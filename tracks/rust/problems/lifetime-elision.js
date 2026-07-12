/* Lifetime Elision — Borrowing (Easy). Why most Rust functions never write
 * <'a> and some cannot avoid it: the three elision rules, implemented as the
 * decision procedure rustc runs over every fn signature before asking you
 * for annotations. Small rule set, outsized payoff for reading real code.
 */
(function () {
	'use strict';
	var T = GoLearnRust;

	// The three rules as a decision ladder, ending in E0106.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 210" width="540" height="210" role="img" aria-label="elision decision ladder: no output ref, then self, then single input, else E0106">' +
		'<text x="20" y="24" class="lbl">does the returned reference get a lifetime without annotations?</text>' +
		'<rect x="30" y="40" width="230" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="145" y="62" text-anchor="middle">no &amp;-return → nothing to elide</text>' +
		'<rect x="30" y="84" width="230" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="145" y="106" text-anchor="middle">&amp;self? → output borrows self</text>' +
		'<rect x="30" y="128" width="230" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="145" y="150" text-anchor="middle">one input ref? → borrows it</text>' +
		'<rect x="30" y="172" width="230" height="34" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="145" y="194" text-anchor="middle" style="fill:var(--err-fg)">else E0106: write &lt;\'a&gt;</text>' +
		'<text x="290" y="62" class="lbl">fn len(s: &amp;str) -&gt; usize</text>' +
		'<text x="290" y="106" class="lbl">fn get(&amp;self, k: &amp;str) -&gt; &amp;V</text>' +
		'<text x="290" y="150" class="lbl">fn first_word(s: &amp;str) -&gt; &amp;str</text>' +
		'<text x="290" y="194" class="lbl">fn longest(a: &amp;str, b: &amp;str) -&gt; &amp;str</text>' +
		'</svg>';

	T.problem({
		id: 'lifetime-elision',
		title: 'Lifetime Elision',
		nav: 'lifetime elision',
		difficulty: 'Easy',
		category: 'Borrowing',
		task: 'Implement Elide — decide where a returned reference borrows from, or that the signature needs an explicit lifetime. All 7 tests.',

		prose: [
			'<h2>Lifetime Elision</h2>' +
			'<p>A returned reference must borrow from <em>something that outlives the ' +
			'call</em> — Go’s escape analysis quietly heap-allocates in this situation; ' +
			'Rust instead tracks, in the type system, which input the output borrows ' +
			'from. That link is a <strong>lifetime</strong>, and written out it looks ' +
			'like this:</p>',
			{ lang: 'rust', code: 'fn first_word<\'a>(s: &\'a str) -> &\'a str   // output borrows from s' },
			'<p>Yet almost no real signatures write <code>&lt;\'a&gt;</code>, because ' +
			'when the answer is unambiguous the compiler fills it in. The ' +
			'<strong>elision rules</strong>, applied in order:</p>' +
			'<ul>' +
			'<li><strong>Rule 1</strong> — every input reference gets its own fresh ' +
			'lifetime. (This is why the question is only ever about the output.)</li>' +
			'<li><strong>Rule 2</strong> — if there is exactly <em>one</em> input ' +
			'lifetime, the output gets it: the return can only borrow from that one ' +
			'place.</li>' +
			'<li><strong>Rule 3</strong> — if one input is <code>&amp;self</code> or ' +
			'<code>&amp;mut self</code>, the output gets <em>self’s</em> lifetime, even ' +
			'when other reference parameters exist. Getters return views into the ' +
			'struct; the rules bet on the overwhelmingly common case.</li>' +
			'</ul>' +
			'<p>When no rule applies — two non-self input references, or none at all — ' +
			'the compiler refuses to guess:</p>',
			{ lang: 'rust', code: 'fn longest(a: &str, b: &str) -> &str      // error[E0106]: missing lifetime\n                                          //   specifier — borrows a or b?\nfn longest<\'a>(a: &\'a str, b: &\'a str) -> &\'a str   // you decide: either' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Elide(sig)</code> over a signature summary, returning ' +
			'where the returned reference gets its lifetime: <code>"no-output"</code> ' +
			'(no reference returned), <code>"from-self"</code>, ' +
			'<code>"from-input"</code>, or <code>"error"</code> (E0106 — explicit ' +
			'annotation required).</p>',
			{ code: 'fn len(s: &str) -> usize              → "no-output"\nfn first_word(s: &str) -> &str        → "from-input"\nfn get(&self, k: &str) -> &V          → "from-self"   rule 3 beats the tie\nfn longest(a: &str, b: &str) -> &str  → "error"       E0106\nfn make() -> &str                     → "error"       nothing to borrow from', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Sig summarizes a fn signature the way the elision rules see it:',
			'// how many places could a returned reference borrow from?',
			'type Sig struct {',
			'	HasSelfRef bool // takes &self or &mut self',
			'	InputRefs  int  // reference parameters, NOT counting self',
			'	ReturnsRef bool // returns a reference',
			'}',
			'',
			'// Elide returns where the output reference gets its lifetime:',
			'//   "no-output"  — no reference is returned; nothing to decide',
			'//   "from-self"  — rule 3: &self\'s lifetime flows to the output',
			'//   "from-input" — rule 2: the single input lifetime flows to it',
			'//   "error"      — E0106: ambiguous (or no source at all)',
			'func Elide(s Sig) string {',
			'	// your code here',
			'	return ""',
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
			'	type tc struct {',
			'		name string',
			'		sig  Sig',
			'		want string',
			'	}',
			'	cases := []tc{',
			'		{"fn len(s: &str) -> usize — no reference returned",',
			'			Sig{InputRefs: 1}, "no-output"},',
			'		{"fn first_word(s: &str) -> &str — the single input",',
			'			Sig{InputRefs: 1, ReturnsRef: true}, "from-input"},',
			'		{"fn get(&self, k: &str) -> &V — self wins the tie",',
			'			Sig{HasSelfRef: true, InputRefs: 1, ReturnsRef: true}, "from-self"},',
			'		{"fn name(&self) -> &str — the classic getter",',
			'			Sig{HasSelfRef: true, ReturnsRef: true}, "from-self"},',
			'		{"fn longest(a: &str, b: &str) -> &str — E0106, two candidates",',
			'			Sig{InputRefs: 2, ReturnsRef: true}, "error"},',
			'		{"fn make() -> &str — E0106, zero candidates",',
			'			Sig{ReturnsRef: true}, "error"},',
			'		{"fn eq(&self, other: &Self) -> bool — refs galore, none returned",',
			'			Sig{HasSelfRef: true, InputRefs: 1}, "no-output"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%q", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := Elide(c.sig)',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%q", got)',
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
			'// Sig summarizes a fn signature the way the elision rules see it:',
			'// how many places could a returned reference borrow from?',
			'type Sig struct {',
			'	HasSelfRef bool // takes &self or &mut self',
			'	InputRefs  int  // reference parameters, NOT counting self',
			'	ReturnsRef bool // returns a reference',
			'}',
			'',
			'// Elide returns where the output reference gets its lifetime.',
			'//',
			'// The rules are a priority ladder, so the implementation is a ladder',
			'// too — order is the whole algorithm. Self is checked BEFORE the',
			'// single-input rule: that is rule 3 winning the &self + &str tie,',
			'// not an optimization.',
			'func Elide(s Sig) string {',
			'	// No output reference: rule 1 names the inputs and nothing more',
			'	// is ever asked. This is why most functions never see E0106.',
			'	if !s.ReturnsRef {',
			'		return "no-output"',
			'	}',
			'',
			'	// Rule 3: methods return views into self overwhelmingly often,',
			'	// so &self\'s lifetime claims the output even with other input',
			'	// refs present.',
			'	if s.HasSelfRef {',
			'		return "from-self"',
			'	}',
			'',
			'	// Rule 2: with exactly one candidate there is nothing to guess.',
			'	if s.InputRefs == 1 {',
			'		return "from-input"',
			'	}',
			'',
			'	// Zero candidates (nothing to borrow from) or several (ambiguous):',
			'	// either way the compiler refuses to pick — E0106, annotate.',
			'	return "error"',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>A priority ladder, not a scoring function</h3>' +
			'<p>All the content is in the <em>order</em> of three early returns:</p>',
			{ code: 'if !s.ReturnsRef { return "no-output" }\nif s.HasSelfRef  { return "from-self" }\nif s.InputRefs == 1 { return "from-input" }\nreturn "error"' },
			'<p>Swap the self and single-input checks and <code>fn get(&amp;self, k: ' +
			'&amp;str) -&gt; &amp;V</code> — a map getter, one of the most common method ' +
			'shapes in the language — would come out ambiguous. Rule 3 exists precisely ' +
			'because methods returning views into <code>self</code> dominate real code, ' +
			'and a rule that guesses right almost always beats a rule that never ' +
			'guesses.</p>' +
			'<h3>Elision hides names, not checking</h3>' +
			'<p>An elided signature is <em>exactly</em> as checked as the annotated one — ' +
			'the compiler expands your <code>fn first_word(s: &amp;str) -&gt; ' +
			'&amp;str</code> to the <code>&lt;\'a&gt;</code> form before doing any borrow ' +
			'analysis. So when E0106 finally appears, nothing exotic happened: you wrote ' +
			'the first signature whose borrow structure has more than one reading, and ' +
			'the annotation you add is not ceremony — it is a design decision, recorded ' +
			'in the type, about whose data the return value keeps alive. For ' +
			'<code>longest</code>, tying both inputs to <code>\'a</code> says “the result ' +
			'may borrow from either, so both must outlive it.”</p>' +
			'<h3>The Go contrast</h3>' +
			'<p>Go answers the same question with escape analysis: return a pointer to a ' +
			'local and the local silently moves to the heap for the GC to track. Rust ' +
			'puts the relationship in the signature instead, which is why a Rust function ' +
			'type tells you something a Go one cannot: not just <em>that</em> it returns ' +
			'a reference, but <em>whose memory</em> that reference is a view into.</p>',
		],
		complexity: { time: 'O(1) — three comparisons', space: 'O(1)' },
	});
})();
