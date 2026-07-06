module github.com/rohanthewiz/go-learn

go 1.26

// Pinned past yaegi v0.16.1: that release zeroed composite literals assigned
// to named return values — fixed on master (same pin the element playground
// uses, proven in production there).
require github.com/traefik/yaegi v0.16.2-0.20260209085605-fcb76d1ece0c
