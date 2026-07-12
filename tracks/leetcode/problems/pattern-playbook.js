/* The Pattern Playbook — Foundations (lesson). The track's map: every problem
 * here is an instance of a reusable technique, and interviews are won by
 * recognizing WHICH one from the problem statement's trigger phrases. This
 * lesson catalogs the playbook, then drills recognition: match ten scenario
 * descriptions to the technique that solves them.
 *
 * Registered directly through GoLearn.registerItem (not GoLearnLeet.problem,
 * which stamps kind:'problem') because this is a kind:'lesson' item — same
 * mechanism the system-design track uses for back-of-envelope.
 */
(function () {
	'use strict';

	GoLearn.registerItem('leetcode', {
		id: 'pattern-playbook',
		kind: 'lesson',
		title: 'The Pattern Playbook',
		nav: 'Pattern Playbook',
		category: 'Foundations',
		prose: [
			'<h2>The Pattern Playbook</h2>' +
			'<p>The ~90 problems in this track are not 90 separate ideas — they are a ' +
			'couple dozen <em>techniques</em> wearing different costumes. Strong ' +
			'interviewees read a problem statement, spot the <em>trigger phrase</em>, and ' +
			'reach for the matching tool before writing a line of code. That recognition ' +
			'step is trainable, and it is what this lesson drills.</p>' +
			'<h3>The playbook</h3>' +
			'<ul>' +
			'<li><strong>Hash map / set</strong> — trigger: “have I seen this before?”, pair lookup, counting. Cost: O(n) time, O(n) space. (Two Sum, Group Anagrams, Contains Duplicate)</li>' +
			'<li><strong>Two pointers (converging)</strong> — trigger: <em>sorted</em> input, pair/triple with a target. Cost: O(n), O(1) space. (Two Sum II, 3Sum, Container With Most Water)</li>' +
			'<li><strong>Fast &amp; slow pointers</strong> — trigger: cycles, middles of linked structures. (Linked List Cycle, Reorder List)</li>' +
			'<li><strong>Sliding window</strong> — trigger: “longest/shortest <em>substring or subarray</em> such that…”. Fixed size when the length is given, variable when a constraint is. (Longest Substring Without Repeating, Permutation in String, Min Window Substring)</li>' +
			'<li><strong>Monotonic stack</strong> — trigger: “nearest greater/smaller element”, spans, histograms. (Daily Temperatures, Largest Rectangle in Histogram)</li>' +
			'<li><strong>Binary search</strong> — trigger: sorted data — or any <em>monotonic yes/no answer space</em>, even without an array. (Binary Search, Koko Eating Bananas, Find Min in Rotated Sorted Array)</li>' +
			'<li><strong>Sentinel/dummy nodes + in-place reversal</strong> — trigger: linked-list surgery. (Reverse Linked List, Merge Two Sorted Lists, Remove Nth Node)</li>' +
			'<li><strong>DFS with subproblem returns</strong> — trigger: tree questions where the answer combines child answers. (Max Depth, Diameter, Balanced Binary Tree)</li>' +
			'<li><strong>BFS / multi-source BFS</strong> — trigger: “shortest”, “minimum steps”, level order, simultaneous spread. (Level Order Traversal, Rotting Oranges)</li>' +
			'<li><strong>BST invariants</strong> — trigger: the tree is a <em>search</em> tree — exploit ordering instead of searching blindly. (Validate BST, LCA of BST, Kth Smallest in BST)</li>' +
			'<li><strong>Trie</strong> — trigger: prefixes, autocomplete, word dictionaries. (Implement Trie)</li>' +
			'<li><strong>Heap</strong> — trigger: “top k”, “kth largest”, repeatedly take the extreme. Cost: O(n log k). (Top K Frequent, K Closest Points, Merge K Sorted Lists)</li>' +
			'<li><strong>Backtracking</strong> — trigger: “all combinations/permutations/paths”. Mark → recurse → unmark. (Subsets, Permutations, Word Search, Generate Parentheses)</li>' +
			'<li><strong>Union-find</strong> — trigger: incremental connectivity, “are these joined yet?”, cycle detection in edge streams. (Redundant Connection)</li>' +
			'<li><strong>Intervals: sort then sweep</strong> — trigger: ranges with overlaps. Sort by start to merge; by end to schedule greedily. (Merge Intervals, Non-overlapping Intervals, Meeting Rooms)</li>' +
			'<li><strong>Greedy + exchange argument</strong> — trigger: a local rule you can PROVE never hurts. (Jump Game, Gas Station, Partition Labels, Task Scheduler)</li>' +
			'<li><strong>1-D DP</strong> — trigger: “number of ways…”, “max/min over prefixes”, decisions per index. (Climbing Stairs, House Robber, Coin Change, Decode Ways)</li>' +
			'<li><strong>2-D DP over prefix pairs</strong> — trigger: TWO sequences compared. (Longest Common Subsequence, Edit Distance)</li>' +
			'<li><strong>0/1 knapsack (reverse iteration)</strong> — trigger: pick each item at most once to hit a target. (Partition Equal Subset Sum)</li>' +
			'<li><strong>Bit tricks</strong> — trigger: “without extra memory”, “appears once”, arithmetic without operators. XOR cancels pairs; n&amp;(n−1) drops a bit. (Single Number, Missing Number, Sum of Two Integers)</li>' +
			'</ul>' +
			'<div class="tip">Triggers beat memorization: “sorted” whispers <em>two pointers or ' +
			'binary search</em>; “all possible” shouts <em>backtracking</em>; “top k” is a ' +
			'<em>heap</em>; “substring” plus a constraint is a <em>window</em>. When two tools ' +
			'both apply, the input’s structure (sorted? streaming? tree-shaped?) breaks the tie.</div>' +
			'<h3>Drill: name the tool</h3>' +
			'<p>Below are ten one-line problem descriptions. Fill each <code>"?"</code> with ' +
			'the technique that solves it best, using exactly these names:</p>',
			{ code: 'hash map · two pointers · sliding window · binary search · monotonic stack\nheap · backtracking · dynamic programming · bfs · union-find', lang: 'txt' },
		],
		task: 'Replace each "?" with the best-fit technique from the vocabulary list, then run.',
		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	// Vocabulary (use these exact strings):',
			'	//   hash map, two pointers, sliding window, binary search,',
			'	//   monotonic stack, heap, backtracking, dynamic programming,',
			'	//   bfs, union-find',
			'	type drill struct {',
			'		scenario  string',
			'		technique string',
			'	}',
			'	drills := []drill{',
			'		{"two items summing to a target in an UNSORTED slice", "?"},',
			'		{"two items summing to a target in a SORTED slice", "?"},',
			'		{"longest substring with at most k distinct characters", "?"},',
			'		{"first true value of a monotonic yes/no predicate", "?"},',
			'		{"nearest greater element to the right of every item", "?"},',
			'		{"k largest items from a huge stream", "?"},',
			'		{"every possible combination that spells a word", "?"},',
			'		{"count the distinct ways to climb n steps", "?"},',
			'		{"fewest moves out of a maze from several start cells", "?"},',
			'		{"do these two nodes connect as edges stream in", "?"},',
			'	}',
			'	for i, d := range drills {',
			'		fmt.Printf("%d: %s  [%s]\\n", i+1, d.technique, d.scenario)',
			'	}',
			'}',
			'',
		].join('\n'),
		check: function (stdout, flat) {
			return flat.indexOf('1: hash map') !== -1 &&
				flat.indexOf('2: two pointers') !== -1 &&
				flat.indexOf('3: sliding window') !== -1 &&
				flat.indexOf('4: binary search') !== -1 &&
				flat.indexOf('5: monotonic stack') !== -1 &&
				flat.indexOf('6: heap') !== -1 &&
				flat.indexOf('7: backtracking') !== -1 &&
				flat.indexOf('8: dynamic programming') !== -1 &&
				flat.indexOf('9: bfs') !== -1 &&
				flat.indexOf('10: union-find') !== -1;
		},
		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	type drill struct {',
			'		scenario  string',
			'		technique string',
			'	}',
			'	// Each answer keys off the scenario\'s trigger phrase:',
			'	// UNSORTED + pair target → remember what you\'ve seen (hash map);',
			'	// SORTED flips the same problem to two pointers; "longest',
			'	// substring …" is a variable window; a monotonic predicate is',
			'	// binary-searchable even with no array in sight; "nearest',
			'	// greater" is the monotonic-stack calling card; "k largest from',
			'	// a stream" wants a bounded heap; "every possible" means',
			'	// backtracking; "count the ways" is 1-D DP; "fewest moves" from',
			'	// MULTIPLE sources is multi-source BFS; streaming connectivity',
			'	// is union-find\'s home turf.',
			'	drills := []drill{',
			'		{"two items summing to a target in an UNSORTED slice", "hash map"},',
			'		{"two items summing to a target in a SORTED slice", "two pointers"},',
			'		{"longest substring with at most k distinct characters", "sliding window"},',
			'		{"first true value of a monotonic yes/no predicate", "binary search"},',
			'		{"nearest greater element to the right of every item", "monotonic stack"},',
			'		{"k largest items from a huge stream", "heap"},',
			'		{"every possible combination that spells a word", "backtracking"},',
			'		{"count the distinct ways to climb n steps", "dynamic programming"},',
			'		{"fewest moves out of a maze from several start cells", "bfs"},',
			'		{"do these two nodes connect as edges stream in", "union-find"},',
			'	}',
			'	for i, d := range drills {',
			'		fmt.Printf("%d: %s  [%s]\\n", i+1, d.technique, d.scenario)',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
