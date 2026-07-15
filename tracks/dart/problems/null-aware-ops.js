/* Null-aware Operators — Null Safety (lesson). The three operators that make
 * String? livable: ?. (nil-safe call), ?? (default), ??= (assign if null).
 * Implemented over Go's closest analogue of T? — a pointer — so the learner
 * sees exactly what each operator compiles down to: one nil check each.
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	T.lesson({
		id: 'null-aware-ops',
		title: 'Null-aware Operators',
		nav: '?. ?? ??=',
		category: 'Null Safety',

		prose: [
			'<h2>Null-aware Operators: <code>?.</code> <code>??</code> <code>??=</code></h2>' +
			'<p>Once <code>String?</code> exists, every use of it needs an answer to ' +
			'"and if it\'s null?". Go answers with an <code>if s != nil</code> block per ' +
			'use site. Dart bakes the three common shapes into operators:</p>',
			{ lang: 'dart', code: "String? name;\n\nname?.length;        // null-safe call: null if name is null\nname ?? 'guest';     // if-null: the value, or the default\nname ??= 'anon';     // assign only if currently null" },
			'<p><code>?.</code> short-circuits the whole chain — ' +
			'<code>user?.address?.city</code> is null if <em>any</em> link is null, ' +
			'which in Go is three nested nil checks. <code>??</code> is Go\'s ' +
			'"<code>if v == nil { v = dflt }</code>" as an expression. <code>??=</code> ' +
			'is the lazy-initialization idiom.</p>' +
			'<h3>Your job</h3>' +
			'<p>The program models <code>String?</code> as <code>*string</code> and ' +
			'replays the operators on two variables: <code>name</code> (null) and ' +
			'<code>title</code> (set to <code>"hello"</code>). <code>qLength</code> ' +
			'(<code>?.length</code>) is done — implement <code>orElse</code> ' +
			'(<code>??</code>) and <code>coalesceAssign</code> (<code>??=</code>) so ' +
			'both variables report the right values: defaults kick in only when the ' +
			'pointer is nil.</p>' +
			'<div class="tip">Note what <code>??=</code> must NOT do: overwrite a ' +
			'non-null value. <code>title ??= \'anon\'</code> leaves ' +
			'<code>"hello"</code> alone — that is the difference between "default" and ' +
			'"reset".</div>',
		],

		task: 'Implement orElse (??) and coalesceAssign (??=): defaults apply only when the pointer is nil.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// qLength is name?.length — the ?. operator: if the receiver is null,',
			'// the whole expression is null and the method is never called.',
			'func qLength(s *string) *int {',
			'	if s == nil {',
			'		return nil',
			'	}',
			'	n := len(*s)',
			'	return &n',
			'}',
			'',
			'// orElse is name ?? dflt — the if-null operator.',
			'func orElse(s *string, dflt string) string {',
			'	// TODO: the value if non-null, the default otherwise.',
			'	return ""',
			'}',
			'',
			'// coalesceAssign is name ??= dflt — assign only if currently null.',
			'// It returns the (possibly updated) pointer, modeling the assignment.',
			'func coalesceAssign(s *string, dflt string) *string {',
			'	// TODO: keep a non-null value; replace only null.',
			'	return s',
			'}',
			'',
			'// show renders a *string the way Dart prints a String? — value or null.',
			'func show(s *string) string {',
			'	if s == nil {',
			'		return "null"',
			'	}',
			'	return *s',
			'}',
			'',
			'func showInt(n *int) string {',
			'	if n == nil {',
			'		return "null"',
			'	}',
			'	return fmt.Sprint(*n)',
			'}',
			'',
			'func main() {',
			'	var name *string // String? name;      — starts null',
			'	hello := "hello"',
			'	title := &hello  // String? title = \'hello\';',
			'',
			'	fmt.Printf("name?.length -> %s\\n", showInt(qLength(name)))',
			'	fmt.Printf("name ?? guest -> %s\\n", orElse(name, "guest"))',
			'	name = coalesceAssign(name, "anon")',
			'	fmt.Printf("after name ??= anon: %s\\n", show(name))',
			'',
			'	fmt.Printf("title?.length -> %s\\n", showInt(qLength(title)))',
			'	fmt.Printf("title ?? guest -> %s\\n", orElse(title, "guest"))',
			'	title = coalesceAssign(title, "anon")',
			'	fmt.Printf("after title ??= anon: %s\\n", show(title))',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('name ?? guest -> guest') !== -1 &&
				flat.indexOf('after name ??= anon: anon') !== -1 &&
				flat.indexOf('title ?? guest -> hello') !== -1 &&
				flat.indexOf('after title ??= anon: hello') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// qLength is name?.length — the ?. operator: if the receiver is null,',
			'// the whole expression is null and the method is never called.',
			'func qLength(s *string) *int {',
			'	if s == nil {',
			'		return nil',
			'	}',
			'	n := len(*s)',
			'	return &n',
			'}',
			'',
			'// orElse is name ?? dflt — the if-null operator. Exactly the Go idiom',
			'// `if v == nil { v = dflt }`, packaged as an expression so it can sit',
			'// inside a larger one.',
			'func orElse(s *string, dflt string) string {',
			'	if s == nil {',
			'		return dflt',
			'	}',
			'	return *s',
			'}',
			'',
			'// coalesceAssign is name ??= dflt — assign only if currently null.',
			'// The guard is the whole operator: a non-null value must survive,',
			'// or ??= would be plain assignment and lazy init would clobber data.',
			'func coalesceAssign(s *string, dflt string) *string {',
			'	if s != nil {',
			'		return s',
			'	}',
			'	return &dflt',
			'}',
			'',
			'// show renders a *string the way Dart prints a String? — value or null.',
			'func show(s *string) string {',
			'	if s == nil {',
			'		return "null"',
			'	}',
			'	return *s',
			'}',
			'',
			'func showInt(n *int) string {',
			'	if n == nil {',
			'		return "null"',
			'	}',
			'	return fmt.Sprint(*n)',
			'}',
			'',
			'func main() {',
			'	var name *string // String? name;      — starts null',
			'	hello := "hello"',
			'	title := &hello  // String? title = \'hello\';',
			'',
			'	fmt.Printf("name?.length -> %s\\n", showInt(qLength(name)))',
			'	fmt.Printf("name ?? guest -> %s\\n", orElse(name, "guest"))',
			'	name = coalesceAssign(name, "anon")',
			'	fmt.Printf("after name ??= anon: %s\\n", show(name))',
			'',
			'	fmt.Printf("title?.length -> %s\\n", showInt(qLength(title)))',
			'	fmt.Printf("title ?? guest -> %s\\n", orElse(title, "guest"))',
			'	title = coalesceAssign(title, "anon")',
			'	fmt.Printf("after title ??= anon: %s\\n", show(title))',
			'}',
			'',
		].join('\n'),
	});
})();
