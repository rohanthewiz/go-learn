/* Cascades — Values & Functions (lesson). The `..` operator: call a method,
 * keep the RECEIVER as the expression's value. It exists because Dart
 * setters and mutators return void (unlike builder-pattern APIs that return
 * `this` by convention) — the learner implements the desugaring.
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	T.lesson({
		id: 'cascades',
		title: 'Cascades (..)',
		nav: 'cascades ..',
		category: 'Values & Functions',

		prose: [
			'<h2>Cascades: <code>..</code></h2>' +
			'<p>Go builders return the receiver so calls chain — ' +
			'<code>b.Div().Class("x")</code> works because each method hands back ' +
			'<code>b</code> <em>by convention</em>. Dart mutators conventionally return ' +
			'<code>void</code>, so ordinary chaining dies after one call:</p>',
			{ lang: 'dart', code: "final buf = StringBuffer();\nbuf.write('go').write('-');    // error: 'write' isn't defined for 'void'\n                               // (the first .write returned void)" },
			'<p>The cascade operator fixes it in the language instead of in every ' +
			'library: <code>a..m()</code> calls <code>m()</code> and then evaluates to ' +
			'<code>a</code> — whatever <code>m</code> returned is thrown away:</p>',
			{ lang: 'dart', code: "final buf = StringBuffer()\n  ..write('go')\n  ..write('-')\n  ..write('learn');   // the whole expression is buf itself\nprint(buf);           // go-learn" },
			'<p>This is why Dart APIs never need a builder convention: any object with ' +
			'void setters cascades for free. (<code>?..</code> exists too — a ' +
			'null-aware cascade that skips the whole chain on null.)</p>' +
			'<h3>Your job</h3>' +
			'<p>The Go model gives <code>stringBuffer</code> a <code>write</code> that ' +
			'returns nothing — faithfully void, chaining is impossible. Implement ' +
			'<code>cascade(target, ops)</code>, the desugaring of the ' +
			'<code>..write(op)</code> chain: apply every op to the target, then return ' +
			'<strong>the receiver itself</strong> — not a copy, not nil — so the ' +
			'identity check prints <code>true</code>.</p>',
		],

		task: 'Implement cascade: apply each op via write, then return the receiver itself.',

		starter: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			'type stringBuffer struct{ parts []string }',
			'',
			'// write appends — and returns NOTHING, like Dart\'s void mutators.',
			'// This is exactly why ordinary chaining can\'t work.',
			'func (b *stringBuffer) write(s string) {',
			'	b.parts = append(b.parts, s)',
			'}',
			'',
			'// cascade desugars  target..write(op)..write(op)...  — every op runs',
			'// against the same receiver, and the receiver is the result.',
			'func cascade(target *stringBuffer, ops []string) *stringBuffer {',
			'	// TODO: apply each op with write, then return the receiver.',
			'	return nil',
			'}',
			'',
			'func main() {',
			'	buf := &stringBuffer{}',
			'	got := cascade(buf, []string{"go", "-", "learn"})',
			'',
			'	fmt.Println("contents:", strings.Join(buf.parts, ""))',
			'	// The cascade expression\'s value is the receiver — that identity is',
			'	// the whole operator.',
			'	fmt.Println("cascade returns receiver:", got == buf)',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('contents: go-learn') !== -1 &&
				flat.indexOf('cascade returns receiver: true') !== -1;
		},

		solution: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			'type stringBuffer struct{ parts []string }',
			'',
			'// write appends — and returns NOTHING, like Dart\'s void mutators.',
			'// This is exactly why ordinary chaining can\'t work.',
			'func (b *stringBuffer) write(s string) {',
			'	b.parts = append(b.parts, s)',
			'}',
			'',
			'// cascade desugars  target..write(op)..write(op)...  — every op runs',
			'// against the same receiver, and the receiver is the result. Note the',
			'// return values of the writes are never consulted: a cascade discards',
			'// them, which is what frees mutators to return void.',
			'func cascade(target *stringBuffer, ops []string) *stringBuffer {',
			'	for _, op := range ops {',
			'		target.write(op)',
			'	}',
			'	return target',
			'}',
			'',
			'func main() {',
			'	buf := &stringBuffer{}',
			'	got := cascade(buf, []string{"go", "-", "learn"})',
			'',
			'	fmt.Println("contents:", strings.Join(buf.parts, ""))',
			'	// The cascade expression\'s value is the receiver — that identity is',
			'	// the whole operator.',
			'	fmt.Println("cascade returns receiver:", got == buf)',
			'}',
			'',
		].join('\n'),
	});
})();
