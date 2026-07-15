/* Keys — Widgets & Reconciliation (Medium). Why reordering a list of
 * stateful tiles scrambles their state — and why adding Key(...) fixes it.
 * The learner implements child-list reconciliation both ways: positional
 * matching without keys, identity matching with them.
 */
(function () {
	'use strict';
	var T = GoLearnFlutter;

	// The checkbox bug in one picture: state boxes matched by position vs
	// by key when a new row is inserted at the front. Marker ids namespaced
	// (dgArrowFLK / dgArrowFLKb).
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 210" width="540" height="210" role="img" aria-label="inserting a row at the front: without keys state sticks to positions and shifts onto the wrong rows; with keys state follows its row">' +
		'<text x="20" y="20" class="lbl">insert Row(new) at the front — where does each row\'s checkbox state go?</text>' +
		'<text x="20" y="46" class="lbl">no keys (match by position)</text>' +
		'<rect x="30" y="56" width="90" height="26" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/><text x="75" y="74" text-anchor="middle">new</text>' +
		'<rect x="130" y="56" width="90" height="26" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/><text x="175" y="74" text-anchor="middle">alice</text>' +
		'<rect x="230" y="56" width="90" height="26" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/><text x="275" y="74" text-anchor="middle">bob</text>' +
		'<rect x="30" y="100" width="90" height="26" rx="5" fill="none" stroke="var(--err-edge)" stroke-width="1.6"/><text x="75" y="118" text-anchor="middle" class="lbl">alice\'s ✓</text>' +
		'<rect x="130" y="100" width="90" height="26" rx="5" fill="none" stroke="var(--err-edge)" stroke-width="1.6"/><text x="175" y="118" text-anchor="middle" class="lbl">bob\'s ✓</text>' +
		'<rect x="230" y="100" width="90" height="26" rx="5" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4"/><text x="275" y="118" text-anchor="middle" class="lbl">fresh</text>' +
		'<text x="420" y="90" class="lbl" style="fill:var(--err-fg)">state shifted onto</text>' +
		'<text x="420" y="104" class="lbl" style="fill:var(--err-fg)">the wrong rows</text>' +
		'<text x="20" y="152" class="lbl">with keys (match by identity)</text>' +
		'<rect x="30" y="162" width="90" height="26" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.6" stroke-dasharray="5 4"/><text x="75" y="180" text-anchor="middle" class="lbl">fresh</text>' +
		'<rect x="130" y="162" width="90" height="26" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.6"/><text x="175" y="180" text-anchor="middle" class="lbl">alice\'s ✓</text>' +
		'<rect x="230" y="162" width="90" height="26" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.6"/><text x="275" y="180" text-anchor="middle" class="lbl">bob\'s ✓</text>' +
		'<text x="420" y="172" class="lbl" style="fill:var(--ok)">state followed</text>' +
		'<text x="420" y="186" class="lbl" style="fill:var(--ok)">its own row</text>' +
		'</svg>';

	T.problem({
		id: 'keys',
		title: 'Keys & List Reconciliation',
		nav: 'keys',
		difficulty: 'Medium',
		category: 'Widgets & Reconciliation',
		task: 'Implement ReconcileChildren: positional matching for unkeyed children, identity matching for keyed ones. All 7 tests.',

		prose: [
			'<h2>Keys &amp; List Reconciliation</h2>' +
			'<p>The classic Flutter bug report: "I have a list of checkboxes; I insert ' +
			'a row at the top, and every checkbox below it flips to its neighbor\'s ' +
			'value." Nothing is broken — the framework did exactly what the previous ' +
			'lesson\'s <code>canUpdate</code> says. Reconciling a children list ' +
			'<em>without keys</em> matches old and new <strong>by position</strong>: ' +
			'slot 0\'s element absorbs the new slot-0 widget (same type — sure, it can ' +
			'update!), and the checkbox <em>state</em>, which lives in the element, ' +
			'stays at slot 0 while the data scrolled down a row.</p>' +
			DIAGRAM +
			'<p>A <code>Key</code> changes the matching from positional to ' +
			'<strong>identity</strong>: each keyed new widget claims the old element ' +
			'with the same key, wherever it moved. Keys are only needed when children ' +
			'of the same type can be <em>reordered, inserted, or removed</em> while ' +
			'holding state — which is why <code>ListView</code> items get keys and a ' +
			'static Column mostly doesn\'t.</p>',
			{ lang: 'dart', code: "ListView(children: [\n  for (final user in users)\n    CheckboxTile(key: ValueKey(user.id), user: user),\n])" },
			'<h3>Your job</h3>' +
			'<p>Implement <code>ReconcileChildren(old, neu)</code>: for each new ' +
			'widget, report the state it ends up with — an old child\'s state, or ' +
			'<code>"fresh"</code>. The rules:</p>' +
			'<ul>' +
			'<li><strong>keyed</strong> new widget: take the state of the old child ' +
			'with the same key <em>and</em> same type, anywhere in the list; no match ' +
			'→ fresh;</li>' +
			'<li><strong>unkeyed</strong> new widget at slot i: take old slot i\'s ' +
			'state if that child exists, is unkeyed, and has the same type; otherwise ' +
			'fresh.</li>' +
			'</ul>',
		],

		starter: [
			'package main',
			'',
			'// OldChild is an element already on screen: its widget\'s type/key,',
			'// plus the State object it owns.',
			'type OldChild struct {',
			'	Type  string',
			'	Key   string // "" = no key',
			'	State string',
			'}',
			'',
			'// NewWidget is one entry of the freshly built children list.',
			'type NewWidget struct {',
			'	Type string',
			'	Key  string // "" = no key',
			'}',
			'',
			'// ReconcileChildren reports, for each new widget in order, which state',
			'// it receives: a matched old child\'s State, or "fresh".',
			'//   keyed:   match the old child with the same Key AND Type, any slot',
			'//   unkeyed: match old child at the SAME SLOT if unkeyed and same Type',
			'func ReconcileChildren(old []OldChild, neu []NewWidget) []string {',
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
			'	type tc struct {',
			'		name string',
			'		old  []OldChild',
			'		neu  []NewWidget',
			'		want []string',
			'	}',
			'	cases := []tc{',
			'		{"unchanged unkeyed list: every state stays",',
			'			[]OldChild{{"Tile", "", "sA"}, {"Tile", "", "sB"}},',
			'			[]NewWidget{{"Tile", ""}, {"Tile", ""}},',
			'			[]string{"sA", "sB"}},',
			'		{"insert at front, no keys: states shift onto wrong rows",',
			'			[]OldChild{{"Tile", "", "aliceChecked"}, {"Tile", "", "bobUnchecked"}},',
			'			[]NewWidget{{"Tile", ""}, {"Tile", ""}, {"Tile", ""}},',
			'			[]string{"aliceChecked", "bobUnchecked", "fresh"}},',
			'		{"insert at front, with keys: state follows its row",',
			'			[]OldChild{{"Tile", "alice", "aliceChecked"}, {"Tile", "bob", "bobUnchecked"}},',
			'			[]NewWidget{{"Tile", "new"}, {"Tile", "alice"}, {"Tile", "bob"}},',
			'			[]string{"fresh", "aliceChecked", "bobUnchecked"}},',
			'		{"swap two keyed children: states swap along",',
			'			[]OldChild{{"Tile", "a", "sA"}, {"Tile", "b", "sB"}},',
			'			[]NewWidget{{"Tile", "b"}, {"Tile", "a"}},',
			'			[]string{"sB", "sA"}},',
			'		{"type change at a slot: no reuse across types",',
			'			[]OldChild{{"Text", "", "sT"}},',
			'			[]NewWidget{{"Button", ""}},',
			'			[]string{"fresh"}},',
			'		{"same key, different type: still no reuse",',
			'			[]OldChild{{"Text", "k", "sT"}},',
			'			[]NewWidget{{"Button", "k"}},',
			'			[]string{"fresh"}},',
			'		{"unkeyed slot never steals a keyed child\'s state",',
			'			[]OldChild{{"Tile", "a", "sA"}},',
			'			[]NewWidget{{"Tile", ""}},',
			'			[]string{"fresh"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprint(c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := ReconcileChildren(append([]OldChild(nil), c.old...), append([]NewWidget(nil), c.neu...))',
			'			r["pass"] = fmt.Sprint(got) == fmt.Sprint(c.want)',
			'			r["got"] = fmt.Sprint(got)',
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
			'// OldChild is an element already on screen: its widget\'s type/key,',
			'// plus the State object it owns.',
			'type OldChild struct {',
			'	Type  string',
			'	Key   string // "" = no key',
			'	State string',
			'}',
			'',
			'// NewWidget is one entry of the freshly built children list.',
			'type NewWidget struct {',
			'	Type string',
			'	Key  string // "" = no key',
			'}',
			'',
			'// ReconcileChildren reports, for each new widget in order, which state',
			'// it receives.',
			'//',
			'// Both arms are canUpdate wearing different glasses: the keyed arm',
			'// searches the whole old list for the identity match, the unkeyed arm',
			'// only ever looks at its own slot. The "old child is unkeyed" guard in',
			'// the positional arm matters: a keyed element belongs to whoever holds',
			'// its key — an anonymous newcomer at its slot must not steal its state.',
			'func ReconcileChildren(old []OldChild, neu []NewWidget) []string {',
			'	out := make([]string, 0, len(neu))',
			'	for i, w := range neu {',
			'		if w.Key != "" {',
			'			// Identity match: same key and type, any position.',
			'			state := "fresh"',
			'			for _, o := range old {',
			'				if o.Key == w.Key && o.Type == w.Type {',
			'					state = o.State',
			'					break',
			'				}',
			'			}',
			'			out = append(out, state)',
			'			continue',
			'		}',
			'		// Positional match: same slot, unkeyed, same type.',
			'		if i < len(old) && old[i].Key == "" && old[i].Type == w.Type {',
			'			out = append(out, old[i].State)',
			'		} else {',
			'			out = append(out, "fresh")',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The bug is a feature, mis-aimed</h3>' +
			'<p>Positional matching is not a shortcut — it is the right default. Most ' +
			'children lists are static structure (a Column with a header, a field, a ' +
			'button), and matching by position lets every frame\'s diff run in one ' +
			'straight pass with zero allocations. The checkbox bug appears only when ' +
			'all three ingredients combine: same-typed children, holding state, being ' +
			'reordered. Keys are the opt-in for exactly that combination.</p>' +
			'<h3>Where the state actually lives</h3>' +
			'<p>The scramble is only possible because the state does NOT live in the ' +
			'widget — widgets are rebuilt every frame and would take their state with ' +
			'them. It lives in the element (for a StatefulWidget, in its State ' +
			'object), and reconciliation decides which element each new widget ' +
			'<em>configures</em>. "Which state does this slot get?" — the question ' +
			'this problem makes you answer by hand — is the real content of every ' +
			'keys discussion.</p>' +
			'<h3>The real algorithm</h3>' +
			'<p>Framework <code>updateChildren</code> is this plus engineering: it ' +
			'first syncs the matching prefix and suffix positionally (cheap, covers ' +
			'the common append/remove-at-end), builds a key→element map only for the ' +
			'scrambled middle, and disposes unclaimed old elements. ' +
			'<code>GlobalKey</code> extends the same identity idea across ' +
			'<em>parents</em> — an element can be adopted to a different spot in the ' +
			'tree entirely, state intact.</p>',
		],
		complexity: { time: 'O(new × old) here; the framework\'s prefix/suffix + key map makes it ~O(n)', space: 'O(new) for the verdicts' },
	});
})();
