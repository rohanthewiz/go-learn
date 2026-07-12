#!/bin/sh
# Regenerates the yaegi stdlib symbol extracts in this directory.
# Every package listed grows the wasm binary — keep the list to what track
# content actually needs (reflect is required by the problem harnesses).
set -eu
cd "$(dirname "$0")"

# encoding/base64, path/filepath, runtime, and sync{,/atomic} are not for
# user code — they are what the staged element/serr *sources* import (see
# wasm/runner); interpreted packages resolve their own imports through this
# table too. (sync/atomic arrived with element v0.6.0's debug concerns.)
for pkg in bytes container/heap container/list errors fmt math math/bits \
	math/rand reflect sort strconv strings time unicode unicode/utf8 \
	encoding/json encoding/base64 path/filepath runtime sync sync/atomic; do
	go run github.com/traefik/yaegi/cmd/yaegi extract "$pkg"
done

# go-styl is extracted as compiled symbols (native speed for CSS compiles in
# the TypeScript track) rather than staged as source: its exported API has no
# generics, so reflection covers it. element/serr, by contrast, are staged as
# interpretable source in wasm/runner (element.ForEach is generic — reflect
# can't express it).
go run github.com/traefik/yaegi/cmd/yaegi extract github.com/rohanthewiz/go-styl
