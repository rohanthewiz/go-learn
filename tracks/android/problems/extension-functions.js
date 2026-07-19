/* Extension Functions — Kotlin: Functions & Delegation (Medium). The most
 * famous Kotlin interview gotcha: extension functions are resolved STATICALLY
 * on the declared type, while members stay virtual — so `fun Shape.name()` and
 * `fun Circle.name()` can both be in scope and a Circle held in a Shape
 * variable still prints "Shape". The learner implements the resolver: member
 * lookup walks the RUNTIME type chain, extension lookup walks the DECLARED
 * type chain, and a member always shadows a matching extension.
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// Two lookups, two different starting points: the member search follows
	// the object (virtual dispatch), the extension search follows the variable
	// (compile-time). Marker id namespaced (dgArrowAndEF) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 210" width="540" height="210" role="img" aria-label="member lookup follows the runtime type Circle; extension lookup follows the declared type Shape">' +
		'<text x="20" y="24" class="lbl">s.name() where val s: Shape = Circle() — two lookups, two starting points</text>' +
		// call site
		'<rect x="200" y="40" width="150" height="40" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="275" y="65" text-anchor="middle">s.name()</text>' +
		// runtime type (member path)
		'<rect x="40" y="120" width="180" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="130" y="141" text-anchor="middle">Circle (runtime)</text>' +
		'<text x="130" y="157" text-anchor="middle" class="lbl">then up: Circle → Shape</text>' +
		// declared type (extension path)
		'<rect x="330" y="120" width="180" height="44" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="420" y="141" text-anchor="middle">Shape (declared)</text>' +
		'<text x="420" y="157" text-anchor="middle" class="lbl">extensions never look down</text>' +
		'<path d="M 240 84 L 150 116" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowAndEF)"/>' +
		'<text x="150" y="102" text-anchor="middle" class="lbl" style="fill:var(--ok)">1. member? virtual</text>' +
		'<path d="M 310 84 L 400 116" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAndEF)"/>' +
		'<text x="410" y="102" text-anchor="middle" class="lbl" style="fill:var(--warn)">2. extension? static</text>' +
		'<text x="20" y="196" class="lbl">a member on the runtime chain always wins; otherwise the FIRST extension up the declared chain runs</text>' +
		'<defs><marker id="dgArrowAndEF" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'extension-functions',
		title: 'Extension Functions Resolve Statically',
		nav: 'extension functions',
		difficulty: 'Medium',
		category: 'Kotlin: Functions & Delegation',
		task: 'Implement Resolve — members dispatch on the runtime type chain, extensions on the declared type chain, members shadow extensions — plus NullableReceiverCall.',

		prose: [
			'<h2>Extension Functions Resolve Statically</h2>' +
			'<p>A teammate ships a "polymorphic" logger built on extension functions, ' +
			'and QA files a bug: every subtype logs as its base class. The repro is the ' +
			'canonical Kotlin puzzle — it appears in the official docs precisely ' +
			'because everyone falls for it once:</p>',
			{ lang: 'kotlin', code: 'open class Shape\nclass Circle : Shape()\n\nfun Shape.name() = "Shape"\nfun Circle.name() = "Circle"\n\nfun printName(s: Shape) = println(s.name())\n\nfun main() {\n    printName(Circle())   // prints "Shape" — not "Circle"!\n}' },
			'<p>An extension function is not a method injected into the class — it is ' +
			'a plain static function whose first parameter wears receiver syntax. The ' +
			'compiler picks which one to call from the <strong>declared</strong> type ' +
			'at the call site (<code>s: Shape</code>), at compile time. The object\'s ' +
			'actual class never enters into it. Members are the opposite: a real ' +
			'member is virtual, dispatched on the runtime type like any override. And ' +
			'when both could apply, <strong>the member always wins</strong> — an ' +
			'extension can never shadow a member with the same signature (the compiler ' +
			'even warns: <code>Extension is shadowed by a member</code>).</p>' +
			DIAGRAM +
			'<p>One more rule with no Go or Java analogue: an extension declared on a ' +
			'<em>nullable</em> receiver runs even when the receiver is null — inside ' +
			'the body, <code>this</code> simply is null. That is how the stdlib\'s ' +
			'<code>fun CharSequence?.isNullOrEmpty()</code> can be called on a null ' +
			'without any NPE, where a member call on null would have crashed:</p>',
			{ lang: 'kotlin', code: 'fun String?.orUnknown(): String = this ?: "unknown"\n\nval s: String? = null\nprintln(s.orUnknown())   // "unknown" — the extension RAN, this was null\nprintln(s.length)        // compile error; and a member call on null would be an NPE' },
			'<h3>Your job</h3>' +
			'<p>Implement the resolver the compiler runs at each call site. ' +
			'<code>Resolve(classes, members, extensions, staticType, runtimeType, ' +
			'method)</code> returns <code>"member C.m"</code>, ' +
			'<code>"extension C.m"</code>, or <code>"unresolved"</code>, applying the ' +
			'pinned order:</p>' +
			'<ul>' +
			'<li><strong>Members first, virtually:</strong> walk the ' +
			'<em>runtime</em> type up its parent chain; the first class with a real ' +
			'member of that name wins.</li>' +
			'<li><strong>Extensions second, statically:</strong> walk the ' +
			'<em>declared</em> type up its parent chain; the first class with a ' +
			'matching extension in scope wins. The runtime type is never consulted ' +
			'— that is the whole lesson.</li>' +
			'<li>Nothing matched: <code>"unresolved"</code> (a real compile error at ' +
			'the call site).</li>' +
			'</ul>' +
			'<p>Then <code>NullableReceiverCall(recvIsNil)</code>: the extension body ' +
			'runs either way and reports what <code>this</code> was.</p>' +
			'<div class="tip">Go has the same split, spelled differently: methods on a ' +
			'concrete type are resolved statically too (Go has no inheritance to ' +
			'dispatch over), and dynamic dispatch happens only through interfaces. ' +
			'Kotlin extensions are like Go\'s free functions with a receiver-flavored ' +
			'first argument — <code>func Name(s Shape) string</code> — which makes it ' +
			'obvious why overload choice is static.</div>',
		],

		starter: [
			'package main',
			'',
			'// Fn is one extension function in scope: fun <Receiver>.<Name>().',
			'type Fn struct {',
			'	Receiver string',
			'	Name     string',
			'}',
			'',
			'// Resolve decides what s.method() calls, the way the Kotlin compiler',
			'// does at each call site.',
			'//',
			'//   classes:    class name -> parent name ("" marks the root)',
			'//   members:    set of "Class.method" strings that exist as REAL members',
			'//   extensions: extension functions in scope',
			'//   staticType: the DECLARED type of the receiver expression',
			'//   runtimeType: the actual object\'s class',
			'//',
			'// Pinned resolution order:',
			'//   1. members are VIRTUAL: walk runtimeType up its parent chain; the',
			'//      first class with a real member wins -> "member C.method".',
			'//      A member always shadows a matching extension.',
			'//   2. extensions are STATIC: walk staticType up its parent chain; the',
			'//      first class with a matching extension wins -> "extension C.method".',
			'//      runtimeType is IGNORED here — that is the gotcha.',
			'//   3. otherwise "unresolved" (a compile error at the call site).',
			'func Resolve(classes map[string]string, members map[string]bool,',
			'	extensions []Fn, staticType, runtimeType, method string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// NullableReceiverCall models fun String?.orUnknown(): an extension on a',
			'// nullable receiver RUNS even when the receiver is null (this == null',
			'// inside the body — no NPE, unlike a member call).',
			'// Return "extension ran, receiver was null" when recvIsNil,',
			'// else "extension ran, receiver was non-null".',
			'func NullableReceiverCall(recvIsNil bool) string {',
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
			'	// The docs\' hierarchy plus a sibling, shared by every case:',
			'	// Shape is the root; Circle and Square extend it.',
			'	shapes := map[string]string{"Shape": "", "Circle": "Shape", "Square": "Shape"}',
			'	noMembers := map[string]bool{}',
			'	extBoth := []Fn{{"Shape", "name"}, {"Circle", "name"}}',
			'	extShapeOnly := []Fn{{"Shape", "name"}}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"the canonical gotcha: extensions on both Shape and Circle, a Circle held as Shape — the SHAPE extension runs",',
			'			"extension Shape.name",',
			'			func() string {',
			'				return Resolve(shapes, noMembers, extBoth, "Shape", "Circle", "name")',
			'			}},',
			'		{"declare the same object as Circle and the Circle extension wins — resolution follows the variable, not the object",',
			'			"extension Circle.name",',
			'			func() string {',
			'				return Resolve(shapes, noMembers, extBoth, "Circle", "Circle", "name")',
			'			}},',
			'		{"member beats extension: a real member on the runtime type shadows a matching extension on the static type",',
			'			"member Circle.name",',
			'			func() string {',
			'				return Resolve(shapes, map[string]bool{"Circle.name": true}, extShapeOnly, "Shape", "Circle", "name")',
			'			}},',
			'		{"members stay virtual: an inherited member is found by walking the RUNTIME type\'s parent chain up to Shape",',
			'			"member Shape.describe",',
			'			func() string {',
			'				return Resolve(shapes, map[string]bool{"Shape.describe": true}, nil, "Shape", "Circle", "describe")',
			'			}},',
			'		{"extensions inherit statically: only Shape has the extension, the call site declares Circle — walk the declared chain up",',
			'			"extension Shape.name",',
			'			func() string {',
			'				return Resolve(shapes, noMembers, extShapeOnly, "Circle", "Circle", "name")',
			'			}},',
			'		{"an extension on a sibling class never applies: Square.area is not on Circle\'s chain — unresolved, a compile error",',
			'			"unresolved",',
			'			func() string {',
			'				return Resolve(shapes, noMembers, []Fn{{"Square", "area"}}, "Circle", "Circle", "area")',
			'			}},',
			'		{"nullable receiver: an extension on String? runs with this == null — no NPE, the body sees the null",',
			'			"extension ran, receiver was null",',
			'			func() string { return NullableReceiverCall(true) }},',
			'		{"the same extension with a real receiver: same body, non-null this",',
			'			"extension ran, receiver was non-null",',
			'			func() string { return NullableReceiverCall(false) }},',
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
			'// Fn is one extension function in scope: fun <Receiver>.<Name>().',
			'type Fn struct {',
			'	Receiver string',
			'	Name     string',
			'}',
			'',
			'// Resolve mirrors the compiler\'s call-site decision. The two lookups',
			'// are deliberately the SAME walk over DIFFERENT starting points —',
			'// that asymmetry (runtime chain for members, declared chain for',
			'// extensions) is the entire semantics of extension functions.',
			'func Resolve(classes map[string]string, members map[string]bool,',
			'	extensions []Fn, staticType, runtimeType, method string) string {',
			'	// 1. Members are virtual. The JVM dispatches on the object\'s real',
			'	//    class, searching up the inheritance chain exactly like a',
			'	//    vtable would — so we start from runtimeType. A hit here ends',
			'	//    resolution: Kotlin pins "member always wins" so that adding',
			'	//    an extension can never silently change what existing calls do',
			'	//    (and, symmetrically, a library adding a member can only',
			'	//    shadow your extension, never break the call).',
			'	for cls := runtimeType; cls != ""; cls = classes[cls] {',
			'		if members[cls+"."+method] {',
			'			return "member " + cls + "." + method',
			'		}',
			'	}',
			'	// 2. Extensions are static. An extension compiles to a plain',
			'	//    function with the receiver as first parameter, so choosing',
			'	//    one is ordinary overload resolution on the DECLARED type —',
			'	//    finished at compile time, before any object exists. Walking',
			'	//    the declared chain upward models "Circle is-a Shape, so a',
			'	//    Shape extension applies to a Circle variable"; what it never',
			'	//    does is look DOWN at the runtime class.',
			'	for cls := staticType; cls != ""; cls = classes[cls] {',
			'		for _, e := range extensions {',
			'			if e.Receiver == cls && e.Name == method {',
			'				return "extension " + cls + "." + method',
			'			}',
			'		}',
			'	}',
			'	// 3. Nothing on either chain: the call site does not compile.',
			'	return "unresolved"',
			'}',
			'',
			'// NullableReceiverCall models an extension on a nullable receiver.',
			'// Because the "receiver" is really just the first argument of a',
			'// static function, passing null through it is perfectly legal — the',
			'// body executes and sees this == null. A member call, by contrast,',
			'// needs an object to dispatch on, which is why s.length on a null is',
			'// impossible but s.isNullOrEmpty() is idiomatic.',
			'func NullableReceiverCall(recvIsNil bool) string {',
			'	if recvIsNil {',
			'		return "extension ran, receiver was null"',
			'	}',
			'	return "extension ran, receiver was non-null"',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What an extension actually compiles to</h3>' +
			'<p><code>fun Shape.name() = "Shape"</code> becomes, in bytecode, a ' +
			'static method <code>name(Shape $this)</code> on a synthetic ' +
			'<code>FileKt</code> class — call it from Java and that is exactly how ' +
			'you spell it. Once you see that, every rule in this problem falls out: ' +
			'static functions are chosen by overload resolution on declared types, ' +
			'so of course the runtime class is invisible; and a real member occupies ' +
			'the name first, so of course it shadows. The Kotlin compiler even emits ' +
			'a warning — <code>Extension is shadowed by a member</code> — when you ' +
			'write an extension that can never be chosen.</p>' +
			'<h3>Where this bites in real Android code</h3>' +
			'<ul>' +
			'<li><strong>The "polymorphic" extension bug:</strong> a ' +
			'<code>fun View.describe()</code> plus <code>fun Button.describe()</code> ' +
			'in an accessibility helper — every child in a ' +
			'<code>List&lt;View&gt;</code> uses the View version. The fix is to make ' +
			'<code>describe()</code> an open member (virtual) or to branch with ' +
			'<code>when (this)</code> inside one extension.</li>' +
			'<li><strong>Library upgrades that silently change behavior:</strong> if ' +
			'a library adds a member with your extension\'s signature, member-wins ' +
			'means the next compile quietly switches every call site to the member. ' +
			'This is by design (source compatibility for the library) and the reason ' +
			'code reviewers flag extensions whose names mirror likely future API.</li>' +
			'<li><strong>Nullable-receiver extensions are the idiom</strong> behind ' +
			'<code>CharSequence?.isNullOrEmpty()</code> and friends — they are why ' +
			'Kotlin code so rarely writes <code>if (s != null &amp;&amp; ...)</code>. ' +
			'The subtle cost: inside such an extension <code>this</code> is nullable, ' +
			'and after a call to one, smart casts do not learn anything unless the ' +
			'function declares a <code>contract</code> (the stdlib ones do).</li>' +
			'</ul>' +
			'<h3>The Go lens</h3>' +
			'<p>Go made the same choice more bluntly: methods on concrete types are ' +
			'always statically bound, and the only dynamic dispatch is through ' +
			'interface values. A Kotlin extension is morally ' +
			'<code>func Describe(v View) string</code> — nobody expects that free ' +
			'function to notice that <code>v</code> is "really" a Button. Kotlin\'s ' +
			'receiver syntax buys fluent chaining and IDE discoverability, and this ' +
			'gotcha is the price of making a static call look like a virtual one.</p>',
		],
		complexity: { time: 'O(d + d·e) — one walk up each parent chain of depth d, scanning e in-scope extensions', space: 'O(1)' },
	});
})();
