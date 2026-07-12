// Package runner executes user Go programs with the yaegi interpreter.
//
// Most tracks are pure stdlib and run against the trimmed symbol table in
// the symbols package alone. The TypeScript track additionally imports
// github.com/rohanthewiz/element and github.com/rohanthewiz/serr, so this
// runner — following the element playground's proven approach — embeds those
// two packages' *sources* and exposes them through a virtual GOPATH
// filesystem. Source interpretation (not symbol extraction) is deliberate:
// element.ForEach/ForEach2 are generic, and reflection-based extracts cannot
// express generic functions, but yaegi interprets them fine.
//
// go-styl takes the opposite trade: its exported API is generics-free, so it
// is compiled into the binary as extracted symbols (see symbols/gen.sh) and
// a lesson's styl.Compile runs at native speed instead of interpreting a
// whole CSS compiler per run.
//
// The runner remains deliberately generic: it knows nothing about tracks,
// tests, or harnesses. Track JavaScript assembles whatever program it wants
// run and parses whatever that program prints — that boundary is what keeps
// future tracks pluggable without touching Go code.
package runner

import (
	"bytes"
	"context"
	"embed"
	"fmt"
	"io/fs"
	"strconv"
	"strings"
	"sync"
	"testing/fstest"
	"time"

	"github.com/traefik/yaegi/interp"

	"github.com/rohanthewiz/go-learn/wasm/symbols"
)

// srcfs is staged by build.sh (run `./build.sh stage` after bumping the
// element or serr module versions):
//
//	srcfs/element/*.go + assets/debug_table.{js,css}
//	srcfs/serr/*.go
//
//go:embed all:srcfs
var rawFS embed.FS

const (
	elementMod = "github.com/rohanthewiz/element"
	serrMod    = "github.com/rohanthewiz/serr"
)

var (
	gopathOnce sync.Once
	gopath     fstest.MapFS
	gopathErr  error
)

// gopathFS lazily assembles the virtual GOPATH the interpreter resolves
// imports against. Built once per process; yaegi only reads from it, and a
// fresh interpreter per run re-parses these sources anyway, so sharing the
// FS across runs leaks no state.
func gopathFS() (fstest.MapFS, error) {
	gopathOnce.Do(func() {
		gopath, gopathErr = buildGopathFS()
	})
	return gopath, gopathErr
}

func buildGopathFS() (fstest.MapFS, error) {
	m := fstest.MapFS{}
	stage := func(from, mod string, transform func(name string, data []byte) ([]byte, error)) error {
		entries, err := fs.ReadDir(rawFS, from)
		if err != nil {
			return fmt.Errorf("srcfs missing %s (run ./build.sh stage): %w", from, err)
		}
		for _, e := range entries {
			name := e.Name()
			if e.IsDir() || !strings.HasSuffix(name, ".go") || strings.HasSuffix(name, "_test.go") {
				continue
			}
			data, err := fs.ReadFile(rawFS, from+"/"+name)
			if err != nil {
				return err
			}
			if transform != nil {
				if data, err = transform(name, data); err != nil {
					return fmt.Errorf("%s/%s: %w", from, name, err)
				}
			}
			m["src/"+mod+"/"+name] = &fstest.MapFile{Data: data}
		}
		return nil
	}

	if err := stage("srcfs/element", elementMod, elementCompat); err != nil {
		return nil, err
	}
	if err := stage("srcfs/serr", serrMod, nil); err != nil {
		return nil, err
	}
	return m, nil
}

