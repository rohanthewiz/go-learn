// Shared by both the wasm and native builds of the runner command.
package main

import "runtime/debug"

// version returns the short vcs revision stamped into the build, or "dev"
// for local uncommitted builds. Shown in the site footer so a deployed page
// can be matched to a commit.
func version() string {
	if bi, ok := debug.ReadBuildInfo(); ok {
		for _, s := range bi.Settings {
			if s.Key == "vcs.revision" && len(s.Value) >= 7 {
				return s.Value[:7]
			}
		}
	}
	return "dev"
}
