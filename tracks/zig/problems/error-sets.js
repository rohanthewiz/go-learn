/* Error Sets — Values & Errors (Medium). In Go a signature says `error`
 * and the possible failures are archaeology; in Zig they are IN the type:
 * error{NotFound, AccessDenied}, merged with ||, coerced subset-to-
 * superset, and inferred for `!T` functions as the union of everything
 * tried inside. The learner implements the set algebra over sorted unique
 * []string sets. The harness pins deduped+sorted merges, coercion in both
 * directions, a three-callee inferred set, and the empty-set edges.
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// Two named sets merge (||) into a superset; membership flows one way:
	// a subset coerces up into the superset, never back down. Marker id
	// namespaced (dgArrowZGES) — SVG ids share one page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 216" width="560" height="216" role="img" aria-label="FileError and NetError merge into a superset; a subset coerces up into the superset but never back down">' +
		'<text x="20" y="24" class="lbl">error-set algebra: || is set union, and assignment coerces subset → superset only</text>' +
		'<circle cx="120" cy="90" r="46" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="120" y="72" text-anchor="middle">FileError</text>' +
		'<text x="120" y="92" text-anchor="middle" class="lbl">NotFound</text>' +
		'<text x="120" y="108" text-anchor="middle" class="lbl">AccessDenied</text>' +
		'<circle cx="120" cy="182" r="30" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="120" y="178" text-anchor="middle">NetError</text>' +
		'<text x="120" y="194" text-anchor="middle" class="lbl">ConnReset, Timeout</text>' +
		'<text x="205" y="140" class="lbl">||</text>' +
		// superset box
		'<rect x="250" y="66" width="290" height="88" rx="8" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="395" y="92" text-anchor="middle">AppError = FileError || NetError</text>' +
		'<text x="395" y="116" text-anchor="middle" class="lbl">{ AccessDenied, ConnReset,</text>' +
		'<text x="395" y="134" text-anchor="middle" class="lbl">NotFound, Timeout }</text>' +
		// one-way coercion arrow
		'<path d="M 168 90 L 244 90" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowZGES)"/>' +
		'<text x="206" y="80" text-anchor="middle" class="lbl">coerces up</text>' +
		'<text x="250" y="184" class="lbl" style="fill:var(--warn)">never the reverse: a superset value might hold ConnReset,</text>' +
		'<text x="250" y="200" class="lbl" style="fill:var(--warn)">which a FileError slot cannot represent</text>' +
		'<defs><marker id="dgArrowZGES" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'error-sets',
		title: 'Error Sets',
		nav: 'error sets',
		difficulty: 'Medium',
		category: 'Values & Errors',
		task: 'Implement MergeSets (the || union), CanCoerce (subset-to-superset rule), and InferSet (union of every callee\'s set) over sorted string sets.',

		prose: [
			'<h2>Error Sets</h2>' +
			'<p>“What can this actually return?” You are three calls deep into a Go ' +
			'code review, staring at <code>func Sync(ctx context.Context) error</code>. ' +
			'The honest answer requires archaeology: read the body, read the ' +
			'callees, read <em>their</em> callees, and hope nobody adds a new failure ' +
			'mode next sprint — the signature will not change when they do, and no ' +
			'compiler will tell your callers. In Zig, the answer is <em>in the ' +
			'type</em>. An error set is a closed list of names, and functions declare ' +
			'exactly which set they can return:</p>',
			{ lang: 'txt', code: 'const FileError = error{ NotFound, AccessDenied };\nconst NetError  = error{ ConnReset, Timeout };\nconst AppError  = FileError || NetError;  // set union, computed at compile time\n\nfn open(p: []const u8) FileError!Handle { ... }\n\nfn fetch(u: []const u8) AppError!Handle {\n    return open(u);   // OK: FileError coerces INTO the superset AppError\n}\n\nfn poll() !Status {   // `!T` — the error set is INFERRED:\n    const c = try connect();   // contributes NetError\n    const f = try open(path);  // contributes FileError\n    ...                        // inferred set = the union of everything tried\n}' },
			'<ul>' +
			'<li><strong><code>||</code> merges sets.</strong> The union is a ' +
			'compile-time computation over names — duplicates collapse, because a ' +
			'given error name is one identity everywhere it appears.</li>' +
			'<li><strong>Coercion is one-way.</strong> A <code>FileError</code> value ' +
			'is always a legal <code>AppError</code> (every member is in the ' +
			'superset), so returning it where the superset is expected just works. ' +
			'The reverse is refused: an <code>AppError</code> might hold ' +
			'<code>ConnReset</code>, which a <code>FileError</code> slot cannot ' +
			'represent. It is the subset rule, checked at compile time.</li>' +
			'<li><strong>Inferred sets.</strong> Write <code>!T</code> and the ' +
			'compiler computes the set for you: the union of every callee’s set that ' +
			'you <code>try</code>. Add a new failing callee and every transitive ' +
			'signature updates itself — <em>and</em> every exhaustive ' +
			'<code>catch |e| switch (e)</code> over the old set becomes a compile ' +
			'error until it handles the new member. No <code>else</code> needed, no ' +
			'forgotten case possible.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Model an error set as a <code>[]string</code> of sorted, unique ' +
			'names (inputs honor this; your outputs must too). Implement ' +
			'<code>MergeSets</code> (the <code>||</code> operator), ' +
			'<code>CanCoerce(from, to)</code> (may a value of set <code>from</code> ' +
			'flow into a slot of set <code>to</code>?), and <code>InferSet</code> ' +
			'(given the sets of every callee a function <code>try</code>s, compute ' +
			'its inferred set).</p>',
			{ lang: 'txt', code: 'MergeSets({AccessDenied,NotFound}, {ConnReset,NotFound,Timeout})\n        → {AccessDenied,ConnReset,NotFound,Timeout}   // NotFound once, sorted\nCanCoerce({AccessDenied,NotFound}, superset)  → true    // subset flows up\nCanCoerce(superset, {AccessDenied,NotFound})  → false   // never back down\nInferSet([{NotFound}, {ConnReset,Timeout}, {AccessDenied,NotFound}])\n        → {AccessDenied,ConnReset,NotFound,Timeout}' },
		],

		starter: [
			'package main',
			'',
			'// An error set is modeled as a []string of error names, kept SORTED',
			'// and UNIQUE — a canonical form, so two equal sets are equal slices.',
			'// All inputs below honor this invariant; all outputs must too.',
			'',
			'// MergeSets models Zig\'s || on error sets: the union of a and b as a',
			'// new sorted, deduplicated slice. Names appearing in both sets appear',
			'// ONCE in the result (an error name is one identity everywhere).',
			'// Merging two empty sets yields an empty set.',
			'func MergeSets(a, b []string) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// CanCoerce reports whether a value of set `from` may flow into a slot',
			'// expecting set `to`: true exactly when EVERY member of `from` is also',
			'// in `to` (the subset rule). The empty set coerces into anything.',
			'func CanCoerce(from, to []string) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// InferSet models the compiler computing a `!T` function\'s error set:',
			'// given the error sets of every callee the function try\'s, return',
			'// their union, sorted and deduplicated. No calls infers the empty set.',
			'func InferSet(calls [][]string) []string {',
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
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// Sets render brace-wrapped and comma-joined, so ordering and',
			'	// duplicate bugs are visible in the diff: {A,B} vs {A,A,B}.',
			'	showSet := func(s []string) string { return "{" + strings.Join(s, ",") + "}" }',
			'',
			'	fileErr := []string{"AccessDenied", "NotFound"}',
			'	netErr := []string{"ConnReset", "NotFound", "Timeout"} // shares NotFound with fileErr',
			'	superset := []string{"AccessDenied", "ConnReset", "NotFound", "Timeout"}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"FileError || NetError: union is sorted and the shared NotFound appears ONCE",',
			'			"{AccessDenied,ConnReset,NotFound,Timeout}",',
			'			func() string { return showSet(MergeSets(fileErr, netErr)) }},',
			'		{"merge with the empty set: identity — {NotFound} unchanged",',
			'			"{NotFound}",',
			'			func() string { return showSet(MergeSets([]string{"NotFound"}, []string{})) }},',
			'		{"merge preserves sort across interleaved names: {B,D} || {A,C} = {A,B,C,D}",',
			'			"{A,B,C,D}",',
			'			func() string { return showSet(MergeSets([]string{"B", "D"}, []string{"A", "C"})) }},',
			'		{"coercion up: FileError flows into FileError||NetError — every member present",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", CanCoerce(fileErr, superset)) }},',
			'		{"coercion down REFUSED: the superset might hold ConnReset, which FileError cannot represent",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", CanCoerce(superset, fileErr)) }},',
			'		{"a set coerces into itself: subset need not be strict",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", CanCoerce(fileErr, fileErr)) }},',
			'		{"the empty set coerces into anything: no members, nothing to violate",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", CanCoerce([]string{}, fileErr)) }},',
			'		{"disjoint sets do not coerce: {ConnReset,Timeout} has no home in FileError",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", CanCoerce([]string{"ConnReset", "Timeout"}, fileErr)) }},',
			'		{"inferred set across three try\'d callees: the union of all their sets",',
			'			"{AccessDenied,ConnReset,NotFound,Timeout}",',
			'			func() string {',
			'				return showSet(InferSet([][]string{',
			'					{"NotFound"},',
			'					{"ConnReset", "Timeout"},',
			'					{"AccessDenied", "NotFound"},',
			'				}))',
			'			}},',
			'		{"inferred set of a function that try\'s nothing: empty — it cannot fail",',
			'			"{}",',
			'			func() string { return showSet(InferSet([][]string{})) }},',
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
			'import "sort"',
			'',
			'// MergeSets is Zig\'s || on error sets. Concatenate, sort, then squeeze',
			'// out adjacent duplicates — after sorting, equal names are neighbors,',
			'// so dedup is a single linear scan. (A two-pointer merge over the',
			'// already-sorted inputs would be O(n) instead of O(n log n), but sets',
			'// here are handfuls of names; the simpler canonical-form pipeline is',
			'// the better trade.)',
			'func MergeSets(a, b []string) []string {',
			'	merged := make([]string, 0, len(a)+len(b))',
			'	merged = append(merged, a...)',
			'	merged = append(merged, b...)',
			'	sort.Strings(merged)',
			'',
			'	// Keep each name\'s FIRST occurrence; later equal neighbors are the',
			'	// same identity — Zig error names are global, so error.NotFound in',
			'	// FileError and in NetError is one value, not two.',
			'	out := []string{}',
			'	for i, name := range merged {',
			'		if i == 0 || merged[i-1] != name {',
			'			out = append(out, name)',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// CanCoerce is the subset rule: from ⊆ to. Coercion adds possible',
			'// members, never removes them — a FileError value is a fine AppError',
			'// because AppError\'s catch arms already cover every FileError name;',
			'// the reverse would let a ConnReset sneak into code that only handles',
			'// file failures. Membership is a linear probe per name: sets are tiny',
			'// (a real compiler interns names and compares bitsets).',
			'func CanCoerce(from, to []string) bool {',
			'	for _, name := range from {',
			'		found := false',
			'		for _, t := range to {',
			'			if t == name {',
			'				found = true',
			'				break',
			'			}',
			'		}',
			'		if !found {',
			'			return false',
			'		}',
			'	}',
			'	// Vacuously true for the empty set: no members, nothing to violate.',
			'	// This is why error{} (an uninferred function that cannot fail)',
			'	// coerces anywhere.',
			'	return true',
			'}',
			'',
			'// InferSet folds MergeSets over every callee\'s set — precisely what',
			'// the compiler does for a `!T` return type: each `try someCallee()`',
			'// contributes that callee\'s set, and the function\'s own set is the',
			'// running union. Starting from the empty set makes "no fallible calls"',
			'// infer error{} with no special case.',
			'func InferSet(calls [][]string) []string {',
			'	inferred := []string{}',
			'	for _, set := range calls {',
			'		inferred = MergeSets(inferred, set)',
			'	}',
			'	return inferred',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Checked exceptions, minus what made them fail</h3>' +
			'<p>“The possible errors are in the signature” has been tried before: ' +
			'Java’s checked exceptions. They collapsed under two weights — every ' +
			'signature change rippled through callers by hand, and code that did not ' +
			'care was forced to either wrap or lie (<code>throws Exception</code>, ' +
			'the type-level shrug). Zig keeps the check and removes the labor: ' +
			'<strong>inference</strong> (<code>!T</code>) means the ripple is ' +
			'automatic — the compiler recomputes the union you just implemented in ' +
			'<code>InferSet</code> on every build — and <strong>coercion</strong> ' +
			'means callers holding a superset slot absorb subset returns without ' +
			'ceremony, using the exact <code>CanCoerce</code> subset test you wrote. ' +
			'The escape hatch still exists (<code>anyerror</code>, the universal ' +
			'superset, is Go’s <code>error</code> reborn), but it is opt-in and ' +
			'greppable, not the default.</p>' +
			'<h3>One global namespace of names</h3>' +
			'<p>A subtlety your string model captures faithfully: error names are ' +
			'<em>global identities</em>. <code>error.NotFound</code> declared in ' +
			'<code>FileError</code> and in some third-party <code>DbError</code> is ' +
			'the <em>same value</em> — under the hood each distinct name in the ' +
			'program gets one integer in a global table, and a set is just a ' +
			'constraint on which of those integers may appear. That is why your ' +
			'merge dedupes on the name and nothing else. It also explains a design ' +
			'that surprises Go developers: sets are not namespaces, so two libraries ' +
			'using <code>error.Timeout</code> interoperate instead of colliding — ' +
			'closer to how Go\'s <code>errors.Is</code> matches sentinel identity ' +
			'than to matching on package paths.</p>' +
			'<h3>What exhaustiveness buys in practice</h3>' +
			'<p>The payoff scenario: you add <code>error.RateLimited</code> to a ' +
			'client library. In Go, every caller’s <code>errors.Is</code> ladder ' +
			'silently falls through to its generic branch — you find out in ' +
			'production. In Zig, the inferred sets of every transitive caller grow ' +
			'automatically, and every <code>catch |e| switch (e)</code> that matched ' +
			'the old set <em>stops compiling</em> until it says what to do about ' +
			'rate limiting. The compile errors are the migration checklist. That is ' +
			'the trade this item teaches: Go treats “which errors?” as documentation ' +
			'and runtime convention; Zig makes it algebra the build system refuses ' +
			'to let drift.</p>',
		],
		complexity: { time: 'O(n log n) per merge (sort-based union); CanCoerce O(n·m) over tiny sets', space: 'O(n) for the merged set' },
	});
})();
