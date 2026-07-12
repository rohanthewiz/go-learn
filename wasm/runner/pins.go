//go:build pins

package runner

// element and serr are never linked into the binary — the interpreter reads
// their *sources*, staged by build.sh from the module cache into srcfs/.
// These blank imports exist solely to pin their versions in go.mod so that
// `go mod tidy` keeps the requirements build.sh resolves with `go list -m`.
// The `pins` build tag is never set; this file compiles nowhere.
import (
	_ "github.com/rohanthewiz/element"
	_ "github.com/rohanthewiz/serr"
)