// elementCompat rewrites element sources for interpretation. yaegi cannot
// process //go:embed directives or the Go 1.21 `clear` builtin, both used
// only in element_debug.go. Each rewrite must apply — a silent no-op would
// surface later as a confusing interpreter error, so unmatched patterns fail
// the build of the virtual filesystem instead. (Same transform the element
// playground ships; if element grows a new incompatibility, the error text
// says exactly where to extend.)
func elementCompat(name string, data []byte) ([]byte, error) {
	if name != "element_debug.go" {
		if bytes.Contains(data, []byte("//go:embed")) || containsBuiltin(data) {
			return nil, fmt.Errorf("uses //go:embed, clear, min, or max — extend elementCompat")
		}
		return data, nil
	}
	s := string(data)

	replace := func(old, new, what string) error {
		replaced := strings.Replace(s, old, new, 1)
		if replaced == s {
			return fmt.Errorf("expected %s not found — element_debug.go changed, update elementCompat", what)
		}
		s = replaced
		return nil
	}

	if err := replace("\t_ \"embed\"\n", "", `import _ "embed"`); err != nil {
		return nil, err
	}
	for _, embedded := range []struct{ file, varName string }{
		{"assets/debug_table.js", "tableJS"},
		{"assets/debug_table.css", "tableCSS"},
	} {
		asset, err := fs.ReadFile(rawFS, "srcfs/element/"+embedded.file)
		if err != nil {
			return nil, fmt.Errorf("embedded asset %s: %w", embedded.file, err)
		}
		err = replace(
			"//go:embed "+embedded.file+"\nvar "+embedded.varName+" string",
			"var "+embedded.varName+" = "+strconv.Quote(string(asset)),
			"//go:embed "+embedded.file)
		if err != nil {
			return nil, err
		}
	}
	if err := replace("\tclear(con.cmap)",
		"\tfor k := range con.cmap {\n\t\tdelete(con.cmap, k)\n\t}",
		"clear(con.cmap)"); err != nil {
		return nil, err
	}
	return []byte(s), nil
}

// containsBuiltin reports whether source calls a builtin yaegi lacks.
// Line-based and crude, but only guards library sources we control.
func containsBuiltin(data []byte) bool {
	for _, pat := range [][]byte{[]byte("\tclear("), []byte(" clear("), []byte("= min("), []byte("= max(")} {
		if bytes.Contains(data, pat) {
			return true
		}
	}
	return false
}

// Result is the outcome of interpreting one program.
type Result struct {
	Stdout string  // everything the program printed to stdout
	Stderr string  // interpreter panic traces and any user writes to stderr
	Ms     float64 // wall-clock interpretation time in milliseconds
	Err    error   // nil on success
	// Best-effort position of Err within the source (1-based; 0 if unknown).
	Line, Col int
}

// Run interprets src (a complete Go main program) with a fresh interpreter.
// A fresh interpreter per run costs little (~15 ms native) and guarantees no
// state leaks between runs. The context bounds runaway programs — yaegi
// checks its done channel at loop back-edges, so even `for {}` is cancelled
// (verified in wasm for the element playground).
func Run(ctx context.Context, src string) Result {
	gofs, err := gopathFS()
	if err != nil {
		return Result{Err: err}
	}

	var stdout, stderr bytes.Buffer
	i := interp.New(interp.Options{
		GoPath:               ".",
		SourcecodeFilesystem: gofs,
		Stdout:               &stdout,
		Stderr:               &stderr,
	})
	if err := i.Use(symbols.Symbols); err != nil {
		return Result{Err: err}
	}

	start := time.Now()
	_, err = i.EvalWithContext(ctx, src)
	res := Result{
		Stdout: stdout.String(),
		Stderr: stderr.String(),
		Ms:     float64(time.Since(start).Microseconds()) / 1000,
		Err:    err,
	}
	if err != nil {
		res.Line, res.Col = errPosition(err.Error())
	}
	return res
}

// errPosition extracts a leading "line:col:" position from a yaegi error
// message. Positions refer to the interpreted (merged) source; the front end
// maps them back into the user's editor region.
func errPosition(msg string) (line, col int) {
	head, _, ok := strings.Cut(msg, ": ")
	if !ok {
		return 0, 0
	}
	l, c, ok := strings.Cut(head, ":")
	if !ok {
		return 0, 0
	}
	ln, err1 := strconv.Atoi(l)
	cn, err2 := strconv.Atoi(c)
	if err1 != nil || err2 != nil || ln < 1 || cn < 1 {
		return 0, 0
	}
	return ln, cn
}
