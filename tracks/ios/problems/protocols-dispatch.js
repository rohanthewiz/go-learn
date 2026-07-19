/* Protocols: Witness Tables vs Static Dispatch — Swift: Types & Optionals
 * (Medium). The most famous dispatch gotcha in Swift: a method declared as a
 * protocol REQUIREMENT dispatches dynamically through the witness table (the
 * runtime type wins), while a method that exists ONLY in a protocol extension
 * dispatches statically on the DECLARED type — so the same value can run two
 * different bodies depending on the type of the variable holding it. The
 * learner implements the resolver (Dispatch) and builds the witness table
 * itself (WitnessTable), proving that extension-only methods never get a
 * slot. Pinned: `let a: Flier = Bird()` runs the extension's fly even though
 * Bird defines its own — one requirement line flips it.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// The famous 2x2: what runs depends on BOTH how the method is declared
	// and how the variable is typed. Only one cell surprises anyone — and
	// it is the one QA files the bug about. Ids namespaced (dgIOSPD*)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 232" width="560" height="232" role="img" aria-label="dispatch table: a requirement method runs Bird.fly through either declared type; an extension-only method runs Bird.fly through a Bird variable but the extension body through a Flier variable — the surprising cell">' +
		'<text x="20" y="24" class="lbl">Bird defines fly(); the extension defines fly() too — what runs when you call it?</text>' +
		'<text x="230" y="60" text-anchor="middle" class="lbl">let b = Bird()</text>' +
		'<text x="440" y="60" text-anchor="middle" class="lbl">let a: Flier = Bird()</text>' +
		'<text x="30" y="98" class="lbl">fly() is a requirement</text>' +
		'<rect x="130" y="76" width="200" height="36" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="230" y="99" text-anchor="middle">Bird.fly</text>' +
		'<rect x="340" y="76" width="200" height="36" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="440" y="99" text-anchor="middle">Bird.fly — witness table</text>' +
		'<text x="30" y="154" class="lbl">fly() is extension-only</text>' +
		'<rect x="130" y="132" width="200" height="36" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="230" y="155" text-anchor="middle">Bird.fly</text>' +
		'<rect x="340" y="132" width="200" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="2.4"/>' +
		'<text x="440" y="155" text-anchor="middle" style="fill:var(--warn)">Flier.fly (extension)</text>' +
		'<text x="440" y="192" text-anchor="middle" class="lbl" style="fill:var(--warn)">the gotcha: no witness slot exists, so the call binds to the DECLARED type at compile time</text>' +
		'<text x="20" y="220" class="lbl">requirements get witness-table slots (runtime type wins); extension-only methods are direct calls (variable type wins)</text>' +
		'</svg>';

	T.problem({
		id: 'protocols-dispatch',
		title: 'Protocols: Witness Tables vs Static Dispatch',
		nav: 'protocols dispatch',
		difficulty: 'Medium',
		category: 'Swift: Types & Optionals',
		task: 'Implement Swift\'s method resolver — protocol requirements dispatch via the witness table (runtime type wins), extension-only methods statically on the declared type — plus WitnessTable itself.',

		prose: [
			'<h2>Protocols: Witness Tables vs Static Dispatch</h2>' +
			'<p>QA files a bug: “custom bird animation never plays when the bird ' +
			'is in the flock.” The animation code is right there on ' +
			'<code>Bird</code>. The repro is the canonical Swift puzzle — it shows ' +
			'up in every serious interview loop because everyone falls for it ' +
			'once:</p>',
			{ lang: 'swift', code: 'protocol Flier { }                    // note: fly() is NOT declared here\nextension Flier {\n    func fly() { print("Flier.fly (extension)") }\n}\nstruct Bird: Flier {\n    func fly() { print("Bird.fly") }  // same name — but no relation!\n}\n\nlet b = Bird()\nb.fly()                // Bird.fly\nlet a: Flier = Bird()  // the SAME value, seen through the protocol\na.fly()                // Flier.fly (extension)   <- the bug report' },
			'<p>Now add one line to the protocol and run it again:</p>',
			{ lang: 'swift', code: 'protocol Flier {\n    func fly()         // fly() is now a REQUIREMENT — it gets a witness slot\n}\n// same extension (now a "default implementation"), same Bird\n\nlet a: Flier = Bird()\na.fly()                // Bird.fly — the witness table found Bird\'s body' },
			'<p>Same call site, opposite output. The rule underneath is a clean ' +
			'two-way split:</p>' +
			'<ul>' +
			'<li><strong>A protocol <em>requirement</em> dispatches dynamically.</strong> ' +
			'For every conformance (<code>Bird: Flier</code>) the compiler builds ' +
			'a <em>witness table</em>: one function pointer per requirement, ' +
			'filled with the type\'s own body if it has one, else the extension\'s ' +
			'default. A call through a protocol-typed variable indexes that table ' +
			'at runtime — <strong>the runtime type wins</strong>.</li>' +
			'<li><strong>An <em>extension-only</em> method dispatches statically.</strong> ' +
			'The protocol declared no slot for it, so there is nothing to look up ' +
			'at runtime. The call compiles to a direct call chosen from the ' +
			'<strong>declared</strong> type of the variable — <code>a: Flier</code> ' +
			'means the extension body, period. <code>Bird.fly</code> existing is ' +
			'invisible: it is not an override, just an unrelated method that ' +
			'happens to share a name.</li>' +
			'<li><strong>On a concrete variable, the type\'s own member wins</strong> ' +
			'over an extension method of the same name — which is why ' +
			'<code>b.fly()</code> prints <code>Bird.fly</code> in both listings.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the resolver over the modeled <code>World</code> in the ' +
			'starter. <code>Dispatch(w, declared, runtime, method)</code> returns ' +
			'the body that runs — <code>"Bird.fly"</code> or ' +
			'<code>"Flier.fly (extension)"</code> — or <code>"unresolved"</code> ' +
			'when the declared type has no such member (the real diagnostic: ' +
			'<code>value of type \'any Flier\' has no member \'dive\'</code>). ' +
			'Then <code>WitnessTable(w, typeName)</code>: build the table itself — ' +
			'one entry per <em>requirement</em>, in declaration order, showing ' +
			'which body fills each slot. Extension-only methods must not appear: ' +
			'their absence from this table <em>is</em> the gotcha.</p>' +
			'<div class="tip">A disclosure about the model: real Swift has more ' +
			'rows in this table — classes add vtable dispatch and inheritance, ' +
			'<code>@objc dynamic</code> adds Objective-C message sends, and ' +
			'generic code reaches witnesses through a different path than ' +
			'existentials (<code>some Flier</code> vs <code>any Flier</code>) ' +
			'with identical <em>semantics</em>. The requirement-vs-extension ' +
			'split you implement here is the part that decides what your code ' +
			'prints, and it applies unchanged to all of them.</div>',
		],

		starter: [
			'package main',
			'',
			'// World describes one protocol, its extension, and its conforming',
			'// types — everything the compiler knows when it resolves a call.',
			'type World struct {',
			'	Protocol string          // the protocol\'s name, e.g. "Flier"',
			'	Methods  []string        // every method name in scope, declaration order',
			'	Req      map[string]bool // method -> declared in the protocol BODY (gets a witness slot)',
			'	Ext      map[string]bool // method -> the protocol extension provides a body',
			'	Impl     map[string]bool // "Type.method" -> the conforming type provides its own body',
			'}',
			'',
			'// Dispatch resolves what value.method() runs, the way swiftc does.',
			'//',
			'//	declared: the variable\'s type — the protocol name or a concrete type',
			'//	runtime:  the actual value\'s concrete type',
			'//',
			'// Return "Type.method" for a concrete body, "Protocol.method',
			'// (extension)" for the extension\'s body, or "unresolved" when the',
			'// declared type has no such member (a compile error at the call site).',
			'//',
			'// The pinned rules:',
			'//   - declared is a CONCRETE type: static resolution on it — the',
			'//     type\'s own member first, else the extension body (runtime is',
			'//     ignored; structs have no subclassing).',
			'//   - declared is the PROTOCOL and method is a REQUIREMENT: witness',
			'//     lookup on the RUNTIME type — its own body if present, else the',
			'//     extension default that filled the slot.',
			'//   - declared is the PROTOCOL and method is extension-only: STATIC —',
			'//     the extension body, no matter what runtime is. This is the',
			'//     whole gotcha.',
			'func Dispatch(w World, declared, runtime, method string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// WitnessTable builds typeName\'s table for the protocol: one entry',
			'// per REQUIREMENT, in Methods order, formatted "method: body" where',
			'// body is what Dispatch would find through the protocol (the type\'s',
			'// own implementation, else the extension default). Extension-only',
			'// methods get NO entry — there is no slot to fill, which is exactly',
			'// why they cannot dispatch dynamically.',
			'func WitnessTable(w World, typeName string) []string {',
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
			'	// Listing 1: fly is EXTENSION-ONLY; Bird has a same-named method.',
			'	extOnly := World{',
			'		Protocol: "Flier",',
			'		Methods:  []string{"fly"},',
			'		Req:      map[string]bool{},',
			'		Ext:      map[string]bool{"fly": true},',
			'		Impl:     map[string]bool{"Bird.fly": true},',
			'	}',
			'	// Listing 2: ONE line added — fly is now a requirement with a',
			'	// default. Bird implements it; Penguin conforms without a body.',
			'	reqDefault := World{',
			'		Protocol: "Flier",',
			'		Methods:  []string{"fly"},',
			'		Req:      map[string]bool{"fly": true},',
			'		Ext:      map[string]bool{"fly": true},',
			'		Impl:     map[string]bool{"Bird.fly": true},',
			'	}',
			'	// A requirement with NO extension default: every conformer must',
			'	// supply a body or the conformance itself fails to compile.',
			'	reqOnly := World{',
			'		Protocol: "Flier",',
			'		Methods:  []string{"fly"},',
			'		Req:      map[string]bool{"fly": true},',
			'		Ext:      map[string]bool{},',
			'		Impl:     map[string]bool{"Bird.fly": true},',
			'	}',
			'	// Both flavors side by side on one protocol: fly is a requirement,',
			'	// eat is extension-only — and Bird implements BOTH names.',
			'	multi := World{',
			'		Protocol: "Flier",',
			'		Methods:  []string{"fly", "eat"},',
			'		Req:      map[string]bool{"fly": true},',
			'		Ext:      map[string]bool{"fly": true, "eat": true},',
			'		Impl:     map[string]bool{"Bird.fly": true, "Bird.eat": true},',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"THE GOTCHA: extension-only fly, `let a: Flier = Bird()` — the extension body runs even though Bird defines its own fly",',
			'			"Flier.fly (extension)",',
			'			func() string { return Dispatch(extOnly, "Flier", "Bird", "fly") }},',
			'		{"the SAME value through `let b = Bird()`: concrete declared type — Bird\'s own member wins over the extension",',
			'			"Bird.fly",',
			'			func() string { return Dispatch(extOnly, "Bird", "Bird", "fly") }},',
			'		{"one requirement line flips it: fly declared in the protocol body — the witness table finds Bird\'s body through Flier",',
			'			"Bird.fly",',
			'			func() string { return Dispatch(reqDefault, "Flier", "Bird", "fly") }},',
			'		{"a conformer with no body of its own: the extension DEFAULT fills Penguin\'s witness slot",',
			'			"Flier.fly (extension)",',
			'			func() string { return Dispatch(reqDefault, "Flier", "Penguin", "fly") }},',
			'		{"requirement with no default, Bird implements: both declared types agree — no surprise anywhere on this row",',
			'			"Bird.fly Bird.fly",',
			'			func() string {',
			'				return Dispatch(reqOnly, "Flier", "Bird", "fly") + " " + Dispatch(reqOnly, "Bird", "Bird", "fly")',
			'			}},',
			'		{"a concrete type USING an extension method it never defined: Penguin.fly does not exist, the extension body serves it",',
			'			"Flier.fly (extension)",',
			'			func() string { return Dispatch(extOnly, "Penguin", "Penguin", "fly") }},',
			'		{"one value, one declared type, two methods, OPPOSITE dispatch: requirement fly finds Bird, extension-only eat ignores it",',
			'			"Bird.fly Flier.eat (extension)",',
			'			func() string {',
			'				return Dispatch(multi, "Flier", "Bird", "fly") + " " + Dispatch(multi, "Flier", "Bird", "eat")',
			'			}},',
			'		{"through the concrete variable both of Bird\'s members run — the asymmetry exists ONLY through the protocol",',
			'			"Bird.fly Bird.eat",',
			'			func() string {',
			'				return Dispatch(multi, "Bird", "Bird", "fly") + " " + Dispatch(multi, "Bird", "Bird", "eat")',
			'			}},',
			'		{"no such member: swiftc: value of type \'any Flier\' has no member \'dive\'",',
			'			"unresolved",',
			'			func() string { return Dispatch(multi, "Flier", "Bird", "dive") }},',
			'		{"Bird\'s witness table has ONE slot: fly. Bird.eat exists, the extension\'s eat exists — neither earns eat an entry",',
			'			"[fly: Bird.fly]",',
			'			func() string { return fmt.Sprintf("%v", WitnessTable(multi, "Bird")) }},',
			'		{"Penguin\'s table: the default implementation is what fills a slot the type left empty",',
			'			"[fly: Flier.fly (extension)]",',
			'			func() string { return fmt.Sprintf("%v", WitnessTable(reqDefault, "Penguin")) }},',
			'		{"a protocol with NO requirements builds an EMPTY witness table — every call through it is static",',
			'			"[]",',
			'			func() string { return fmt.Sprintf("%v", WitnessTable(extOnly, "Bird")) }},',
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
			'// World describes one protocol, its extension, and its conforming',
			'// types — everything the compiler knows when it resolves a call.',
			'type World struct {',
			'	Protocol string          // the protocol\'s name, e.g. "Flier"',
			'	Methods  []string        // every method name in scope, declaration order',
			'	Req      map[string]bool // method -> declared in the protocol BODY (gets a witness slot)',
			'	Ext      map[string]bool // method -> the protocol extension provides a body',
			'	Impl     map[string]bool // "Type.method" -> the conforming type provides its own body',
			'}',
			'',
			'// witness answers "what body sits in typeName\'s slot for method?" —',
			'// the lookup the runtime performs when a requirement is called',
			'// through a protocol-typed variable. The type\'s own body wins the',
			'// slot; the extension default is the fallback that filled it at',
			'// compile time. (A requirement with NEITHER would mean the',
			'// conformance itself did not compile — "type \'Penguin\' does not',
			'// conform to protocol \'Flier\'" — so callers never see that state.)',
			'func witness(w World, typeName, method string) string {',
			'	if w.Impl[typeName+"."+method] {',
			'		return typeName + "." + method',
			'	}',
			'	if w.Ext[method] {',
			'		return w.Protocol + "." + method + " (extension)"',
			'	}',
			'	return "unresolved"',
			'}',
			'',
			'// Dispatch mirrors the compiler\'s call-site decision. The heart of',
			'// it: WHICH type name feeds the lookup. A requirement call through',
			'// the protocol uses the RUNTIME type (the witness table travels with',
			'// the value); everything else uses the DECLARED type and is finished',
			'// at compile time — the runtime type never enters into it.',
			'func Dispatch(w World, declared, runtime, method string) string {',
			'	if declared != w.Protocol {',
			'		// Concrete variable: static resolution on the declared type.',
			'		// The type\'s own member shadows a same-named extension method',
			'		// (which is why b.fly() prints Bird.fly in both listings);',
			'		// runtime is ignored — structs have no subclasses to differ.',
			'		// Conveniently, this is exactly the witness computation with',
			'		// the declared type plugged in.',
			'		return witness(w, declared, method)',
			'	}',
			'	if w.Req[method] {',
			'		// Protocol-typed variable + requirement: dynamic dispatch.',
			'		// Index the runtime type\'s witness table — this is the ONE',
			'		// path where the actual value decides what runs.',
			'		return witness(w, runtime, method)',
			'	}',
			'	if w.Ext[method] {',
			'		// Protocol-typed variable + extension-only method: no slot',
			'		// exists, so there is nothing to look up at runtime. The call',
			'		// bound to the extension body at COMPILE time — Bird\'s',
			'		// same-named method is not an override, just a coincidence',
			'		// the resolver never consults. This branch is the bug report.',
			'		return w.Protocol + "." + method + " (extension)"',
			'	}',
			'	// Not a requirement, not in the extension: the declared type has',
			'	// no such member — a compile error at the call site.',
			'	return "unresolved"',
			'}',
			'',
			'// WitnessTable materializes what the compiler emits per conformance:',
			'// one slot per REQUIREMENT, in declaration order, holding the body',
			'// dynamic dispatch will find. Iterating Methods (a slice, never a',
			'// map) keeps the table deterministic. The loop\'s filter is the',
			'// lesson: w.Ext and w.Impl may both know about a method, but only',
			'// w.Req earns it a slot — dynamic behavior comes from the protocol',
			'// DECLARATION, not from who happens to provide bodies.',
			'func WitnessTable(w World, typeName string) []string {',
			'	table := []string{}',
			'	for _, m := range w.Methods {',
			'		if !w.Req[m] {',
			'			continue // extension-only: no slot — THE point of this problem',
			'		}',
			'		table = append(table, m+": "+witness(w, typeName, m))',
			'	}',
			'	return table',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What a witness table physically is</h3>' +
			'<p>For every conformance the compiler emits a static record — the ' +
			'protocol witness table — holding one function pointer per ' +
			'requirement. A protocol-typed value (<code>any Flier</code>, an ' +
			'“existential”) is a box carrying the value plus a pointer to its ' +
			'type\'s table; calling a requirement loads the pointer and jumps. ' +
			'That is the entire runtime cost of protocol polymorphism, and it is ' +
			'why the table\'s <em>contents are frozen at compile time</em>: the ' +
			'table you built in <code>WitnessTable</code> is baked into the ' +
			'binary, one per (type, protocol) pair.</p>' +
			'<h3>Why extension methods are not in the table — on purpose</h3>' +
			'<p>It looks like a footgun, but the design holds up:</p>' +
			'<ul>' +
			'<li><strong>Anyone can extend a protocol</strong> — including other ' +
			'modules, retroactively, on types they do not own. If extension ' +
			'methods dispatched dynamically, importing a library could silently ' +
			'change which body runs for existing code, and two modules adding ' +
			'the same method would need a runtime tiebreak. Static binding makes ' +
			'an extension method exactly as safe as a free function.</li>' +
			'<li><strong>Requirements are the declared customization points.</strong> ' +
			'Apple\'s own API-design language: if conformers should be able to ' +
			'substitute behavior, <em>declare the requirement</em>, even when a ' +
			'default exists. The one-line diff between the two prose listings is ' +
			'this contract being made or not made.</li>' +
			'<li><strong>Static calls optimize.</strong> A direct call can be ' +
			'inlined and specialized; a witness call cannot (until the optimizer ' +
			'devirtualizes it). SwiftUI leans on this: <code>View</code> has ' +
			'essentially one requirement (<code>body</code>) and hundreds of ' +
			'extension-only modifiers that resolve statically.</li>' +
			'</ul>' +
			'<h3>Field notes</h3>' +
			'<ul>' +
			'<li><strong>The code-review smell</strong> is a conforming type ' +
			'defining a method with the same name as an extension-only method — ' +
			'exactly the prose\'s <code>Bird.fly</code>. It compiles without a ' +
			'whisper (no <code>override</code> keyword exists here to catch it) ' +
			'and produces the split behavior the harness pins. The fix is always ' +
			'the same: promote the method to a requirement.</li>' +
			'<li><strong><code>some</code> vs <code>any</code>:</strong> ' +
			'<code>some Flier</code> (opaque) and generic <code>&lt;F: ' +
			'Flier&gt;</code> keep the concrete type statically known and reach ' +
			'witnesses without boxing; <code>any Flier</code> boxes. The ' +
			'requirement-vs-extension split behaves identically through all three ' +
			'— which is why the mental model you built here transfers.</li>' +
			'<li><strong><code>Self</code> requirements</strong> ' +
			'(<code>func mate(with: Self)</code>, or an ' +
			'<code>associatedtype</code>) historically made a protocol unusable ' +
			'as a type (“protocol can only be used as a generic constraint”); ' +
			'since Swift 5.7 <code>any</code> handles most of it, with members ' +
			'involving <code>Self</code> in bad positions still unavailable on ' +
			'the existential.</li>' +
			'<li><strong>Classes stack more dispatch on top:</strong> vtables for ' +
			'inheritance, and <code>@objc dynamic</code> for Objective-C message ' +
			'sends (the mechanism KVO swizzles). The interview-grade summary ' +
			'table is: message send &gt; vtable &gt; witness table &gt; direct — ' +
			'flexibility decreasing, speed increasing.</li>' +
			'</ul>' +
			'<h3>The Go mirror</h3>' +
			'<p>Go\'s interfaces are witness tables with the compile-time step ' +
			'moved to runtime: an interface value is (data pointer, itab), and ' +
			'the itab — method pointers for the concrete type — is computed ' +
			'lazily because Go conformance is implicit. What Go does not have is ' +
			'the second half of this problem: you cannot add methods to an ' +
			'interface from outside, so the extension-only trap cannot exist — ' +
			'the nearest Go bug is shadowing a promoted method on an embedded ' +
			'struct, which is likewise resolved statically and likewise surprises ' +
			'exactly once.</p>',
		],
		complexity: { time: 'O(1) per Dispatch (constant map lookups); O(m) for WitnessTable over the method list', space: 'O(r) for the emitted table — one slot per requirement' },
	});
})();
