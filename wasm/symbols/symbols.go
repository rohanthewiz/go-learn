// Package symbols holds a trimmed set of stdlib symbols for the yaegi
// interpreter — only the packages go-learn tracks expose to user code.
// The full yaegi/stdlib.Symbols would roughly triple the wasm binary.
//
// reflect is included because every problem harness compares results with
// reflect.DeepEqual; container/heap, container/list, and math/bits are cheap
// conveniences learners reasonably reach for in algorithm problems.
//
// Non-stdlib entries: github.com/rohanthewiz/go-styl (the TypeScript track
// compiles Stylus to CSS live) and github.com/rohanthewiz/bytdb{,/sql,/tuple}
// (the Database track runs real SQL against it). Both are compiled in, not
// interpreted, so a lesson's styl.Compile or db.Exec runs at native speed —
// a CSS compiler or a SQL parser/planner/executor is far too much code to
// interpret per keystroke. In the browser, bytdb's file I/O lands in the
// in-memory fs shim (engine/memfs.js); natively it hits the real disk.
// os is a hand-written PARTIAL extract (os-partial.go) — see that file for
// why the full package stays out.
//
// Regenerate the extracted files with gen.sh after changing the package
// list. Adding a package here is the tax for any track lesson that imports
// something new.
package symbols

import "reflect"

// Symbols is the map the generated files populate via init().
var Symbols = map[string]map[string]reflect.Value{}
