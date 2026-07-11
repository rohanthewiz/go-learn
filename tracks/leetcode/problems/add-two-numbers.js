/* Add Two Numbers — Linked List (Medium). Grade-school addition where the
 * lists already did you a favor: digits stored in REVERSE order mean the
 * ones place comes first, so a single forward walk adds column by column
 * while a carry rides along. The classic gotchas are unequal lengths and
 * the final carry minting one extra node.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// 342 + 465 = 807, all three numbers stored in reverse. Columns line up
	// by place value; the middle column (4+6=10) writes 0 and hands a carry
	// to the next column. Box centers at x = 120 + 100*i, boxes 44×30.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 210" width="500" height="210" role="img" aria-label="column-wise addition of two reversed linked lists with a carry">' +
		'<text x="20" y="16" class="lbl">342 + 465 — reversed storage puts the ones place first</text>' +
		// l1 row: 2 → 4 → 3
		'<text x="20" y="52" class="lbl">l1 (342)</text>' +
		'<g>' +
		'<rect x="98" y="32" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="198" y="32" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="298" y="32" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="120" y="52" text-anchor="middle">2</text>' +
		'<text x="220" y="52" text-anchor="middle">4</text>' +
		'<text x="320" y="52" text-anchor="middle">3</text>' +
		'</g>' +
		// l2 row: 5 → 6 → 4
		'<text x="20" y="100" class="lbl">l2 (465)</text>' +
		'<g>' +
		'<rect x="98" y="80" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="198" y="80" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="298" y="80" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="120" y="100" text-anchor="middle">5</text>' +
		'<text x="220" y="100" text-anchor="middle">6</text>' +
		'<text x="320" y="100" text-anchor="middle">4</text>' +
		'</g>' +
		// next-pointers for both rows
		'<g fill="none" stroke="var(--edge)" stroke-width="1.5">' +
		'<path d="M 144 47 L 192 47" marker-end="url(#dgArrowATN)"/>' +
		'<path d="M 244 47 L 292 47" marker-end="url(#dgArrowATN)"/>' +
		'<path d="M 144 95 L 192 95" marker-end="url(#dgArrowATN)"/>' +
		'<path d="M 244 95 L 292 95" marker-end="url(#dgArrowATN)"/>' +
		'</g>' +
		// sum row: 7 → 0 → 8
		'<text x="20" y="168" class="lbl">sum (807)</text>' +
		'<g>' +
		'<rect x="98" y="148" width="44" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="198" y="148" width="44" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="298" y="148" width="44" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="120" y="168" text-anchor="middle">7</text>' +
		'<text x="220" y="168" text-anchor="middle">0</text>' +
		'<text x="320" y="168" text-anchor="middle">8</text>' +
		'</g>' +
		'<g fill="none" stroke="var(--edge)" stroke-width="1.5">' +
		'<path d="M 144 163 L 192 163" marker-end="url(#dgArrowATN)"/>' +
		'<path d="M 244 163 L 292 163" marker-end="url(#dgArrowATN)"/>' +
		'</g>' +
		// column math + the carry hop from column 2 to column 3
		'<text x="120" y="134" text-anchor="middle" class="lbl">2+5 = 7</text>' +
		'<text x="220" y="134" text-anchor="middle" style="fill:var(--accent)">4+6 = 10</text>' +
		'<text x="320" y="134" text-anchor="middle" class="lbl">3+4+1 = 8</text>' +
		'<path d="M 234 146 C 254 122 286 122 306 144" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="5 3" marker-end="url(#dgArrowATNc)"/>' +
		'<text x="270" y="121" text-anchor="middle" style="fill:var(--accent)">carry 1</text>' +
		'<text x="20" y="200" class="lbl">write 10 % 10 = 0, pass 10 / 10 = 1 along · a leftover carry at the end mints one extra node</text>' +
		'<defs>' +
		'<marker id="dgArrowATN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowATNc" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'add-two-numbers',
		title: 'Add Two Numbers',
		nav: 'Add Two Numbers',
		difficulty: 'Medium',
		category: 'Linked List',
		task: 'Implement addTwoNumbers — make all 5 tests pass.',

		prose: [
			'<h2>Add Two Numbers</h2>' +
			'<p>You are given two <em>non-empty</em> linked lists representing two ' +
			'non-negative integers. The digits are stored in <em>reverse order</em> ' +
			'(ones place first), one digit per node. Add the two numbers and return the ' +
			'sum as a linked list, also in reverse order.</p>' +
			'<ul><li>The lists may have different lengths.</li>' +
			'<li>No leading zeros, except the number 0 itself (a single 0 node).</li>' +
			'<li>The numbers can be arbitrarily long — do <em>not</em> convert to an ' +
			'<code>int</code> and back; add digit by digit.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'addTwoNumbers(2 → 4 → 3, 5 → 6 → 4)  →  7 → 0 → 8   // 342 + 465 = 807\naddTwoNumbers(9 → 9 → 9, 1)          →  0 → 0 → 0 → 1   // 999 + 1 = 1000', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Reverse storage is a gift: the ones place is at the <em>head</em> of both ' +
			'lists, so grade-school column addition becomes a plain forward walk. Add the ' +
			'two current digits plus the carry, write <code>sum % 10</code>, and hand ' +
			'<code>sum / 10</code> to the next column:</p>' +
			DIAGRAM +
			'<p>Treat an exhausted list as contributing 0, and keep looping while a carry ' +
			'is still pending — that single loop condition absorbs every edge case.</p>',
		],

		starter: [
			'package main',
			'',
			'// ListNode is a node in a singly linked list.',
			'type ListNode struct {',
			'	Val  int',
			'	Next *ListNode',
			'}',
			'',
			'// addTwoNumbers adds two non-negative integers stored as linked',
			'// lists with digits in reverse order (ones place first) and returns',
			'// the sum in the same encoding. The lists are non-empty and may',
			'// have different lengths.',
			'func addTwoNumbers(l1 *ListNode, l2 *ListNode) *ListNode {',
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
			'	"reflect"',
			')',
			'',
			LC.HARNESS_RT,
			'',
			LC.LIST_HELPERS,
			'',
			'func main() {',
			'	type tc struct {',
			'		l1   []int',
			'		l2   []int',
			'		want []int',
			'	}',
			'	cases := []tc{',
			'		{[]int{2, 4, 3}, []int{5, 6, 4}, []int{7, 0, 8}},                         // 342 + 465 = 807',
			'		{[]int{9, 9, 9}, []int{1}, []int{0, 0, 0, 1}},                            // carry ripples the whole way: 999 + 1 = 1000',
			'		{[]int{9, 9, 9, 9, 9, 9, 9}, []int{9, 9, 9, 9}, []int{8, 9, 9, 9, 0, 0, 0, 1}}, // different lengths + final carry',
			'		{[]int{0}, []int{0}, []int{0}},                                           // 0 + 0 = 0, single node',
			'		{[]int{1, 8}, []int{0}, []int{1, 8}},                                     // short second list, no carry',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("l1=%v, l2=%v", c.l1, c.l2),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// sliceToList builds fresh nodes per case, so a solution that',
			'			// rewires or reuses input nodes cannot poison later cases.',
			'			got := listToSlice(addTwoNumbers(sliceToList(c.l1), sliceToList(c.l2)))',
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
			'// ListNode is a node in a singly linked list.',
			'type ListNode struct {',
			'	Val  int',
			'	Next *ListNode',
			'}',
			'',
			'// addTwoNumbers adds two reversed-digit lists column by column,',
			'// exactly like grade-school addition read right to left.',
			'//',
			'// One loop handles every shape of input because its condition is',
			'// "any digit source still live": l1 pending OR l2 pending OR a',
			'// carry pending. An exhausted list simply stops contributing (its',
			'// digit is an implicit 0), so unequal lengths need no special',
			'// case, and a carry surviving past both lists mints the final',
			'// node (999 + 1 → the leading 1 of 1000) without extra code.',
			'//',
			'// The dummy head is the usual list-building idiom: cur always',
			'// points at the last node written, so appending is one assignment,',
			'// and dummy.Next is the real head when we are done — even for the',
			'// very first node.',
			'func addTwoNumbers(l1 *ListNode, l2 *ListNode) *ListNode {',
			'	dummy := &ListNode{}',
			'	cur := dummy',
			'	carry := 0',
			'',
			'	for l1 != nil || l2 != nil || carry > 0 {',
			'		sum := carry',
			'		if l1 != nil {',
			'			sum += l1.Val',
			'			l1 = l1.Next',
			'		}',
			'		if l2 != nil {',
			'			sum += l2.Val',
			'			l2 = l2.Next',
			'		}',
			'',
			'		// Digits are 0..9 so sum is at most 9+9+1 = 19: the carry',
			'		// out of a column is only ever 0 or 1.',
			'		cur.Next = &ListNode{Val: sum % 10}',
			'		cur = cur.Next',
			'		carry = sum / 10',
			'	}',
			'',
			'	return dummy.Next',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why not convert to integers?</h3>' +
			'<p>The tempting shortcut — walk each list, build an <code>int</code>, add, ' +
			'rebuild a list — breaks the moment the numbers outgrow 64 bits, and LeetCode’s ' +
			'constraint (up to 100 digits) guarantees they do. The lists <em>are</em> the ' +
			'arbitrary-precision representation; add them digit by digit like you learned ' +
			'in school.</p>' +
			'<h3>Reverse order is the gift</h3>' +
			'<p>Column addition starts at the ones place, and reverse storage puts the ones ' +
			'place at the <em>head</em> of both lists. So the algorithm is one forward walk ' +
			'with a carry riding along:</p>',
			{ code: 'dummy := &ListNode{}\ncur := dummy\ncarry := 0\nfor l1 != nil || l2 != nil || carry > 0 {\n\tsum := carry\n\tif l1 != nil { sum += l1.Val; l1 = l1.Next }\n\tif l2 != nil { sum += l2.Val; l2 = l2.Next }\n\tcur.Next = &ListNode{Val: sum % 10}\n\tcur = cur.Next\n\tcarry = sum / 10\n}\nreturn dummy.Next' },
			'<p>The loop condition is where the design lives:</p>' +
			'<ul>' +
			'<li><strong>Three-way OR, one loop.</strong> Keeping <code>carry &gt; 0</code> ' +
			'in the condition means <code>999 + 1</code> naturally emits the fourth node ' +
			'for the leading 1 — no post-loop “if carry” patch. Unequal lengths are equally ' +
			'free: a nil list just contributes 0 until the other runs out.</li>' +
			'<li><strong><code>sum % 10</code> and <code>sum / 10</code>.</strong> Each ' +
			'column sums at most 9 + 9 + 1 = 19, so the carry is always 0 or 1 — but ' +
			'writing it as div/mod keeps the invariant explicit instead of relying on ' +
			'<code>if sum &gt;= 10</code> arithmetic.</li>' +
			'<li><strong>Dummy head.</strong> Building a list from nothing has an annoying ' +
			'first-node special case; a throwaway dummy node erases it. Append via ' +
			'<code>cur.Next</code>, return <code>dummy.Next</code>.</li>' +
			'</ul>' +
			'<p>One pass over the longer list, O(1) work per digit. This is the same ' +
			'ripple-carry walk hardware adders and bignum libraries do — just spelled out ' +
			'one node at a time.</p>',
		],
		complexity: { time: 'O(max(m, n))', space: 'O(max(m, n))' },
	});
})();
