#!/bin/sh
# Builds the wasm runner into the repo root:
#   go-learn.wasm   (yaegi + trimmed stdlib symbols, js/wasm)
#   wasm_exec.js    (Go's JS support shim, copied from GOROOT)
#
# No staging step — go-learn embeds no library sources (pure-stdlib tracks).
# Serve the site with: go run ./serve
set -eu
cd "$(dirname "$0")"

GOOS=js GOARCH=wasm go build -trimpath -ldflags='-s -w' -o go-learn.wasm ./wasm

goroot=$(go env GOROOT)
if [ -f "$goroot/lib/wasm/wasm_exec.js" ]; then # Go >= 1.24
	cp "$goroot/lib/wasm/wasm_exec.js" .
else # Go <= 1.23
	cp "$goroot/misc/wasm/wasm_exec.js" .
fi

ls -lh go-learn.wasm
