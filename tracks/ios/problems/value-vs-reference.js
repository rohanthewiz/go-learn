/* Structs vs Classes: Value Semantics & CoW — Swift: Types & Optionals
 * (Medium). The first question in every Swift interview and the root cause of
 * a whole genre of bugs: structs COPY at assignment, classes SHARE. The
 * learner implements both semantics as a two-variable interpreter (assign /
 * mutate over struct-typed vs class-typed variables), then builds Swift
 * Array's copy-on-write: buffers with ids and refcounts, sharing on assign,
 * and a copy triggered by the FIRST mutation through a shared buffer — the
 * isKnownUniquelyReferenced check, written out. Pinned: a shared mutation
 * copies exactly once, the other variable's buffer id never moves.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// The CoW fork: two variables share one buffer until the first write,
	// which peels the writer off onto a fresh buffer and leaves the reader
	// untouched. Marker ids namespaced (dgArrowIOSVR*) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 232" width="560" height="232" role="img" aria-label="copy-on-write: xs and ys share buffer 1 after assignment; the first mutation through xs allocates buffer 2 for xs and leaves ys on buffer 1">' +
		'<text x="20" y="24" class="lbl">var ys = xs — O(1), both share one buffer… until somebody writes</text>' +
		'<rect x="40" y="44" width="70" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="75" y="67" text-anchor="middle">xs</text>' +
		'<rect x="40" y="100" width="70" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="75" y="123" text-anchor="middle">ys</text>' +
		'<rect x="200" y="68" width="130" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="265" y="88" text-anchor="middle">buffer #1</text>' +
		'<text x="265" y="105" text-anchor="middle" class="lbl">refs: 2 — shared</text>' +
		'<path d="M 110 62 L 196 80" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowIOSVR)"/>' +
		'<path d="M 110 118 L 196 100" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowIOSVR)"/>' +
		'<text x="20" y="170" class="lbl" style="fill:var(--warn)">xs.append(4): buffer #1 is NOT uniquely referenced → copy first, then write</text>' +
		'<rect x="400" y="44" width="130" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="465" y="64" text-anchor="middle">buffer #2</text>' +
		'<text x="465" y="81" text-anchor="middle" class="lbl">fresh copy for xs</text>' +
		'<path d="M 330 76 L 396 66" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowIOSVRw)"/>' +
		'<text x="20" y="196" class="lbl">ys never moves: still buffer #1, now refs: 1 — the NEXT write through either side is free</text>' +
		'<text x="20" y="218" class="lbl">the test the stdlib runs before every mutation: isKnownUniquelyReferenced(&amp;buffer)</text>' +
		'<defs>' +
		'<marker id="dgArrowIOSVR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowIOSVRw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'value-vs-reference',
		title: 'Structs vs Classes: Value Semantics & CoW',
		nav: 'value vs reference',
		difficulty: 'Medium',
		category: 'Swift: Types & Optionals',
		task: 'Implement Swift\'s two assignment semantics — structs copy, classes share — as a tiny interpreter, then Array\'s copy-on-write buffers with the isKnownUniquelyReferenced check.',

		prose: [
			'<h2>Structs vs Classes: Value Semantics &amp; CoW</h2>' +
			'<p>Code review, and a teammate is adamant there is a bug: “you assigned ' +
			'the model to a second variable and mutated it — now both screens will ' +
			'change.” Whether they are right depends on one keyword in a file ' +
			'neither of you has open: <code>struct</code> or <code>class</code>.</p>',
			{ lang: 'swift', code: 'struct PointS { var x: Int }\nclass  PointC { var x: Int; init(x: Int) { self.x = x } }\n\nvar s1 = PointS(x: 10)\nvar s2 = s1                 // COPY: s2 is a brand-new value\ns1.x = 99\nprint(s1.x, s2.x)           // 99 10   — s2 never noticed\n\nlet c1 = PointC(x: 10)\nlet c2 = c1                 // SHARE: two names, ONE instance\nc1.x = 99\nprint(c1.x, c2.x)           // 99 99   — the mutation is visible through both' },
			'<p>Two rules, and they explain both prints:</p>' +
			'<ul>' +
			'<li><strong>Structs copy at assignment.</strong> <code>s2 = s1</code> ' +
			'duplicates the value; from that moment the two variables have no ' +
			'relationship. Note <em>when</em> the copy happens: at the assignment, ' +
			'not at the mutation — assign after mutating and the copy carries the ' +
			'mutated value.</li>' +
			'<li><strong>Classes share at assignment.</strong> <code>c2 = c1</code> ' +
			'copies a <em>reference</em>; both names point at one instance, and a ' +
			'mutation through either is visible through both. Notice the ' +
			'<code>let</code>s above still allowed <code>c1.x = 99</code>: ' +
			'<code>let</code> on a class freezes the <em>reference</em>, not the ' +
			'instance. On a struct, <code>let</code> freezes everything — ' +
			'<code>s.x = 5</code> on a <code>let</code> struct is the compile error ' +
			'<code>Cannot assign to property: \'s\' is a \'let\' constant</code>.</li>' +
			'</ul>' +
			'<h3>So is <code>var ys = xs</code> on a 10,000-element array a 10,000-element copy?</h3>' +
			'<p>No — and this is the part interviews actually probe. ' +
			'<code>Array</code>, <code>Dictionary</code>, <code>Set</code>, and ' +
			'<code>String</code> are structs with <em>value semantics</em> but a ' +
			'shared heap buffer inside: assignment shares the buffer in O(1), and ' +
			'the copy is deferred until the first <em>mutation</em> through a ' +
			'variable whose buffer is shared — <strong>copy-on-write</strong>. You ' +
			'can watch it happen:</p>',
			{ lang: 'swift', code: 'var xs = [1, 2, 3]\nvar ys = xs                                            // O(1) — shared buffer\nxs.withUnsafeBufferPointer { print($0.baseAddress!) }  // 0x0000600001710e40\nys.withUnsafeBufferPointer { print($0.baseAddress!) }  // 0x0000600001710e40  same!\n\nxs.append(4)                                           // first write: copy NOW\nxs.withUnsafeBufferPointer { print($0.baseAddress!) }  // 0x0000600002b04120  fresh\nys.withUnsafeBufferPointer { print($0.baseAddress!) }  // 0x0000600001710e40  untouched' },
			'<p>Before every mutating operation, the stdlib asks ' +
			'<code>isKnownUniquelyReferenced(&amp;buffer)</code> — literally “is ' +
			'the refcount 1?”. Unique: write in place. Shared: allocate a fresh ' +
			'buffer, copy, <em>then</em> write — and the copy happens ' +
			'<strong>exactly once</strong>, because the writer\'s new buffer is ' +
			'uniquely held from then on.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement both layers of the rule. <code>Eval</code> is the ' +
			'two-variable interpreter: run <code>assign</code>/<code>mutate</code> ' +
			'ops over variables <code>a</code> and <code>b</code> under struct or ' +
			'class semantics and report the final observed values. Then the CoW ' +
			'engine over a <code>World</code> of buffers: <code>Assign</code> ' +
			'shares a buffer, <code>Mutate</code> performs the uniqueness check ' +
			'(copying to a fresh buffer id only when shared), and ' +
			'<code>Unique</code> is <code>isKnownUniquelyReferenced</code> ' +
			'itself.</p>' +
			'<div class="tip">A disclosure about the model: our refcount counts ' +
			'<em>variables</em> holding a buffer, while real ARC counts every ' +
			'strong reference from anywhere (closures, other objects, the ' +
			'autorelease pool — which is why <code>isKnownUniquelyReferenced</code> ' +
			'can conservatively answer false and cause a spurious copy). The ' +
			'fork-on-first-write logic you implement is exactly the stdlib\'s, ' +
			'though; only the counting is simplified.</div>',
		],

		starter: [
			'package main',
			'',
			'// ---- Part 1: the two assignment semantics, as an interpreter ----',
			'',
			'// Op is one line of a tiny two-variable Swift program over `a` and',
			'// `b`, each holding a one-field value (modeled as a bare int).',
			'//',
			'//	{Kind: "assign", Var: "b", Src: "a"}  ->  b = a',
			'//	{Kind: "mutate", Var: "a", Val: 99}   ->  a.x = 99',
			'type Op struct {',
			'	Kind string // "assign" | "mutate"',
			'	Var  string // the variable written',
			'	Src  string // assign only: the variable read',
			'	Val  int    // mutate only: the new field value',
			'}',
			'',
			'// Eval runs ops and returns the FINAL observed values of a then b.',
			'// Both variables start holding the value `initial` independently.',
			'//',
			'// isClass selects the semantics:',
			'//   - struct (false): assign copies the VALUE — afterwards the two',
			'//     variables have no relationship; mutation touches only Var.',
			'//   - class (true): assign copies the REFERENCE — both names point',
			'//     at one instance; mutation through either is visible via both.',
			'//',
			'// Hint: model storage as cells. Struct assign copies cell contents;',
			'// class assign re-points the variable at the source\'s cell.',
			'func Eval(isClass bool, initial int, ops []Op) (int, int) {',
			'	// your code here',
			'	return 0, 0',
			'}',
			'',
			'// ---- Part 2: Array\'s copy-on-write, buffers made visible ----',
			'',
			'// World models Swift array storage: which heap buffer each variable',
			'// points at, and how many variables hold each buffer. Buffer ids are',
			'// allocation order (1, 2, 3, ...) so every run is deterministic.',
			'type World struct {',
			'	BufferOf map[string]int // variable name -> buffer id',
			'	Refs     map[int]int    // buffer id -> variables holding it',
			'	NextID   int            // next fresh buffer id',
			'	Copies   int            // CoW copies performed so far',
			'}',
			'',
			'// NewWorld and Declare are given: Declare is `var xs = [...]` — a',
			'// fresh, uniquely-held buffer.',
			'func NewWorld() *World {',
			'	return &World{BufferOf: map[string]int{}, Refs: map[int]int{}, NextID: 1}',
			'}',
			'',
			'func Declare(w *World, name string) {',
			'	w.BufferOf[name] = w.NextID',
			'	w.Refs[w.NextID] = 1',
			'	w.NextID++',
			'}',
			'',
			'// Assign is `var dst = src` for arrays: O(1) — dst SHARES src\'s',
			'// buffer (bump its ref). If dst previously held a buffer, release',
			'// that one first (drop its ref).',
			'func Assign(w *World, dst, src string) {',
			'	// your code here',
			'}',
			'',
			'// Mutate is xs.append(...) / xs[i] = v: the stdlib\'s check, written',
			'// out. If Var\'s buffer is uniquely held, write in place — no copy,',
			'// return false. If it is shared: peel Var off onto a fresh buffer id',
			'// (release the old, count the copy), return true. The OTHER holders',
			'// keep the old buffer — their ids never move.',
			'func Mutate(w *World, name string) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// Unique is isKnownUniquelyReferenced: is name\'s buffer held by',
			'// exactly one variable?',
			'func Unique(w *World, name string) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// The prose program: b = a, then mutate a. Run under both',
			'	// semantics — same ops, different world.',
			'	prog := []Op{',
			'		{Kind: "assign", Var: "b", Src: "a"},',
			'		{Kind: "mutate", Var: "a", Val: 99},',
			'	}',
			'	evalStr := func(isClass bool, initial int, ops []Op) string {',
			'		a, b := Eval(isClass, initial, ops)',
			'		return fmt.Sprintf("a=%d b=%d", a, b)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"struct: b = a copies — mutating a afterwards leaves b at the old value (the 99/10 print)",',
			'			"a=99 b=10",',
			'			func() string { return evalStr(false, 10, prog) }},',
			'		{"class: b = a shares — the SAME ops now show the mutation through both names (the 99/99 print)",',
			'			"a=99 b=99",',
			'			func() string { return evalStr(true, 10, prog) }},',
			'		{"struct: mutation through b is just as private — a keeps its value",',
			'			"a=10 b=99",',
			'			func() string {',
			'				return evalStr(false, 10, []Op{{Kind: "assign", Var: "b", Src: "a"}, {Kind: "mutate", Var: "b", Val: 99}})',
			'			}},',
			'		{"structs copy at ASSIGNMENT time, not mutation time: mutate a first, then b = a — the copy carries 99",',
			'			"a=99 b=99",',
			'			func() string {',
			'				return evalStr(false, 10, []Op{{Kind: "mutate", Var: "a", Val: 99}, {Kind: "assign", Var: "b", Src: "a"}})',
			'			}},',
			'		{"class: mutate through b, read through a — one instance, two names",',
			'			"a=7 b=7",',
			'			func() string {',
			'				return evalStr(true, 10, []Op{{Kind: "assign", Var: "b", Src: "a"}, {Kind: "mutate", Var: "b", Val: 7}})',
			'			}},',
			'		{"CoW assign is O(1) sharing: ys = xs leaves BOTH on buffer #1, and neither is uniquely referenced",',
			'			"xs=#1 ys=#1 unique=false",',
			'			func() string {',
			'				w := NewWorld()',
			'				Declare(w, "xs")',
			'				Assign(w, "ys", "xs")',
			'				return fmt.Sprintf("xs=#%d ys=#%d unique=%v", w.BufferOf["xs"], w.BufferOf["ys"], Unique(w, "xs"))',
			'			}},',
			'		{"first mutation through a SHARED buffer copies: xs forks to #2, ys stays on #1 — its id never moves",',
			'			"copied=true xs=#2 ys=#1",',
			'			func() string {',
			'				w := NewWorld()',
			'				Declare(w, "xs")',
			'				Assign(w, "ys", "xs")',
			'				copied := Mutate(w, "xs")',
			'				return fmt.Sprintf("copied=%v xs=#%d ys=#%d", copied, w.BufferOf["xs"], w.BufferOf["ys"])',
			'			}},',
			'		{"the copy happens EXACTLY once: after the fork both sides are unique, and the next write is free",',
			'			"second=false xs=#2 unique=true copies=1",',
			'			func() string {',
			'				w := NewWorld()',
			'				Declare(w, "xs")',
			'				Assign(w, "ys", "xs")',
			'				Mutate(w, "xs")',
			'				second := Mutate(w, "xs")',
			'				return fmt.Sprintf("second=%v xs=#%d unique=%v copies=%d", second, w.BufferOf["xs"], Unique(w, "xs"), w.Copies)',
			'			}},',
			'		{"mutating a UNIQUELY-held buffer never copies: no observer, write in place",',
			'			"copied=false xs=#1 copies=0",',
			'			func() string {',
			'				w := NewWorld()',
			'				Declare(w, "xs")',
			'				copied := Mutate(w, "xs")',
			'				return fmt.Sprintf("copied=%v xs=#%d copies=%d", copied, w.BufferOf["xs"], w.Copies)',
			'			}},',
			'		{"three-way share: a and b each pay for a copy, then c — last one holding #1 — mutates for FREE",',
			'			"a=#2 b=#3 c=#1 cCopied=false copies=2",',
			'			func() string {',
			'				w := NewWorld()',
			'				Declare(w, "a")',
			'				Assign(w, "b", "a")',
			'				Assign(w, "c", "a")',
			'				Mutate(w, "a")',
			'				Mutate(w, "b")',
			'				cCopied := Mutate(w, "c")',
			'				return fmt.Sprintf("a=#%d b=#%d c=#%d cCopied=%v copies=%d",',
			'					w.BufferOf["a"], w.BufferOf["b"], w.BufferOf["c"], cCopied, w.Copies)',
			'			}},',
			'		{"isKnownUniquelyReferenced on a fresh declaration: true — one variable, one buffer",',
			'			"true",',
			'			func() string {',
			'				w := NewWorld()',
			'				Declare(w, "xs")',
			'				return fmt.Sprintf("%v", Unique(w, "xs"))',
			'			}},',
			'		{"re-assignment releases the old buffer: ys = xs then ys = zs leaves xs uniquely held again",',
			'			"xsUnique=true ys=#2",',
			'			func() string {',
			'				w := NewWorld()',
			'				Declare(w, "xs")',
			'				Declare(w, "zs")',
			'				Assign(w, "ys", "xs")',
			'				Assign(w, "ys", "zs")',
			'				return fmt.Sprintf("xsUnique=%v ys=#%d", Unique(w, "xs"), w.BufferOf["ys"])',
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
			'// ---- Part 1: the two assignment semantics, as an interpreter ----',
			'',
			'// Op is one line of a tiny two-variable Swift program over `a` and',
			'// `b`, each holding a one-field value (modeled as a bare int).',
			'type Op struct {',
			'	Kind string // "assign" | "mutate"',
			'	Var  string // the variable written',
			'	Src  string // assign only: the variable read',
			'	Val  int    // mutate only: the new field value',
			'}',
			'',
			'// Eval models both semantics with ONE mechanism: cells. A cell is a',
			'// unit of storage; a variable is a NAME for a cell. The entire',
			'// struct/class difference is what `assign` does to that mapping:',
			'//',
			'//	struct:  copy the cell\'s CONTENTS into the target\'s own cell',
			'//	         (two cells, forever independent)',
			'//	class:   re-point the target NAME at the source\'s cell',
			'//	         (one cell, two names — aliasing)',
			'//',
			'// Mutation is then the same code for both: write the cell the name',
			'// currently designates. Visibility through the other variable falls',
			'// out of whether the names alias — no special casing needed, which',
			'// is the point: sharing IS the semantics, not an optimization.',
			'func Eval(isClass bool, initial int, ops []Op) (int, int) {',
			'	cells := []int{initial, initial} // cell 0: a\'s storage, cell 1: b\'s',
			'	cellOf := map[string]int{"a": 0, "b": 1}',
			'	for _, op := range ops {',
			'		if op.Kind == "assign" {',
			'			if isClass {',
			'				// Reference copy: dst now aliases src\'s instance.',
			'				cellOf[op.Var] = cellOf[op.Src]',
			'			} else {',
			'				// Value copy — and note WHEN: right now, at the',
			'				// assignment. Later mutations of src are invisible to',
			'				// dst; earlier ones are baked into the copy.',
			'				cells[cellOf[op.Var]] = cells[cellOf[op.Src]]',
			'			}',
			'			continue',
			'		}',
			'		// mutate: write whatever cell the name designates today.',
			'		cells[cellOf[op.Var]] = op.Val',
			'	}',
			'	return cells[cellOf["a"]], cells[cellOf["b"]]',
			'}',
			'',
			'// ---- Part 2: Array\'s copy-on-write, buffers made visible ----',
			'',
			'// World models Swift array storage: which heap buffer each variable',
			'// points at, and how many variables hold each buffer.',
			'type World struct {',
			'	BufferOf map[string]int // variable name -> buffer id',
			'	Refs     map[int]int    // buffer id -> variables holding it',
			'	NextID   int            // next fresh buffer id',
			'	Copies   int            // CoW copies performed so far',
			'}',
			'',
			'func NewWorld() *World {',
			'	return &World{BufferOf: map[string]int{}, Refs: map[int]int{}, NextID: 1}',
			'}',
			'',
			'func Declare(w *World, name string) {',
			'	w.BufferOf[name] = w.NextID',
			'	w.Refs[w.NextID] = 1',
			'	w.NextID++',
			'}',
			'',
			'// Assign is the O(1) half of CoW: no elements move, only refcounts.',
			'// Releasing dst\'s previous buffer first matters — without it, a',
			'// re-assigned variable would keep phantom shares alive and force',
			'// copies that real Swift never performs (see the re-assignment case:',
			'// xs must become uniquely held again once ys moves away).',
			'func Assign(w *World, dst, src string) {',
			'	if old, held := w.BufferOf[dst]; held {',
			'		w.Refs[old]--',
			'	}',
			'	id := w.BufferOf[src]',
			'	w.BufferOf[dst] = id',
			'	w.Refs[id]++',
			'}',
			'',
			'// Mutate is the stdlib\'s pre-write check, written out:',
			'//',
			'//	if !isKnownUniquelyReferenced(&buffer) { buffer = buffer.copy() }',
			'//	buffer.write(...)',
			'//',
			'// The WRITER pays for the copy and moves to the fresh buffer; every',
			'// other holder keeps the old one untouched — which is why ys\'s id',
			'// never changes when xs mutates. After one fork both sides are',
			'// uniquely held, so the copy can only ever happen once per share.',
			'func Mutate(w *World, name string) bool {',
			'	id := w.BufferOf[name]',
			'	if w.Refs[id] == 1 {',
			'		// Unique: write in place. This is the common case, and it is',
			'		// why value semantics stays affordable — an array that is',
			'		// never shared never copies.',
			'		return false',
			'	}',
			'	// Shared: peel this variable off onto a fresh buffer, THEN write.',
			'	w.Refs[id]--',
			'	fresh := w.NextID',
			'	w.NextID++',
			'	w.Refs[fresh] = 1',
			'	w.BufferOf[name] = fresh',
			'	w.Copies++',
			'	return true',
			'}',
			'',
			'// Unique is isKnownUniquelyReferenced: refcount exactly 1. The real',
			'// function inspects the buffer object\'s ARC count (and answers',
			'// conservatively — a false negative only costs a spurious copy,',
			'// never a shared write, so the design errs toward copying).',
			'func Unique(w *World, name string) bool {',
			'	return w.Refs[w.BufferOf[name]] == 1',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why Swift bet the platform on value types</h3>' +
			'<p>Every Swift API design guide says “prefer structs,” and the reason ' +
			'is the code-review argument from the intro: with a struct, ' +
			'<strong>whoever holds a copy holds the only copy</strong>. No other ' +
			'screen, closure, or thread can mutate it behind your back, so you can ' +
			'reason about a value by reading the function it sits in — Swift\'s ' +
			'answer to shared mutable state, and the foundation SwiftUI builds on ' +
			'(a view\'s state is a value; changing it <em>provably</em> changes ' +
			'only that view\'s copy). Classes remain the tool for identity — one ' +
			'network client, one database connection — where “two names, one ' +
			'instance” is the feature, not the bug.</p>' +
			'<h3>What the model simplifies</h3>' +
			'<ul>' +
			'<li><strong>CoW is a library pattern, not a language feature.</strong> ' +
			'Only <code>Array</code>, <code>Dictionary</code>, <code>Set</code>, ' +
			'<code>String</code> (and types that opt in by hand) defer their ' +
			'copies. A struct <em>you</em> write copies eagerly at assignment — ' +
			'though shallowly: a class reference stored inside a struct copies as ' +
			'a reference, quietly reintroducing sharing one field down. That ' +
			'hybrid is the second-most-common “struct bug” after the intro\'s.</li>' +
			'<li><strong>Our refcount counts variables.</strong> Real ' +
			'<code>isKnownUniquelyReferenced</code> reads the buffer\'s ARC count, ' +
			'which any strong reference bumps. The famous consequence: a struct ' +
			'method that touches its own buffer through a second reference can ' +
			'trigger copies on every write. The classic performance bug is exactly ' +
			'that shape — mutate an array in a loop while something else holds it, ' +
			'and each iteration re-shares then re-copies: O(n) writes become ' +
			'O(n²) bytes moved. Instruments shows it as malloc traffic; the fix is ' +
			'to break the share before the loop.</li>' +
			'<li><strong><code>mutating func</code> is the compiler\'s ledger.</strong> ' +
			'A struct method that writes <code>self</code> must be marked ' +
			'<code>mutating</code> — that is how the compiler knows to forbid it ' +
			'on a <code>let</code>, and how the stdlib knows where to place the ' +
			'uniqueness check you implemented.</li>' +
			'</ul>' +
			'<h3>The Go lens</h3>' +
			'<p>Go has the same two semantics wearing different clothes: a Go ' +
			'struct assigns by copy (Swift struct), a pointer or any ' +
			'reference-shaped header shares (Swift class), and a Go slice is the ' +
			'cautionary middle — <code>ys := xs</code> shares the backing array ' +
			'like Swift, but Go has <em>no</em> copy-on-write, so ' +
			'<code>xs[0] = 9</code> is visible through <code>ys</code>, and an ' +
			'<code>append</code> may or may not fork the buffer depending on ' +
			'capacity. Swift\'s CoW is precisely the machinery that turns Go\'s ' +
			'“it depends” into a guarantee: observed value semantics, always, with ' +
			'the copy deferred until someone actually writes while someone else ' +
			'watches.</p>',
		],
		complexity: { time: 'O(n) over the op list — each op is O(1) map work; a real CoW fork costs O(elements), which is the entire point of deferring it', space: 'O(v + b) for the variable and buffer tables' },
	});
})();
