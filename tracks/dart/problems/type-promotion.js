/* Type Promotion — Null Safety (Medium). Dart's flow analysis: a String?
 * becomes a plain String inside code the compiler can PROVE is null-free —
 * and stops being one the moment that proof dies. The famous asymmetry
 * (locals promote, fields don't) is the test that separates people who use
 * null safety from people who understand it.
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	T.problem({
		id: 'type-promotion',
		title: 'Type Promotion',
		nav: 'type promotion',
		difficulty: 'Medium',
		category: 'Null Safety',
		task: 'Implement PromotionCheck — track the proof: guards and value assignments promote locals, never fields. All 7 tests.',

		prose: [
			'<h2>Type Promotion</h2>' +
			'<p>Null safety would be unbearable if every <code>String?</code> needed ' +
			'<code>!</code> or <code>?.</code> forever. It doesn\'t, because the ' +
			'analyzer runs a <em>flow analysis</em>: after a check that rules null out, ' +
			'the variable\'s type is <strong>promoted</strong> to the non-nullable ' +
			'version for exactly the code the proof covers:</p>',
			{ lang: 'dart', code: "void greet(String? name) {\n  if (name != null) {\n    print(name.length);   // ok — name is promoted to String here\n  }\n  print(name.length);     // error: The property 'length' can't be\n                          // unconditionally accessed because the\n                          // receiver can be 'null'.\n}" },
			'<p>The proof is fragile on purpose. Assigning a possibly-null value ' +
			'<em>demotes</em>; assigning a definite value promotes. And the rule ' +
			'everyone hits within a week: <strong>instance fields never promote</strong>.</p>',
			{ lang: 'dart', code: "class Greeter {\n  String? title;\n  void hello() {\n    if (title != null) {\n      print(title.length);  // STILL an error — title is a field\n    }\n  }\n}" },
			'<p>Why? Between the check and the use, <code>title</code> could change: ' +
			'another method, another isolate\'s copy of your logic, or — the killer — a ' +
			'subclass overriding <code>title</code> as a getter that returns something ' +
			'different every read. The analyzer can only trust what nothing else can ' +
			'touch: locals and parameters. (The idiom: copy the field into a local, ' +
			'<code>final t = title;</code>, and check that.)</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>PromotionCheck(varKind, steps)</code> for one ' +
			'<code>String?</code> variable. Walk the steps and return one verdict per ' +
			'<code>use</code> (<code>x.length</code>): <code>"ok"</code> if the ' +
			'variable is promoted at that point, <code>"error"</code> otherwise.</p>' +
			'<ul>' +
			'<li><code>guard</code> — a passed <code>if (x != null)</code>: promotes, ' +
			'but only when <code>varKind</code> is <code>"local"</code>;</li>' +
			'<li><code>assignValue</code> — <code>x = \'hi\'</code>: promotes ' +
			'(locals only, again);</li>' +
			'<li><code>assignNull</code> — <code>x = null</code>: demotes, always;</li>' +
			'<li><code>use</code> — judge it against the current state.</li>' +
			'</ul>',
		],

		starter: [
			'package main',
			'',
			'// PromotionCheck replays flow analysis for ONE variable of type String?.',
			'//   varKind — "local" (parameters count as locals) or "field"',
			'//   steps   — "guard", "assignValue", "assignNull", "use"',
			'// It returns one verdict per "use" step, in order: "ok" when the',
			'// variable is promoted to String at that point, "error" when it is',
			'// still String? (the analyzer rejects x.length).',
			'func PromotionCheck(varKind string, steps []string) []string {',
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
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		name    string',
			'		varKind string',
			'		steps   []string',
			'		want    []string',
			'	}',
			'	cases := []tc{',
			'		{"bare use of a String? local", "local",',
			'			[]string{"use"}, []string{"error"}},',
			'		{"guard promotes a local", "local",',
			'			[]string{"guard", "use"}, []string{"ok"}},',
			'		{"assigning null demotes", "local",',
			'			[]string{"guard", "assignNull", "use"}, []string{"error"}},',
			'		{"assigning a value promotes without a guard", "local",',
			'			[]string{"assignValue", "use"}, []string{"ok"}},',
			'		{"fields never promote, even guarded", "field",',
			'			[]string{"guard", "use"}, []string{"error"}},',
			'		{"fields never promote, even freshly assigned", "field",',
			'			[]string{"assignValue", "use"}, []string{"error"}},',
			'		{"promotion is a timeline, not a flag you set once", "local",',
			'			[]string{"guard", "use", "assignNull", "use", "assignValue", "use"},',
			'			[]string{"ok", "error", "ok"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%s: %s %v", c.name, c.varKind, c.steps),',
			'			"want":  fmt.Sprint(c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := PromotionCheck(c.varKind, append([]string(nil), c.steps...))',
			'			r["pass"] = fmt.Sprint(got) == fmt.Sprint(c.want)',
			'			r["got"] = fmt.Sprint(got)',
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
			'// PromotionCheck replays flow analysis for ONE variable of type String?,',
			'// returning a verdict per "use".',
			'//',
			'// The entire analysis is one boolean — "is the variable currently',
			'// proven non-null?" — plus the field rule. Guards and definite',
			'// assignments create the proof, but only for locals: a field\'s value',
			'// can change between the check and the use (an override, another',
			'// method, a getter), so the analyzer refuses to carry the proof.',
			'// Assigning null kills the proof for everyone.',
			'func PromotionCheck(varKind string, steps []string) []string {',
			'	verdicts := []string{}',
			'	promoted := false',
			'	for _, s := range steps {',
			'		switch s {',
			'		case "guard", "assignValue":',
			'			// Both create the same proof, and the same caveat',
			'			// gates both: only storage nothing else can touch',
			'			// keeps a proof alive.',
			'			promoted = varKind == "local"',
			'		case "assignNull":',
			'			promoted = false',
			'		case "use":',
			'			if promoted {',
			'				verdicts = append(verdicts, "ok")',
			'			} else {',
			'				verdicts = append(verdicts, "error")',
			'			}',
			'		}',
			'	}',
			'	return verdicts',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Promotion is a timeline</h3>' +
			'<p>The last test is the one that matters: <code>guard, use, assignNull, ' +
			'use, assignValue, use</code> → <code>ok, error, ok</code>. The proof is ' +
			'not a property of the variable, it is a property of a <em>point in the ' +
			'flow graph</em> — every assignment re-decides it. That is why the ' +
			'implementation is a running boolean updated in step order, not a lookup ' +
			'computed once.</p>' +
			'<h3>Why fields refuse the proof</h3>' +
			'<p>The check and the use are two reads. For a local, the language ' +
			'guarantees both reads see the same value — nothing else can write it. For ' +
			'a field, <code>title</code> might be an overridden getter, or mutated by a ' +
			'callback between the two reads. Rather than promote unsoundly (and make ' +
			'"sound null safety" a lie), Dart refuses — and pushes you to the idiom ' +
			'that IS sound:</p>',
			{ lang: 'dart', code: "final t = title;      // one read into a local\nif (t != null) {\n  print(t.length);    // promotes: t can't change under you\n}" },
			'<p>Since Dart 3.2 there is one carve-out: <code>private final</code> ' +
			'fields promote, because the compiler can see every read and write in the ' +
			'library and <code>final</code> rules out the writes. The exception proves ' +
			'the rule — promotion happens exactly where the analyzer can enumerate all ' +
			'writers.</p>' +
			'<h3>The escape hatch, priced</h3>' +
			'<p>When you know better than the analyzer, <code>title!.length</code> ' +
			'asserts non-null — and moves the failure to runtime as a thrown error, ' +
			'exactly the panic Go would have given you for free. Every <code>!</code> ' +
			'is a small IOU written against your own certainty; the promotion rules ' +
			'above are how you avoid writing them.</p>',
		],
		complexity: { time: 'O(n) — one pass over the steps', space: 'O(1) beyond the verdicts' },
	});
})();
