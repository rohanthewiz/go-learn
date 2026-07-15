/* Flex Layout — Layout (Medium). The Row/Column algorithm: fixed children
 * measure first, Expanded children split what's left by flex factor, and a
 * negative remainder is the yellow-black overflow stripe. Implementing the
 * split ends the "why doesn't my Row fit?" guessing game.
 */
(function () {
	'use strict';
	var T = GoLearnFlutter;

	T.problem({
		id: 'flex-layout',
		title: 'Row/Column Flex Layout',
		nav: 'flex layout',
		difficulty: 'Medium',
		category: 'Layout',
		task: 'Implement LayoutRow: fixed children first, remaining space split by flex (remainder to the last flex child), overflow when fixed alone overshoot. All 7 tests.',

		prose: [
			'<h2>Row/Column Flex Layout</h2>' +
			'<p>A <code>Row</code> gets a width from its parent and must divide it ' +
			'among children. The algorithm runs in two rounds:</p>' +
			'<ol>' +
			'<li><strong>Inflexible children first</strong> — everything that is not ' +
			'wrapped in <code>Expanded</code>/<code>Flexible</code> is laid out and ' +
			'takes its intrinsic size (the Row cannot shrink them);</li>' +
			'<li><strong>Flex children split the rest</strong> — the remaining width ' +
			'is divided among <code>Expanded</code> children in proportion to their ' +
			'<code>flex</code> factors.</li>' +
			'</ol>',
			{ lang: 'dart', code: "Row(children: [\n  Icon(size: 100),                       // fixed: 100\n  Expanded(flex: 1, child: Search()),    // gets 1 share of what's left\n  Expanded(flex: 2, child: Results()),   // gets 2 shares\n])\n// in 400px: fixed 100 → 300 left → shares of 100 → [100, 100, 200]" },
			'<p>Two edges define the war stories. If the fixed children <em>alone</em> ' +
			'exceed the available width, the Row overflows — that is the yellow-and-' +
			'black stripe with "RenderFlex overflowed by 100 pixels", and no flex ' +
			'child gets anything. And integer division leaves a remainder; hand it to ' +
			'the last flex child so the total always adds up exactly.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>LayoutRow(available, children)</code>. Each child is ' +
			'either fixed (<code>Fixed &gt; 0</code>) or flexible ' +
			'(<code>Flex &gt; 0</code>). Return every child\'s size in order, plus ' +
			'the overflow amount (0 when everything fits):</p>' +
			'<ul>' +
			'<li>fixed children always get exactly <code>Fixed</code>;</li>' +
			'<li>remaining = available − sum of fixed; if negative → overflow = the ' +
			'shortfall, every flex child gets 0;</li>' +
			'<li>otherwise each flex child gets <code>remaining × flex / ' +
			'totalFlex</code> (integer division), and the last flex child also ' +
			'receives the leftover remainder.</li>' +
			'</ul>',
		],

		starter: [
			'package main',
			'',
			'// FlexChild is one child of a Row: intrinsically sized (Fixed > 0)',
			'// or an Expanded with a flex factor (Flex > 0).',
			'type FlexChild struct {',
			'	Fixed int',
			'	Flex  int',
			'}',
			'',
			'// LayoutRow divides `available` main-axis pixels among the children.',
			'// Returns each child\'s size, in order, and the overflow amount',
			'// (0 when the children fit).',
			'func LayoutRow(available int, children []FlexChild) (sizes []int, overflow int) {',
			'	// your code here',
			'	return nil, 0',
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
			'	fx := func(n int) FlexChild { return FlexChild{Fixed: n} }',
			'	fl := func(n int) FlexChild { return FlexChild{Flex: n} }',
			'',
			'	type tc struct {',
			'		name      string',
			'		available int',
			'		children  []FlexChild',
			'		wantSizes []int',
			'		wantOver  int',
			'	}',
			'	cases := []tc{',
			'		{"fixed children just fit their sizes", 300,',
			'			[]FlexChild{fx(100), fx(50)}, []int{100, 50}, 0},',
			'		{"one Expanded absorbs the leftover", 300,',
			'			[]FlexChild{fx(100), fl(1)}, []int{100, 200}, 0},',
			'		{"flex 1:2 splits in proportion", 300,',
			'			[]FlexChild{fl(1), fl(2)}, []int{100, 200}, 0},',
			'		{"the lesson\'s Row: fixed + 1:2 in 400", 400,',
			'			[]FlexChild{fx(100), fl(1), fl(2)}, []int{100, 100, 200}, 0},',
			'		{"RenderFlex overflowed by 100 pixels", 300,',
			'			[]FlexChild{fx(200), fx(200)}, []int{200, 200}, 100},',
			'		{"overflow starves the flex children", 300,',
			'			[]FlexChild{fx(400), fl(1)}, []int{400, 0}, 100},',
			'		{"integer remainder goes to the last flex child", 301,',
			'			[]FlexChild{fx(100), fl(1), fl(1)}, []int{100, 100, 101}, 0},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%s (available=%d)", c.name, c.available),',
			'			"want":  fmt.Sprintf("sizes=%v overflow=%d", c.wantSizes, c.wantOver),',
			'		}',
			'		runCase(r, func() {',
			'			sizes, over := LayoutRow(c.available, append([]FlexChild(nil), c.children...))',
			'			got := fmt.Sprintf("sizes=%v overflow=%d", sizes, over)',
			'			r["pass"] = got == fmt.Sprintf("sizes=%v overflow=%d", c.wantSizes, c.wantOver)',
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
			'// FlexChild is one child of a Row: intrinsically sized (Fixed > 0)',
			'// or an Expanded with a flex factor (Flex > 0).',
			'type FlexChild struct {',
			'	Fixed int',
			'	Flex  int',
			'}',
			'',
			'// LayoutRow divides `available` main-axis pixels among the children,',
			'// in the framework\'s two rounds.',
			'//',
			'// Round 1 walks all children to lay out the fixed ones — their sizes',
			'// are facts the Row must accommodate, never inputs it may shrink.',
			'// Round 2 distributes what remains by flex share. The bookkeeping',
			'// details ARE the algorithm: overflow zeroes the flex children (there',
			'// is nothing left to share), and the integer remainder lands on the',
			'// LAST flex child so the sizes sum exactly to available.',
			'func LayoutRow(available int, children []FlexChild) (sizes []int, overflow int) {',
			'	sizes = make([]int, len(children))',
			'',
			'	// Round 1: inflexible children take their intrinsic sizes.',
			'	sumFixed, totalFlex, lastFlex := 0, 0, -1',
			'	for i, c := range children {',
			'		if c.Fixed > 0 {',
			'			sizes[i] = c.Fixed',
			'			sumFixed += c.Fixed',
			'		} else {',
			'			totalFlex += c.Flex',
			'			lastFlex = i',
			'		}',
			'	}',
			'',
			'	remaining := available - sumFixed',
			'	if remaining < 0 {',
			'		// The fixed children alone overshoot: the yellow-black stripe.',
			'		return sizes, -remaining',
			'	}',
			'',
			'	// Round 2: split the leftover by flex factor.',
			'	if totalFlex > 0 {',
			'		distributed := 0',
			'		for i, c := range children {',
			'			if c.Flex > 0 {',
			'				sizes[i] = remaining * c.Flex / totalFlex',
			'				distributed += sizes[i]',
			'			}',
			'		}',
			'		sizes[lastFlex] += remaining - distributed // integer dust',
			'	}',
			'	return sizes, 0',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why two rounds, not one</h3>' +
			'<p>The Row cannot know what "the rest" is until every inflexible child ' +
			'has answered — an Icon\'s 100px is a fact established by <em>its</em> ' +
			'layout, not negotiable by the parent. So fixed children are laid out ' +
			'with an <em>unbounded</em> main axis (be whatever size you are), and ' +
			'only then do Expanded children get a <em>tight</em> constraint of ' +
			'exactly their computed share. Both constraint shapes come straight from ' +
			'the previous lesson.</p>' +
			'<h3>Reading the two failure modes</h3>' +
			'<p>"RenderFlex overflowed by 100 pixels" is round 1 finishing negative: ' +
			'fixed content wider than the Row. The fix is making something flexible ' +
			'(<code>Expanded</code>), scrollable (<code>ListView</code>), or smaller. ' +
			'The <em>other</em> classic — "unbounded width" — is the mirror image: ' +
			'putting a Row inside something that gives it infinite width makes ' +
			'<code>Expanded</code> meaningless ("all of infinity, please"), and the ' +
			'framework throws during layout. Both errors are this arithmetic ' +
			'refusing to produce nonsense.</p>' +
			'<h3>The remainder detail is real</h3>' +
			'<p>Real Flutter distributes fractional logical pixels with doubles and ' +
			'quantizes carefully; an integer model surfaces the same requirement as ' +
			'"give the dust to someone". Skip it and a 301px Row with two flex-1 ' +
			'children yields 100+100=200 ≠ 201 of flex space — layouts that ' +
			'mysteriously leave a 1px gap. Sum preservation is a property tests ' +
			'should assert, and now yours does.</p>',
		],
		complexity: { time: 'O(n) — two passes over the children', space: 'O(n) for the sizes' },
	});
})();
