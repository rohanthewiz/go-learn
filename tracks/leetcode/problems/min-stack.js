/* Min Stack — Stack (Medium). The first design/struct problem in the track:
 * instead of one function, the learner fills in a MinStack type plus its
 * methods (NewMinStack, Push, Pop, Top, GetMin), all O(1). The harness
 * drives operation scripts (a small op table per case) and compares the
 * sequence of Top/GetMin outputs, so any correct internal representation
 * passes. Teaches the paired min-so-far stack.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="a value stack paired with a min-so-far stack">' +
		'<text x="20" y="18" class="lbl">after Push(-2), Push(0), Push(-3)</text>' +
		// vals column
		'<text x="60" y="44" class="lbl">vals</text>' +
		'<g text-anchor="middle">' +
		'<rect x="40" y="54" width="70" height="28" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="75" y="73">-3</text>' +
		'<rect x="40" y="88" width="70" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="75" y="107">0</text>' +
		'<rect x="40" y="122" width="70" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="75" y="141">-2</text>' +
		'</g>' +
		// mins column
		'<text x="180" y="44" class="lbl">mins (min at this depth)</text>' +
		'<g text-anchor="middle">' +
		'<rect x="160" y="54" width="70" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="195" y="73">-3</text>' +
		'<rect x="160" y="88" width="70" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="195" y="107">-2</text>' +
		'<rect x="160" y="122" width="70" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="195" y="141">-2</text>' +
		'</g>' +
		'<text x="20" y="73" class="lbl">top →</text>' +
		// read-off arrows
		'<path d="M 234 62 C 280 52 310 52 342 58" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowMS)"/>' +
		'<text x="350" y="64" style="fill:var(--ok)">GetMin() → -3</text>' +
		'<path d="M 114 62 C 220 24 300 24 342 34" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowMS)"/>' +
		'<text x="350" y="38" style="fill:var(--accent)">Top() → -3</text>' +
		// pop annotation
		'<text x="290" y="106" class="lbl">Pop() removes one level from BOTH:</text>' +
		'<text x="290" y="124" class="lbl">the old min (-2) is sitting right</text>' +
		'<text x="290" y="142" class="lbl">underneath — no rescan needed.</text>' +
		'<text x="20" y="180" class="lbl">every level remembers the minimum of everything at or below it</text>' +
		'<defs><marker id="dgArrowMS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'min-stack',
		title: 'Min Stack',
		nav: 'Min Stack',
		difficulty: 'Medium',
		category: 'Stack',
		task: 'Implement MinStack (Push, Pop, Top, GetMin) — make all 5 tests pass.',

		prose: [
			'<h2>Min Stack</h2>' +
			'<p>Design a stack that supports <code>Push</code>, <code>Pop</code>, <code>Top</code> ' +
			'and <code>GetMin</code> — retrieving the minimum element — each in <em>O(1)</em> time.</p>' +
			'<ul><li>Fill in the <code>MinStack</code> struct fields and all five functions ' +
			'(the constructor <code>NewMinStack</code> plus the four methods).</li>' +
			'<li><code>Pop</code>, <code>Top</code> and <code>GetMin</code> are only ever called on ' +
			'a non-empty stack.</li>' +
			'<li>The tests run scripts of operations and compare every value returned by ' +
			'<code>Top</code> and <code>GetMin</code> along the way.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 's := NewMinStack()\ns.Push(-2); s.Push(0); s.Push(-3)\ns.GetMin()  →  -3\ns.Pop()\ns.Top()     →  0\ns.GetMin()  →  -2', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>A plain stack answers <code>Top</code> in O(1) but <code>GetMin</code> seems to ' +
			'need a scan — and worse, popping the minimum means finding the <em>next</em> ' +
			'minimum. The fix: alongside every value, store the minimum of everything at or ' +
			'below that level. Pop discards a value <em>and</em> its min together, so the ' +
			'previous minimum is always waiting right underneath:</p>' +
			DIAGRAM +
			'<p>Two slices growing in lockstep — every operation is one append or one slice-shrink.</p>',
		],

		starter: [
			'package main',
			'',
			'// MinStack is a stack supporting Push, Pop, Top and GetMin,',
			'// each in O(1) time.',
			'type MinStack struct {',
			'	// your fields here',
			'}',
			'',
			'// NewMinStack returns an empty, ready-to-use MinStack.',
			'func NewMinStack() *MinStack {',
			'	// your code here',
			'	return &MinStack{}',
			'}',
			'',
			'// Push adds x to the top of the stack.',
			'func (s *MinStack) Push(x int) {',
			'	// your code here',
			'}',
			'',
			'// Pop removes the element on top of the stack.',
			'func (s *MinStack) Pop() {',
			'	// your code here',
			'}',
			'',
			'// Top returns the element on top of the stack (without removing it).',
			'func (s *MinStack) Top() int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// GetMin returns the minimum element currently on the stack.',
			'func (s *MinStack) GetMin() int {',
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
			'	"reflect"',
			'	"strings"',
			')',
			'',
			LC.HARNESS_RT,
			'',
			'func main() {',
			'	// Each case is a script of operations; "top" and "min" record the',
			'	// value they return, and the recorded sequence is what we compare.',
			'	type op struct {',
			'		name string // "push", "pop", "top", "min"',
			'		arg  int    // used by "push" only',
			'	}',
			'	type tc struct {',
			'		ops  []op',
			'		want []int',
			'	}',
			'	cases := []tc{',
			'		// The classic LeetCode script: min changes as -3 comes and goes.',
			'		{[]op{{"push", -2}, {"push", 0}, {"push", -3}, {"min", 0}, {"pop", 0}, {"top", 0}, {"min", 0}}, []int{-3, 0, -2}},',
			'		// Increasing pushes: the first element stays the min throughout.',
			'		{[]op{{"push", 1}, {"push", 2}, {"push", 3}, {"min", 0}, {"top", 0}, {"pop", 0}, {"top", 0}, {"min", 0}}, []int{1, 3, 2, 1}},',
			'		// Duplicate minimums: popping one 1 must NOT lose the other.',
			'		{[]op{{"push", 5}, {"push", 1}, {"push", 1}, {"min", 0}, {"pop", 0}, {"min", 0}, {"pop", 0}, {"min", 0}, {"top", 0}}, []int{1, 1, 5, 5}},',
			'		// Single element: Top and GetMin agree.',
			'		{[]op{{"push", 42}, {"top", 0}, {"min", 0}}, []int{42, 42}},',
			'		// Min drops, is popped, then a new lower value arrives and leaves.',
			'		{[]op{{"push", 3}, {"min", 0}, {"push", 5}, {"min", 0}, {"pop", 0}, {"push", 2}, {"min", 0}, {"top", 0}, {"pop", 0}, {"min", 0}}, []int{3, 3, 2, 2, 3}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		// Render the op script as a human-readable trace for the UI.',
			'		trace := make([]string, 0, len(c.ops))',
			'		for _, o := range c.ops {',
			'			switch o.name {',
			'			case "push":',
			'				trace = append(trace, fmt.Sprintf("Push(%d)", o.arg))',
			'			case "pop":',
			'				trace = append(trace, "Pop()")',
			'			case "top":',
			'				trace = append(trace, "Top()")',
			'			case "min":',
			'				trace = append(trace, "GetMin()")',
			'			}',
			'		}',
			'		r := map[string]any{',
			'			"input": strings.Join(trace, " "),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			s := NewMinStack()',
			'			got := []int{}',
			'			for _, o := range c.ops {',
			'				switch o.name {',
			'				case "push":',
			'					s.Push(o.arg)',
			'				case "pop":',
			'					s.Pop()',
			'				case "top":',
			'					got = append(got, s.Top())',
			'				case "min":',
			'					got = append(got, s.GetMin())',
			'				}',
			'			}',
			'			r["pass"] = reflect.DeepEqual(got, c.want)',
			'			r["got"] = fmt.Sprintf("%v", got)',
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
			'// MinStack is a stack supporting Push, Pop, Top and GetMin, each in',
			'// O(1) time.',
			'//',
			'// Representation: two slices that grow and shrink in lockstep.',
			'// mins[i] is the minimum of vals[0..i] — “the min as of this depth”.',
			'// Popping discards a value AND the min that was current while it was',
			'// on top, so the previous minimum resurfaces automatically; no rescan',
			'// is ever needed.',
			'//',
			'//	Push(-2) Push(0) Push(-3):',
			'//	    vals:  -2   0  -3        ← top',
			'//	    mins:  -2  -2  -3        ← GetMin reads here',
			'type MinStack struct {',
			'	vals []int // stack contents, top at the end',
			'	mins []int // mins[i] = min of vals[:i+1]',
			'}',
			'',
			'// NewMinStack returns an empty, ready-to-use MinStack.',
			'// The zero value works as-is: append handles nil slices.',
			'func NewMinStack() *MinStack {',
			'	return &MinStack{}',
			'}',
			'',
			'// Push adds x, recording the min-so-far at the new depth.',
			'func (s *MinStack) Push(x int) {',
			'	m := x // first element, or a new minimum',
			'	if len(s.mins) > 0 && s.mins[len(s.mins)-1] < x {',
			'		m = s.mins[len(s.mins)-1] // the old min still rules',
			'	}',
			'	s.vals = append(s.vals, x)',
			'	s.mins = append(s.mins, m)',
			'}',
			'',
			'// Pop removes the top value together with its paired min, which is',
			'// exactly what makes the previous min reappear in O(1).',
			'func (s *MinStack) Pop() {',
			'	s.vals = s.vals[:len(s.vals)-1]',
			'	s.mins = s.mins[:len(s.mins)-1]',
			'}',
			'',
			'// Top returns the element on top of the stack.',
			'func (s *MinStack) Top() int {',
			'	return s.vals[len(s.vals)-1]',
			'}',
			'',
			'// GetMin returns the minimum over the whole stack — just the top of',
			'// the paired mins slice.',
			'func (s *MinStack) GetMin() int {',
			'	return s.mins[len(s.mins)-1]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why a single “min” field fails</h3>' +
			'<p>Tracking the minimum in one variable is easy — until <code>Pop</code> removes ' +
			'it. Then you need the <em>second smallest</em>, and the only way a lone field can ' +
			'find it is an O(n) rescan of the stack. The problem isn’t knowing the current ' +
			'min; it’s knowing what the min <em>used to be</em> at every earlier depth.</p>' +
			'<h3>Remember the min per depth</h3>' +
			'<p>So store exactly that: a second stack, grown and shrunk in lockstep, where ' +
			'each level holds the minimum of everything at or below it. Push compares the new ' +
			'value against the previous level’s min; Pop discards a value and its min ' +
			'together, exposing the older min underneath:</p>',
			{ code: 'func (s *MinStack) Push(x int) {\n\tm := x\n\tif len(s.mins) > 0 && s.mins[len(s.mins)-1] < x {\n\t\tm = s.mins[len(s.mins)-1] // old min still rules\n\t}\n\ts.vals = append(s.vals, x)\n\ts.mins = append(s.mins, m)\n}\n\nfunc (s *MinStack) Pop() {\n\ts.vals = s.vals[:len(s.vals)-1]\n\ts.mins = s.mins[:len(s.mins)-1] // previous min resurfaces\n}' },
			'<p>The subtle points:</p>' +
			'<ul>' +
			'<li><strong>Pop never searches.</strong> The history of minimums is materialized ' +
			'on the mins stack, so “what was the min before this element?” is a lookup, not a ' +
			'computation.</li>' +
			'<li><strong>Duplicates are safe.</strong> Push <code>1</code> twice and mins holds ' +
			'<code>1</code> twice — popping one copy leaves the other as the recorded min ' +
			'(the <code>&lt;</code> vs <code>&lt;=</code> choice doesn’t matter with paired ' +
			'entries; it only matters in the space-optimized variant that pushes to mins ' +
			'selectively).</li>' +
			'<li><strong>The zero value just works.</strong> <code>append</code> on a nil slice ' +
			'allocates, so <code>NewMinStack</code> needs no explicit initialization.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(1) per operation', space: 'O(n)' },
	});
})();
