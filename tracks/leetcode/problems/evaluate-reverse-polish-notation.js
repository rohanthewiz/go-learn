/* Evaluate Reverse Polish Notation — Stack (Medium). Postfix evaluation:
 * numbers push, operators pop two and push the result. The classic
 * demonstration of why stacks and expression evaluation are the same
 * subject. Highlights two Go details: strconv.Atoi for parsing and the
 * fact that Go's integer division already truncates toward zero.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="stack evaluation of an RPN expression">' +
		'<text x="20" y="16" class="lbl">tokens · reading "+"</text>' +
		// token strip
		'<g text-anchor="middle">' +
		'<rect x="20" y="26" width="40" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="40" y="46">2</text>' +
		'<rect x="66" y="26" width="40" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="86" y="46">1</text>' +
		'<rect x="112" y="26" width="40" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="132" y="46">+</text>' +
		'<rect x="158" y="26" width="40" height="30" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'<text x="178" y="46" class="lbl">3</text>' +
		'<rect x="204" y="26" width="40" height="30" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'<text x="224" y="46" class="lbl">*</text>' +
		'</g>' +
		// stack before
		'<text x="30" y="92" class="lbl">stack</text>' +
		'<g text-anchor="middle">' +
		'<rect x="20" y="100" width="56" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="48" y="119">1</text>' +
		'<rect x="20" y="134" width="56" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="48" y="153">2</text>' +
		'</g>' +
		// pop arrows into the operation
		'<path d="M 80 114 C 120 110 140 110 168 116" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowRPN)"/>' +
		'<path d="M 80 148 C 120 148 140 132 168 124" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowRPN)"/>' +
		'<text x="130" y="98" class="lbl">pop b=1, pop a=2</text>' +
		'<text x="180" y="126" style="fill:var(--accent)">a + b = 3</text>' +
		// push arrow into stack after
		'<path d="M 262 122 C 300 122 320 122 344 128" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowRPN)"/>' +
		'<text x="284" y="112" class="lbl">push</text>' +
		'<g text-anchor="middle">' +
		'<rect x="350" y="118" width="56" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="378" y="137">3</text>' +
		'</g>' +
		'<text x="330" y="92" class="lbl">stack after "+"</text>' +
		'<text x="20" y="182" class="lbl">then "3" pushes and "*" computes 3 * 3 = 9 — one number remains: the answer</text>' +
		'<defs><marker id="dgArrowRPN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'evaluate-reverse-polish-notation',
		title: 'Evaluate Reverse Polish Notation',
		nav: 'Evaluate RPN',
		difficulty: 'Medium',
		category: 'Stack',
		task: 'Implement evalRPN — make all 5 tests pass.',

		prose: [
			'<h2>Evaluate Reverse Polish Notation</h2>' +
			'<p>Given <code>tokens</code>, a slice of strings encoding an arithmetic ' +
			'expression in <em>reverse Polish (postfix) notation</em>, evaluate it and ' +
			'return the result as an <code>int</code>.</p>' +
			'<ul><li>Valid operators are <code>+</code>, <code>-</code>, <code>*</code> ' +
			'and <code>/</code>; every other token is an integer (possibly negative).</li>' +
			'<li>Division truncates toward zero: <code>7 / -3 = -2</code>, not −3.</li>' +
			'<li>The expression is always valid — no empty input, no division by zero.</li>' +
			'<li><code>strconv.Atoi</code> parses a numeric token (add ' +
			'<code>import "strconv"</code> to your file).</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'evalRPN([]string{"2", "1", "+", "3", "*"})    →  9    // (2 + 1) * 3\nevalRPN([]string{"4", "13", "5", "/", "+"})   →  6    // 4 + (13 / 5)', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Postfix notation is a stack machine’s native language: a number means ' +
			'“push me”, an operator means “pop two operands, apply, push the result”. ' +
			'No precedence, no parentheses — the order of the tokens <em>is</em> the ' +
			'order of evaluation:</p>' +
			DIAGRAM +
			'<p>One left-to-right pass; the single value left on the stack is the answer.</p>',
		],

		starter: [
			'package main',
			'',
			'// evalRPN evaluates an arithmetic expression given in reverse Polish',
			'// (postfix) notation. Tokens are integers or one of + - * /.',
			'// Division truncates toward zero.',
			'func evalRPN(tokens []string) int {',
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
			LC.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		tokens []string',
			'		want   int',
			'	}',
			'	cases := []tc{',
			'		{[]string{"2", "1", "+", "3", "*"}, 9},',
			'		{[]string{"4", "13", "5", "/", "+"}, 6},',
			'		// The classic stress case: 6 / -132 must truncate to 0, not floor to -1.',
			'		{[]string{"10", "6", "9", "3", "+", "-11", "*", "/", "*", "17", "+", "5", "+"}, 22},',
			'		// Negative division truncates toward zero: 7 / -3 = -2 (floor would be -3).',
			'		{[]string{"7", "-3", "/"}, -2},',
			'		// A lone number is a complete expression.',
			'		{[]string{"18"}, 18},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.tokens),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := evalRPN(append([]string(nil), c.tokens...))',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%d", got)',
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
			'import "strconv"',
			'',
			'// evalRPN evaluates a postfix expression with an operand stack:',
			'// numbers push, operators pop two and push the result.',
			'//',
			'// Operand order is the one trap. The stack top is the RIGHT operand',
			'// (it was pushed last), so pop b first, then a, and compute a op b —',
			'// getting this backwards flips every - and / result.',
			'//',
			'// Go needs no special-casing for the truncation rule: integer / on',
			'// int operands already truncates toward zero (7 / -3 == -2), which',
			'// is exactly what the problem specifies.',
			'func evalRPN(tokens []string) int {',
			'	// Worst case every token is a number; sizing the stack up front',
			'	// avoids re-allocation during the pass.',
			'	stack := make([]int, 0, len(tokens))',
			'	for _, tok := range tokens {',
			'		switch tok {',
			'		case "+", "-", "*", "/":',
			'			b := stack[len(stack)-1] // right operand: pushed last',
			'			a := stack[len(stack)-2] // left operand',
			'			stack = stack[:len(stack)-2]',
			'			var v int',
			'			switch tok {',
			'			case "+":',
			'				v = a + b',
			'			case "-":',
			'				v = a - b',
			'			case "*":',
			'				v = a * b',
			'			case "/":',
			'				v = a / b // truncates toward zero by definition',
			'			}',
			'			stack = append(stack, v)',
			'		default:',
			'			// Not an operator, so it must be an integer. The input is',
			'			// guaranteed valid, so the parse error can be ignored.',
			'			n, _ := strconv.Atoi(tok)',
			'			stack = append(stack, n)',
			'		}',
			'	}',
			'	// A valid expression reduces to exactly one value.',
			'	return stack[0]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why not parse it like infix?</h3>' +
			'<p>Evaluating <code>(2 + 1) * 3</code> from its usual infix form means handling ' +
			'precedence and parentheses — a recursive-descent parser or the shunting-yard ' +
			'algorithm. Postfix has already done that work: the token order encodes the ' +
			'evaluation order, so <code>"2 1 + 3 *"</code> needs no lookahead at all.</p>' +
			'<h3>A number pushes, an operator pops two</h3>' +
			'<p>Walk the tokens once with an <code>[]int</code> stack. Every operand waits on ' +
			'the stack until an operator consumes it; the operator’s result becomes an operand ' +
			'for whatever comes later:</p>',
			{ code: 'case "+", "-", "*", "/":\n\tb := stack[len(stack)-1] // right operand — pushed last\n\ta := stack[len(stack)-2]\n\tstack = stack[:len(stack)-2]\n\t// ... v = a + b, a - b, a * b, or a / b\n\tstack = append(stack, v)\ndefault:\n\tn, _ := strconv.Atoi(tok)\n\tstack = append(stack, n)' },
			'<p>The details that bite:</p>' +
			'<ul>' +
			'<li><strong>Pop order.</strong> The top of the stack is the <em>right</em> operand. ' +
			'For <code>"7 3 -"</code> you must compute <code>7 − 3</code>, not <code>3 − 7</code> ' +
			'— addition and multiplication hide this bug, subtraction and division expose it.</li>' +
			'<li><strong>Truncation toward zero is free in Go.</strong> <code>a / b</code> on ' +
			'ints truncates toward zero by language definition, so <code>6 / -132 = 0</code> and ' +
			'<code>7 / -3 = -2</code> need no adjustment. (Languages with floored division, like ' +
			'Python, would need extra work here.)</li>' +
			'<li><strong>Distinguish operator from number by the token, not its shape.</strong> ' +
			'Matching the four operator strings exactly means <code>"-11"</code> falls through ' +
			'to <code>strconv.Atoi</code> and parses as a negative number.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(n)' },
	});
})();
