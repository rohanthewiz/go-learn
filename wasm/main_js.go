//go:build js && wasm

// Command wasm is the WebAssembly build of the go-learn runner.
// It installs a global `goRun` object with:
//
//	goRun.run(src) -> {stdout, stderr, ms} | {error, line, col, stderr, ms}
//	goRun.version  -> short vcs revision or "dev"
//
// `src` is a complete Go main program. The API is intentionally generic —
// no notion of tests or lessons — so any track that needs Go execution can
// assemble its own program and interpret the stdout however it likes.
package main

import (
	"context"
	"syscall/js"
	"time"

	"github.com/rohanthewiz/go-learn/wasm/runner"
)

// runTimeout bounds a single interpretation so a runaway user loop
// (`for {}`) doesn't wedge the page forever.
const runTimeout = 5 * time.Second

func main() {
	g := js.Global()
	api := g.Get("Object").New()
	api.Set("run", js.FuncOf(run))
	api.Set("version", version())
	g.Set("goRun", api)
	// Tell the page the API is ready (wasm instantiation is async).
	if cb := g.Get("goRunReady"); cb.Type() == js.TypeFunction {
		cb.Invoke()
	}
	select {} // keep the Go runtime alive for future JS calls
}

// run implements goRun.run(src).
func run(_ js.Value, args []js.Value) any {
	if len(args) < 1 || args[0].Type() != js.TypeString {
		return map[string]any{"error": "run(src): src must be a string"}
	}
	ctx, cancel := context.WithTimeout(context.Background(), runTimeout)
	defer cancel()

	res := runner.Run(ctx, args[0].String())
	out := map[string]any{"ms": res.Ms, "stderr": res.Stderr}
	if res.Err != nil {
		out["error"] = res.Err.Error()
		if res.Line > 0 {
			out["line"] = res.Line
			out["col"] = res.Col
		}
		return out
	}
	out["stdout"] = res.Stdout
	return out
}
