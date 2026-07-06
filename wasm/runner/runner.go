// Package runner executes user Go programs with the yaegi interpreter.
// Unlike the element playground's runner this one embeds no library sources:
// go-learn problems are pure stdlib, so there is no virtual GOPATH, no
// source staging, and no compat rewrites — just a fresh interpreter per run
// with a trimmed stdlib symbol table (see the symbols package).
//
// The runner is deliberately generic: it knows nothing about tracks, tests,
// or harnesses. Track JavaScript assembles whatever program it wants run and
// parses whatever that program prints — that boundary is what keeps future
// tracks pluggable without touching Go code.
package runner

import (
	"bytes"
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/traefik/yaegi/interp"

	"github.com/rohanthewiz/go-learn/wasm/symbols"
)

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
	var stdout, stderr bytes.Buffer
	i := interp.New(interp.Options{
		Stdout: &stdout,
		Stderr: &stderr,
	})
	if err := i.Use(symbols.Symbols); err != nil {
		return Result{Err: err}
	}

	start := time.Now()
	_, err := i.EvalWithContext(ctx, src)
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
