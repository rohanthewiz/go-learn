// Command serve hosts the go-learn site locally for development.
// Run ./build.sh first, then: go run ./serve
package main

import (
	"flag"
	"log"
	"net/http"
)

func main() {
	addr := flag.String("addr", ":8080", "listen address")
	dir := flag.String("dir", ".", "directory to serve")
	flag.Parse()
	log.Printf("go-learn on http://localhost%s (serving %s)", *addr, *dir)
	log.Fatal(http.ListenAndServe(*addr, http.FileServer(http.Dir(*dir))))
}
