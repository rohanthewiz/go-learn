/* MeasureSpec — UI: Lists, Compose & Layout (Medium). The 9-case
 * negotiation in ViewGroup.getChildMeasureSpec: the parent's constraint
 * meets the child's LayoutParams and produces the spec the child must
 * answer in onMeasure. The harness pins the full AOSP table (with
 * available = max(0, parentSize - padding)), the child's ResolveSize vote,
 * and the dp->px rounding rule int(dp*density + 0.5) — including the 1dp
 * hairline that comes out 3px, not 2, at density 2.625.
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// Constraints flow down (one MeasureSpec per child), measured sizes flow
	// back up through setMeasuredDimension. Marker ids namespaced
	// (dgArrowAndMS / dgArrowAndMSup) because every track's SVGs share the
	// page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 214" width="520" height="214" role="img" aria-label="the parent sends a MeasureSpec (mode and size) down to the child; the child answers with setMeasuredDimension, honoring the mode via resolveSize">' +
		'<text x="20" y="22" class="lbl">the measure pass: constraints go DOWN, one child at a time; sizes come back UP</text>' +
		'<rect x="40" y="34" width="440" height="34" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="260" y="56" text-anchor="middle">parent ViewGroup — own MeasureSpec + padding + child LayoutParams</text>' +
		// down arrow: the derived child spec
		'<path d="M 110 72 L 110 146" stroke="var(--accent)" stroke-width="1.8" marker-end="url(#dgArrowAndMS)"/>' +
		'<text x="102" y="100" text-anchor="end" class="lbl">getChildMeasureSpec</text>' +
		'<text x="102" y="114" text-anchor="end" class="lbl">(mode, size)</text>' +
		// the table, condensed
		'<text x="268" y="92" text-anchor="middle" class="lbl">fixed px → (EXACTLY, px) — no negotiation at all</text>' +
		'<text x="268" y="108" text-anchor="middle" class="lbl">EXACTLY + match_parent → EXACTLY · EXACTLY + wrap_content → AT_MOST</text>' +
		'<text x="268" y="124" text-anchor="middle" class="lbl">AT_MOST + either → AT_MOST · UNSPECIFIED + either → (UNSPECIFIED, 0)</text>' +
		'<text x="268" y="140" text-anchor="middle" class="lbl">size = available = max(0, parentSize − padding)</text>' +
		// up arrow: the child's answer
		'<path d="M 410 146 L 410 72" stroke="var(--ok)" stroke-width="1.8" marker-end="url(#dgArrowAndMSup)"/>' +
		'<text x="418" y="100" class="lbl">measured size</text>' +
		'<text x="418" y="114" class="lbl">back UP</text>' +
		'<rect x="140" y="150" width="240" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="260" y="172" text-anchor="middle">child View.onMeasure(spec)</text>' +
		'<text x="20" y="206" class="lbl">the child must honor every mode — ResolveSize(desired, mode, size) is that answer</text>' +
		'<defs>' +
		'<marker id="dgArrowAndMS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowAndMSup" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'measure-spec',
		title: 'MeasureSpec: The 9-Case Negotiation',
		nav: 'measure spec',
		difficulty: 'Medium',
		category: 'UI: Lists, Compose & Layout',
		task: 'Implement ChildMeasureSpec (the 9-case getChildMeasureSpec table), ResolveSize (the child\'s final vote), and DpToPx (round-half-up AOSP conversion).',

		prose: [
			'<h2>MeasureSpec: The 9-Case Negotiation</h2>' +
			'<p>The custom badge view looked perfect in its demo app. Dropped into a ' +
			'real screen it paints 300px wide inside a column that gave it the full ' +
			'width, overlaps its neighbors inside a RecyclerView row, and collapses ' +
			'to nothing inside a ScrollView. The demo never exercised the contract ' +
			'the view is breaking:</p>',
			{ lang: 'kotlin', code: 'class BadgeView(ctx: Context) : View(ctx) {\n    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {\n        // BUG: ignores the spec entirely — claims 300x300 no matter\n        // what the parent just told it.\n        setMeasuredDimension(300, 300)\n    }\n}\n\n// The fix: desire a size, then let the spec have the last word.\noverride fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {\n    val desired = dpToPx(48f)\n    setMeasuredDimension(\n        resolveSize(desired, widthMeasureSpec),\n        resolveSize(desired, heightMeasureSpec),\n    )\n}' },
			'<p>Every measure pass is a negotiation. The parent walks its children ' +
			'and, for each one, combines <strong>its own constraint</strong> (a ' +
			'<code>MeasureSpec</code>: a mode and a size packed into one int — mode ' +
			'in the top 2 bits) with <strong>the child’s ' +
			'<code>LayoutParams</code></strong> (a fixed px value, ' +
			'<code>match_parent</code>, or <code>wrap_content</code>). The result — ' +
			'computed by <code>ViewGroup.getChildMeasureSpec</code> — is the spec ' +
			'the child’s <code>onMeasure</code> receives. Three parent modes × three ' +
			'child params = the 9-case table, with ' +
			'<code>available = max(0, parentSize − padding)</code>:</p>' +
			'<ul>' +
			'<li><strong>Fixed px</strong> → <code>(EXACTLY, px)</code> under every ' +
			'parent mode. A number is a number; nothing to negotiate.</li>' +
			'<li><strong>Parent EXACTLY</strong> (it knows its size): ' +
			'<code>match_parent</code> → <code>(EXACTLY, available)</code> — the ' +
			'child is <em>told</em> its size; <code>wrap_content</code> → ' +
			'<code>(AT_MOST, available)</code> — be whatever you like, up to the ' +
			'space.</li>' +
			'<li><strong>Parent AT_MOST</strong> (it is itself wrapping): both ' +
			'<code>match_parent</code> and <code>wrap_content</code> → ' +
			'<code>(AT_MOST, available)</code> — a parent that cannot promise its ' +
			'own size cannot promise the child’s either.</li>' +
			'<li><strong>Parent UNSPECIFIED</strong> (a ScrollView measuring its ' +
			'scrolling axis): both → <code>(UNSPECIFIED, 0)</code> — how big would ' +
			'you like to be, money no object?</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>ChildMeasureSpec</code> (the table above), ' +
			'<code>ResolveSize</code> — the child’s final vote: ' +
			'<code>EXACTLY</code> → the spec’s size, <code>AT_MOST</code> → ' +
			'<code>min(desired, size)</code>, <code>UNSPECIFIED</code> → ' +
			'<code>desired</code> — and <code>DpToPx</code>, AOSP’s density ' +
			'conversion: <code>int(dp*density + 0.5)</code>, round-half-up for ' +
			'non-negative dp.</p>' +
			'<div class="tip">That +0.5 is not a nicety: at a Pixel’s density of ' +
			'2.625, a 1dp hairline is <code>2.625 + 0.5 = 3.125 → 3px</code> — not ' +
			'the 2px a truncating cast would give. Divider widths that “randomly” ' +
			'differ across devices are almost always this line.</div>',
		],

		starter: [
			'package main',
			'',
			'// ChildMeasureSpec is ViewGroup.getChildMeasureSpec: the parent\'s',
			'// constraint (parentMode: "EXACTLY" | "AT_MOST" | "UNSPECIFIED", plus',
			'// parentSize in px and its padding) meets the child\'s LayoutParams',
			'// value (childParam: n>=0 exact px, -1 MATCH_PARENT, -2 WRAP_CONTENT)',
			'// and yields the (mode, size) spec the child\'s onMeasure receives.',
			'//',
			'// available = max(0, parentSize - padding), and the pinned table is:',
			'//   child n>=0            -> (EXACTLY, n)        under every parent mode',
			'//   EXACTLY  + MATCH_PARENT -> (EXACTLY, available)',
			'//   EXACTLY  + WRAP_CONTENT -> (AT_MOST, available)',
			'//   AT_MOST  + MATCH_PARENT -> (AT_MOST, available)',
			'//   AT_MOST  + WRAP_CONTENT -> (AT_MOST, available)',
			'//   UNSPECIFIED + either    -> (UNSPECIFIED, 0)',
			'func ChildMeasureSpec(parentMode string, parentSize, padding, childParam int) (string, int) {',
			'	// your code here',
			'	return "", 0',
			'}',
			'',
			'// ResolveSize is the child\'s final vote in onMeasure: it wants desired',
			'// px, but the spec has the last word:',
			'//   EXACTLY     -> size (the parent decided; desired is irrelevant)',
			'//   AT_MOST     -> min(desired, size)',
			'//   UNSPECIFIED -> desired',
			'func ResolveSize(desired int, mode string, size int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// DpToPx converts density-independent pixels to raw pixels the way',
			'// AOSP does for non-negative dp: int(dp*density + 0.5) — scale, then',
			'// round half up via truncation.',
			'func DpToPx(dp float64, density float64) int {',
			'	// your code here',
			'	return 0',
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
			'	// cm formats one negotiation as "MODE/size" so a whole table row',
			'	// fits in one case string.',
			'	cm := func(parentMode string, parentSize, padding, childParam int) string {',
			'		mode, size := ChildMeasureSpec(parentMode, parentSize, padding, childParam)',
			'		return fmt.Sprintf("%s/%d", mode, size)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"a fixed 100px child is non-negotiable: (EXACTLY, 100) under every parent mode",',
			'			"EXACTLY/100 EXACTLY/100 EXACTLY/100",',
			'			func() string {',
			'				return cm("EXACTLY", 1080, 0, 100) + " " + cm("AT_MOST", 600, 0, 100) + " " + cm("UNSPECIFIED", 0, 0, 100)',
			'			}},',
			'		{"EXACTLY 1080 parent with 32px padding + match_parent -> (EXACTLY, 1048): the child is TOLD its size",',
			'			"EXACTLY/1048",',
			'			func() string { return cm("EXACTLY", 1080, 32, -1) }},',
			'		{"EXACTLY 1080 parent with 32px padding + wrap_content -> (AT_MOST, 1048): be what you like, up to the space",',
			'			"AT_MOST/1048",',
			'			func() string { return cm("EXACTLY", 1080, 32, -2) }},',
			'		{"AT_MOST 600 parent + match_parent -> (AT_MOST, 600): a wrapping parent cannot promise exactness",',
			'			"AT_MOST/600",',
			'			func() string { return cm("AT_MOST", 600, 0, -1) }},',
			'		{"AT_MOST 600 parent with 16px padding + wrap_content -> (AT_MOST, 584)",',
			'			"AT_MOST/584",',
			'			func() string { return cm("AT_MOST", 600, 16, -2) }},',
			'		{"UNSPECIFIED parent (a ScrollView on its scrolling axis) -> (UNSPECIFIED, 0) for match_parent and wrap_content alike",',
			'			"UNSPECIFIED/0 UNSPECIFIED/0",',
			'			func() string { return cm("UNSPECIFIED", 800, 0, -1) + " " + cm("UNSPECIFIED", 800, 0, -2) }},',
			'		{"padding larger than the parent: available clamps at max(0, size-padding), never negative",',
			'			"EXACTLY/0",',
			'			func() string { return cm("EXACTLY", 40, 64, -1) }},',
			'		{"ResolveSize is the child\'s final vote: EXACTLY wins outright, AT_MOST caps, UNSPECIFIED defers to desired",',
			'			"200 200 300 300",',
			'			func() string {',
			'				return fmt.Sprintf("%d %d %d %d",',
			'					ResolveSize(300, "EXACTLY", 200),',
			'					ResolveSize(300, "AT_MOST", 200),',
			'					ResolveSize(300, "AT_MOST", 400),',
			'					ResolveSize(300, "UNSPECIFIED", 0))',
			'			}},',
			'		{"DpToPx: the 48dp touch target at Pixel density 2.625 lands on exactly 126px",',
			'			"126",',
			'			func() string { return fmt.Sprintf("%d", DpToPx(48, 2.625)) }},',
			'		{"DpToPx hairline surprise: 1dp at density 2.625 is 3px, not 2 — 2.625+0.5 = 3.125 truncates to 3",',
			'			"3",',
			'			func() string { return fmt.Sprintf("%d", DpToPx(1, 2.625)) }},',
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
			'// ChildMeasureSpec is ViewGroup.getChildMeasureSpec as a pure',
			'// function. The whole measure pass reduces to this table, so the',
			'// implementation is deliberately shaped LIKE the table: clamp once,',
			'// dispatch on the one non-negotiable case, then on the parent mode.',
			'func ChildMeasureSpec(parentMode string, parentSize, padding, childParam int) (string, int) {',
			'	// Padding is the parent\'s own chrome; children are only ever',
			'	// offered what is left. The clamp matters: a heavily padded tiny',
			'	// parent must offer 0, never a negative size (AOSP does exactly',
			'	// this max(0, ...) — a negative size would corrupt the packed',
			'	// spec int).',
			'	available := parentSize - padding',
			'	if available < 0 {',
			'		available = 0',
			'	}',
			'',
			'	// A concrete LayoutParams value ends the negotiation before it',
			'	// starts: android:layout_width="100px" measures 100 regardless of',
			'	// what the parent wanted. (This is also why hard-coded sizes are',
			'	// the ones that clip on small screens.)',
			'	if childParam >= 0 {',
			'		return "EXACTLY", childParam',
			'	}',
			'',
			'	matchParent := childParam == -1 // the only other legal value is -2, WRAP_CONTENT',
			'	switch parentMode {',
			'	case "EXACTLY":',
			'		// The parent knows its size, so it can make promises:',
			'		// match_parent inherits the certainty, wrap_content gets a',
			'		// firm ceiling.',
			'		if matchParent {',
			'			return "EXACTLY", available',
			'		}',
			'		return "AT_MOST", available',
			'	case "AT_MOST":',
			'		// The parent is itself being told "at most" — certainty',
			'		// cannot be manufactured, so BOTH child params degrade to',
			'		// AT_MOST. This is the row people forget: match_parent under',
			'		// a wrapping parent is a ceiling, not a guarantee.',
			'		return "AT_MOST", available',
			'	}',
			'	// UNSPECIFIED: the parent wants the child\'s unconstrained ideal',
			'	// (ScrollView measuring its scrolling axis). Size 0 is the pinned',
			'	// classic-table value — the size is meaningless in this mode and',
			'	// well-behaved children must not read anything into it.',
			'	return "UNSPECIFIED", 0',
			'}',
			'',
			'// ResolveSize is View.resolveSize: the child computed a desired size,',
			'// and the spec gets the last word. Note the asymmetry — EXACTLY',
			'// ignores desired entirely, which is why a fixed-size parent can',
			'// stretch or crush any child, and why ignoring the spec (the BadgeView',
			'// bug) only LOOKS fine under a permissive demo parent.',
			'func ResolveSize(desired int, mode string, size int) int {',
			'	switch mode {',
			'	case "EXACTLY":',
			'		return size',
			'	case "AT_MOST":',
			'		if desired < size {',
			'			return desired',
			'		}',
			'		return size',
			'	}',
			'	// UNSPECIFIED: money no object — the desired size stands.',
			'	return desired',
			'}',
			'',
			'// DpToPx is TypedValue.applyDimension for COMPLEX_UNIT_DIP, for',
			'// non-negative dp: scale by density, then round half UP by adding 0.5',
			'// before the truncating cast. The +0.5 is why a 1dp hairline is 3px',
			'// (not 2) at density 2.625: 2.625 + 0.5 = 3.125 truncates to 3.',
			'func DpToPx(dp float64, density float64) int {',
			'	return int(dp*density + 0.5)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Where each mode actually comes from</h3>' +
			'<p>The window gives the root view an <code>EXACTLY</code> spec (the ' +
			'screen is not negotiable), and modes degrade from there exactly per ' +
			'your table: an <code>EXACTLY</code> parent with a ' +
			'<code>wrap_content</code> child mints <code>AT_MOST</code>; any parent ' +
			'that is itself wrapping passes <code>AT_MOST</code> on. ' +
			'<code>UNSPECIFIED</code> is rarer and almost always means “a scrolling ' +
			'container is measuring its scrolling axis”: ScrollView, RecyclerView ' +
			'measuring children, a ListView row. That is why a view that works ' +
			'everywhere else “collapses to zero in a ScrollView” — its ' +
			'<code>onMeasure</code> returned 0 for a mode it never handled.</p>' +
			'<h3>The two classic bugs</h3>' +
			'<ul>' +
			'<li><strong>Ignoring the spec</strong> (the BadgeView): renders fine ' +
			'under a permissive demo parent, then overlaps or clips inside ' +
			'LinearLayout weights, RecyclerView rows, or anything ' +
			'<code>EXACTLY</code>. The contract is honored in one line: ' +
			'<code>setMeasuredDimension(resolveSize(desired, spec), …)</code> — and ' +
			'skipping <code>setMeasuredDimension</code> altogether throws ' +
			'<code>IllegalStateException</code> from <code>measure()</code>.</li>' +
			'<li><strong>Treating AT_MOST as EXACTLY</strong>: a wrap_content view ' +
			'that just returns the given size acts like match_parent, and every ' +
			'layout that hosts it grows to full width. AT_MOST is a ceiling; the ' +
			'view is supposed to want something and clamp.</li>' +
			'</ul>' +
			'<h3>Field notes</h3>' +
			'<p>One honesty note on the pinned table: it is the classic documented ' +
			'behavior, and pre-Marshmallow AOSP returned size 0 for ' +
			'<code>UNSPECIFIED</code> exactly as pinned; modern AOSP threads the ' +
			'available size through instead for apps targeting M+ ' +
			'(<code>sUseZeroUnspecifiedMeasureSpec</code>) — well-behaved children ' +
			'treat the size as advisory noise in this mode either way. The ' +
			'dp→px rounding, though, is load-bearing everywhere: ' +
			'<code>TypedValue.applyDimension</code> is your <code>DpToPx</code>, and ' +
			'the round-half-up explains why 0.5dp dividers show on some densities ' +
			'and vanish on others, and why designers’ redlines (a 48dp touch ' +
			'target) land on different pixel counts per device — 126px at 2.625, ' +
			'144px at 3.0. Double-taxation is the performance sequel to this item: ' +
			'every AT_MOST negotiation that fails to satisfy a parent forces a ' +
			'second measure pass over the subtree, which is the standard ' +
			'explanation for jank in deeply nested legacy layouts and a founding ' +
			'motivation for both ConstraintLayout and Compose’s ' +
			'single-pass-with-intrinsics measurement.</p>',
		],
		complexity: { time: 'O(1) — a table lookup and one multiply', space: 'O(1)' },
	});
})();
