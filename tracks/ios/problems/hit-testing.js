/* Hit-Testing & Touch Delivery — Touches & Permissions (Medium). UIKit's
 * hitTest(_:with:) recursion as a pure function over a view tree: eligibility
 * (hidden / alpha < 0.01 / interaction disabled prunes the whole subtree),
 * point(inside:) containment, topmost-child-first recursion with coordinate
 * conversion. The harness pins the classic child-outside-parent-bounds trap
 * (drawn but untappable), topmost-sibling-wins, and the disabled-view
 * fall-through to the sibling BELOW — not to nil.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// The trap this item is famous for: the ghost button is DRAWN outside its
	// parent's bounds (no clipping) but the parent's containment check fails
	// before children are ever consulted. Marker id namespaced (dgArrowIOSHT)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 250" width="560" height="250" role="img" aria-label="a card view with a button hanging below its bounds; the tap on the button never reaches it because the card fails point-inside first">' +
		'<text x="20" y="22" class="lbl">the classic: a child drawn OUTSIDE its parent\'s bounds is untappable</text>' +
		// card bounds
		'<rect x="60" y="44" width="220" height="130" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="74" y="66" class="lbl">card (parent bounds)</text>' +
		// ghost button, straddling the bottom edge
		'<rect x="170" y="150" width="100" height="50" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="220" y="180" text-anchor="middle">button</text>' +
		'<text x="288" y="196" text-anchor="start" class="lbl" style="fill:var(--warn)">visible (clipsToBounds = false)…</text>' +
		// tap
		'<circle cx="220" cy="190" r="5" fill="var(--warn)"/>' +
		'<path d="M 220 226 L 220 200" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowIOSHT)"/>' +
		'<text x="220" y="242" text-anchor="middle" class="lbl">tap lands below the card\'s bounds</text>' +
		// the explanation column
		'<text x="330" y="80" text-anchor="start" class="lbl">hitTest(card): point(inside:) is FALSE</text>' +
		'<text x="330" y="98" text-anchor="start" class="lbl">&#8594; card returns nil immediately —</text>' +
		'<text x="330" y="116" text-anchor="start" class="lbl">its subviews are never even asked.</text>' +
		'<text x="330" y="146" text-anchor="start" class="lbl">The tap falls through to whatever is</text>' +
		'<text x="330" y="164" text-anchor="start" class="lbl">behind: drawing and touchability are</text>' +
		'<text x="330" y="182" text-anchor="start" class="lbl">two DIFFERENT trees of truth.</text>' +
		'<defs><marker id="dgArrowIOSHT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'hit-testing',
		title: 'Hit-Testing: Who Gets the Touch?',
		nav: 'hit testing',
		difficulty: 'Medium',
		category: 'Touches & Permissions',
		task: 'Implement PointInside (bounds containment) and HitTest (UIKit\'s recursion: eligibility pruning, topmost-child-first with coordinate conversion, self as fallback).',

		prose: [
			'<h2>Hit-Testing: Who Gets the Touch?</h2>' +
			'<p>The bug report, filed against iOS apps roughly weekly since 2008: ' +
			'<em>&ldquo;the button is right there on screen and tapping it does ' +
			'nothing.&rdquo;</em> The button is real, visible, enabled — and hangs a ' +
			'few points below its parent card\'s bounds, drawn anyway because the ' +
			'card doesn\'t clip. Rendering and touch delivery are two different ' +
			'algorithms over the same tree, and only one of them cares about ' +
			'<code>clipsToBounds</code>. When a touch lands, UIKit runs one ' +
			'recursion from the window down — <code>hitTest(_:with:)</code> — and ' +
			'the view it returns is the one that gets the ' +
			'<code>touchesBegan</code>, the gesture recognizers, everything. The ' +
			'whole algorithm fits in a screenful, and it is one of the most-typed ' +
			'overrides in iOS history because overriding it is how you debug it:</p>',
			{ lang: 'swift', code: '// hitTest, as documented — override-and-print is the standard debugging move.\noverride func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {\n    // 1. Eligibility: an ineligible view rules out its ENTIRE subtree.\n    guard isUserInteractionEnabled, !isHidden, alpha >= 0.01 else { return nil }\n    // 2. Containment: outside my bounds -> nil, children never consulted.\n    guard self.point(inside: point, with: event) else { return nil }\n    // 3. Children, TOPMOST first (subviews array is back-to-front),\n    //    each asked in its own coordinate space.\n    for subview in subviews.reversed() {\n        let converted = subview.convert(point, from: self)\n        if let hit = subview.hitTest(converted, with: event) {\n            return hit\n        }\n    }\n    // 4. No child claimed it, but it is inside me -> I am the hit view.\n    return self\n}' },
			'<p>Four rules, each with a bug named after it:</p>' +
			'<ul>' +
			'<li><strong>Eligibility prunes subtrees.</strong> A view that is ' +
			'hidden, has <code>alpha &lt; 0.01</code>, or has ' +
			'<code>isUserInteractionEnabled = false</code> is skipped <em>along ' +
			'with everything inside it</em>. Fading a container to 0.005 for a ' +
			'&ldquo;disabled look&rdquo; silently kills every button in it — while ' +
			'0.5 keeps them all live, because the threshold is 0.01, not ' +
			'&ldquo;looks transparent&rdquo;.</li>' +
			'<li><strong>Containment gates the recursion.</strong> ' +
			'<code>point(inside:)</code> is a plain bounds check — min edge in, ' +
			'max edge out, CGRect containment. If it fails, the view returns ' +
			'<code>nil</code> <em>before looking at its children</em>. That single ' +
			'ordering decision is the outside-the-bounds trap above.</li>' +
			'<li><strong>Topmost child first.</strong> The <code>subviews</code> ' +
			'array is back-to-front, so the recursion walks it in ' +
			'<em>reverse</em>: overlapping siblings resolve to whichever is drawn ' +
			'on top.</li>' +
			'<li><strong>A miss falls through to the next sibling — not to ' +
			'nil.</strong> When the topmost sibling returns <code>nil</code> (it ' +
			'was disabled, say), the loop simply asks the next one down. A ' +
			'disabled overlay does not block touches; it is transparent to them — ' +
			'which is why a full-screen &ldquo;loading shield&rdquo; must keep ' +
			'interaction <em>enabled</em> to actually shield anything.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>PointInside(v, x, y)</code> — containment in the ' +
			'view\'s own coordinate space, <code>0 &le; x &lt; W</code> and ' +
			'<code>0 &le; y &lt; H</code> — and <code>HitTest(v, x, y)</code>, the ' +
			'full recursion. Coordinates arrive in <code>v</code>\'s own space; ' +
			'convert for each subview by subtracting the subview\'s origin (the ' +
			'model has no transforms). Return the hit view\'s name, or ' +
			'<code>""</code> for nil.</p>' +
			'<div class="tip">The model matches the documented algorithm but skips ' +
			'what real UIKit layers on top: transforms in ' +
			'<code>convert(_:from:)</code>, gesture-recognizer arbitration after ' +
			'the hit view is found, and the two-pass reality that ' +
			'<code>hitTest</code> may be called more than once per touch. The ' +
			'recursion itself — eligibility, containment, reverse-order children, ' +
			'self as fallback — is verbatim.</div>',
		],

		starter: [
			'package main',
			'',
			'// View is one node of the view tree.',
			'type View struct {',
			'	Name     string',
			'	X, Y     int     // frame origin, in the PARENT\'s coordinate space',
			'	W, H     int     // frame size',
			'	Hidden   bool    // isHidden',
			'	Alpha    float64 // hit-testing ignores the view (and subtree) below 0.01',
			'	Disabled bool    // isUserInteractionEnabled == false',
			'	Subviews []*View // back-to-front: the LAST entry is drawn topmost',
			'}',
			'',
			'// PointInside is point(inside:with:): plain bounds containment in the',
			'// view\'s OWN coordinate space — 0 <= x < W && 0 <= y < H (min edge',
			'// in, max edge out, exactly CGRect containment).',
			'func PointInside(v *View, x, y int) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// HitTest is hitTest(_:with:). (x, y) is in v\'s own coordinate space.',
			'// Pinned rules, in order:',
			'//   1. v Hidden, Alpha < 0.01, or Disabled -> "" (whole subtree pruned)',
			'//   2. !PointInside(v, x, y)               -> "" (children never asked)',
			'//   3. subviews in REVERSE array order (topmost first), each asked in',
			'//      its own space: (x - sub.X, y - sub.Y); first non-"" answer wins',
			'//   4. no child claimed it -> v.Name (v itself is the hit view)',
			'// Returns the hit view\'s Name, or "" for nil.',
			'func HitTest(v *View, x, y int) string {',
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
			'// demo builds the fixture screen. Geometry (all in parent coords):',
			'//',
			'//   root (0,0 400x800)',
			'//   ├─ banner     (0,0 400x64)    alpha = bannerAlpha',
			'//   ├─ card       (40,100 320x400) hidden/disabled per flags',
			'//   │  ├─ photo      (0,0 320x200)',
			'//   │  │  └─ avatar     (10,150 40x40)',
			'//   │  ├─ likeButton (240,220 64x44)',
			'//   │  └─ ghostButton(260,420 80x44)  <- hangs OUTSIDE card\'s bounds',
			'//   ├─ saveButton (40,600 150x60)',
			'//   └─ shield     (0,560 400x140)  topmost over saveButton; enabled per flag',
			'func demo(bannerAlpha float64, cardHidden, cardDisabled, shieldEnabled bool) *View {',
			'	return &View{Name: "root", W: 400, H: 800, Alpha: 1, Subviews: []*View{',
			'		{Name: "banner", X: 0, Y: 0, W: 400, H: 64, Alpha: bannerAlpha},',
			'		{Name: "card", X: 40, Y: 100, W: 320, H: 400, Alpha: 1,',
			'			Hidden: cardHidden, Disabled: cardDisabled, Subviews: []*View{',
			'				{Name: "photo", X: 0, Y: 0, W: 320, H: 200, Alpha: 1, Subviews: []*View{',
			'					{Name: "avatar", X: 10, Y: 150, W: 40, H: 40, Alpha: 1},',
			'				}},',
			'				{Name: "likeButton", X: 240, Y: 220, W: 64, H: 44, Alpha: 1},',
			'				{Name: "ghostButton", X: 260, Y: 420, W: 80, H: 44, Alpha: 1},',
			'			}},',
			'		{Name: "saveButton", X: 40, Y: 600, W: 150, H: 60, Alpha: 1},',
			'		{Name: "shield", X: 0, Y: 560, W: 400, H: 140, Alpha: 1, Disabled: !shieldEnabled},',
			'	}}',
			'}',
			'',
			'func main() {',
			'	// std is the default screen: opaque banner, live card, DISABLED',
			'	// shield (the fall-through configuration).',
			'	std := func() *View { return demo(1, false, false, false) }',
			'	hit := func(v *View, x, y int) string {',
			'		got := HitTest(v, x, y)',
			'		if got == "" {',
			'			return "nil"',
			'		}',
			'		return got',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"PointInside is CGRect containment: min edge in, max edge out",',
			'			"origin=true corner=true rightEdge=false bottomEdge=false",',
			'			func() string {',
			'				v := &View{Name: "v", W: 400, H: 800, Alpha: 1}',
			'				return fmt.Sprintf("origin=%v corner=%v rightEdge=%v bottomEdge=%v",',
			'					PointInside(v, 0, 0), PointInside(v, 399, 799),',
			'					PointInside(v, 400, 0), PointInside(v, 0, 800))',
			'			}},',
			'		{"a tap on empty space: no child claims it, so the containing view itself is the hit view",',
			'			"root",',
			'			func() string { return hit(std(), 200, 80) }},',
			'		{"recursion with coordinate conversion: root (290,330) -> card space (250,230) -> likeButton",',
			'			"likeButton",',
			'			func() string { return hit(std(), 290, 330) }},',
			'		{"three levels deep: root (60,255) -> card (20,155) -> photo (20,155) -> avatar (10,5)",',
			'			"avatar",',
			'			func() string { return hit(std(), 60, 255) }},',
			'		{"a miss inside a child falls back to that child: next to the avatar the hit view is the photo",',
			'			"photo",',
			'			func() string { return hit(std(), 95, 260) }},',
			'		{"THE classic: ghostButton is drawn outside card\'s bounds — the tap lands on it and gets root, because card fails point(inside:) before its children are asked",',
			'			"root",',
			'			func() string { return hit(std(), 310, 530) }},',
			'		{"overlapping siblings: the shield is drawn above saveButton, and when ENABLED the topmost sibling wins",',
			'			"shield",',
			'			func() string { return hit(demo(1, false, false, true), 100, 620) }},',
			'		{"the fall-through: a DISABLED topmost sibling returns nil and the loop asks the sibling BELOW — saveButton, not nil",',
			'			"saveButton",',
			'			func() string { return hit(std(), 100, 620) }},',
			'		{"hidden prunes the subtree: hide the card and the likeButton tap falls through to root",',
			'			"root",',
			'			func() string { return hit(demo(1, true, false, false), 290, 330) }},',
			'		{"disabling a PARENT disables every descendant: card.isUserInteractionEnabled=false kills the likeButton too",',
			'			"root",',
			'			func() string { return hit(demo(1, false, true, false), 290, 330) }},',
			'		{"the 0.01 threshold: alpha 0.005 is untouchable, alpha 0.5 is fully hittable — \\"looks transparent\\" is not the rule",',
			'			"faded=root translucent=banner",',
			'			func() string {',
			'				return fmt.Sprintf("faded=%s translucent=%s",',
			'					hit(demo(0.005, false, false, false), 200, 30),',
			'					hit(demo(0.5, false, false, false), 200, 30))',
			'			}},',
			'		{"outside the root entirely: hitTest returns nil (no view wants it)",',
			'			"right=nil left=nil",',
			'			func() string {',
			'				return fmt.Sprintf("right=%s left=%s", hit(std(), 450, 100), hit(std(), -1, 5))',
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
			'// View is one node of the view tree.',
			'type View struct {',
			'	Name     string',
			'	X, Y     int',
			'	W, H     int',
			'	Hidden   bool',
			'	Alpha    float64',
			'	Disabled bool',
			'	Subviews []*View',
			'}',
			'',
			'// PointInside is CGRect containment: half-open on the max edges, so a',
			'// 400-wide view answers true for x=399 and false for x=400. The',
			'// half-openness matters in practice — two views tiled edge-to-edge',
			'// must not BOTH claim the shared boundary pixel, or touches on the',
			'// seam would resolve by z-order instead of geometry.',
			'func PointInside(v *View, x, y int) bool {',
			'	return x >= 0 && x < v.W && y >= 0 && y < v.H',
			'}',
			'',
			'// HitTest is the documented UIKit recursion, rule for rule. The ORDER',
			'// of the early returns is the algorithm: eligibility before',
			'// containment before children, and containment failing before children',
			'// are consulted is precisely why a child outside its parent\'s bounds',
			'// is unreachable.',
			'func HitTest(v *View, x, y int) string {',
			'	// Rule 1 — eligibility prunes the SUBTREE: the checks guard the',
			'	// recursion itself, so a hidden/faded/disabled container takes all',
			'	// of its descendants out of play in one stroke. (UIKit\'s pinned',
			'	// alpha threshold is 0.01 — a value chosen so that "practically',
			'	// invisible" views stop eating touches, while any intentionally',
			'	// translucent view keeps them.)',
			'	if v.Hidden || v.Alpha < 0.01 || v.Disabled {',
			'		return ""',
			'	}',
			'	// Rule 2 — containment gates the children. Returning before the',
			'	// loop is the load-bearing choice: children are only reachable',
			'	// THROUGH their parent\'s bounds, no matter where they draw.',
			'	if !PointInside(v, x, y) {',
			'		return ""',
			'	}',
			'	// Rule 3 — children topmost-first. Subviews are stored',
			'	// back-to-front (draw order), so touch order is the REVERSE walk.',
			'	// The conversion is a plain origin subtraction because the model',
			'	// has no transforms; real convert(_:from:) composes affine',
			'	// transforms along the same path.',
			'	for i := len(v.Subviews) - 1; i >= 0; i-- {',
			'		sub := v.Subviews[i]',
			'		if hitName := HitTest(sub, x-sub.X, y-sub.Y); hitName != "" {',
			'			// First non-nil answer wins — and a nil from the topmost',
			'			// sibling does NOT end the loop. That continuation is the',
			'			// fall-through: a disabled overlay is transparent to',
			'			// touches, not a shield.',
			'			return hitName',
			'		}',
			'	}',
			'	// Rule 4 — inside self, no child claimed it: self is the hit view.',
			'	// This is why tapping the padding around a button returns the',
			'	// container, and why containers that should be "touch-invisible"',
			'	// override hitTest to return nil for exactly this case.',
			'	return v.Name',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What happens after the hit view is found</h3>' +
			'<p>The recursion you implemented runs when the touch <em>begins</em> ' +
			'(UIKit may actually invoke it more than once per touch — treat ' +
			'<code>hitTest</code> as a pure function, never a side-effect hook). ' +
			'The returned view becomes the touch\'s owner for its whole lifetime: ' +
			'<code>touchesBegan/Moved/Ended</code> go to it, and its gesture ' +
			'recognizers — plus those of every ancestor up the chain — get first ' +
			'claim. A finger that slides off the view mid-touch does not change ' +
			'owners; hit-testing happens once, at contact. That is why a button ' +
			'highlights, the finger drags away, and the touch still belongs to ' +
			'the button (which then cancels on exit).</p>' +
			'<h3>The production patterns built on this recursion</h3>' +
			'<ul>' +
			'<li><strong>Enlarging a tap target</strong> — the 44-point rule meets ' +
			'a 24-point icon. Override <code>point(inside:)</code> to return true ' +
			'for an inset-by-negative-10 bounds: containment is rule 2, so growing ' +
			'it grows the touchable area without moving a pixel. (Overriding ' +
			'<code>hitTest</code> for this is overkill; overriding neither and ' +
			'wondering why the edge of the icon misses is the bug report.)</li>' +
			'<li><strong>The outside-the-bounds fix has three spellings.</strong> ' +
			'Move the child inside; grow the parent; or override the ' +
			'<em>parent\'s</em> <code>hitTest</code> to consult children even on ' +
			'containment failure. The third exists in most large codebases under a ' +
			'name like <code>GreedyTouchView</code> — now you can write it from ' +
			'first principles, and explain why it must convert coordinates before ' +
			'recursing.</li>' +
			'<li><strong>Touch-transparent overlays</strong> — a gradient over a ' +
			'scroll view — override <code>hitTest</code> to return <code>nil</code> ' +
			'whenever the answer would be <code>self</code> (rule 4), letting ' +
			'decoration pass touches through while its interactive children still ' +
			'work. The inverse — a loading shield — must stay <em>enabled</em> and ' +
			'simply exist: rule 4 makes it swallow everything, and the pinned ' +
			'fall-through case shows why disabling it would do the opposite of ' +
			'shielding.</li>' +
			'<li><strong>Debugging is override-and-print.</strong> Xcode\'s Debug ' +
			'View Hierarchy shows geometry but not touch flow; the standard move ' +
			'is exactly the prose\'s Swift override with a <code>print</code>, ' +
			'watching which subtree returns nil. The three usual culprits, in ' +
			'observed frequency order: a parent whose frame silently shrank to ' +
			'zero height (auto layout), <code>isUserInteractionEnabled</code> ' +
			'defaulting to false on <code>UIImageView</code>, and an invisible ' +
			'sibling added on top that passes eligibility.</li>' +
			'</ul>' +
			'<h3>Simplifications, disclosed</h3>' +
			'<p>Real UIKit converts through arbitrary affine transforms (rotation, ' +
			'scale) rather than subtracting origins, starts the recursion at the ' +
			'<code>UIWindow</code> after a first pass by the system, and follows ' +
			'hit-testing with the entire gesture-recognizer arbitration system — ' +
			'which can delay, cancel, or steal touches from the hit view ' +
			'(<code>UIScrollView</code>\'s pan does exactly this). And SwiftUI ' +
			'reimplements the same idea as <code>contentShape</code> and ' +
			'<code>allowsHitTesting</code> over its own tree. The recursion pinned ' +
			'here is the substrate all of that negotiates with.</p>',
		],
		complexity: { time: 'O(n) worst case — each view visited at most once per hit-test', space: 'O(d) recursion depth for a tree of depth d' },
	});
})();
