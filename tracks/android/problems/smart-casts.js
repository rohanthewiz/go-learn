/* Smart Casts — Kotlin: Types & Null Safety (Medium). After `is` or a null
 * check, Kotlin silently promotes the variable's type — but ONLY when the
 * compiler can prove nothing changed it between the check and the use. That
 * proof is a small decision table over the declaration (val/var/property,
 * custom getter, open, delegated, captured-by-closure), and the learner
 * implements the table, plus the flow-typing rule that decides WHICH type a
 * variable has inside vs after an is-check.
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// The compiler's question, drawn as the decision it actually makes: not
	// "is x a String here?" but "can anything have CHANGED x since the
	// check?". Marker ids namespaced (dgArrowAndSC*) because every track's
	// SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 216" width="560" height="216" role="img" aria-label="smart cast decision: after an is-check the compiler asks whether the value could have changed between check and use; locals it can prove stable get promoted, mutable or overridable properties do not">' +
		'<text x="20" y="24" class="lbl">if (x is String) { x.length } — the compiler\'s real question is about TIME, not type</text>' +
		'<rect x="40" y="40" width="180" height="44" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="130" y="60" text-anchor="middle">x is String</text>' +
		'<text x="130" y="76" text-anchor="middle" class="lbl">the check, at time t0</text>' +
		'<rect x="340" y="40" width="180" height="44" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="430" y="60" text-anchor="middle">x.length</text>' +
		'<text x="430" y="76" text-anchor="middle" class="lbl">the use, at time t1</text>' +
		'<path d="M 220 62 L 336 62" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowAndSCm)"/>' +
		'<text x="278" y="54" text-anchor="middle" class="lbl">could x have changed?</text>' +
		'<path d="M 200 84 C 240 130 320 130 360 84" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAndSCw)"/>' +
		'<text x="280" y="132" text-anchor="middle" class="lbl" style="fill:var(--warn)">another thread? a subclass getter? a lambda that writes x?</text>' +
		'<text x="40" y="168" class="lbl" style="fill:var(--ok)">provably stable (local val, un-captured var): PROMOTED — x : String, no cast emitted</text>' +
		'<text x="40" y="192" class="lbl" style="fill:var(--warn)">any gap in the proof (var property, open, custom getter): NOT promoted — compile error</text>' +
		'<defs>' +
		'<marker id="dgArrowAndSCm" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker>' +
		'<marker id="dgArrowAndSCw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'smart-casts',
		title: 'Smart Casts: Flow Typing as a Decision Table',
		nav: 'smart casts',
		difficulty: 'Medium',
		category: 'Kotlin: Types & Null Safety',
		task: 'Implement CanSmartCast — the compiler\'s ordered decision table over a declaration\'s mutability facts — and PromotedType, the flow-typing rule for is-checks.',

		prose: [
			'<h2>Smart Casts: Flow Typing as a Decision Table</h2>' +
			'<p>You check the type. You use the value on the very next line. And the ' +
			'compiler still says no:</p>',
			{ lang: 'kotlin', code: 'class Screen {\n    var title: Any = "Feed"          // a var member property\n\n    fun render() {\n        if (title is String) {\n            println(title.length)\n            // error: Smart cast to \'String\' is impossible, because\n            // \'title\' is a mutable property that could have been\n            // changed by this time\n        }\n    }\n}' },
			'<p>The message is precise: the problem is not the check, it is the ' +
			'<em>gap between the check and the use</em>. A <code>var</code> member ' +
			'property can be reassigned by another thread, another method, or a ' +
			'subclass override between those two lines, so the compiler refuses to ' +
			'promote it. A smart cast is a <strong>proof of stability</strong>, not a ' +
			'type test — and the compiler grants it only when the proof is airtight:</p>' +
			'<ul>' +
			'<li><strong>Local <code>val</code></strong> — immutable by construction: ' +
			'promoted, always.</li>' +
			'<li><strong>Local <code>var</code></strong> — promoted too, ' +
			'<em>surprisingly</em>, because flow analysis sees every assignment in ' +
			'the function… unless a lambda in scope writes to it, at which point the ' +
			'compiler no longer knows <em>when</em> those writes run: ' +
			'<code>Smart cast to \'String\' is impossible, because \'x\' is a local ' +
			'variable that is captured by a changing closure</code>.</li>' +
			'<li><strong>Member properties</strong> — the proof needs the whole ' +
			'declaration: a <code>val</code> with a plain backing field promotes; a ' +
			'<code>val</code> with a custom <code>get() = …</code> can return a ' +
			'different value each call, so it does not; an <code>open</code> property ' +
			'can be overridden by a subclass getter; a delegated property ' +
			'(<code>by …</code>) routes reads through arbitrary code; and a ' +
			'<code>var</code> property is the case in the error above — never ' +
			'promoted across statements.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the two halves of the feature over the ' +
			'<code>Ref</code> record in the starter — the facts the compiler knows ' +
			'about a declaration:</p>' +
			'<p><code>CanSmartCast(r Ref) (bool, string)</code> — the decision ' +
			'table, <strong>first match wins</strong>, reason <code>""</code> when ' +
			'promotion is allowed:</p>' +
			'<ul>' +
			'<li><code>val</code> local, no custom getter, not delegated → ' +
			'<code>true</code></li>' +
			'<li><code>var</code> local, not mutated in any lambda → ' +
			'<code>true</code></li>' +
			'<li><code>var</code> local, mutated in a lambda → ' +
			'<code>"captured by a changing closure"</code></li>' +
			'<li>property with a custom getter → <code>"custom getter"</code></li>' +
			'<li>delegated property → <code>"delegated property"</code></li>' +
			'<li>open/overridable property → <code>"open property"</code></li>' +
			'<li><code>var</code> property (plain backing field, final) → ' +
			'<code>"mutable property could have been changed by this time"</code>; ' +
			'a <code>val</code> property that survived every test above → ' +
			'<code>true</code>.</li>' +
			'</ul>' +
			'<p><code>PromotedType(declared, checked, negated, branchTaken)</code> — ' +
			'flow typing for one <code>is</code>-check: inside the taken branch of ' +
			'<code>if (x is String)</code> the type is <code>"String"</code>; in the ' +
			'else branch it stays <code>declared</code>. A negated check flips it: ' +
			'after <code>if (x !is String) return</code> — i.e. on the ' +
			'<em>not-taken</em> path — <code>x</code> is <code>"String"</code>.</p>' +
			'<div class="tip">Order matters and is part of the contract: a property ' +
			'with a custom getter that is <em>also</em> open reports ' +
			'<code>"custom getter"</code> — the compiler reports the first hole in ' +
			'the proof it finds, exactly like a decision table evaluated top to ' +
			'bottom.</div>',
		],

		starter: [
			'package main',
			'',
			'// Ref is what the compiler knows about the declaration behind an',
			'// is-check — the facts the smart-cast proof is built from.',
			'type Ref struct {',
			'	Kind              string // "val" | "var" (locals) | "property" (member)',
			'	Mutable           bool   // property declared var (only meaningful for Kind "property")',
			'	CustomGetter      bool   // property with get() = ...',
			'	OpenOrOverridable bool   // property declared open / in an open class',
			'	MutatedInLambda   bool   // some lambda in scope writes to this local var',
			'	Delegated         bool   // property is `by ...`',
			'}',
			'',
			'// CanSmartCast decides whether a checked Ref may be used at the',
			'// promoted type. First matching rule wins; reason is "" exactly when',
			'// ok is true, otherwise one of the pinned reason strings:',
			'//',
			'//  1. val local, !CustomGetter, !Delegated            -> true, ""',
			'//  2. var local, !MutatedInLambda                     -> true, ""',
			'//  3. var local, MutatedInLambda                      -> false, "captured by a changing closure"',
			'//  4. property, CustomGetter                          -> false, "custom getter"',
			'//  5. property, Delegated                             -> false, "delegated property"',
			'//  6. property, OpenOrOverridable                     -> false, "open property"',
			'//  7. property, Mutable                               -> false, "mutable property could have been changed by this time"',
			'//     property, !Mutable (val, plain backing field)   -> true, ""',
			'func CanSmartCast(r Ref) (bool, string) {',
			'	// your code here',
			'	return false, ""',
			'}',
			'',
			'// PromotedType is flow typing for a single is-check: the type of x',
			'// on a given control-flow path.',
			'//',
			'//   if (x is String)  { <taken> }  else { <not taken> }   // negated=false',
			'//   if (x !is String) { <taken> }  else { <not taken> }   // negated=true',
			'//',
			'// The path where the check PASSED gets the checked type; the other',
			'// path keeps the declared type. (After `if (x !is String) return`,',
			'// straight-line code is the not-taken path — that is how early',
			'// returns promote the rest of the function.)',
			'func PromotedType(declared, checked string, negated bool, branchTaken bool) string {',
			'	// your code here',
			'	return declared',
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
			'	// fmtCast renders both return values so a wrong reason string fails',
			'	// as visibly as a wrong verdict.',
			'	fmtCast := func(r Ref) string {',
			'		okCast, reason := CanSmartCast(r)',
			'		return fmt.Sprintf("%v %q", okCast, reason)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"a plain local val: immutable by construction — promoted, the textbook case",',
			'			"true \\"\\"",',
			'			func() string { return fmtCast(Ref{Kind: "val"}) }},',
			'		{"a local var NO lambda touches: promoted too — flow analysis sees every assignment in the function (the fact that surprises people who think var never smart-casts)",',
			'			"true \\"\\"",',
			'			func() string { return fmtCast(Ref{Kind: "var"}) }},',
			'		{"a local var some lambda writes to: the compiler no longer knows WHEN those writes run",',
			'			"false \\"captured by a changing closure\\"",',
			'			func() string { return fmtCast(Ref{Kind: "var", MutatedInLambda: true}) }},',
			'		{"property with a custom getter: get() may compute a different value every read — a check proves nothing about the next read",',
			'			"false \\"custom getter\\"",',
			'			func() string { return fmtCast(Ref{Kind: "property", CustomGetter: true}) }},',
			'		{"delegated property (by lazy, by Delegates.observable...): every read routes through arbitrary delegate code",',
			'			"false \\"delegated property\\"",',
			'			func() string { return fmtCast(Ref{Kind: "property", Delegated: true}) }},',
			'		{"open property: a subclass may override the getter — the declared type cannot vouch for the dynamic one",',
			'			"false \\"open property\\"",',
			'			func() string { return fmtCast(Ref{Kind: "property", OpenOrOverridable: true}) }},',
			'		{"var member property, plain backing field: Kotlin\'s actual pinned error — even inside one method, another thread could write between check and use",',
			'			"false \\"mutable property could have been changed by this time\\"",',
			'			func() string { return fmtCast(Ref{Kind: "property", Mutable: true}) }},',
			'		{"val member property, plain backing field, final, not delegated: initialized once, readable forever — promoted",',
			'			"true \\"\\"",',
			'			func() string { return fmtCast(Ref{Kind: "property"}) }},',
			'		{"FIRST MATCH WINS: custom getter + open + var reports \\"custom getter\\" — the table is ordered, like the compiler\'s diagnostics",',
			'			"false \\"custom getter\\"",',
			'			func() string {',
			'				return fmtCast(Ref{Kind: "property", CustomGetter: true, OpenOrOverridable: true, Mutable: true})',
			'			}},',
			'		{"if (x is String): inside the taken branch x is String",',
			'			"String",',
			'			func() string { return PromotedType("Any", "String", false, true) }},',
			'		{"if (x is String): in the else branch x stays at its declared type",',
			'			"Any",',
			'			func() string { return PromotedType("Any", "String", false, false) }},',
			'		{"if (x !is String) return: AFTER the check (the not-taken path) x is String — the early-return idiom that types the rest of the function",',
			'			"String",',
			'			func() string { return PromotedType("Any", "String", true, false) }},',
			'		{"if (x !is String): inside the taken branch the check FAILED — x stays declared",',
			'			"Any",',
			'			func() string { return PromotedType("Any", "String", true, true) }},',
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
			'// Ref is what the compiler knows about the declaration behind an',
			'// is-check — the facts the smart-cast proof is built from.',
			'type Ref struct {',
			'	Kind              string // "val" | "var" (locals) | "property" (member)',
			'	Mutable           bool   // property declared var (only meaningful for Kind "property")',
			'	CustomGetter      bool   // property with get() = ...',
			'	OpenOrOverridable bool   // property declared open / in an open class',
			'	MutatedInLambda   bool   // some lambda in scope writes to this local var',
			'	Delegated         bool   // property is `by ...`',
			'}',
			'',
			'// CanSmartCast is the compiler\'s stability proof as an ordered decision',
			'// table. The ORDER is part of the design: each rule is a distinct way',
			'// the value could change (or a read could differ) between check and',
			'// use, tested from strongest guarantee to weakest, and the first hole',
			'// found is the one reported — which is why a custom-getter-and-open',
			'// property errors with "custom getter", not "open property". A cascade',
			'// of ifs rather than a switch, and no named returns: yaegi (the Go',
			'// interpreter running this) leaks named results across calls when a',
			'// return sits inside a switch.',
			'func CanSmartCast(r Ref) (bool, string) {',
			'	// Rules 1-3: locals. Flow analysis sees every assignment inside the',
			'	// function body, so even a var promotes — UNTIL a lambda captures',
			'	// and writes it, because a lambda\'s run time is unknowable (another',
			'	// thread, later, or never).',
			'	if r.Kind == "val" && !r.CustomGetter && !r.Delegated {',
			'		return true, ""',
			'	}',
			'	if r.Kind == "var" && !r.MutatedInLambda {',
			'		return true, ""',
			'	}',
			'	if r.Kind == "var" {',
			'		return false, "captured by a changing closure"',
			'	}',
			'	// Rules 4-7: member properties. The question shifts from "who',
			'	// writes the variable" to "what does a READ even mean" — a custom',
			'	// or overridden getter makes two consecutive reads unrelated, so',
			'	// the check-time value proves nothing about the use-time value.',
			'	if r.CustomGetter {',
			'		return false, "custom getter"',
			'	}',
			'	if r.Delegated {',
			'		return false, "delegated property"',
			'	}',
			'	if r.OpenOrOverridable {',
			'		return false, "open property"',
			'	}',
			'	if r.Mutable {',
			'		// Kotlin\'s real behavior, pinned: a var member NEVER smart-casts',
			'		// across statements — not because this method mutates it, but',
			'		// because the compiler cannot rule out a write from another',
			'		// thread or method between the two lines.',
			'		return false, "mutable property could have been changed by this time"',
			'	}',
			'	// A val property with a plain backing field, final, not delegated:',
			'	// initialized once in the constructor, identical on every read —',
			'	// the proof holds even across statements.',
			'	return true, ""',
			'}',
			'',
			'// PromotedType: one is-check splits control flow into a path where the',
			'// check PASSED and a path where it failed. The passed path gets the',
			'// checked type; the other keeps the declared type. `negated` flips',
			'// which branch is which — so the promoted path is exactly the one',
			'// where negated and branchTaken DISAGREE:',
			'//',
			'//   is,  taken     -> promoted   (if (x is String), then-branch)',
			'//   is,  not taken -> declared   (else-branch)',
			'//   !is, taken     -> declared   (x was NOT a String here)',
			'//   !is, not taken -> promoted   (after `if (x !is String) return`)',
			'func PromotedType(declared, checked string, negated bool, branchTaken bool) string {',
			'	if negated != branchTaken {',
			'		return checked',
			'	}',
			'	return declared',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The rule you now own</h3>' +
			'<p>Smart casts fail for exactly one reason: <strong>the compiler cannot ' +
			'prove the value at the use is the value that was checked</strong>. Every ' +
			'reason string in the table is a different hole in that proof — a closure ' +
			'that writes later, a getter that computes, a subclass that overrides, a ' +
			'delegate that intercepts, a field other threads share. Read the ' +
			'diagnostic as the compiler telling you <em>which</em> hole.</p>' +
			'<h3>How Android developers actually fix it</h3>' +
			'<ul>' +
			'<li><strong>Snapshot into a local val.</strong> The universal fix: ' +
			'<code>val t = title; if (t is String) { t.length }</code>. The copy is ' +
			'rule 1 — always promotable. This is why idiomatic Kotlin is full of ' +
			'one-line locals right before type checks.</li>' +
			'<li><strong><code>?.let { }</code>.</strong> ' +
			'<code>title?.let { it.length }</code> does the same snapshot ' +
			'implicitly: <code>it</code> is a fresh immutable parameter holding the ' +
			'checked value. The idiom from the previous problem is, mechanically, a ' +
			'smart-cast workaround.</li>' +
			'<li><strong><code>when</code> subjects.</strong> ' +
			'<code>when (val s = state) { is Loading -&gt; … }</code> binds and ' +
			'checks in one move — the subject is a local, so every branch gets the ' +
			'promotion. The sealed-hierarchy problem two items from now leans on ' +
			'exactly this.</li>' +
			'</ul>' +
			'<h3>Why this matters beyond the error message</h3>' +
			'<p>The var-property rule is the type system telling you about ' +
			'<em>shared mutable state</em>: the reason <code>title</code> will not ' +
			'promote is the same reason it is a data race waiting to happen — the ' +
			'equivalent Go field is what <code>go test -race</code> flags. Kotlin ' +
			'turns the concurrency smell into a day-one compile error. It is also a ' +
			'favorite interview probe (“why doesn\'t this compile, and why does ' +
			'copying to a val fix it?”), and worth knowing historically: the K2 ' +
			'compiler in Kotlin 2.0 <em>widened</em> the table — promotions now ' +
			'survive into more lambda positions and across ' +
			'<code>&amp;&amp;</code>/<code>||</code> chains — but the member-property ' +
			'rules you implemented are unchanged, because the hole they guard is not ' +
			'in the compiler, it is in the program.</p>' +
			'<p>Note what Go does instead: a type switch ' +
			'(<code>switch v := x.(type)</code>) <em>rebinds</em> <code>v</code> per ' +
			'branch — Go always makes the snapshot copy, so “could it have changed?” ' +
			'never arises. Kotlin lets you skip the copy when the compiler can prove ' +
			'the copy unnecessary; the decision table you wrote is precisely that ' +
			'proof.</p>',
		],
		complexity: { time: 'O(1) — a fixed cascade of boolean tests per query', space: 'O(1)' },
	});
})();
