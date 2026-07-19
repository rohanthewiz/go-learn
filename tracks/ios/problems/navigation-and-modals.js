/* Navigation Stacks & Modal Chains — View Controllers & Navigation (Medium).
 * The two containers every iOS screen lives in, as one state machine: the
 * UINavigationController stack (push / pop / popToRoot / popTo) and the modal
 * presentation chain (present forwards to the topmost card; dismiss on a
 * mid-chain VC kills everything above it). The harness pins pop-on-root as a
 * no-op, top-down dealloc order, the two-deep dismiss chain, and the fact
 * that pushing under a modal changes the stack but not the visible VC.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// The two containers side by side: the nav stack grows by push, the
	// modal chain hangs above it. Marker id namespaced (dgArrowIOSNM)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 260" width="560" height="260" role="img" aria-label="nav stack A B with modal chain C then D above; dismiss on C removes only D; dismiss on B removes D then C">' +
		'<text x="20" y="22" class="lbl">two containers, one screen: the nav stack below, the modal chain above it</text>' +
		// nav stack (left tower)
		'<rect x="50" y="180" width="120" height="34" rx="5" fill="none" stroke="var(--muted)" stroke-width="2"/>' +
		'<text x="110" y="202" text-anchor="middle">A (root)</text>' +
		'<rect x="50" y="140" width="120" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="110" y="162" text-anchor="middle">B</text>' +
		'<text x="110" y="238" text-anchor="middle" class="lbl">nav stack (push/pop)</text>' +
		// modal chain
		'<rect x="50" y="96" width="120" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="110" y="118" text-anchor="middle">C</text>' +
		'<rect x="50" y="52" width="120" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="110" y="74" text-anchor="middle">D</text>' +
		'<text x="196" y="74" text-anchor="start" class="lbl">&#8592; visible VC</text>' +
		'<text x="196" y="118" text-anchor="start" class="lbl">&#8592; modal chain: present() lands on the TOPMOST card</text>' +
		// dismiss arrows
		'<path d="M 340 150 L 340 96" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowIOSNM)"/>' +
		'<text x="350" y="120" text-anchor="start" class="lbl" style="fill:var(--warn)">B.dismiss() &#8594; D, then C die (top-down)</text>' +
		'<text x="350" y="150" text-anchor="start" class="lbl">C.dismiss() &#8594; only D dies; C keeps its card</text>' +
		'<text x="350" y="180" text-anchor="start" class="lbl">push:X now &#8594; stack grows under the cards;</text>' +
		'<text x="350" y="196" text-anchor="start" class="lbl">the visible VC is STILL D</text>' +
		'<text x="20" y="256" class="lbl">pop unwinds the stack &#183; dismiss unwinds the chain &#183; neither ever touches the other container</text>' +
		'<defs><marker id="dgArrowIOSNM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'navigation-and-modals',
		title: 'Navigation Stacks & Modal Chains',
		nav: 'navigation and modals',
		difficulty: 'Medium',
		category: 'View Controllers & Navigation',
		task: 'Implement Apply (push/pop/popToRoot/popTo/present/dismiss over a nav stack plus modal chain, with top-down dealloc lists), Run (the fold), and Visible.',

		prose: [
			'<h2>Navigation Stacks &amp; Modal Chains</h2>' +
			'<p>The bug: <em>&ldquo;tap Upgrade while the share sheet is open and the ' +
			'paywall never appears — but nothing crashes.&rdquo;</em> The console ' +
			'knows why:</p>',
			{ lang: 'txt', code: 'Warning: Attempt to present <PaywallVC: 0x7fb2c4408c40> on\n<HomeVC: 0x7fb2c4405560> which is already presenting\n<UIActivityViewController: 0x7fb2c5011a00>' },
			'<p>A view controller can present exactly <strong>one</strong> modal at a ' +
			'time. Present a second from the same VC and UIKit logs that warning and ' +
			'does <em>nothing</em> — the classic silent no-show. The fix everyone ' +
			'ships is the topmost-finder: walk <code>presentedViewController</code> ' +
			'until it runs out, and present from <em>there</em>:</p>',
			{ lang: 'swift', code: '// The pattern behind this item\'s present op: forward to the topmost card.\nvar top: UIViewController = self\nwhile let presented = top.presentedViewController {\n    top = presented\n}\ntop.present(paywall, animated: true)   // now it actually appears' },
			'<p>Every screen on iOS lives in one of two containers, and every ' +
			'navigation bug is a confusion between them:</p>' +
			'<ul>' +
			'<li><strong>The navigation stack</strong> (<code>UINavigationController</code>): ' +
			'a LIFO of view controllers. <code>pushViewController</code> grows it; ' +
			'<code>popViewController</code> removes exactly the top — and on the root ' +
			'it returns <code>nil</code> and does <em>nothing</em>, which is why ' +
			'&ldquo;pop&rdquo; can never empty a nav controller. ' +
			'<code>popToRootViewController</code> and ' +
			'<code>popToViewController(_:)</code> unwind many at once, and every ' +
			'popped VC — losing its last strong reference — <code>deinit</code>s, ' +
			'topmost first.</li>' +
			'<li><strong>The modal chain</strong>: <code>present(_:)</code> stacks ' +
			'cards <em>above</em> the whole nav controller, each card presented by ' +
			'the one below. <code>dismiss(animated:)</code> is subtler than pop: ' +
			'called on a VC <em>that is presenting something</em>, it dismisses the ' +
			'presented child <em>and everything above it</em> — the caller keeps its ' +
			'own card. Called on the topmost card (nothing above), it dismisses the ' +
			'caller itself. So with the chain C&nbsp;&rarr;&nbsp;D: ' +
			'<code>C.dismiss()</code> removes only D, while calling dismiss from ' +
			'below the chain removes D <em>then</em> C, top-down.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>And the two containers are independent: you can keep pushing onto ' +
			'the nav stack <em>while a modal is up</em>. The stack changes; the user ' +
			'sees none of it — the visible VC is still the topmost card. Deep-link ' +
			'handlers do this deliberately (rebuild the stack behind the modal, then ' +
			'dismiss); doing it accidentally is the &ldquo;back button skips a ' +
			'screen that was never shown&rdquo; report.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Apply(nav, op)</code> — one operation against a ' +
			'<code>Nav</code> (stack bottom&rarr;top, modal chain ' +
			'presenter-first) returning the new state plus the dealloc list, ' +
			'top-down — along with <code>Run(ops)</code>, the fold from empty, and ' +
			'<code>Visible(nav)</code>: topmost card if any, else top of stack.</p>' +
			'<div class="tip">The model pins UIKit\'s documented dismiss rule ' +
			'verbatim: <em>&ldquo;calling this method on a view controller lower in ' +
			'the stack dismisses its immediate child view controller and all view ' +
			'controllers above that child.&rdquo;</em> One simplification: the modal ' +
			'chain hangs off the top of the nav stack only, and dismiss on a ' +
			'non-presenting stack VC is a no-op — real UIKit lets any VC in the ' +
			'window present, but the arbitration is identical.</div>',
		],

		starter: [
			'package main',
			'',
			'// Nav is the whole navigation state of one scene.',
			'type Nav struct {',
			'	Stack  []string // nav stack, bottom -> top; Stack[0] is the root',
			'	Modals []string // modal chain, presenter-first; last entry is the topmost card',
			'}',
			'',
			'// Apply performs one operation and returns the new state plus the list',
			'// of deallocated VCs, TOP-DOWN (the order their deinits print). Do not',
			'// mutate the input Nav\'s slices. Ops:',
			'//',
			'//   "push:X"     push X onto the nav stack (legal while modals are up:',
			'//                the stack changes underneath the cards)',
			'//   "pop"        remove the top of the stack; NO-OP on the root (the',
			'//                real popViewController returns nil there)',
			'//   "popToRoot"  dealloc everything above Stack[0], top-down',
			'//   "popTo:X"    unwind until X is top; no-op if X is absent or already top',
			'//   "present:X"  present X — forwarded to the TOPMOST card, so the',
			'//                chain grows by one (the topmost-finder pattern)',
			'//   "dismiss:X"  UIKit\'s rule: if X is presenting something, its whole',
			'//                child chain above dies (X keeps its own card); if X is',
			'//                the topmost card, X itself dies; if X is the top of',
			'//                the STACK with modals up, the entire chain dies.',
			'//                Anything else: no-op.',
			'func Apply(nav Nav, op string) (Nav, []string) {',
			'	// your code here',
			'	return nav, nil',
			'}',
			'',
			'// Run folds ops from an empty Nav, concatenating every dealloc.',
			'func Run(ops []string) (Nav, []string) {',
			'	// your code here',
			'	return Nav{}, nil',
			'}',
			'',
			'// Visible is the VC the user actually sees: the topmost modal card if',
			'// any, else the top of the nav stack, else "" for an empty scene.',
			'func Visible(nav Nav) string {',
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
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// show renders "stack=[...] modals=[...] | dealloc: ..." so a wrong',
			'	// stack, a wrong chain, and a wrong dealloc order all surface in',
			'	// one diff.',
			'	show := func(nav Nav, deallocs []string) string {',
			'		s := "stack=[" + strings.Join(nav.Stack, " ") + "] modals=[" + strings.Join(nav.Modals, " ") + "]"',
			'		if len(deallocs) == 0 {',
			'			return s + " | (none)"',
			'		}',
			'		return s + " | dealloc: " + strings.Join(deallocs, " ")',
			'	}',
			'	step := func(nav Nav, op string) string {',
			'		next, dead := Apply(nav, op)',
			'		return show(next, dead)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"three pushes build the stack bottom-up; nothing deallocs",',
			'			"stack=[A B C] modals=[] | (none)",',
			'			func() string {',
			'				nav, dead := Run([]string{"push:A", "push:B", "push:C"})',
			'				return show(nav, dead)',
			'			}},',
			'		{"pop removes exactly the top, and the popped VC deinits",',
			'			"stack=[A B] modals=[] | dealloc: C",',
			'			func() string { return step(Nav{Stack: []string{"A", "B", "C"}}, "pop") }},',
			'		{"pop on the root is a NO-OP: popViewController returns nil rather than empty the stack",',
			'			"stack=[A] modals=[] | (none)",',
			'			func() string { return step(Nav{Stack: []string{"A"}}, "pop") }},',
			'		{"popToRoot unwinds everything above the root, deinits printing top-down",',
			'			"stack=[A] modals=[] | dealloc: D C B",',
			'			func() string { return step(Nav{Stack: []string{"A", "B", "C", "D"}}, "popToRoot") }},',
			'		{"popTo:B unwinds until B is top — two deallocs, top-down",',
			'			"stack=[A B] modals=[] | dealloc: D C",',
			'			func() string { return step(Nav{Stack: []string{"A", "B", "C", "D"}}, "popTo:B") }},',
			'		{"popTo a VC that is not in the stack is a no-op",',
			'			"stack=[A B] modals=[] | (none)",',
			'			func() string { return step(Nav{Stack: []string{"A", "B"}}, "popTo:X") }},',
			'		{"present forwards to the topmost card: two presents build a two-deep chain",',
			'			"stack=[A] modals=[C D] | (none)",',
			'			func() string {',
			'				nav, dead := Run([]string{"push:A", "present:C", "present:D"})',
			'				return show(nav, dead)',
			'			}},',
			'		{"dismiss called below a two-deep chain tears the WHOLE chain down, top-down: D then C",',
			'			"stack=[A] modals=[] | dealloc: D C",',
			'			func() string {',
			'				return step(Nav{Stack: []string{"A"}, Modals: []string{"C", "D"}}, "dismiss:A")',
			'			}},',
			'		{"dismiss on a MID-CHAIN presenter kills only its child chain: C keeps its own card",',
			'			"stack=[A] modals=[C] | dealloc: D",',
			'			func() string {',
			'				return step(Nav{Stack: []string{"A"}, Modals: []string{"C", "D"}}, "dismiss:C")',
			'			}},',
			'		{"dismiss on the topmost card (nothing above it) dismisses the card itself",',
			'			"stack=[A] modals=[C] | dealloc: D",',
			'			func() string {',
			'				return step(Nav{Stack: []string{"A"}, Modals: []string{"C", "D"}}, "dismiss:D")',
			'			}},',
			'		{"pushing while a modal is up changes the stack but NOT the visible VC — the card still covers everything",',
			'			"stack=[A B] modals=[C] visible=C",',
			'			func() string {',
			'				nav, _ := Run([]string{"push:A", "present:C", "push:B"})',
			'				return fmt.Sprintf("stack=[%s] modals=[%s] visible=%s",',
			'					strings.Join(nav.Stack, " "), strings.Join(nav.Modals, " "), Visible(nav))',
			'			}},',
			'		{"Visible arbitration: card beats stack top; an empty scene shows nobody",',
			'			"withModal=D noModal=B empty=",',
			'			func() string {',
			'				return fmt.Sprintf("withModal=%s noModal=%s empty=%s",',
			'					Visible(Nav{Stack: []string{"A", "B"}, Modals: []string{"C", "D"}}),',
			'					Visible(Nav{Stack: []string{"A", "B"}}),',
			'					Visible(Nav{}))',
			'			}},',
			'		{"the deep-link dance: rebuild the stack behind the modal, then one dismiss reveals the new top",',
			'			"stack=[A Settings Profile] modals=[] | dealloc: Sheet visible=Profile",',
			'			func() string {',
			'				nav, _ := Run([]string{"push:A", "present:Sheet", "push:Settings", "push:Profile"})',
			'				next, dead := Apply(nav, "dismiss:Sheet")',
			'				return show(next, dead) + " visible=" + Visible(next)',
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
			'import "strings"',
			'',
			'// Nav is the whole navigation state of one scene: the nav stack',
			'// (bottom -> top) and the modal chain (presenter-first, topmost card',
			'// last). Two independent slices because the two containers really are',
			'// independent — the item\'s central fact.',
			'type Nav struct {',
			'	Stack  []string',
			'	Modals []string',
			'}',
			'',
			'// clone copies a Nav so Apply can be compute-then-commit: the caller\'s',
			'// state must survive untouched, the same discipline the real',
			'// UINavigationController keeps (a cancelled interactive pop leaves the',
			'// stack exactly as it was).',
			'func clone(nav Nav) Nav {',
			'	return Nav{',
			'		Stack:  append([]string(nil), nav.Stack...),',
			'		Modals: append([]string(nil), nav.Modals...),',
			'	}',
			'}',
			'',
			'// unwindStack pops the stack down to length keep, logging deallocs',
			'// top-down — the order the deinits actually print, because the',
			'// framework releases the topmost (most recently pushed) VC first.',
			'// Shared by pop, popToRoot, and popTo: they differ only in the target',
			'// length, which is exactly how the three UIKit methods relate.',
			'func unwindStack(nav Nav, keep int) (Nav, []string) {',
			'	out := clone(nav)',
			'	dead := []string{}',
			'	for i := len(out.Stack) - 1; i >= keep; i-- {',
			'		dead = append(dead, out.Stack[i])',
			'	}',
			'	out.Stack = out.Stack[:keep]',
			'	return out, dead',
			'}',
			'',
			'// dropModals removes chain entries from index keep upward, top-down.',
			'// Same shape as unwindStack on purpose: dismiss IS pop, one container',
			'// over — the insight this item is built around.',
			'func dropModals(nav Nav, keep int) (Nav, []string) {',
			'	out := clone(nav)',
			'	dead := []string{}',
			'	for i := len(out.Modals) - 1; i >= keep; i-- {',
			'		dead = append(dead, out.Modals[i])',
			'	}',
			'	out.Modals = out.Modals[:keep]',
			'	return out, dead',
			'}',
			'',
			'// Apply performs one operation. Every no-op path returns the (cloned)',
			'// state with a nil dealloc list rather than an error — mirroring UIKit,',
			'// where popViewController-on-root and present-while-presenting fail',
			'// silently (one returns nil, the other just logs the warning).',
			'func Apply(nav Nav, op string) (Nav, []string) {',
			'	parts := strings.Split(op, ":")',
			'	switch parts[0] {',
			'	case "push":',
			'		// Push is legal with modals up: the stack mutates UNDER the',
			'		// cards. Visible() is what proves nothing changed on screen.',
			'		out := clone(nav)',
			'		out.Stack = append(out.Stack, parts[1])',
			'		return out, nil',
			'	case "pop":',
			'		// The root is not poppable — a nav controller always shows',
			'		// something. Real popViewController returns nil here.',
			'		if len(nav.Stack) < 2 {',
			'			return clone(nav), nil',
			'		}',
			'		return unwindStack(nav, len(nav.Stack)-1)',
			'	case "popToRoot":',
			'		if len(nav.Stack) < 2 {',
			'			return clone(nav), nil',
			'		}',
			'		return unwindStack(nav, 1)',
			'	case "popTo":',
			'		// Unwind until the target is top. Absent target: no-op (the',
			'		// real method requires the VC to be in the stack; the model',
			'		// flattens the resulting exception to a no-op).',
			'		for i, name := range nav.Stack {',
			'			if name == parts[1] {',
			'				if i == len(nav.Stack)-1 {',
			'					return clone(nav), nil // already top',
			'				}',
			'				return unwindStack(nav, i+1)',
			'			}',
			'		}',
			'		return clone(nav), nil',
			'	case "present":',
			'		// The topmost-finder pattern baked in: a present always lands',
			'		// at the end of the chain. (The raw UIKit call on a VC that',
			'		// is already presenting would log the "already presenting"',
			'		// warning and silently do nothing — the model forwards, which',
			'		// is what shipping code does on purpose.)',
			'		out := clone(nav)',
			'		out.Modals = append(out.Modals, parts[1])',
			'		return out, nil',
			'	case "dismiss":',
			'		return dismiss(nav, parts[1])',
			'	}',
			'	return clone(nav), nil',
			'}',
			'',
			'// dismiss is UIKit\'s documented rule, verbatim: a VC lower in the',
			'// chain dismisses its immediate child AND everything above the child;',
			'// the topmost card dismisses itself (UIKit forwards the call to its',
			'// presenter). The two arms reduce to one question: which chain index',
			'// is the first to go?',
			'func dismiss(nav Nav, name string) (Nav, []string) {',
			'	// Is the caller in the modal chain?',
			'	for i, m := range nav.Modals {',
			'		if m != name {',
			'			continue',
			'		}',
			'		if i < len(nav.Modals)-1 {',
			'			// Mid-chain presenter: the child chain above dies, the',
			'			// caller keeps its own card. This is why C.dismiss()',
			'			// with C -> D up removes only D.',
			'			return dropModals(nav, i+1)',
			'		}',
			'		// Topmost card, nothing above: the call is forwarded to the',
			'		// presenter and dismisses the caller itself.',
			'		return dropModals(nav, i)',
			'	}',
			'	// A stack VC: only the top of the stack presents the chain in',
			'	// this model, and only when there IS a chain. Everything above',
			'	// it — the entire chain — dies top-down.',
			'	if len(nav.Modals) > 0 && len(nav.Stack) > 0 && nav.Stack[len(nav.Stack)-1] == name {',
			'		return dropModals(nav, 0)',
			'	}',
			'	return clone(nav), nil',
			'}',
			'',
			'// Run folds ops from an empty scene, concatenating deallocs — the',
			'// combined deinit log of the whole session.',
			'func Run(ops []string) (Nav, []string) {',
			'	nav := Nav{}',
			'	dead := []string{}',
			'	for _, op := range ops {',
			'		next, d := Apply(nav, op)',
			'		nav = next',
			'		dead = append(dead, d...)',
			'	}',
			'	return nav, dead',
			'}',
			'',
			'// Visible is the arbitration the user experiences: cards always cover',
			'// the stack, so the topmost modal wins; otherwise the stack top; an',
			'// empty scene shows nothing (the window\'s root has not been set).',
			'func Visible(nav Nav) string {',
			'	if len(nav.Modals) > 0 {',
			'		return nav.Modals[len(nav.Modals)-1]',
			'	}',
			'	if len(nav.Stack) > 0 {',
			'		return nav.Stack[len(nav.Stack)-1]',
			'	}',
			'	return ""',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why dismiss is not pop</h3>' +
			'<p>Pop is symmetric: one call, one VC, always the top. Dismiss carries ' +
			'<em>routing</em>: UIKit walks from the caller to figure out what should ' +
			'go. The documented rule you implemented — a presenter dismisses its ' +
			'child chain, a childless card dismisses itself — exists because ' +
			'<code>dismiss()</code> is usually called as <code>self.dismiss()</code> ' +
			'from <em>inside</em> the card, and forwarding to the presenter is what ' +
			'makes that ergonomic call work. The tuition-expensive corollary: ' +
			'<code>self.dismiss()</code> in a VC that has meanwhile presented ' +
			'something else (a photo picker, a second sheet) dismisses <em>the ' +
			'picker, not self</em> — the &ldquo;my screen won\'t close&rdquo; bug ' +
			'that reproduces only when the user opened something first.</p>' +
			'<h3>Field notes</h3>' +
			'<ul>' +
			'<li><strong>The &ldquo;already presenting&rdquo; warning is a silent ' +
			'failure, by design.</strong> UIKit logs and drops the present rather ' +
			'than crash — so the symptom is a button that &ldquo;does nothing&rdquo; ' +
			'under exactly one user flow. Grep session logs for <code>Attempt to ' +
			'present</code>; it is one of the highest-signal strings in iOS ' +
			'debugging. The topmost-finder (or presenting from the resolved top of ' +
			'<code>view.window?.rootViewController</code>) is the standard fix, and ' +
			'it is precisely the forwarding your <code>present</code> op ' +
			'models.</li>' +
			'<li><strong>Dealloc order is observable and load-bearing.</strong> ' +
			'<code>popToRootViewController</code> releases the popped VCs and their ' +
			'deinits print top-down, exactly your unwind loop. Teams instrument ' +
			'<code>deinit</code> and assert the sequence in UI tests — a missing ' +
			'deinit after a mass pop means a retain cycle is holding a ' +
			'&ldquo;dead&rdquo; screen (the ARC item\'s delegate cycle, nine times ' +
			'out of ten).</li>' +
			'<li><strong>Deep links rebuild behind the curtain.</strong> The last ' +
			'harness case is the production pattern: keep the modal up, push (or ' +
			'<code>setViewControllers</code>) the new stack underneath, then one ' +
			'dismiss lands the user on the rebuilt top with no flicker. Done in the ' +
			'wrong order — dismiss first, then push — the user watches the old ' +
			'screen flash by: a bug filed as &ldquo;janky deep link&rdquo; that is ' +
			'really an ordering choice between two independent containers.</li>' +
			'<li><strong>What the model flattens.</strong> Real chains can hang off ' +
			'any VC in the window (each has its own ' +
			'<code>presentedViewController</code> pointer, and ' +
			'<code>definesPresentationContext</code> can scope a present to a child ' +
			'container); pops and dismisses animate, so state changes complete ' +
			'asynchronously and a second call mid-animation logs <code>Unbalanced ' +
			'calls to begin/end appearance transitions</code> — the warning behind ' +
			'most &ldquo;double-tap breaks navigation&rdquo; reports. The ' +
			'arbitration table, though, is exactly the one you implemented.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n) per op — one scan and one rebuild of the affected container', space: 'O(n) for the new state and dealloc list' },
	});
})();
