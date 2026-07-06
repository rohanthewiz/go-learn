#!/bin/sh
# Regenerates the yaegi stdlib symbol extracts in this directory.
# Every package listed grows the wasm binary — keep the list to what track
# content actually needs (reflect is required by the problem harnesses).
set -eu
cd "$(dirname "$0")"

for pkg in bytes container/heap container/list errors fmt math math/bits \
	math/rand reflect sort strconv strings time unicode unicode/utf8 \
	encoding/json; do
	go run github.com/traefik/yaegi/cmd/yaegi extract "$pkg"
done
