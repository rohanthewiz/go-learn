/* Nil Maps & Zero Values — Gotchas (lesson). Go's zero values are usable
 * more often than not — nil slices append fine, nil maps READ fine — which
 * is exactly why the one asymmetry (a nil map panics on WRITE) blindsides
 * people: everything works until the first insert. The typed-nil interface
 * gotcha is covered in prose as a "try this in compiled Go" aside, because
 * the sandbox interpreter does not reproduce it faithfully (probed: a
 * typed nil returned through an interface compares == nil here).
 */
(function () {
	'use strict';
	var T = GoLearnGoBasics;

	// The asymmetry in one picture: nil map, read side ok, write side panics.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 180" width="540" height="180" role="img" aria-label="a nil map: reads return the zero value and len works, but any write panics">' +
		'<text x="20" y="24" class="lbl">var m map[string]int — nil: half the API works, the other half panics</text>' +
		'<rect x="210" y="60" width="120" height="44" rx="6" fill="none" stroke="var(--edge)" stroke-width="2" stroke-dasharray="6 4"/>' +
		'<text x="270" y="82" text-anchor="middle">m</text>' +
		'<text x="270" y="97" text-anchor="middle" class="lbl">nil — no table</text>' +
		'<path d="M 206 82 L 130 82" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowGBNZ)"/>' +
		'<text x="118" y="66" text-anchor="end" class="lbl" style="fill:var(--ok)">m["k"] → 0</text>' +
		'<text x="118" y="84" text-anchor="end" class="lbl" style="fill:var(--ok)">len(m) → 0</text>' +
		'<text x="118" y="102" text-anchor="end" class="lbl" style="fill:var(--ok)">range m → 0 laps</text>' +
		'<path d="M 334 82 L 410 82" stroke="var(--err-edge)" stroke-width="2" marker-end="url(#dgArrowGBNZe)"/>' +
		'<text x="420" y="78" class="lbl" style="fill:var(--err-fg)">m["k"] = 1</text>' +
		'<text x="420" y="96" class="lbl" style="fill:var(--err-fg)">panic!</text>' +
		'<text x="270" y="150" text-anchor="middle" class="lbl">make(map[string]int) or map[string]int{} allocates the table — then writes work</text>' +
		'<defs>' +
		'<marker id="dgArrowGBNZ" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowGBNZe" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'nil-zero-values',
		title: 'Nil Maps & Zero Values',
		nav: 'nil maps & zero values',
		category: 'Gotchas',

		prose: [
			'<h2>Nil Maps &amp; Zero Values</h2>' +
			'<p>Every Go declaration initializes: numbers to 0, strings to ' +
			'<code>""</code>, booleans to <code>false</code>, and pointers, slices, ' +
			'maps, channels, interfaces and functions to <code>nil</code>. The design ' +
			'goal is that zero values be <em>useful</em> — and mostly they are. A nil ' +
			'slice is a perfectly good empty list:</p>',
			{ code: 'var s []int          // nil\ns = append(s, 1)     // fine! append allocates on first growth\nfmt.Println(len(s))  // 1' },
			'<p>Maps look symmetrical and are not. A nil map behaves like an empty map ' +
			'for every <em>read</em>: indexing yields the zero value, ' +
			'<code>len</code> is 0, <code>range</code> makes zero passes. But the ' +
			'first <em>write</em> panics — there is no hash table to insert into, and ' +
			'unlike <code>append</code>, map assignment cannot reallocate, because ' +
			'nobody would receive the new map (<code>m[k] = v</code> returns ' +
			'nothing).</p>',
			{ code: 'var m map[string]int\nfmt.Println(m["go"], len(m)) // 0 0 — reads are safe\nm["go"] = 1                  // panic: assignment to entry in nil map' },
			DIAGRAM +
			'<p>The trap in the wild is rarely a bare <code>var</code> — it is structs ' +
			'and JSON: <code>var cfg Config</code> or an unmarshal into a struct gives ' +
			'every map field nil, and code that only ever <em>read</em> those maps ' +
			'works for months until something finally writes. Hence the idiom: types ' +
			'with map fields get a constructor (<code>NewCounter</code> in the mutex ' +
			'problem did exactly this), and functions that fill a map ' +
			'<code>make</code> it up front.</p>' +
			'<h3>Your job</h3>' +
			'<p>The program below only reads, so it runs — and counts nothing. ' +
			'Initialize the map and count the words. (Try running it with the write ' +
			'uncommented first, to meet the panic in person.)</p>',
		],
		task: 'Initialize the map, count the words, and print exactly: go=2 fun=1',
		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	var counts map[string]int // nil: fine to read, fatal to write',
			'',
			'	words := []string{"go", "fun", "go"}',
			'',
			'	// reads on a nil map are safe — this line works:',
			'	fmt.Println("before:", counts["go"], len(counts))',
			'',
			'	// but counting requires WRITES. Uncomment to see the panic:',
			'	// counts["go"]++',
			'',
			'	// initialize counts, then count each word in words',
			'',
			'	fmt.Printf("go=%d fun=%d\\n", counts["go"], counts["fun"])',
			'}',
			'',
		].join('\n'),
		check: function (stdout, flat) { return flat.indexOf('go=2 fun=1') !== -1; },
		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	// make (or a map literal) allocates the hash table the zero value',
			'	// lacks. From here on, writes are legal.',
			'	counts := make(map[string]int)',
			'',
			'	words := []string{"go", "fun", "go"}',
			'',
			'	fmt.Println("before:", counts["go"], len(counts))',
			'',
			'	for _, w := range words {',
			'		counts[w]++ // read-modify-write: needs a real table',
			'	}',
			'',
			'	fmt.Printf("go=%d fun=%d\\n", counts["go"], counts["fun"])',
			'}',
			'',
		].join('\n'),
		explanation: [
			'<h3>Why slices and maps differ</h3>' +
			'<p>Not an accident of history — a consequence of calling convention. ' +
			'<code>append</code> returns the (possibly reallocated) slice, so it can ' +
			'swap a nil slice for a real one and hand it back; that is why you always ' +
			'write <code>s = append(s, …)</code>. Map assignment is a statement with ' +
			'no return value — if it allocated a table, the new map could never reach ' +
			'the variable. Same logic covers channels: a <code>make</code>-less ' +
			'channel is nil, and sends and receives on it block forever (which the ' +
			'select item turned into a feature for disabling cases).</p>' +
			'<h3>nil vs empty is observable</h3>' +
			'<p><code>var s []int</code> (nil) and <code>s := []int{}</code> (empty, ' +
			'allocated) behave identically under <code>len</code>, <code>range</code> ' +
			'and <code>append</code> — but <code>encoding/json</code> marshals the ' +
			'first as <code>null</code> and the second as <code>[]</code>. API ' +
			'consumers notice. When a JSON shape matters, choose deliberately.</p>' +
			'<h3>One more nil, for the road</h3>' +
			'<p>The nastiest nil gotcha does not reproduce in this sandbox, so try it ' +
			'in compiled Go: return a nil <code>*MyError</code> from a function whose ' +
			'return type is the <code>error</code> <em>interface</em>, and the caller ' +
			'&rsquo;s <code>err != nil</code> is <strong>true</strong> — an interface ' +
			'holding a nil pointer is not itself nil (it still carries the type). The ' +
			'rule that follows: functions returning <code>error</code> should return ' +
			'the literal <code>nil</code>, never a typed nil pointer variable.</p>',
		],
	});
})();
