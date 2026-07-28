/* Capstone: Tokenizer — Capstone (Hard). The track assembled into one
 * machine: scan a sentinel-terminated buffer (slices item) into tagged
 * tokens (unions item) behind an error-union return where the first bad
 * byte aborts the whole scan (try item). Keywords vs idents by longest
 * match, Zig's number-underscore rule, and a Summarize keyed by token kind
 * — compared per-key in the harness because map order is not deterministic.
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// The byte stream flowing through skip/classify stages onto a token
	// tape; the 0 sentinel is the end wall, and a warn arrow bails out of
	// the classify stage mid-stream — the error-union path. Marker ids
	// namespaced (dgArrowZGCT / dgArrowZGCTe): all tracks' SVGs share one
	// page id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 232" width="540" height="232" role="img" aria-label="bytes flow through skip-whitespace and classify stages onto a token tape; the zero sentinel is the end wall, and an error arrow bails out of classify to a nil-tokens error return">' +
		'<text x="20" y="18" class="lbl">the byte stream ends at the 0 sentinel — the wall the scan never crosses</text>' +
		// byte stream: c o n s t ␠ x 0
		'<rect x="20" y="30" width="30" height="30" fill="none" stroke="var(--accent)" stroke-width="1.4"/><text x="35" y="50" text-anchor="middle">c</text>' +
		'<rect x="50" y="30" width="30" height="30" fill="none" stroke="var(--accent)" stroke-width="1.4"/><text x="65" y="50" text-anchor="middle">o</text>' +
		'<rect x="80" y="30" width="30" height="30" fill="none" stroke="var(--accent)" stroke-width="1.4"/><text x="95" y="50" text-anchor="middle">n</text>' +
		'<rect x="110" y="30" width="30" height="30" fill="none" stroke="var(--accent)" stroke-width="1.4"/><text x="125" y="50" text-anchor="middle">s</text>' +
		'<rect x="140" y="30" width="30" height="30" fill="none" stroke="var(--accent)" stroke-width="1.4"/><text x="155" y="50" text-anchor="middle">t</text>' +
		'<rect x="170" y="30" width="30" height="30" fill="none" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="3 3"/><text x="185" y="50" text-anchor="middle" class="lbl">sp</text>' +
		'<rect x="200" y="30" width="30" height="30" fill="none" stroke="var(--accent)" stroke-width="1.4"/><text x="215" y="50" text-anchor="middle">x</text>' +
		'<rect x="230" y="30" width="30" height="30" fill="none" stroke="var(--warn)" stroke-width="3"/><text x="245" y="50" text-anchor="middle" style="fill:var(--warn)">0</text>' +
		'<text x="270" y="50" class="lbl" style="fill:var(--warn)">← end wall</text>' +
		// down into the pipeline
		'<path d="M 140 66 L 140 88" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowZGCT)"/>' +
		// pipeline stages
		'<rect x="60" y="94" width="86" height="32" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="103" y="115" text-anchor="middle">skip ws</text>' +
		'<path d="M 146 110 L 186 110" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowZGCT)"/>' +
		'<rect x="190" y="94" width="130" height="32" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="255" y="115" text-anchor="middle">longest match</text>' +
		'<path d="M 320 110 L 360 110" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowZGCT)"/>' +
		'<rect x="364" y="94" width="96" height="32" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="412" y="115" text-anchor="middle">classify</text>' +
		// success path: onto the token tape
		'<path d="M 412 126 L 412 150 L 320 158" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowZGCT)"/>' +
		'<rect x="60" y="152" width="130" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="125" y="172" text-anchor="middle">keyword:const</text>' +
		'<rect x="196" y="152" width="90" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="241" y="172" text-anchor="middle">ident:x</text>' +
		'<text x="60" y="200" class="lbl">the token tape — appended left to right</text>' +
		// error path: bail out mid-stream
		'<path d="M 460 126 C 500 150 500 190 462 210" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 3" marker-end="url(#dgArrowZGCTe)"/>' +
		'<text x="455" y="224" text-anchor="end" class="lbl" style="fill:var(--warn)">bad byte → (nil, error): the first error aborts the whole scan, try-style</text>' +
		'<defs>' +
		'<marker id="dgArrowZGCT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowZGCTe" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'capstone-tokenizer',
		title: 'Capstone: Tokenizer',
		nav: 'capstone: tokenizer',
		difficulty: 'Hard',
		category: 'Capstone',
		task: 'Tokenize a sentinel-terminated buffer of Zig-ish source into tagged tokens behind an error-union return — first error aborts the scan.',

		prose: [
			'<h2>Capstone: Tokenizer</h2>' +
			'<p>Every compiler’s first pass is the same machine: a cursor walking raw ' +
			'bytes, chopping them into tagged tokens, bailing on the first byte that ' +
			'fits no rule. Zig’s own tokenizer (<code>std.zig.Tokenizer</code>) is ' +
			'exactly this — and it is built from the pieces this track has already ' +
			'made you implement:</p>',
			{ lang: 'txt', code: 'const Token = union(enum) {     // tagged variants: one kind at a time\n    keyword: []const u8,\n    ident:   []const u8,\n    number:  []const u8,\n    symbol:  u8,\n};\n\nfn tokenize(gpa: Allocator, src: [:0]const u8) ![]Token {\n    // [:0]const u8 — the TYPE guarantees a 0 terminator, so the hot\n    // loop is `while (src[i] != 0)` with no length re-checks\n    // !          — error union: a bad byte propagates out via `try`,\n    //              aborting the scan with no partial results\n}' },
			'<ul>' +
			'<li><strong>Sentinel scan</strong> (Slices &amp; Sentinels): the input ' +
			'ends at the first 0 byte, not at <code>len(buf)</code>. A buffer with no ' +
			'sentinel is an error — conceptually you may never read past the wall.</li>' +
			'<li><strong>Error-union discipline</strong> (Error Unions &amp; try): ' +
			'the first malformed number or invalid byte aborts immediately with ' +
			'<code>nil</code> tokens and an error — no partial tape, exactly what ' +
			'<code>try</code> does at every call site.</li>' +
			'<li><strong>Tagged variants</strong> (Tagged Unions &amp; switch): each ' +
			'token is a kind plus its text — <code>keyword</code> (exactly ' +
			'<code>const var fn try defer comptime</code>), <code>ident</code> ' +
			'(<code>[A-Za-z_][A-Za-z0-9_]*</code>), <code>number</code> (digits with ' +
			'optional <em>single</em> <code>_</code> separators between digits: ' +
			'<code>1_000</code> yes; <code>1__0</code> and <code>1_</code> no), ' +
			'<code>symbol</code> (one of <code>=+-*(){};:,</code>).</li>' +
			'<li><strong>Longest match first:</strong> read the whole word, ' +
			'<em>then</em> classify — <code>constant</code> is an identifier, not ' +
			'<code>const</code> plus <code>ant</code>. (In real Zig that keyword ' +
			'table is a comptime-generated perfect map — the comptime items’ move.)</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Tokenize(buf)</code>: find the sentinel (error ' +
			'<code>no sentinel</code> if absent), then repeatedly skip spaces, tabs, ' +
			'and newlines and cut the next token; errors are <code>malformed number: ' +
			'&lt;text&gt;</code> and <code>invalid byte: &lt;char&gt;</code>, each ' +
			'returned immediately with nil tokens. Then <code>Summarize(toks)</code>: ' +
			'a map from kind to count.</p>' +
			'<div class="tip">The harness never prints the Summarize map whole — it ' +
			'looks up each key individually, because Go randomizes map iteration ' +
			'order on purpose and <code>fmt.Sprint</code> of a map is a test ' +
			'flake waiting to happen.</div>',
		],

		starter: [
			'package main',
			'',
			'// Token is one tagged variant of the tape: Kind is "keyword",',
			'// "ident", "number", or "symbol"; Text is the exact source text',
			'// (for symbols, the single character).',
			'type Token struct {',
			'	Kind string',
			'	Text string',
			'}',
			'',
			'// keywords is the exact keyword set. Any other word shape is an',
			'// ident — including words that merely START with a keyword.',
			'var keywords = map[string]bool{',
			'	"const": true, "var": true, "fn": true,',
			'	"try": true, "defer": true, "comptime": true,',
			'}',
			'',
			'// Tokenize scans a sentinel-terminated buffer into tokens:',
			'//',
			'//   - the scan STOPS at the first 0 byte; if buf has no 0 byte,',
			'//     return (nil, error "no sentinel") — never read past the wall',
			'//   - skip spaces, tabs, and newlines between tokens',
			'//   - words: [A-Za-z_][A-Za-z0-9_]* — read the WHOLE word, then',
			'//     classify: keyword if in the table, else ident',
			'//   - numbers: digits with optional single \'_\' separators between',
			'//     digits ("1_000" ok). A trailing \'_\' or a double "__" is',
			'//     (nil, error "malformed number: <text>")',
			'//   - symbols: one char from =+-*(){};:,',
			'//   - any other byte: (nil, error "invalid byte: <char>")',
			'//',
			'// The first error aborts the whole scan with nil tokens — the try',
			'// discipline: no partial tape ever escapes.',
			'func Tokenize(buf []byte) ([]Token, error) {',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
			'// Summarize counts tokens by Kind. Kinds that never occur are',
			'// simply absent (a lookup returns 0).',
			'func Summarize(toks []Token) map[string]int {',
			'	// your code here',
			'	return nil',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// tape spells a token slice as kind:text pairs — a stable string',
			'	// form for whole-program comparisons.',
			'	tape := func(toks []Token) string {',
			'		parts := make([]string, 0, len(toks))',
			'		for _, t := range toks {',
			'			parts = append(parts, t.Kind+":"+t.Text)',
			'		}',
			'		return strings.Join(parts, " ")',
			'	}',
			'	errStr := func(err error) string {',
			'		if err == nil {',
			'			return "<nil>"',
			'		}',
			'		return err.Error()',
			'	}',
			'	// A small two-line program exercising every token kind.',
			'	program := []byte("const x = 1_000;\\nvar y = x + 2;\\x00")',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"a full program: keywords, idents, an underscored number, symbols — the whole tape in order",',
			'			"keyword:const ident:x symbol:= number:1_000 symbol:; keyword:var ident:y symbol:= ident:x symbol:+ number:2 symbol:;",',
			'			func() string {',
			'				toks, err := Tokenize(program)',
			'				if err != nil {',
			'					return "err=" + errStr(err)',
			'				}',
			'				return tape(toks)',
			'			}},',
			'		{"Summarize of that program — compared key by key, never by printing the map",',
			'			"keyword=2 ident=3 number=2 symbol=5",',
			'			func() string {',
			'				toks, _ := Tokenize(program)',
			'				m := Summarize(toks)',
			'				return fmt.Sprintf("keyword=%d ident=%d number=%d symbol=%d", m["keyword"], m["ident"], m["number"], m["symbol"])',
			'			}},',
			'		{"the prefix trap: \'constant\' starts with \'const\' but is one ident — longest match, then classify",',
			'			"keyword:try ident:constant symbol:;",',
			'			func() string {',
			'				toks, err := Tokenize([]byte("try constant;\\x00"))',
			'				if err != nil {',
			'					return "err=" + errStr(err)',
			'				}',
			'				return tape(toks)',
			'			}},',
			'		{"the rest of the keyword set — and \'deferred\' stays an ident",',
			'			"keyword:fn keyword:defer ident:deferred keyword:comptime",',
			'			func() string {',
			'				toks, err := Tokenize([]byte("fn defer deferred comptime\\x00"))',
			'				if err != nil {',
			'					return "err=" + errStr(err)',
			'				}',
			'				return tape(toks)',
			'			}},',
			'		{"the scan stops AT the sentinel: garbage past the wall is never seen",',
			'			"keyword:fn",',
			'			func() string {',
			'				toks, err := Tokenize([]byte("fn\\x00@@ not scanned @@"))',
			'				if err != nil {',
			'					return "err=" + errStr(err)',
			'				}',
			'				return tape(toks)',
			'			}},',
			'		{"no 0 byte anywhere: the buffer is not a valid input at all",',
			'			"tokens=0 err=no sentinel",',
			'			func() string {',
			'				toks, err := Tokenize([]byte("const x = 1"))',
			'				return fmt.Sprintf("tokens=%d err=%s", len(toks), errStr(err))',
			'			}},',
			'		{"double underscore in a number: malformed, nil tokens — no partial tape escapes",',
			'			"tokens=0 err=malformed number: 1__0",',
			'			func() string {',
			'				toks, err := Tokenize([]byte("x = 1__0;\\x00"))',
			'				return fmt.Sprintf("tokens=%d err=%s", len(toks), errStr(err))',
			'			}},',
			'		{"trailing underscore: separators go BETWEEN digits, never at the end",',
			'			"tokens=0 err=malformed number: 1_",',
			'			func() string {',
			'				toks, err := Tokenize([]byte("1_\\x00"))',
			'				return fmt.Sprintf("tokens=%d err=%s", len(toks), errStr(err))',
			'			}},',
			'		{"a byte outside every rule aborts with invalid byte",',
			'			"tokens=0 err=invalid byte: @",',
			'			func() string {',
			'				toks, err := Tokenize([]byte("const @ x\\x00"))',
			'				return fmt.Sprintf("tokens=%d err=%s", len(toks), errStr(err))',
			'			}},',
			'		{"only whitespace before the sentinel: zero tokens is a fine, non-error result",',
			'			"tokens=0 err=<nil>",',
			'			func() string {',
			'				toks, err := Tokenize([]byte(" \\t\\n \\x00"))',
			'				return fmt.Sprintf("tokens=%d err=%s", len(toks), errStr(err))',
			'			}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			got := c.got()',
			'			r["pass"] = got == c.want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'import "errors"',
			'',
			'// Token is one tagged variant of the tape: Kind is "keyword",',
			'// "ident", "number", or "symbol"; Text is the exact source text.',
			'type Token struct {',
			'	Kind string',
			'	Text string',
			'}',
			'',
			'// keywords is the exact keyword set. Classification happens AFTER',
			'// the whole word is read (longest match), so "constant" never',
			'// half-matches "const" — the table is consulted once per word.',
			'var keywords = map[string]bool{',
			'	"const": true, "var": true, "fn": true,',
			'	"try": true, "defer": true, "comptime": true,',
			'}',
			'',
			'// Byte-class predicates. Hand-rolled (no unicode, no regexp) because',
			'// the token grammar is pure ASCII — and because a tokenizer\'s hot',
			'// loop is exactly where you want branch-predictable byte compares.',
			'func isSpace(b byte) bool {',
			'	return b == \' \' || b == \'\\t\' || b == \'\\n\'',
			'}',
			'',
			'func isDigit(b byte) bool {',
			'	return b >= \'0\' && b <= \'9\'',
			'}',
			'',
			'func isWordStart(b byte) bool {',
			'	return b == \'_\' || (b >= \'a\' && b <= \'z\') || (b >= \'A\' && b <= \'Z\')',
			'}',
			'',
			'func isWordChar(b byte) bool {',
			'	return isWordStart(b) || isDigit(b)',
			'}',
			'',
			'// symbolSet holds every single-char symbol token. A linear scan over',
			'// 11 bytes beats building a map for a set this small.',
			'const symbolSet = "=+-*(){};:,"',
			'',
			'func isSymbol(b byte) bool {',
			'	for i := 0; i < len(symbolSet); i++ {',
			'		if symbolSet[i] == b {',
			'			return true',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
			'// Tokenize scans a sentinel-terminated buffer into tagged tokens,',
			'// aborting on the first error with nil tokens — the try discipline:',
			'// every error return here is what `try` would propagate in Zig, and',
			'// no partial tape ever escapes to a caller.',
			'func Tokenize(buf []byte) ([]Token, error) {',
			'	// Locate the end wall FIRST. Slicing to it up front means the',
			'	// scan loop below cannot even express reading past the sentinel',
			'	// — the same guarantee Zig\'s [:0]const u8 puts in the type.',
			'	end := -1',
			'	for i := 0; i < len(buf); i++ {',
			'		if buf[i] == 0 {',
			'			end = i',
			'			break',
			'		}',
			'	}',
			'	if end < 0 {',
			'		return nil, errors.New("no sentinel")',
			'	}',
			'	src := buf[:end]',
			'',
			'	toks := []Token{}',
			'	i := 0',
			'	for i < len(src) {',
			'		b := src[i]',
			'		switch {',
			'		case isSpace(b):',
			'			i++',
			'',
			'		case isWordStart(b):',
			'			// Longest match: consume the entire word, THEN classify.',
			'			// Splitting these steps is what makes "constant" one',
			'			// ident instead of keyword "const" + ident "ant".',
			'			j := i + 1',
			'			for j < len(src) && isWordChar(src[j]) {',
			'				j++',
			'			}',
			'			text := string(src[i:j])',
			'			kind := "ident"',
			'			if keywords[text] {',
			'				kind = "keyword"',
			'			}',
			'			toks = append(toks, Token{Kind: kind, Text: text})',
			'			i = j',
			'',
			'		case isDigit(b):',
			'			// Consume digits AND underscores greedily, then validate',
			'			// the run as a whole. Greedy-then-validate beats validating',
			'			// mid-scan: the error message can show the entire offending',
			'			// text ("1__0"), not just the byte where it went wrong.',
			'			j := i + 1',
			'			for j < len(src) && (isDigit(src[j]) || src[j] == \'_\') {',
			'				j++',
			'			}',
			'			text := string(src[i:j])',
			'			// Separators go BETWEEN digits: no trailing underscore,',
			'			// no doubled underscore. (A leading underscore cannot',
			'			// occur — that byte starts a word, not a number.)',
			'			bad := text[len(text)-1] == \'_\'',
			'			for k := 1; k < len(text); k++ {',
			'				if text[k] == \'_\' && text[k-1] == \'_\' {',
			'					bad = true',
			'				}',
			'			}',
			'			if bad {',
			'				return nil, errors.New("malformed number: " + text)',
			'			}',
			'			toks = append(toks, Token{Kind: "number", Text: text})',
			'			i = j',
			'',
			'		case isSymbol(b):',
			'			toks = append(toks, Token{Kind: "symbol", Text: string(rune(b))})',
			'			i++',
			'',
			'		default:',
			'			// A byte no rule claims. Abort immediately — returning',
			'			// nil (not the partial toks) keeps the contract atomic:',
			'			// callers get a tape or an error, never both.',
			'			return nil, errors.New("invalid byte: " + string(rune(b)))',
			'		}',
			'	}',
			'	return toks, nil',
			'}',
			'',
			'// Summarize counts tokens by Kind. Absent kinds simply have no key',
			'// — a map lookup returns 0, which is exactly the count a caller',
			'// wants for "how many numbers did this file have: none".',
			'func Summarize(toks []Token) map[string]int {',
			'	counts := map[string]int{}',
			'	for _, t := range toks {',
			'		counts[t.Kind]++',
			'	}',
			'	return counts',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The capstone, unpacked</h3>' +
			'<p>Each stage of your loop is one item of this track wearing work ' +
			'clothes. The up-front sentinel search is the Slices &amp; Sentinels move ' +
			'— and slicing <code>buf[:end]</code> <em>before</em> scanning is the Go ' +
			'translation of what Zig puts in the type <code>[:0]const u8</code>: the ' +
			'code past that line cannot express an out-of-wall read, rather than ' +
			'promising not to do one. The <code>(nil, error)</code> returns are the ' +
			'error-union discipline from Error Unions &amp; try — note that every ' +
			'error path returns <code>nil</code>, not the partial <code>toks</code>; ' +
			'atomicity is a decision, and forgetting it is how half-parsed garbage ' +
			'leaks into callers. And <code>Token</code> is the tagged-union item ' +
			'flattened into Go: one Kind at a time, with the exhaustive-switch ' +
			'guarantee traded away for a string tag.</p>' +
			'<h3>Real tokenizers, same skeleton</h3>' +
			'<p>Zig’s <code>std.zig.Tokenizer</code> is this loop scaled up: a state ' +
			'machine over sentinel-terminated source, returning token tag + byte ' +
			'range (not the text — an index pair is smaller and allocation-free, a ' +
			'trick worth stealing). Its keyword lookup is a ' +
			'<code>std.StaticStringMap</code> built at <em>comptime</em> — the ' +
			'comptime items’ promise made concrete: the perfect-hash table is ' +
			'computed during compilation, so the runtime pays one length check and a ' +
			'couple of compares. Go’s own scanner (<code>go/scanner</code>) has the ' +
			'identical longest-match-then-classify shape, with the keyword map built ' +
			'at package init instead — runtime work Zig moves to the compiler.</p>' +
			'<h3>Two bugs this harness was built to catch</h3>' +
			'<p>The prefix trap (<code>constant</code>) kills every tokenizer that ' +
			'checks keywords <em>while</em> scanning instead of after — real-world ' +
			'victims include naive syntax highlighters that paint the first five ' +
			'letters of <code>constant</code> purple. And the number rule ' +
			'(<code>1_000</code> ok, <code>1__0</code>, <code>1_</code> not) is ' +
			'lifted from real language specs — Zig, Go (since 1.13), Rust, and Java ' +
			'all allow digit separators and all had to decide the same edge cases; ' +
			'greedy-consume-then-validate is the standard implementation precisely ' +
			'because it makes the whole malformed text available for the error ' +
			'message. The last habit worth naming is in the harness itself: ' +
			'<code>Summarize</code> is checked by individual key lookups because Go ' +
			'deliberately randomizes map iteration order — <code>fmt.Sprint</code> ' +
			'of a map in a test is a flake that passes for weeks and then doesn’t.</p>',
		],
		complexity: { time: 'O(n) — each byte is visited a constant number of times (once to find the wall, once to scan)', space: 'O(t) for the token tape' },
	});
})();
