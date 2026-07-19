/* The View Controller Lifecycle — View Controllers & Navigation (Medium).
 * The UIKit appearance callbacks as a deterministic trace generator: push,
 * pop, present, dismiss folded over a nav stack. The harness pins the famous
 * push interleaving (B.viewDidLoad before A.viewWillDisappear — the iOS 11+
 * order), the pop-and-deinit sequence, viewDidLoad's once-per-instance rule
 * (a retained VC re-pushed does NOT reload), and the iOS 13 page-sheet
 * surprise: a sheet present never calls the presenter's disappear callbacks.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// The push interleaving as two lanes: A's callbacks and B's callbacks
	// alternate — neither VC gets a tidy block. Marker id namespaced
	// (dgArrowIOSVCL) because every track's SVGs share the page's id
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 240" width="560" height="240" role="img" aria-label="push interleaving timeline: B viewDidLoad, A viewWillDisappear, B viewWillAppear, A viewDidDisappear, B viewDidAppear">' +
		'<text x="20" y="22" class="lbl">push(B) onto A — the callbacks interleave across BOTH controllers (iOS 11+)</text>' +
		// lane labels
		'<text x="46" y="66" text-anchor="middle" style="fill:var(--warn)">A</text>' +
		'<text x="46" y="126" text-anchor="middle" style="fill:var(--accent)">B</text>' +
		// lane lines
		'<path d="M 70 60 L 540 60" stroke="var(--warn)" stroke-width="1" opacity="0.35"/>' +
		'<path d="M 70 120 L 540 120" stroke="var(--accent)" stroke-width="1" opacity="0.35"/>' +
		// B.viewDidLoad
		'<rect x="76" y="104" width="88" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="120" y="124" text-anchor="middle" class="lbl">viewDidLoad</text>' +
		// A.viewWillDisappear
		'<rect x="172" y="44" width="106" height="30" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="225" y="64" text-anchor="middle" class="lbl">viewWillDisappear</text>' +
		// B.viewWillAppear
		'<rect x="286" y="104" width="96" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="334" y="124" text-anchor="middle" class="lbl">viewWillAppear</text>' +
		// A.viewDidDisappear
		'<rect x="390" y="44" width="104" height="30" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="442" y="64" text-anchor="middle" class="lbl">viewDidDisappear</text>' +
		// B.viewDidAppear
		'<rect x="446" y="104" width="94" height="30" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="493" y="124" text-anchor="middle" class="lbl">viewDidAppear</text>' +
		// order arrows along the bottom
		'<path d="M 120 140 L 120 170 L 225 170 L 225 80" fill="none" stroke="var(--muted)" stroke-width="1.2"/>' +
		'<path d="M 225 80 L 225 78" stroke="var(--muted)" stroke-width="1.2" marker-end="url(#dgArrowIOSVCL)"/>' +
		'<text x="20" y="196" class="lbl">1 B.viewDidLoad &#183; 2 A.viewWillDisappear &#183; 3 B.viewWillAppear &#183; 4 A.viewDidDisappear &#183; 5 B.viewDidAppear</text>' +
		'<text x="20" y="222" class="lbl">the will-pair fires before the transition animation, the did-pair after it — and A.viewDidLoad never runs again</text>' +
		'<defs><marker id="dgArrowIOSVCL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'viewcontroller-lifecycle',
		title: 'The View Controller Lifecycle',
		nav: 'viewcontroller lifecycle',
		difficulty: 'Medium',
		category: 'View Controllers & Navigation',
		task: 'Implement PushCallbacks and PopCallbacks (the pinned UIKit interleavings) and Trace (fold push/pop/present/dismiss over a nav stack, viewDidLoad once per instance, sheets that never notify the presenter).',

		prose: [
			'<h2>The View Controller Lifecycle</h2>' +
			'<p>The bug report arrived the week iOS 13 shipped: <em>&ldquo;screen-time ' +
			'analytics double-count whenever the share sheet is open.&rdquo;</em> The ' +
			'code was textbook — start the timer in <code>viewWillAppear</code>, stop ' +
			'it in <code>viewWillDisappear</code> — and it had worked for years. ' +
			'What changed: presented sheets became <em>cards</em> that leave the ' +
			'presenter visible underneath, so UIKit stopped calling the presenter\'s ' +
			'disappear callbacks at all. The timer never stopped, because the screen ' +
			'never &ldquo;disappeared&rdquo;. Every bug of this family — timers that ' +
			'leak, data that reloads on every back-swipe, <code>deinit</code> that ' +
			'never prints — is the appearance state machine doing exactly what it ' +
			'promises, to code that guessed. Instrument it and the machine becomes ' +
			'visible:</p>',
			{ lang: 'swift', code: 'final class LoggingVC: UIViewController {\n    let name: String\n    init(_ name: String) { self.name = name; super.init(nibName: nil, bundle: nil) }\n    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }\n\n    override func viewDidLoad()                { super.viewDidLoad();            print("\\(name).viewDidLoad") }\n    override func viewWillAppear(_ a: Bool)    { super.viewWillAppear(a);        print("\\(name).viewWillAppear") }\n    override func viewDidAppear(_ a: Bool)     { super.viewDidAppear(a);         print("\\(name).viewDidAppear") }\n    override func viewWillDisappear(_ a: Bool) { super.viewWillDisappear(a);     print("\\(name).viewWillDisappear") }\n    override func viewDidDisappear(_ a: Bool)  { super.viewDidDisappear(a);      print("\\(name).viewDidDisappear") }\n    deinit { print("\\(name).deinit") }\n}' },
			'<p>Push B onto A inside a <code>UINavigationController</code>, then pop. ' +
			'The Xcode console (iOS 11 and later — the ordering genuinely changed in ' +
			'11, see the explanation):</p>',
			{ lang: 'txt', code: '--- nav.pushViewController(B, animated: true) ---\nB.viewDidLoad          <- B\'s view is built FIRST, before A hears anything\nA.viewWillDisappear\nB.viewWillAppear       <- both will-callbacks fire BEFORE the slide animation\nA.viewDidDisappear\nB.viewDidAppear        <- and both did-callbacks AFTER it completes\n--- nav.popViewController(animated: true) ---\nB.viewWillDisappear\nA.viewWillAppear       <- but NOT A.viewDidLoad: A\'s view never left memory\nB.viewDidDisappear\nA.viewDidAppear\nB.deinit               <- the nav stack held the only strong ref; pop kills B' },
			'<p>Three rules generate every line of that trace:</p>' +
			'<ul>' +
			'<li><strong><code>viewDidLoad</code> runs once per instance</strong>, ' +
			'lazily, the first time the view is needed. Popping back to A does not ' +
			're-run it — A\'s view stayed in memory. But pop <em>deallocates</em> B, ' +
			'so pushing a <em>fresh</em> B later loads again. Keep an external strong ' +
			'reference to B (a coordinator, say) and a re-push reuses the loaded ' +
			'instance: no second <code>viewDidLoad</code>, no <code>deinit</code> at ' +
			'pop.</li>' +
			'<li><strong>The callbacks interleave across both controllers.</strong> ' +
			'The will-pair (<code>A.viewWillDisappear</code>, ' +
			'<code>B.viewWillAppear</code>) brackets the start of the transition, the ' +
			'did-pair its end — neither controller gets a tidy block, and B\'s view is ' +
			'loaded before A is told anything.</li>' +
			'<li><strong>Presentation style decides whether the presenter is ' +
			'notified at all.</strong> A <code>.fullScreen</code> present covers A ' +
			'completely and fires the same will/did pairs as a push. A ' +
			'<code>.pageSheet</code> — the iOS 13+ <em>default</em> — leaves A ' +
			'visible under the card, so A gets <em>no</em> disappear callbacks, and ' +
			'no appear callbacks when the sheet is dismissed. That default flip is ' +
			'the analytics bug above.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>PushCallbacks</code> and <code>PopCallbacks</code> — ' +
			'the two pinned interleavings as pure functions — and ' +
			'<code>Trace(events)</code>, which folds a whole navigation session ' +
			'(<code>push:X</code>, <code>pop</code>, <code>retain:X</code>, ' +
			'<code>present:X:fullScreen</code>, <code>present:X:pageSheet</code>, ' +
			'<code>dismiss</code>) into the exact console trace, tracking which ' +
			'instances are loaded, retained, and deallocated.</p>' +
			'<div class="tip">The model keeps one presented VC at a time; stacked ' +
			'modal chains (present-over-present, mid-chain dismissal) are the next ' +
			'item\'s territory. Animation timing is collapsed too: real UIKit fires ' +
			'the did-pair from the transition-completion block, hundreds of ' +
			'milliseconds later — the <em>order</em> is what this item pins.</div>',
		],

		starter: [
			'package main',
			'',
			'// PushCallbacks returns the exact callback interleaving when "next" is',
			'// pushed over "prev" (also the shape of a .fullScreen present). The',
			'// pinned iOS 11+ order:',
			'//',
			'//   next.viewDidLoad        (only if nextNeedsLoad — first need of the view)',
			'//   prev.viewWillDisappear  (skipped when prev is "" — the root setup)',
			'//   next.viewWillAppear',
			'//   prev.viewDidDisappear   (skipped when prev is "")',
			'//   next.viewDidAppear',
			'//',
			'// Entries are "Name.callback" strings, e.g. "B.viewDidLoad".',
			'func PushCallbacks(prev, next string, nextNeedsLoad bool) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// PopCallbacks returns the interleaving when "top" is popped, revealing',
			'// "below" (also the shape of a .fullScreen dismiss):',
			'//',
			'//   top.viewWillDisappear',
			'//   below.viewWillAppear    <- NOT below.viewDidLoad: its view never unloaded',
			'//   top.viewDidDisappear',
			'//   below.viewDidAppear',
			'//   top.deinit              (only if topDeallocs — no external strong ref)',
			'func PopCallbacks(top, below string, topDeallocs bool) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Trace folds a navigation session into its full console trace.',
			'// Events:',
			'//   "push:X"                push X onto the nav stack (loads X\'s view',
			'//                           first if this instance never loaded)',
			'//   "pop"                   pop the top VC; no-op on the root; the popped',
			'//                           VC deinits unless retained (a retained',
			'//                           instance survives, still loaded, and a later',
			'//                           push:X reuses it — NO second viewDidLoad)',
			'//   "retain:X"              an external strong reference to the current X',
			'//                           instance (no callbacks)',
			'//   "present:X:fullScreen"  modal that fully covers: push-shaped',
			'//                           callbacks over the visible VC',
			'//   "present:X:pageSheet"   iOS 13-style card: X loads and appears, but',
			'//                           the presenter gets NO disappear callbacks',
			'//   "dismiss"               dismiss the presented VC (no-op if none);',
			'//                           fullScreen -> pop-shaped callbacks + deinit;',
			'//                           pageSheet  -> only X\'s own disappear pair +',
			'//                           deinit (the presenter never "re-appears")',
			'func Trace(events []string) []string {',
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
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	join := func(cbs []string) string {',
			'		if len(cbs) == 0 {',
			'			return "(none)"',
			'		}',
			'		return strings.Join(cbs, " ")',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"the famous push interleaving: B loads BEFORE A hears anything, will-pair then did-pair alternate",',
			'			"B.viewDidLoad A.viewWillDisappear B.viewWillAppear A.viewDidDisappear B.viewDidAppear",',
			'			func() string { return join(PushCallbacks("A", "B", true)) }},',
			'		{"root setup: pushing the first VC has no partner — just load, willAppear, didAppear",',
			'			"A.viewDidLoad A.viewWillAppear A.viewDidAppear",',
			'			func() string { return join(PushCallbacks("", "A", true)) }},',
			'		{"pushing an already-loaded instance skips viewDidLoad — it runs once per instance, ever",',
			'			"A.viewWillDisappear B.viewWillAppear A.viewDidDisappear B.viewDidAppear",',
			'			func() string { return join(PushCallbacks("A", "B", false)) }},',
			'		{"pop: B and A interleave the same way, A.viewDidLoad does NOT run again, and B deinits last",',
			'			"B.viewWillDisappear A.viewWillAppear B.viewDidDisappear A.viewDidAppear B.deinit",',
			'			func() string { return join(PopCallbacks("B", "A", true)) }},',
			'		{"pop of a retained VC: same appearance callbacks, but no deinit — something still owns it",',
			'			"B.viewWillDisappear A.viewWillAppear B.viewDidDisappear A.viewDidAppear",',
			'			func() string { return join(PopCallbacks("B", "A", false)) }},',
			'		{"Trace: a full push/pop session reads exactly like the Xcode console",',
			'			"A.viewDidLoad A.viewWillAppear A.viewDidAppear " +',
			'				"B.viewDidLoad A.viewWillDisappear B.viewWillAppear A.viewDidDisappear B.viewDidAppear " +',
			'				"B.viewWillDisappear A.viewWillAppear B.viewDidDisappear A.viewDidAppear B.deinit",',
			'			func() string { return join(Trace([]string{"push:A", "push:B", "pop"})) }},',
			'		{"pop deallocated B, so re-pushing B builds a FRESH instance: viewDidLoad runs again",',
			'			"A.viewDidLoad A.viewWillAppear A.viewDidAppear " +',
			'				"B.viewDidLoad A.viewWillDisappear B.viewWillAppear A.viewDidDisappear B.viewDidAppear " +',
			'				"B.viewWillDisappear A.viewWillAppear B.viewDidDisappear A.viewDidAppear B.deinit " +',
			'				"B.viewDidLoad A.viewWillDisappear B.viewWillAppear A.viewDidDisappear B.viewDidAppear",',
			'			func() string { return join(Trace([]string{"push:A", "push:B", "pop", "push:B"})) }},',
			'		{"a RETAINED B survives the pop (no deinit) and re-pushes WITHOUT a second viewDidLoad",',
			'			"A.viewDidLoad A.viewWillAppear A.viewDidAppear " +',
			'				"B.viewDidLoad A.viewWillDisappear B.viewWillAppear A.viewDidDisappear B.viewDidAppear " +',
			'				"B.viewWillDisappear A.viewWillAppear B.viewDidDisappear A.viewDidAppear " +',
			'				"A.viewWillDisappear B.viewWillAppear A.viewDidDisappear B.viewDidAppear",',
			'			func() string { return join(Trace([]string{"push:A", "push:B", "retain:B", "pop", "push:B"})) }},',
			'		{"a .fullScreen present covers the presenter: the same will/did pairs as a push",',
			'			"A.viewDidLoad A.viewWillAppear A.viewDidAppear " +',
			'				"C.viewDidLoad A.viewWillDisappear C.viewWillAppear A.viewDidDisappear C.viewDidAppear",',
			'			func() string { return join(Trace([]string{"push:A", "present:C:fullScreen"})) }},',
			'		{"the iOS 13 surprise: a .pageSheet present never calls the presenter\'s disappear callbacks",',
			'			"A.viewDidLoad A.viewWillAppear A.viewDidAppear " +',
			'				"C.viewDidLoad C.viewWillAppear C.viewDidAppear",',
			'			func() string { return join(Trace([]string{"push:A", "present:C:pageSheet"})) }},',
			'		{"dismissing a sheet: only the sheet\'s own disappear pair and deinit — A never \\"re-appears\\" because it never left",',
			'			"A.viewDidLoad A.viewWillAppear A.viewDidAppear " +',
			'				"C.viewDidLoad C.viewWillAppear C.viewDidAppear " +',
			'				"C.viewWillDisappear C.viewDidDisappear C.deinit",',
			'			func() string { return join(Trace([]string{"push:A", "present:C:pageSheet", "dismiss"})) }},',
			'		{"dismissing a .fullScreen modal is pop-shaped: the presenter re-appears and the modal deinits",',
			'			"A.viewDidLoad A.viewWillAppear A.viewDidAppear " +',
			'				"C.viewDidLoad A.viewWillDisappear C.viewWillAppear A.viewDidDisappear C.viewDidAppear " +',
			'				"C.viewWillDisappear A.viewWillAppear C.viewDidDisappear A.viewDidAppear C.deinit",',
			'			func() string { return join(Trace([]string{"push:A", "present:C:fullScreen", "dismiss"})) }},',
			'		{"pop on the root is a no-op: a nav controller never pops its last VC",',
			'			"A.viewDidLoad A.viewWillAppear A.viewDidAppear",',
			'			func() string { return join(Trace([]string{"push:A", "pop"})) }},',
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
			'// PushCallbacks is the pinned iOS 11+ push interleaving. The shape is',
			'// worth internalizing, not memorizing: UIKit builds the incoming view',
			'// FIRST (it needs B\'s view to run the transition at all — and since',
			'// iOS 11 that load happens before the outgoing VC hears anything),',
			'// then fires both will-callbacks before the animation and both',
			'// did-callbacks after it. The prev == "" case is the root setup: a',
			'// nav controller\'s first VC appears with nobody to displace.',
			'func PushCallbacks(prev, next string, nextNeedsLoad bool) []string {',
			'	out := []string{}',
			'	if nextNeedsLoad {',
			'		// viewDidLoad is lazy: it fires on first ACCESS of .view, which',
			'		// the transition machinery triggers. An already-loaded instance',
			'		// (retained across a pop) skips straight to the appearance pair.',
			'		out = append(out, next+".viewDidLoad")',
			'	}',
			'	if prev != "" {',
			'		out = append(out, prev+".viewWillDisappear")',
			'	}',
			'	out = append(out, next+".viewWillAppear")',
			'	if prev != "" {',
			'		out = append(out, prev+".viewDidDisappear")',
			'	}',
			'	out = append(out, next+".viewDidAppear")',
			'	return out',
			'}',
			'',
			'// PopCallbacks mirrors the push — same alternation, roles swapped —',
			'// with two teaching points encoded: "below" gets NO viewDidLoad (its',
			'// view never left memory while it sat under the top VC), and the',
			'// deinit comes LAST, after the transition completes, because the nav',
			'// stack\'s strong reference is what kept the popped VC alive through',
			'// its own exit animation.',
			'func PopCallbacks(top, below string, topDeallocs bool) []string {',
			'	out := []string{',
			'		top + ".viewWillDisappear",',
			'		below + ".viewWillAppear",',
			'		top + ".viewDidDisappear",',
			'		below + ".viewDidAppear",',
			'	}',
			'	if topDeallocs {',
			'		out = append(out, top+".deinit")',
			'	}',
			'	return out',
			'}',
			'',
			'// inst is one view controller INSTANCE\'s bookkeeping — deliberately',
			'// instance-scoped, not name-scoped, because the whole viewDidLoad',
			'// story is about instance identity: pop deallocates the instance, so',
			'// the next push:X is a NEW object that must load again; a retained',
			'// instance keeps its loaded view and skips the load.',
			'type inst struct {',
			'	name     string',
			'	loaded   bool // viewDidLoad has run: the view is in memory',
			'	retained bool // an external strong ref keeps it alive after pop/dismiss',
			'}',
			'',
			'// Trace folds a navigation session into the exact console trace. State',
			'// is a nav stack of instances plus at most one presented modal (chains',
			'// are the next item\'s model). The retained-pool map is only ever',
			'// looked up by name, never iterated, so the trace stays deterministic.',
			'func Trace(events []string) []string {',
			'	log := []string{}',
			'	stack := []*inst{}',
			'	var modal *inst',
			'	modalStyle := ""',
			'	pool := map[string]*inst{} // retained instances that survived a pop',
			'',
			'	// visible is the VC a present() would cover: the modal if one is',
			'	// up, else the top of the nav stack, else nobody ("").',
			'	visible := func() string {',
			'		if modal != nil {',
			'			return modal.name',
			'		}',
			'		if len(stack) > 0 {',
			'			return stack[len(stack)-1].name',
			'		}',
			'		return ""',
			'	}',
			'	// instantiate reuses a retained, still-loaded instance if one',
			'	// exists — the coordinator-held-VC pattern — else it "allocs" a',
			'	// fresh one whose view has never loaded.',
			'	instantiate := func(name string) *inst {',
			'		if kept, ok := pool[name]; ok {',
			'			delete(pool, name)',
			'			return kept',
			'		}',
			'		return &inst{name: name}',
			'	}',
			'',
			'	for _, ev := range events {',
			'		parts := strings.Split(ev, ":")',
			'		switch parts[0] {',
			'		case "push":',
			'			vc := instantiate(parts[1])',
			'			log = append(log, PushCallbacks(visible(), vc.name, !vc.loaded)...)',
			'			vc.loaded = true',
			'			stack = append(stack, vc)',
			'		case "pop":',
			'			// A nav controller refuses to pop its root — the real',
			'			// popViewController returns nil and nothing happens.',
			'			if len(stack) < 2 {',
			'				continue',
			'			}',
			'			top := stack[len(stack)-1]',
			'			below := stack[len(stack)-2]',
			'			log = append(log, PopCallbacks(top.name, below.name, !top.retained)...)',
			'			stack = stack[:len(stack)-1]',
			'			if top.retained {',
			'				// The instance survives, view still loaded: a later',
			'				// push reuses it with no second viewDidLoad.',
			'				pool[top.name] = top',
			'			}',
			'		case "retain":',
			'			// Mark the CURRENT instance named X, wherever it lives.',
			'			// No callbacks: taking a strong reference is invisible',
			'			// to the appearance machinery.',
			'			for _, vc := range stack {',
			'				if vc.name == parts[1] {',
			'					vc.retained = true',
			'				}',
			'			}',
			'			if modal != nil && modal.name == parts[1] {',
			'				modal.retained = true',
			'			}',
			'		case "present":',
			'			if modal != nil {',
			'				continue // single-modal model; chains are the next item',
			'			}',
			'			vc := instantiate(parts[1])',
			'			if parts[2] == "fullScreen" {',
			'				// Full coverage: the presenter genuinely disappears,',
			'				// so the callbacks are push-shaped.',
			'				log = append(log, PushCallbacks(visible(), vc.name, !vc.loaded)...)',
			'			} else {',
			'				// pageSheet: the presenter stays visible under the',
			'				// card, so it is NOT told anything — only the sheet',
			'				// itself loads and appears. This is the iOS 13',
			'				// default, and the silent flip that broke every',
			'				// willAppear/willDisappear-paired timer in 2019.',
			'				if !vc.loaded {',
			'					log = append(log, vc.name+".viewDidLoad")',
			'				}',
			'				log = append(log, vc.name+".viewWillAppear", vc.name+".viewDidAppear")',
			'			}',
			'			vc.loaded = true',
			'			modal = vc',
			'			modalStyle = parts[2]',
			'		case "dismiss":',
			'			if modal == nil {',
			'				continue',
			'			}',
			'			presenter := ""',
			'			if len(stack) > 0 {',
			'				presenter = stack[len(stack)-1].name',
			'			}',
			'			if modalStyle == "fullScreen" {',
			'				log = append(log, PopCallbacks(modal.name, presenter, !modal.retained)...)',
			'			} else {',
			'				// The sheet slides away; the presenter never left, so',
			'				// it gets no appear pair — only the sheet\'s own',
			'				// disappear pair and (unless retained) its deinit.',
			'				log = append(log, modal.name+".viewWillDisappear", modal.name+".viewDidDisappear")',
			'				if !modal.retained {',
			'					log = append(log, modal.name+".deinit")',
			'				}',
			'			}',
			'			if modal.retained {',
			'				pool[modal.name] = modal',
			'			}',
			'			modal = nil',
			'			modalStyle = ""',
			'		}',
			'	}',
			'	return log',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The ordering is real — and it has changed before</h3>' +
			'<p>The push interleaving you pinned is the iOS 11+ order, and the ' +
			'<code>B.viewDidLoad</code>-first detail is not folklore: before iOS 11 ' +
			'UIKit fired <code>A.viewWillDisappear</code> <em>before</em> loading ' +
			'B\'s view, and the flip broke apps that passed data &ldquo;at the last ' +
			'moment&rdquo; from A\'s <code>viewWillDisappear</code> into B\'s ' +
			'not-yet-loaded outlets. Apple\'s own answer on the developer forums, ' +
			'when asked which order is guaranteed: none — the cross-controller ' +
			'interleaving is an internal detail that <em>&ldquo;will vary from ' +
			'version to version of the iOS SDK&rdquo;</em>. The durable contract is ' +
			'per-controller: load once, will before did, appear and disappear ' +
			'strictly alternating. Depend on the interleaving for resource handoff ' +
			'and you have written the next iOS-11-style regression. (iOS 17 wedged ' +
			'a new callback, <code>viewIsAppearing</code>, between ' +
			'<code>viewWillAppear</code> and <code>viewDidAppear</code> — the ' +
			'machine still grows edges.)</p>' +
			'<h3>Where each rule bites in production</h3>' +
			'<ul>' +
			'<li><strong>viewDidLoad is per-instance, and instances die on pop.</strong> ' +
			'&ldquo;Why does my table refetch every time I navigate back and ' +
			'forth?&rdquo; — because each push builds a fresh VC and its ' +
			'<code>viewDidLoad</code> fetch runs again. The fixes are exactly the ' +
			'model\'s two levers: retain the instance (a coordinator holding the VC, ' +
			'as <code>retain:</code> models) or move the state out of the VC ' +
			'entirely. Conversely, doing setup in <code>viewWillAppear</code> ' +
			'&ldquo;because it always runs&rdquo; means re-running it on every ' +
			'back-swipe.</li>' +
			'<li><strong><code>deinit</code> is your leak detector.</strong> The ' +
			'trace ends with <code>B.deinit</code> because the nav stack held the ' +
			'only strong reference. When that print stops appearing after a pop, ' +
			'something else is retaining the VC — almost always a closure that ' +
			'captured <code>self</code> strongly (the ARC item\'s delegate cycle). ' +
			'Instrumented <code>deinit</code> prints are the cheapest memory-debugging ' +
			'tool on the platform.</li>' +
			'<li><strong>The sheet default is a behavior change, not a style ' +
			'change.</strong> Since iOS 13, <code>present(_:animated:)</code> ' +
			'defaults to <code>.pageSheet</code> on iPhone portrait — and the ' +
			'presenter\'s <code>viewWillDisappear</code>/<code>viewDidDisappear</code> ' +
			'simply do not fire, nor the appear pair on dismissal. Code pairing ' +
			'start/stop across those callbacks (timers, video, analytics, KVO) ' +
			'silently double-runs. Opting back with ' +
			'<code>modalPresentationStyle = .fullScreen</code> restores the pinned ' +
			'push-shaped pairs.</li>' +
			'</ul>' +
			'<h3>What the model simplifies</h3>' +
			'<p>Real UIKit runs the did-pair from the transition coordinator\'s ' +
			'completion, so wall-clock time passes inside each pinned sequence — ' +
			'and an interactive back-swipe can <em>cancel</em> mid-transition, ' +
			'giving <code>viewWillDisappear</code> followed by ' +
			'<code>viewWillAppear</code> on the same VC with no did-pair between. ' +
			'The layout callbacks (<code>viewWillLayoutSubviews</code> / ' +
			'<code>viewDidLayoutSubviews</code>) interleave with appearance and can ' +
			'fire many times; they are omitted here. And ' +
			'<code>loadView</code>/<code>viewDidLoad</code> can be triggered early ' +
			'by any stray <code>.view</code> access — the classic ' +
			'&ldquo;premature loading&rdquo; bug where touching ' +
			'<code>vc.view</code> in a configurator fires ' +
			'<code>viewDidLoad</code> before the push. The state machine you built ' +
			'is the invariant skeleton those details hang off.</p>',
		],
		complexity: { time: 'O(1) per event — constant callback emission; O(n) to fold an n-event trace', space: 'O(d) for the nav stack and retained pool' },
	});
})();
