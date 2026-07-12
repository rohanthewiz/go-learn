module github.com/rohanthewiz/go-learn

go 1.26

// Pinned past yaegi v0.16.1: that release zeroed composite literals assigned
// to named return values — fixed on master (same pin the element playground
// uses, proven in production there).
require github.com/traefik/yaegi v0.16.2-0.20260209085605-fcb76d1ece0c

require (
	github.com/rohanthewiz/element v0.5.6
	github.com/rohanthewiz/go-styl v0.2.0
)

require github.com/rohanthewiz/serr v1.4.0
