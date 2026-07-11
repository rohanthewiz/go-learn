/* Daily Temperatures — Stack (Medium). The canonical monotonic-stack
 * problem: for each day, how many days until a warmer temperature. A
 * decreasing stack of indices holds the days still waiting for their
 * answer; each new day resolves every colder day beneath it. Every index
 * is pushed and popped at most once — the amortized-O(n) argument this
 * whole pattern rests on.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="monotonic stack of indices resolving colder days">' +
		'<text x="20" y="16" class="lbl">temperatures · day 5 (72) arrives</text>' +
		// temperature cells
		'<g text-anchor="middle">' +
		'<rect x="20" y="26" width="44" height="32" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="42" y="47">73</text>' +
		'<rect x="70" y="26" width="44" height="32" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="92" y="47">74</text>' +
		'<rect x="120" y="26" width="44" height="32" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="142" y="47">75</text>' +
		'<rect x="170" y="26" width="44" height="32" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="192" y="47">71</text>' +
		'<rect x="220" y="26" width="44" height="32" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="242" y="47">69</text>' +
		'<rect x="270" y="26" width="44" height="32" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="292" y="47">72</text>' +
		'<text x="42" y="74" class="lbl">0</text><text x="92" y="74" class="lbl">1</text>' +
		'<text x="142" y="74" class="lbl">2</text><text x="192" y="74" class="lbl">3</text>' +
		'<text x="242" y="74" class="lbl">4</text><text x="292" y="74" class="lbl">5</text>' +
		'</g>' +
		// stack of waiting indices (temps decreasing top to bottom of the array order)
		'<text x="368" y="30" class="lbl">stack (waiting days)</text>' +
		'<g text-anchor="middle">' +
		'<rect x="368" y="40" width="90" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="413" y="58">4 (69)</text>' +
		'<rect x="368" y="72" width="90" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="413" y="90">3 (71)</text>' +
		'<rect x="368" y="104" width="90" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="413" y="122">2 (75)</text>' +
		'</g>' +
		'<text x="470" y="58" class="lbl">← pop</text>' +
		'<text x="470" y="90" class="lbl">← pop</text>' +
		'<text x="470" y="122" class="lbl">stays</text>' +
		// resolve arrows: 72 answers days 4 and 3
		'<path d="M 292 66 C 292 110 264 128 250 132" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowDT)"/>' +
		'<path d="M 292 66 C 292 130 220 152 200 156" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowDT)"/>' +
		'<text x="242" y="150" style="fill:var(--ok)">ans[4] = 5-4 = 1</text>' +
		'<text x="192" y="174" style="fill:var(--ok)">ans[3] = 5-3 = 2</text>' +
		'<text x="20" y="194" class="lbl">72 &gt; 69 and 72 &gt; 71: both waiting days are resolved; 75 keeps waiting, then 5 is pushed</text>' +
		'<defs><marker id="dgArrowDT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'daily-temperatures',
		title: 'Daily Temperatures',
		nav: 'Daily Temperatures',
		difficulty: 'Medium',
		category: 'Stack',
		task: 'Implement dailyTemperatures — make all 5 tests pass.',

		prose: [
			'<h2>Daily Temperatures</h2>' +
			'<p>Given a slice <code>temperatures</code> of daily temperatures, return a slice ' +
			'<code>answer</code> of the same length where <code>answer[i]</code> is the number ' +
			'of days you have to wait after day <code>i</code> for a <em>warmer</em> ' +
			'temperature. If no warmer day ever comes, <code>answer[i]</code> is 0.</p>' +
			'<ul><li>“Warmer” is strictly greater — an equal temperature doesn’t count.</li>' +
			'<li>The result has an entry for every day, in the original order.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'dailyTemperatures([]int{73, 74, 75, 71, 69, 72, 76, 73})\n\t→  []int{1, 1, 4, 2, 1, 1, 0, 0}\n// day 2 (75) waits 4 days for 76; days 6 and 7 never see warmer', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Scanning forward from every day is O(n²). Flip the question: when a new ' +
			'temperature arrives, <em>which earlier days does it answer?</em> Exactly the ' +
			'colder ones still waiting. Keep those waiting days on a stack of indices — ' +
			'coldest on top — and let each new day pop everything it beats:</p>' +
			DIAGRAM +
			'<p>Each index is pushed once and popped at most once — 2n stack operations total.</p>',
		],

		starter: [
			'package main',
			'',
			'// dailyTemperatures returns, for each day i, the number of days',
			'// until a strictly warmer temperature (0 if none ever comes).',
			'func dailyTemperatures(temperatures []int) []int {',
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
			'func main() {',
			'	type tc struct {',
			'		temps []int',
			'		want  []int',
			'	}',
			'	cases := []tc{',
			'		// The classic: mixed rises and falls.',
			'		{[]int{73, 74, 75, 71, 69, 72, 76, 73}, []int{1, 1, 4, 2, 1, 1, 0, 0}},',
			'		// Strictly increasing: every answer is 1, except the last.',
			'		{[]int{30, 40, 50, 60}, []int{1, 1, 1, 0}},',
			'		// Strictly decreasing: nothing warmer ever comes — all zeros',
			'		// (the stack only grows; nothing is ever popped).',
			'		{[]int{90, 80, 70, 60}, []int{0, 0, 0, 0}},',
			'		// Plateaus: equal is NOT warmer, so both 70s wait for the 75.',
			'		{[]int{70, 70, 75}, []int{2, 1, 0}},',
			'		// Single day: no tomorrow to wait for.',
			'		{[]int{50}, []int{0}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.temps),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := dailyTemperatures(append([]int(nil), c.temps...))',
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
			'// dailyTemperatures returns, for each day, the wait until a strictly',
			'// warmer temperature, using a monotonic decreasing stack of indices.',
			'//',
			'// Invariant: the stack holds the days that haven\'t seen a warmer',
			'// temperature yet, and their temperatures are strictly decreasing',
			'// from bottom to top. Both facts are maintained by the same move:',
			'// a new day pops (and thereby answers) every colder day on top of',
			'// the stack before being pushed itself.',
			'//',
			'//	temps:  73 74 75 71 69 [72]      stack: 2(75) 3(71) 4(69)',
			'//	72 arrives → pops 4 and 3 (both colder), answers them with the',
			'//	index gap, stops at 75 (not colder), pushes 5.',
			'func dailyTemperatures(temperatures []int) []int {',
			'	// make() zero-fills, so "no warmer day ever" is the default and',
			'	// only resolved days need a write.',
			'	res := make([]int, len(temperatures))',
			'	stack := []int{} // indices of days still waiting, temps decreasing',
			'	for i, t := range temperatures {',
			'		// Resolve every waiting day this temperature beats. Strict <',
			'		// keeps equal temperatures waiting (equal is not "warmer").',
			'		for len(stack) > 0 && temperatures[stack[len(stack)-1]] < t {',
			'			j := stack[len(stack)-1]',
			'			stack = stack[:len(stack)-1]',
			'			res[j] = i - j // wait = index gap, not a day count we tracked',
			'		}',
			'		stack = append(stack, i)',
			'	}',
			'	// Whatever is left on the stack never met a warmer day; res is',
			'	// already 0 for those indices.',
			'	return res',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force: look ahead from every day</h3>' +
			'<p>For each day, scan forward until something warmer appears — O(n²) when the ' +
			'temperatures keep falling (every day scans to the end and finds nothing). The ' +
			'waste: day after day re-walks the same stretch of cold days.</p>' +
			'<h3>Flip the direction of the question</h3>' +
			'<p>Instead of each day searching its future, let each new temperature ' +
			'<em>report to its past</em>: when 72 arrives, it is the answer for every colder ' +
			'day still waiting. Keep those unanswered days on a stack of <em>indices</em>. ' +
			'Because a new day pops everyone it beats before joining, the stack’s ' +
			'temperatures are always strictly decreasing — the coldest, most-recently-seen ' +
			'days sit on top, exactly the ones a warm newcomer resolves first:</p>',
			{ code: 'res := make([]int, len(temperatures)) // zero = "never"\nstack := []int{}                       // waiting days, temps decreasing\nfor i, t := range temperatures {\n\tfor len(stack) > 0 && temperatures[stack[len(stack)-1]] < t {\n\t\tj := stack[len(stack)-1]\n\t\tstack = stack[:len(stack)-1]\n\t\tres[j] = i - j // this day\'s wait is the index gap\n\t}\n\tstack = append(stack, i)\n}' },
			'<p>What makes it tick:</p>' +
			'<ul>' +
			'<li><strong>Store indices, not temperatures.</strong> The answer is a <em>distance</em> ' +
			'(<code>i − j</code>); the temperature is recoverable from the index but not vice ' +
			'versa.</li>' +
			'<li><strong>O(n) despite the nested loop.</strong> The inner loop only pops, and each ' +
			'index is pushed exactly once — so across the whole run there are at most n pops. ' +
			'Amortized, each day costs O(1).</li>' +
			'<li><strong>Strict comparison.</strong> <code>&lt;</code> (not <code>&lt;=</code>) leaves ' +
			'equal temperatures on the stack: a 70° day is not the answer for another 70° day.</li>' +
			'<li><strong>Unanswered days cost nothing.</strong> <code>make</code> zero-fills the ' +
			'result, so days still on the stack at the end are already correct.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(n)' },
	});
})();
