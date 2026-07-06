//go:build !(js && wasm)

// Native build of the go-learn runner — the same interpreter the browser
// uses, as a CLI. The verification harness (verify/verify.mjs) shells out to
// this to batch-check every problem and lesson without a browser:
//
//	go run ./wasm [-timeout 5s] [file.go]   # source from the file, or stdin
//
// Output is one JSON object mirroring goRun.run's result:
// {"stdout", "stderr", "ms"} on success, {"error", "line", "col", ...} on
// failure (exit status 2 so callers can distinguish run errors from IO ones).
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"time"

	"github.com/rohanthewiz/go-learn/wasm/runner"
)

func main() {
	timeout := flag.Duration("timeout", 5*time.Second, "interpretation time limit")
	flag.Parse()

	var src []byte
	var err error
	if flag.NArg() > 0 {
		src, err = os.ReadFile(flag.Arg(0))
	} else {
		src, err = io.ReadAll(os.Stdin)
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), *timeout)
	defer cancel()
	res := runner.Run(ctx, string(src))

	enc := json.NewEncoder(os.Stdout)
	out := map[string]any{"ms": res.Ms, "stderr": res.Stderr}
	if res.Err != nil {
		out["error"] = res.Err.Error()
		if res.Line > 0 {
			out["line"] = res.Line
			out["col"] = res.Col
		}
		_ = enc.Encode(out)
		os.Exit(2)
	}
	out["stdout"] = res.Stdout
	_ = enc.Encode(out)
}
