#!/bin/sh
# Builds the wasm runner into the repo root:
#   go-learn.wasm   (yaegi + trimmed stdlib symbols + go-styl, js/wasm)
#   wasm_exec.js    (Go's JS support shim, copied from GOROOT)
#
# `./build.sh stage` only refreshes wasm/runner/srcfs — the element + serr
# sources the interpreter reads (the TypeScript track imports them). That is
# enough for native `go run ./wasm` and `node verify/verify.mjs`.
#
# Serve the site with: go run ./serve
set -eu
cd "$(dirname "$0")"

# --- stage: copy interpretable sources into the embed tree ------------------
# Sources come from the module cache (go.mod pins the versions), never from a
# sibling checkout — so CI and every contributor stage identical bytes.
srcfs=wasm/runner/srcfs
rm -rf "$srcfs"
mkdir -p "$srcfs/element/assets" "$srcfs/serr"

go mod download github.com/rohanthewiz/element github.com/rohanthewiz/serr # cold caches (CI)
stage_mod() { # stage_mod <module> <dest-dir>
	dir=$(go list -m -f '{{.Dir}}' "$1")
	if [ -z "$dir" ] || [ ! -d "$dir" ]; then
		echo "error: cannot locate $1 module source (got: '$dir')" >&2
		exit 1
	fi
	for f in "$dir"/*.go; do
		case "$f" in *_test.go) continue ;; esac
		cp "$f" "$2/"
	done
	echo "$dir" # so callers can pull non-.go assets too
}

eledir=$(stage_mod github.com/rohanthewiz/element "$srcfs/element")
cp "$eledir/assets/debug_table.js" "$eledir/assets/debug_table.css" "$srcfs/element/assets/"
stage_mod github.com/rohanthewiz/serr "$srcfs/serr" >/dev/null
chmod -R u+w "$srcfs" # module cache files are read-only

[ "${1:-}" = "stage" ] && { echo "staged $srcfs"; exit 0; }

# --- build -------------------------------------------------------------------
GOOS=js GOARCH=wasm go build -trimpath -ldflags='-s -w' -o go-learn.wasm ./wasm

goroot=$(go env GOROOT)
rm -f wasm_exec.js # a prior copy keeps GOROOT's read-only mode; cp can't overwrite it
if [ -f "$goroot/lib/wasm/wasm_exec.js" ]; then # Go >= 1.24
	cp "$goroot/lib/wasm/wasm_exec.js" .
else # Go <= 1.23
	cp "$goroot/misc/wasm/wasm_exec.js" .
fi

ls -lh go-learn.wasm
