/* Auto Layout: Priorities, Hugging & Compression — UI: SwiftUI, Lists &
 * Layout (Hard). One horizontal axis, two labels pinned edge-to-edge with
 * margins and spacing: available = W − 2M − S, and the engine's verdict is
 * pure priority arbitration — slack goes to the label with LOWER content-
 * hugging priority, deficit is taken from the label with LOWER compression
 * resistance, and a tie on the deciding priority is Xcode's "Content
 * Priority Ambiguity". The harness pins the computed arithmetic (390pt
 * cell, 16pt margins, 8pt spacing: 120+260 intrinsics truncate the 749-CR
 * label to exactly 230) and that the OTHER priority never matters: hugging
 * decides only slack, resistance decides only overflow.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// The one-axis layout: margins and spacing are required constraints, so
	// only `available` is negotiable, and the two intrinsic sizes fight
	// over it by priority. Marker id namespaced (dgArrowIOSAL) because
	// every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 206" width="520" height="206" role="img" aria-label="a container of width W holds two labels: margin M, label one, spacing S, label two, margin M. available = W minus 2M minus S. Slack stretches the lower-hugging label; deficit truncates the lower-compression-resistance label.">' +
		'<text x="20" y="22" class="lbl">one axis, required edges: only available = W − 2M − S is negotiable</text>' +
		// container
		'<rect x="30" y="36" width="460" height="52" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="484" y="30" text-anchor="end" class="lbl">container width W = 390</text>' +
		// margins + labels + spacing
		'<rect x="62" y="46" width="130" height="32" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="127" y="67" text-anchor="middle">name (120)</text>' +
		'<rect x="216" y="46" width="242" height="32" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="337" y="67" text-anchor="middle">handle (intrinsic 260)</text>' +
		'<text x="46" y="67" text-anchor="middle" class="lbl">M</text>' +
		'<text x="204" y="67" text-anchor="middle" class="lbl">S</text>' +
		'<text x="474" y="67" text-anchor="middle" class="lbl">M</text>' +
		'<text x="20" y="110" class="lbl">available = 390 − 32 − 8 = 350 · intrinsics sum to 380 → deficit 30: somebody must shrink</text>' +
		// arbitration arrows
		'<path d="M 337 116 L 337 140" stroke="var(--warn)" stroke-width="1.8" marker-end="url(#dgArrowIOSAL)"/>' +
		'<text x="20" y="158" class="lbl" style="fill:var(--warn)">overflow → LOWER compression resistance truncates: handle (749) vs name (750) → handle = 350 − 120 = 230</text>' +
		'<text x="20" y="178" class="lbl" style="fill:var(--accent)">slack → LOWER content hugging stretches (hugging never decides overflow, resistance never decides slack)</text>' +
		'<text x="20" y="198" class="lbl">tie on the DECIDING priority → ambiguous: Xcode\'s “Content Priority Ambiguity”</text>' +
		'<defs><marker id="dgArrowIOSAL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'autolayout-engine',
		title: 'Auto Layout: Priorities, Hugging & Compression',
		nav: 'autolayout engine',
		difficulty: 'Hard',
		category: 'UI: SwiftUI, Lists & Layout',
		task: 'Implement Solve for one axis: available = W − 2M − S; slack stretches the lower-hugging label, overflow truncates the lower-compression-resistance label, and a tie on the deciding priority is ambiguous.',

		prose: [
			'<h2>Auto Layout: Priorities, Hugging &amp; Compression</h2>' +
			'<p>The profile cell has two labels on one line — a name and a ' +
			'handle — pinned leading to trailing with 16pt margins and 8pt ' +
			'between. It ships, and then the war starts: with short text the ' +
			'<em>name</em> mysteriously stretches, gluing the handle to the right ' +
			'edge with a lake of space after the name; with a long handle the ' +
			'<em>name</em> gets truncated to “Ada Lo…” while the disposable ' +
			'handle text stays whole. Both are the same bug: nobody told the ' +
			'engine <strong>which label should lose</strong>.</p>',
			{ lang: 'swift', code: 'let name = UILabel()      // "Ada Lovelace"  — intrinsic width 120\nlet handle = UILabel()    // "@ada · 2h ago" — intrinsic width up to 260\n\nNSLayoutConstraint.activate([\n    name.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),\n    handle.leadingAnchor.constraint(equalTo: name.trailingAnchor, constant: 8),\n    handle.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),\n])\n// Every edge is REQUIRED (priority 1000). The labels\' widths are not\n// constraints you wrote — they come from intrinsicContentSize, enforced\n// at two OPTIONAL priorities per label:\n//   content hugging          (default 251 for UILabel): "don\'t stretch me"\n//   compression resistance   (default 750 for UILabel): "don\'t squeeze me"' },
			'<p>The engine’s arithmetic on this axis is small enough to hold in ' +
			'your head. The required edges eat their share first: ' +
			'<code>available = W − 2M − S</code>. Then the two intrinsic widths ' +
			'are compared against it:</p>' +
			'<ul>' +
			'<li><strong>Exact fit</strong> (<code>sum == available</code>): both ' +
			'labels sit at intrinsic width. Nothing to arbitrate.</li>' +
			'<li><strong>Slack</strong> (<code>sum &lt; available</code>): ' +
			'someone must grow beyond intrinsic. Growing violates a ' +
			'<em>hugging</em> constraint, so the engine breaks the cheaper one: ' +
			'the label with <strong>lower hugging priority</strong> absorbs all ' +
			'the slack. Equal hugging → <strong>ambiguous</strong>: two equally ' +
			'cheap solutions, and the engine picks one arbitrarily.</li>' +
			'<li><strong>Overflow</strong> (<code>sum &gt; available</code>): ' +
			'someone must shrink. Shrinking violates a <em>compression ' +
			'resistance</em> constraint; the label with <strong>lower ' +
			'resistance</strong> is truncated to exactly ' +
			'<code>available − other.intrinsic</code> (floored at 0). Equal ' +
			'resistance → ambiguous again.</li>' +
			'</ul>' +
			'<p>Ambiguity is not a crash and not a console warning — the layout ' +
			'“works”, differently on different runs. Xcode surfaces it in ' +
			'Interface Builder as <strong>Content Priority Ambiguity</strong>, ' +
			'and at runtime in the view debugger and lldb:</p>',
			{ lang: 'txt', code: '(lldb) po UIWindow.keyWindow?.value(forKey: "_autolayoutTrace")\nUIWindow:0x7f9b2bd07350\n|   •UITableViewCellContentView:0x7f9b2be0a5c0\n|   |   *UILabel:0x7f9b2be0b170 \'Ada Lovelace\' - AMBIGUOUS LAYOUT\n|   |     for UILabel:0x7f9b2be0b170.minX{id: 31}, UILabel:0x7f9b2be0b170.Width{id: 34}\n|   |   *UILabel:0x7f9b2be0c010 \'@ada · 2h ago\' - AMBIGUOUS LAYOUT ...\n\n// The fix is one line per axis of doubt — decide the loser yourself:\n// handle.setContentHuggingPriority(.defaultLow, for: .horizontal)   // 250 < 251: handle stretches\n// handle.setContentCompressionResistancePriority(UILayoutPriority(749), for: .horizontal)' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Solve(w, m, s, a, b)</code> returning ' +
			'<code>(widthA, widthB, verdict)</code> with verdicts ' +
			'<code>intrinsic</code>, <code>stretched:&lt;Name&gt;</code>, ' +
			'<code>truncated:&lt;Name&gt;</code>, or <code>ambiguous</code> ' +
			'(on ambiguity, return both intrinsic widths — the model’s stand-in ' +
			'for “the engine picked something you didn’t choose”). Note which ' +
			'priority is consulted when: <em>hugging decides only slack, ' +
			'resistance decides only overflow</em> — a wildly low hugging value ' +
			'changes nothing in an overflow case, and the harness checks exactly ' +
			'that.</p>' +
			'<div class="tip">Why is UILabel’s default hugging 251, not the ' +
			'plain-view 250? So that in a label-next-to-plain-UIView row the ' +
			'<em>spacer view</em> stretches and the label doesn’t — the extra 1 ' +
			'is Apple pre-resolving the most common ambiguity for you. It is ' +
			'also why two <em>labels</em> tie at 251/251 and reintroduce it.</div>',
		],

		starter: [
			'package main',
			'',
			'// Label is one view on the axis, reduced to what the engine needs:',
			'//   Intrinsic  — intrinsicContentSize.width, in points',
			'//   Hugging    — content-hugging priority ("don\'t stretch me");',
			'//                UILabel default 251',
			'//   Resistance — compression-resistance priority ("don\'t squeeze',
			'//                me"); UILabel default 750',
			'type Label struct {',
			'	Name       string',
			'	Intrinsic  int',
			'	Hugging    int',
			'	Resistance int',
			'}',
			'',
			'// Solve lays out one horizontal axis: |M| a |S| b |M| inside width w,',
			'// all edges required. It returns a\'s width, b\'s width, and a verdict:',
			'//',
			'//   available = w - 2*m - s',
			'//   sum == available -> both intrinsic,           verdict "intrinsic"',
			'//   sum <  available -> the label with LOWER Hugging absorbs ALL the',
			'//                       slack (other stays intrinsic),',
			'//                                        verdict "stretched:<Name>"',
			'//                       equal Hugging  -> both intrinsic, "ambiguous"',
			'//   sum >  available -> the label with LOWER Resistance is truncated',
			'//                       to available - other.Intrinsic, floored at 0,',
			'//                                        verdict "truncated:<Name>"',
			'//                       equal Resistance -> both intrinsic, "ambiguous"',
			'//',
			'// Hugging is consulted ONLY on slack, Resistance ONLY on overflow —',
			'// each verdict reads exactly one of the two priorities.',
			'func Solve(w, m, s int, a, b Label) (int, int, string) {',
			'	// your code here',
			'	return 0, 0, ""',
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
			'	// sv formats one solve as "wA/wB verdict" so each case reads like',
			'	// a row of the arbitration table.',
			'	sv := func(w, m, s int, a, b Label) string {',
			'		wa, wb, verdict := Solve(w, m, s, a, b)',
			'		return fmt.Sprintf("%d/%d %s", wa, wb, verdict)',
			'	}',
			'	// lbl keeps the case literals compact.',
			'	lbl := func(name string, intrinsic, hug, cr int) Label {',
			'		return Label{Name: name, Intrinsic: intrinsic, Hugging: hug, Resistance: cr}',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"exact fit: 390pt cell, 16pt margins, 8pt spacing -> available 350; intrinsics 150+200 fill it precisely",',
			'			"150/200 intrinsic",',
			'			func() string { return sv(390, 16, 8, lbl("Name", 150, 251, 750), lbl("Handle", 200, 251, 750)) }},',
			'		{"slack: 120+60 in 350 leaves 170; Handle hugs at 251 vs Name\'s 252, so Handle stretches to 60+170 = 230",',
			'			"120/230 stretched:Handle",',
			'			func() string { return sv(390, 16, 8, lbl("Name", 120, 252, 750), lbl("Handle", 60, 251, 750)) }},',
			'		{"slack, both at the UILabel default 251: two equally cheap solutions — Content Priority Ambiguity",',
			'			"120/60 ambiguous",',
			'			func() string { return sv(390, 16, 8, lbl("Name", 120, 251, 750), lbl("Handle", 60, 251, 750)) }},',
			'		{"overflow: 120+260 in 350 is 30 over; Handle\'s resistance lowered to 749 -> Handle truncates to 350-120 = 230",',
			'			"120/230 truncated:Handle",',
			'			func() string { return sv(390, 16, 8, lbl("Name", 120, 251, 750), lbl("Handle", 260, 251, 749)) }},',
			'		{"same overflow, the other loser: Name at 749 truncates to 350-260 = 90 — the \\"Ada Lo...\\" bug, chosen on purpose",',
			'			"90/260 truncated:Name",',
			'			func() string { return sv(390, 16, 8, lbl("Name", 120, 251, 749), lbl("Handle", 260, 251, 750)) }},',
			'		{"overflow, both at the default 750: the engine must pick a victim itself — ambiguous",',
			'			"120/260 ambiguous",',
			'			func() string { return sv(390, 16, 8, lbl("Name", 120, 251, 750), lbl("Handle", 260, 251, 750)) }},',
			'		{"hugging NEVER decides overflow: wild hugging values (1 vs 1000) change nothing — resistance 749 still picks Handle",',
			'			"120/230 truncated:Handle",',
			'			func() string { return sv(390, 16, 8, lbl("Name", 120, 1, 750), lbl("Handle", 260, 1000, 749)) }},',
			'		{"resistance NEVER decides slack: Name hugs less (250) and stretches to 350-60 = 290, whatever the CRs say",',
			'			"290/60 stretched:Name",',
			'			func() string { return sv(390, 16, 8, lbl("Name", 120, 250, 1), lbl("Handle", 60, 251, 1000)) }},',
			'		{"crushed to zero: 300pt cell -> available 260, exactly Title\'s intrinsic; the 749-CR Badge is truncated to 0",',
			'			"0/260 truncated:Badge",',
			'			func() string { return sv(300, 16, 8, lbl("Badge", 40, 251, 749), lbl("Title", 260, 251, 750)) }},',
			'		{"the margins do real work: 414pt cell, 20pt margins, 12pt spacing -> available 362; slack 62 goes to Handle: 262",',
			'			"100/262 stretched:Handle",',
			'			func() string { return sv(414, 20, 12, lbl("Name", 100, 252, 750), lbl("Handle", 200, 251, 750)) }},',
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
			'// Label is one view on the axis: intrinsic width plus the two',
			'// optional priorities that defend it — Hugging against stretching,',
			'// Resistance against squeezing.',
			'type Label struct {',
			'	Name       string',
			'	Intrinsic  int',
			'	Hugging    int',
			'	Resistance int',
			'}',
			'',
			'// Solve is the one-axis engine. The structure mirrors how the real',
			'// solver experiences this layout: the required constraints (edges,',
			'// margins, spacing) are non-negotiable, so they are folded into a',
			'// single number first — available — and only then do the OPTIONAL',
			'// constraints (two intrinsic widths, each held at two priorities)',
			'// compete for it. Exactly one comparison direction consults exactly',
			'// one priority pair: growing breaks a hugging constraint, shrinking',
			'// breaks a resistance constraint, and the engine always breaks the',
			'// CHEAPEST constraint that resolves the conflict.',
			'func Solve(w, m, s int, a, b Label) (int, int, string) {',
			'	available := w - 2*m - s',
			'	sum := a.Intrinsic + b.Intrinsic',
			'',
			'	if sum == available {',
			'		// No optional constraint needs breaking; every view gets its',
			'		// intrinsic wish. (This is the case Interface Builder shows',
			'		// with no warnings at all — and the case that evaporates the',
			'		// moment localization changes a string length.)',
			'		return a.Intrinsic, b.Intrinsic, "intrinsic"',
			'	}',
			'',
			'	if sum < available {',
			'		// SLACK. Someone must exceed intrinsic width, which violates',
			'		// a hugging constraint. Lower priority = cheaper to break =',
			'		// that label stretches, and it takes ALL the slack — the',
			'		// winner\'s hugging constraint holds exactly, so the winner',
			'		// stays at intrinsic. Resistance is never consulted here.',
			'		if a.Hugging == b.Hugging {',
			'			// Equal cost both ways: the system is under-determined.',
			'			// The real engine still returns SOME layout (breaking',
			'			// ties arbitrarily); returning the intrinsics is this',
			'			// model\'s deterministic stand-in, with the verdict',
			'			// carrying the diagnosis.',
			'			return a.Intrinsic, b.Intrinsic, "ambiguous"',
			'		}',
			'		if a.Hugging < b.Hugging {',
			'			return available - b.Intrinsic, b.Intrinsic, "stretched:" + a.Name',
			'		}',
			'		return a.Intrinsic, available - a.Intrinsic, "stretched:" + b.Name',
			'	}',
			'',
			'	// OVERFLOW. Someone must shrink below intrinsic width, violating a',
			'	// compression-resistance constraint — again the cheaper one loses.',
			'	// The loser is cut to exactly what the winner leaves behind',
			'	// (available - winner\'s intrinsic): the winner\'s resistance holds',
			'	// completely, the loser absorbs the entire deficit. That all-or-',
			'	// nothing split is real Auto Layout behavior, not proportional',
			'	// sharing — priorities are an ORDER, not weights.',
			'	if a.Resistance == b.Resistance {',
			'		return a.Intrinsic, b.Intrinsic, "ambiguous"',
			'	}',
			'	if a.Resistance < b.Resistance {',
			'		wa := available - b.Intrinsic',
			'		if wa < 0 {',
			'			// The deficit exceeds the loser\'s whole width: a label',
			'			// cannot be negative pixels wide, so it bottoms out at 0.',
			'			// (Past this point the real engine would start breaking',
			'			// the NEXT-cheapest constraint; out of scope here.)',
			'			wa = 0',
			'		}',
			'		return wa, b.Intrinsic, "truncated:" + a.Name',
			'	}',
			'	wb := available - a.Intrinsic',
			'	if wb < 0 {',
			'		wb = 0',
			'	}',
			'	return a.Intrinsic, wb, "truncated:" + b.Name',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What the real engine is</h3>' +
			'<p>Auto Layout is a <strong>Cassowary</strong> solver (the same ' +
			'linear-arithmetic constraint algorithm behind many UI toolkits) fed ' +
			'with your constraints plus two the system synthesizes per view per ' +
			'axis from <code>intrinsicContentSize</code>: ' +
			'<code>width &gt;= intrinsic</code> held at the compression-resistance ' +
			'priority, and <code>width &lt;= intrinsic</code> held at the hugging ' +
			'priority. Priorities 1–999 are <em>optional</em> constraints the ' +
			'solver satisfies in priority order, breaking cheap ones to save ' +
			'expensive ones; 1000 (<code>.required</code>) must hold or you get ' +
			'the <em>other</em> famous console message — ' +
			'<code>Unable to simultaneously satisfy constraints</code>, followed ' +
			'by the engine breaking one of yours at random to carry on. Keep the ' +
			'two failure modes straight: <strong>unsatisfiable</strong> is too ' +
			'many required constraints (loud, logs a wall of text), ' +
			'<strong>ambiguous</strong> is too few decisive ones (silent, flips ' +
			'between runs). Your <code>Solve</code> models the second.</p>' +
			'<h3>The API names to remember</h3>' +
			'<p><code>setContentHuggingPriority(_:for:)</code> and ' +
			'<code>setContentCompressionResistancePriority(_:for:)</code>, per ' +
			'axis. The default ladder is deliberate: plain views hug at 250, ' +
			'<code>UILabel</code>/<code>UIButton</code> at 251 (so a lone spacer ' +
			'view loses to a label automatically), and everything resists ' +
			'compression at 750. The idiomatic fix is relative, not absolute: ' +
			'<code>.defaultLow&nbsp;−&nbsp;1</code>, “one less than my neighbor”, ' +
			'because what matters is only the <em>order</em> — as your ' +
			'harness proved, the numbers 1 vs 1000 and 250 vs 251 produce ' +
			'identical layouts.</p>' +
			'<h3>Where this model simplifies</h3>' +
			'<ul>' +
			'<li><strong>Two views, one axis, integer points.</strong> The real ' +
			'solver handles arbitrary view counts, simultaneous axes, fractional ' +
			'points, and inequality chains; with more than two optional ' +
			'constraints in play it breaks them cheapest-first rather than ' +
			'pairwise.</li>' +
			'<li><strong>Ambiguity returns intrinsics here.</strong> The real ' +
			'engine always produces <em>some</em> frame (deterministic per run, ' +
			'unpredictable across code changes) — ' +
			'<code>hasAmbiguousLayout</code> and ' +
			'<code>exerciseAmbiguityInLayout()</code> exist precisely because you ' +
			'cannot see the problem in a single screenshot.</li>' +
			'<li><strong>Truncation is really the label’s doing.</strong> The ' +
			'engine just hands the label a too-small width; ' +
			'<code>lineBreakMode</code> (default <code>.byTruncatingTail</code>) ' +
			'renders the “Ada Lo…”. Multi-line labels add ' +
			'<code>preferredMaxLayoutWidth</code> and a second measurement pass — ' +
			'a different war story.</li>' +
			'<li><strong>SwiftUI kept the idea, renamed the knobs:</strong> ' +
			'<code>.fixedSize()</code> is maximal hugging + resistance, ' +
			'<code>.layoutPriority(_:)</code> is the ordering, and HStack slack ' +
			'arbitration is the same lower-priority-loses game you just ' +
			'implemented.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(1) — one subtraction and a two-way priority comparison', space: 'O(1)' },
	});
})();
