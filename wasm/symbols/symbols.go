// Package symbols holds a trimmed set of stdlib symbols for the yaegi
// interpreter — only the packages go-learn tracks expose to user code.
// The full yaegi/stdlib.Symbols would roughly triple the wasm binary.
//
// reflect is included because every problem harness compares results with
// reflect.DeepEqual; container/heap, container/list, and math/bits are cheap
// conveniences learners reasonably reach for in algorithm problems.
//
// One non-stdlib entry: github.com/rohanthewiz/go-styl (the TypeScript track
// compiles Stylus to CSS live). It is compiled in, not interpreted, so a
// lesson's styl.Compile call runs at native speed — the compiler is far too
// much code to interpret per keystroke.
//
// Regenerate the extracted files with gen.sh after changing the package
// list. Adding a package here is the tax for any track lesson that imports
// something new.
package symbols

import "reflect"

// Symbols is the map the generated files populate via init().
var Symbols = map[string]map[string]reflect.Value{}
