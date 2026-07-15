/* Navigator — Interaction & Navigation (lesson). Navigation is a stack of
 * routes and nothing more: push, pop, and the two compound moves everyone
 * needs — pushReplacement (splash screens) and popUntil (back to home).
 * The learner implements the compound moves.
 */
(function () {
	'use strict';
	var T = GoLearnFlutter;

	T.lesson({
		id: 'navigator',
		title: 'The Navigator Stack',
		nav: 'navigator',
		category: 'Interaction & Navigation',

		prose: [
			'<h2>The Navigator Stack</h2>' +
			'<p>Flutter navigation has no page graph, no XML routes file — the ' +
			'<code>Navigator</code> is literally a stack of route entries, and the ' +
			'topmost route is the screen you see. The API is stack vocabulary:</p>',
			{ lang: 'dart', code: "Navigator.push(context, route);            // new top\nNavigator.pop(context);                    // back — reveal what's under\nNavigator.pushReplacement(context, route); // swap the top in place\nNavigator.popUntil(context, (r) => r.settings.name == 'home');" },
			'<p>The two compound moves carry real product logic:</p>' +
			'<ul>' +
			'<li><code>pushReplacement</code> — the splash-screen and login move: ' +
			'after Splash → Home, the user must <em>not</em> be able to press back ' +
			'into the splash, so Home replaces it instead of stacking on it;</li>' +
			'<li><code>popUntil</code> — the "done with this flow" move: from three ' +
			'screens deep in checkout, return to Home by popping <em>everything</em> ' +
			'above it, not by pushing a fresh Home on top (which would make back ' +
			'lead into the stale flow).</li>' +
			'</ul>' +
			'<p>The system back button is just <code>pop</code>; when the stack has ' +
			'one entry left, popping exits the app — which is why replacing rather ' +
			'than pushing matters for the very first screen.</p>' +
			'<h3>Your job</h3>' +
			'<p><code>push</code> and <code>pop</code> are done. Implement ' +
			'<code>pushReplacement</code> (swap the top, stack depth unchanged) and ' +
			'<code>popUntil</code> (pop until the named route is on top; it must ' +
			'still be there afterwards). The replay drives a splash → home → ' +
			'checkout flow and prints the stack after each step.</p>',
		],

		task: 'Implement pushReplacement (swap the top) and popUntil (pop down to — not including — the named route).',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// stack is the Navigator\'s route stack: last element = visible screen.',
			'type stack struct {',
			'	routes []string',
			'}',
			'',
			'func (s *stack) push(route string) {',
			'	s.routes = append(s.routes, route)',
			'}',
			'',
			'func (s *stack) pop() {',
			'	if len(s.routes) > 0 {',
			'		s.routes = s.routes[:len(s.routes)-1]',
			'	}',
			'}',
			'',
			'// pushReplacement swaps the visible screen without deepening the',
			'// stack — after it, back skips the replaced route entirely.',
			'func (s *stack) pushReplacement(route string) {',
			'	// TODO: replace the TOP entry (a push leaves the old screen',
			'	// underneath — the splash-screen bug).',
			'	s.push(route)',
			'}',
			'',
			'// popUntil pops routes until `route` is the visible screen.',
			'func (s *stack) popUntil(route string) {',
			'	// TODO: pop while the top is not `route` (this version pops once).',
			'	s.pop()',
			'}',
			'',
			'func main() {',
			'	nav := &stack{}',
			'',
			'	nav.push("Splash")',
			'	fmt.Println("push Splash:", nav.routes)',
			'	nav.pushReplacement("Home")',
			'	fmt.Println("pushReplacement Home:", nav.routes)',
			'	nav.push("Cart")',
			'	fmt.Println("push Cart:", nav.routes)',
			'	nav.push("Payment")',
			'	fmt.Println("push Payment:", nav.routes)',
			'	nav.popUntil("Home")',
			'	fmt.Println("popUntil Home:", nav.routes)',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('pushReplacement Home: [Home]') !== -1 &&
				flat.indexOf('push Payment: [Home Cart Payment]') !== -1 &&
				flat.indexOf('popUntil Home: [Home]') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// stack is the Navigator\'s route stack: last element = visible screen.',
			'type stack struct {',
			'	routes []string',
			'}',
			'',
			'func (s *stack) push(route string) {',
			'	s.routes = append(s.routes, route)',
			'}',
			'',
			'func (s *stack) pop() {',
			'	if len(s.routes) > 0 {',
			'		s.routes = s.routes[:len(s.routes)-1]',
			'	}',
			'}',
			'',
			'// pushReplacement swaps the visible screen without deepening the',
			'// stack. pop-then-push is exactly the semantics: the replaced route',
			'// is disposed (its state is gone for good), and back from the new',
			'// screen lands wherever back from the OLD screen would have.',
			'func (s *stack) pushReplacement(route string) {',
			'	s.pop()',
			'	s.push(route)',
			'}',
			'',
			'// popUntil pops routes until `route` is the visible screen. The',
			'// guard on emptiness mirrors the real predicate contract: if nothing',
			'// matches, the real Navigator would pop to nothing — the predicate is',
			'// expected to match an existing route.',
			'func (s *stack) popUntil(route string) {',
			'	for len(s.routes) > 0 && s.routes[len(s.routes)-1] != route {',
			'		s.pop()',
			'	}',
			'}',
			'',
			'func main() {',
			'	nav := &stack{}',
			'',
			'	nav.push("Splash")',
			'	fmt.Println("push Splash:", nav.routes)',
			'	nav.pushReplacement("Home")',
			'	fmt.Println("pushReplacement Home:", nav.routes)',
			'	nav.push("Cart")',
			'	fmt.Println("push Cart:", nav.routes)',
			'	nav.push("Payment")',
			'	fmt.Println("push Payment:", nav.routes)',
			'	nav.popUntil("Home")',
			'	fmt.Println("popUntil Home:", nav.routes)',
			'}',
			'',
		].join('\n'),
	});
})();
