/* leetcode — the LeetCode-in-Go track: manifest + shared Go harness helpers.
 *
 * Each problem lives in problems/<slug>.js and registers itself through
 * GoLearnLeet.problem(). A problem's `harness` is plain Go source (package
 * main + imports + func main) that the engine merges with the user's file
 * (see engine/assemble.js) — the harness runs the test table and reports
 * through the sentinel protocol via emitResults below.
 *
 * Shared Go snippets (HARNESS_RT, LIST_HELPERS, TREE_HELPERS) are single-
 * source constants concatenated into harnesses so the problems can't
 * drift apart. They are bare declarations — no package/import clauses —
 * because they're spliced into the harness file, whose import block must
 * cover what they use (fmt, encoding/json for HARNESS_RT).
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'leetcode',
		title: 'LeetCode in Go',
		runner: 'go-wasm',
		order: [
			// Foundations
			'pattern-playbook',
			// Arrays & Hashing
			'two-sum', 'contains-duplicate', 'valid-anagram', 'group-anagrams',
			'top-k-frequent-elements', 'product-of-array-except-self', 'longest-consecutive-sequence',
			'valid-sudoku', 'encode-decode-strings', 'majority-element',
			// Stack
			'valid-parentheses', 'min-stack', 'evaluate-reverse-polish-notation', 'daily-temperatures',
			'largest-rectangle-in-histogram',
			// Two Pointers
			'valid-palindrome', 'two-sum-ii', 'three-sum', 'container-with-most-water',
			'sort-colors', 'trapping-rain-water',
			// Sliding Window
			'best-time-to-buy-sell-stock', 'longest-substring-without-repeating',
			'longest-repeating-character-replacement', 'permutation-in-string', 'min-window-substring',
			// Binary Search
			'binary-search', 'search-2d-matrix', 'find-min-in-rotated-sorted-array',
			'search-in-rotated-sorted-array', 'koko-eating-bananas', 'median-of-two-sorted-arrays',
			// Linked List
			'reverse-linked-list', 'merge-two-sorted-lists', 'linked-list-cycle',
			'reorder-list', 'remove-nth-node-from-end', 'copy-list-with-random-pointer',
			'add-two-numbers', 'merge-k-sorted-lists',
			// Trees
			'invert-binary-tree', 'max-depth-binary-tree', 'diameter-of-binary-tree', 'same-tree',
			'subtree-of-another-tree', 'balanced-binary-tree', 'lowest-common-ancestor-bst',
			'binary-tree-level-order-traversal', 'kth-smallest-in-bst', 'validate-binary-search-tree',
			// Tries
			'implement-trie',
			// Heap / Priority Queue
			'last-stone-weight', 'k-closest-points', 'kth-largest-element', 'task-scheduler',
			// Backtracking
			'subsets', 'permutations', 'combination-sum', 'generate-parentheses',
			'letter-combinations', 'word-search',
			// Graphs
			'number-of-islands', 'rotting-oranges', 'pacific-atlantic', 'course-schedule',
			'redundant-connection',
			// Intervals
			'merge-intervals', 'insert-interval', 'non-overlapping-intervals', 'meeting-rooms',
			// Greedy
			'jump-game', 'gas-station', 'partition-labels',
			// Dynamic Programming
			'climbing-stairs', 'min-cost-climbing-stairs', 'maximum-subarray', 'house-robber',
			'decode-ways', 'coin-change', 'palindromic-substrings', 'longest-increasing-subsequence',
			'longest-common-subsequence', 'edit-distance', 'partition-equal-subset-sum',
			'unique-paths', 'word-break',
			// Bit Manipulation
			'single-number', 'number-of-1-bits', 'counting-bits', 'reverse-bits',
			'missing-number', 'sum-of-two-integers',
		],
	});

	// --- shared Go harness snippets -----------------------------------------

	// Every harness splices this in and its import block therefore always
	// includes fmt and encoding/json. runCase isolates one test: a panicking
	// solution records a failure for that case but the harness still reports
	// every result (the sentinel must always print).
	var HARNESS_RT = [
		'// runCase executes one test body, converting a panic into a failed case.',
		'func runCase(r map[string]any, body func()) {',
		'	defer func() {',
		'		if p := recover(); p != nil {',
		'			r["pass"] = false',
		'			r["got"] = fmt.Sprintf("panic: %v", p)',
		'		}',
		'	}()',
		'	body()',
		'}',
		'',
		'// emitResults prints the sentinel-delimited JSON block the UI parses.',
		'// Printed last, so user output can never spoof it (the parser splits',
		'// on the LAST marker).',
		'func emitResults(results []map[string]any) {',
		'	buf, _ := json.Marshal(results)',
		'	fmt.Println("\\n__GOLEARN_RESULTS__")',
		'	fmt.Println(string(buf))',
		'	fmt.Println("__GOLEARN_END__")',
		'}',
	].join('\n');

	// ListNode itself is declared in each linked-list problem's STARTER so
	// learners see the type they're working with; these builders only use it.
	var LIST_HELPERS = [
		'// sliceToList builds a ListNode chain from vals.',
		'func sliceToList(vals []int) *ListNode {',
		'	dummy := &ListNode{}',
		'	cur := dummy',
		'	for _, v := range vals {',
		'		cur.Next = &ListNode{Val: v}',
		'		cur = cur.Next',
		'	}',
		'	return dummy.Next',
		'}',
		'',
		'// listToSlice flattens a chain; capped so an accidental cycle in a',
		'// user-built list turns into a wrong answer, not a hung harness.',
		'func listToSlice(head *ListNode) []int {',
		'	out := []int{}',
		'	for n := head; n != nil && len(out) <= 10000; n = n.Next {',
		'		out = append(out, n.Val)',
		'	}',
		'	return out',
		'}',
	].join('\n');

	// TreeNode is declared in each tree problem's starter, same as ListNode.
	// Level-order uses []any so nulls can appear mid-sequence (LeetCode's
	// familiar [3,9,20,null,null,15,7] encoding).
	var TREE_HELPERS = [
		'// treeFromLevel builds a tree from LeetCode level-order encoding.',
		'func treeFromLevel(vals []any) *TreeNode {',
		'	if len(vals) == 0 || vals[0] == nil {',
		'		return nil',
		'	}',
		'	root := &TreeNode{Val: vals[0].(int)}',
		'	queue := []*TreeNode{root}',
		'	i := 1',
		'	for len(queue) > 0 && i < len(vals) {',
		'		n := queue[0]',
		'		queue = queue[1:]',
		'		if i < len(vals) && vals[i] != nil {',
		'			n.Left = &TreeNode{Val: vals[i].(int)}',
		'			queue = append(queue, n.Left)',
		'		}',
		'		i++',
		'		if i < len(vals) && vals[i] != nil {',
		'			n.Right = &TreeNode{Val: vals[i].(int)}',
		'			queue = append(queue, n.Right)',
		'		}',
		'		i++',
		'	}',
		'	return root',
		'}',
		'',
		'// treeToLevel is the inverse encoding (trailing nulls trimmed).',
		'func treeToLevel(root *TreeNode) []any {',
		'	out := []any{}',
		'	queue := []*TreeNode{root}',
		'	for len(queue) > 0 {',
		'		n := queue[0]',
		'		queue = queue[1:]',
		'		if n == nil {',
		'			out = append(out, nil)',
		'			continue',
		'		}',
		'		out = append(out, n.Val)',
		'		queue = append(queue, n.Left, n.Right)',
		'	}',
		'	for len(out) > 0 && out[len(out)-1] == nil {',
		'		out = out[:len(out)-1]',
		'	}',
		'	return out',
		'}',
	].join('\n');

	// globalThis (not window) so the Node verification harness can load
	// track files unchanged.
	globalThis.GoLearnLeet = {
		HARNESS_RT: HARNESS_RT,
		LIST_HELPERS: LIST_HELPERS,
		TREE_HELPERS: TREE_HELPERS,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('leetcode', def);
		},
	};
})();
