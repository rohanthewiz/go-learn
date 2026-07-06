/* Valid Parentheses — Stack (Easy). The introductory stack problem:
 * bracket nesting is last-opened-first-closed, which is exactly what a
 * LIFO stack models. Push openers, match closers against the top.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="stack growing and shrinking while scanning a bracket string">' +
		// match arcs: each closer pairs with the most recent opener
		'<path d="M 70 36 C 70 4 420 4 420 36" fill="none" stroke="var(--ok)" stroke-width="1.4"/>' +
		'<path d="M 140 36 C 140 12 350 12 350 36" fill="none" stroke="var(--ok)" stroke-width="1.4"/>' +
		'<path d="M 210 36 C 210 20 280 20 280 36" fill="none" stroke="var(--ok)" stroke-width="1.4"/>' +
		// the string, one character per step
		'<text x="70" y="54" text-anchor="middle">(</text>' +
		'<text x="140" y="54" text-anchor="middle">[</text>' +
		'<text x="210" y="54" text-anchor="middle">{</text>' +
		'<text x="280" y="54" text-anchor="middle">}</text>' +
		'<text x="350" y="54" text-anchor="middle">]</text>' +
		'<text x="420" y="54" text-anchor="middle">)</text>' +
		'<text x="70" y="74" text-anchor="middle" class="lbl">push</text>' +
		'<text x="140" y="74" text-anchor="middle" class="lbl">push</text>' +
		'<text x="210" y="74" text-anchor="middle" class="lbl">push</text>' +
		'<text x="280" y="74" text-anchor="middle" class="lbl">pop</text>' +
		'<text x="350" y="74" text-anchor="middle" class="lbl">pop</text>' +
		'<text x="420" y="74" text-anchor="middle" class="lbl">pop</text>' +
		'<text x="20" y="110" class="lbl">stack after</text>' +
		'<text x="20" y="126" class="lbl">each step</text>' +
		// step 1: (      — just pushed → accent
		'<rect x="57" y="172" width="26" height="18" rx="3" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="70" y="185" text-anchor="middle">(</text>' +
		// step 2: ( [
		'<rect x="127" y="172" width="26" height="18" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<text x="140" y="185" text-anchor="middle">(</text>' +
		'<rect x="127" y="154" width="26" height="18" rx="3" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="140" y="167" text-anchor="middle">[</text>' +
		// step 3: ( [ {  — the peak
		'<rect x="197" y="172" width="26" height="18" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<text x="210" y="185" text-anchor="middle">(</text>' +
		'<rect x="197" y="154" width="26" height="18" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<text x="210" y="167" text-anchor="middle">[</text>' +
		'<rect x="197" y="136" width="26" height="18" rx="3" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="210" y="149" text-anchor="middle">{</text>' +
		// step 4: ( [   — } matched { and popped it
		'<rect x="267" y="172" width="26" height="18" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<text x="280" y="185" text-anchor="middle">(</text>' +
		'<rect x="267" y="154" width="26" height="18" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<text x="280" y="167" text-anchor="middle">[</text>' +
		// step 5: (
		'<rect x="337" y="172" width="26" height="18" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<text x="350" y="185" text-anchor="middle">(</text>' +
		// step 6: empty — every opener found its closer
		'<text x="420" y="186" text-anchor="middle" style="fill:var(--ok)">∅ ✓</text>' +
		'</svg>';

	LC.problem({
		id: 'valid-parentheses',
		title: 'Valid Parentheses',
		nav: 'Valid Parentheses',
		difficulty: 'Easy',
		category: 'Stack',
		task: 'Implement isValid — make all 6 tests pass.',

		prose: [
			'<h2>Valid Parentheses</h2>' +
			'<p>Given a string <code>s</code> containing only the characters ' +
			'<code>()[]{}</code>, return <code>true</code> if it is valid:</p>' +
			'<ul><li>Every opening bracket is closed by the <em>same type</em> of bracket.</li>' +
			'<li>Brackets close in the correct order — the most recently opened bracket must ' +
			'close first.</li>' +
			'<li>Every closing bracket has a matching opener. The empty string is valid.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'isValid("()[]{}")  →  true\nisValid("([)]")    →  false   // ] arrives while ( is still open\nisValid("{[]}")    →  true', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>“Most recently opened closes first” is <em>last in, first out</em> — a stack. ' +
			'Push each opener; each closer must match the top of the stack and pop it. Watch ' +
			'the stack grow and shrink over <code>"([{}])"</code>:</p>' +
			DIAGRAM +
			'<p>Valid means every closer matched the top <em>and</em> the stack ends empty.</p>',
		],

		starter: [
			'package main',
			'',
			'// isValid reports whether every bracket in s (containing only the',
			'// characters "()[]{}") is closed by the matching bracket type in',
			'// the correct order. The empty string is valid.',
			'func isValid(s string) bool {',
			'	// your code here',
			'	return false',
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
			LC.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		s    string',
			'		want bool',
			'	}',
			'	cases := []tc{',
			'		{"()", true},',
			'		{"()[]{}", true},',
			'		{"(]", false},',
			'		{"([)]", false},',
			'		{"{[]}", true},',
			'		{"", true},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("s=%q", c.s),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := isValid(c.s)',
			'			r["pass"] = got == c.want',
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
			'// isValid reports whether every bracket in s is closed by the right',
			'// type in the right order.',
			'//',
			'// A stack models nesting exactly: the most recently opened bracket',
			'// must be the first one closed (LIFO), so push openers and demand',
			'// that each closer match the current top. The closer→opener map',
			'// keeps the loop to a single comparison instead of a three-way',
			'// switch, and doubles as the opener/closer test: only closers are',
			'// keys. Anything left on the stack at the end is an opener that',
			'// never closed — invalid.',
			'func isValid(s string) bool {',
			'	pairs := map[byte]byte{\')\': \'(\', \']\': \'[\', \'}\': \'{\'}',
			'	stack := make([]byte, 0, len(s)) // []byte as a stack: append = push, reslice = pop',
			'	for i := 0; i < len(s); i++ {',
			'		open, isCloser := pairs[s[i]]',
			'		if !isCloser {',
			'			stack = append(stack, s[i]) // opener: wait for its closer',
			'			continue',
			'		}',
			'		if len(stack) == 0 || stack[len(stack)-1] != open {',
			'			return false // closer with nothing open, or the wrong thing open',
			'		}',
			'		stack = stack[:len(stack)-1] // matched — pop',
			'	}',
			'	return len(stack) == 0 // leftovers are openers that never closed',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Repeatedly delete every adjacent <code>"()"</code>, <code>"[]"</code>, ' +
			'<code>"{}"</code> pair until nothing changes; valid iff the string ends empty. ' +
			'Correct, but each sweep is O(n) and up to n/2 sweeps may be needed — O(n²), and ' +
			'lots of string rebuilding. The wasted work: after deleting a pair, only its ' +
			'immediate neighborhood can change, yet we rescan everything.</p>' +
			'<h3>Let a stack track the nesting</h3>' +
			'<p>“Most recently opened must close first” is the definition of LIFO. Scan once: ' +
			'push openers, and require each closer to match — then pop — the top:</p>',
			{ code: 'pairs := map[byte]byte{\')\': \'(\', \']\': \'[\', \'}\': \'{\'}\nstack := make([]byte, 0, len(s))\nfor i := 0; i < len(s); i++ {\n\topen, isCloser := pairs[s[i]]\n\tif !isCloser {\n\t\tstack = append(stack, s[i])\n\t\tcontinue\n\t}\n\tif len(stack) == 0 || stack[len(stack)-1] != open {\n\t\treturn false\n\t}\n\tstack = stack[:len(stack)-1]\n}\nreturn len(stack) == 0' },
			'<p>The details worth noticing:</p>' +
			'<ul>' +
			'<li><strong>Type must match at the top.</strong> <code>"([)]"</code> fails ' +
			'because <code>)</code> arrives while <code>[</code> is on top — interleaving is ' +
			'exactly what the top-of-stack comparison rejects.</li>' +
			'<li><strong>Two failure modes for closers.</strong> Empty stack (<code>")("</code>' +
			' — nothing to close) and wrong top (<code>"(]"</code>) share one guard.</li>' +
			'<li><strong>The final emptiness check.</strong> <code>"(("</code> sails through ' +
			'the loop; leftover openers are what <code>len(stack) == 0</code> catches. The ' +
			'empty string is valid for free.</li>' +
			'<li><strong>Why a map.</strong> <code>pairs</code> is both the classifier ' +
			'(closers are keys) and the matcher (values are the required openers) — one ' +
			'lookup replaces a six-case switch.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(n)' },
	});
})();
