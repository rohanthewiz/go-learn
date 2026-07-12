/* IAM Policy Evaluation — Security & IAM (Hard). Implement the actual IAM
 * decision procedure: explicit deny > allow > implicit deny, over the union
 * of all attached statements, with AWS-style trailing-* wildcards. Exact
 * table harness — the algorithm is fully deterministic.
 */
(function () {
	'use strict';
	var T = GoLearnAWS;

	// The deny-overrides flowchart — the order of these three questions IS
	// the algorithm, and the exam tests exactly this ordering.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="IAM evaluation flowchart: any matching Deny wins, else any matching Allow, else implicit deny">' +
		'<defs><marker id="dgArrowIAM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		// request
		'<rect x="16" y="80" width="104" height="40" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="68" y="98" text-anchor="middle" class="lbl">request</text>' +
		'<text x="68" y="112" text-anchor="middle" class="lbl">action + resource</text>' +
		'<path d="M 120 100 L 158 100" fill="none" stroke="var(--dim)" stroke-width="1.5" marker-end="url(#dgArrowIAM)"/>' +
		// deny gate
		'<rect x="160" y="76" width="140" height="48" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<text x="230" y="96" text-anchor="middle" class="lbl">any matching</text>' +
		'<text x="230" y="112" text-anchor="middle" style="fill:var(--err-edge)">Deny?</text>' +
		'<path d="M 230 76 L 230 44 L 402 44" fill="none" stroke="var(--err-edge)" stroke-width="1.5" marker-end="url(#dgArrowIAM)"/>' +
		'<text x="250" y="38" class="lbl">yes</text>' +
		'<text x="470" y="48" style="fill:var(--err-edge)">ExplicitDeny</text>' +
		'<path d="M 300 100 L 338 100" fill="none" stroke="var(--dim)" stroke-width="1.5" marker-end="url(#dgArrowIAM)"/>' +
		'<text x="308" y="92" class="lbl">no</text>' +
		// allow gate
		'<rect x="340" y="76" width="140" height="48" rx="6" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="410" y="96" text-anchor="middle" class="lbl">any matching</text>' +
		'<text x="410" y="112" text-anchor="middle" style="fill:var(--ok)">Allow?</text>' +
		'<path d="M 480 100 L 518 100" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowIAM)"/>' +
		'<text x="488" y="92" class="lbl">yes</text>' +
		'<text x="524" y="104" style="fill:var(--ok)">Allow</text>' +
		'<path d="M 410 124 L 410 168 L 448 168" fill="none" stroke="var(--dim)" stroke-width="1.5" marker-end="url(#dgArrowIAM)"/>' +
		'<text x="418" y="150" class="lbl">no</text>' +
		'<text x="454" y="172" class="lbl">ImplicitDeny (the default)</text>' +
		'</svg>';

	T.problem({
		id: 'iam-policy-eval',
		title: 'IAM Policy Evaluation',
		nav: 'IAM policy eval',
		difficulty: 'Hard',
		category: 'Security & IAM',
		task: 'Implement Evaluate — make all 6 tests pass.',

		prose: [
			'<h2>IAM Policy Evaluation</h2>' +
			'<p>You are designing the permission model for a multi-team AWS account. ' +
			'A developer has three policies attached — one from their team, one from ' +
			'the org, one inline — and asks: “can I delete this object, yes or no?” ' +
			'To answer, you must run the same decision procedure IAM runs on every ' +
			'single API call.</p>' +
			'<p>A policy is a list of statements:</p>',
			{ code: 'type Stmt struct {\n\tEffect    string   // "Allow" or "Deny"\n\tActions   []string // e.g. "s3:GetObject", "s3:Get*", "*"\n\tResources []string // ARNs, e.g. "arn:aws:s3:::logs/*"\n}', lang: 'txt' },
			'<p>Implement <code>Evaluate(stmts []Stmt, action, resource string) string</code> ' +
			'returning one of <code>"ExplicitDeny"</code>, <code>"Allow"</code>, ' +
			'<code>"ImplicitDeny"</code>.</p>' +
			'<h3>Matching rules (exactly these)</h3>' +
			'<ul>' +
			'<li>A statement <strong>matches</strong> the request when <em>any</em> of its ' +
			'<code>Actions</code> matches <code>action</code> AND <em>any</em> of its ' +
			'<code>Resources</code> matches <code>resource</code>.</li>' +
			'<li>A pattern matches a string when it is <em>exactly equal</em> to it, OR the ' +
			'pattern is <code>"*"</code> (matches everything), OR the pattern ends in a ' +
			'<em>single trailing</em> <code>*</code> and everything before the <code>*</code> ' +
			'is a prefix of the string — <code>"s3:Get*"</code> matches ' +
			'<code>"s3:GetObject"</code>; <code>"arn:aws:s3:::logs/*"</code> matches any key ' +
			'under <code>logs/</code>. No other wildcard positions exist here.</li>' +
			'</ul>' +
			'<h3>Decision order</h3>' +
			'<p>Evaluate <em>all</em> statements (the union of every attached policy):</p>' +
			'<ol>' +
			'<li>Any matching <code>Deny</code> → <code>"ExplicitDeny"</code>. Deny wins over ' +
			'everything, no matter how many Allows also match.</li>' +
			'<li>Otherwise any matching <code>Allow</code> → <code>"Allow"</code>.</li>' +
			'<li>Otherwise → <code>"ImplicitDeny"</code> — the default when nothing speaks.</li>' +
			'</ol>' +
			DIAGRAM,
		],

		starter: [
			'package main',
			'',
			'// Stmt is one statement from an IAM identity policy. Effect is',
			'// "Allow" or "Deny"; Actions and Resources are pattern lists where',
			'// a pattern is an exact string, "*", or a single trailing-* prefix.',
			'type Stmt struct {',
			'	Effect    string',
			'	Actions   []string',
			'	Resources []string',
			'}',
			'',
			'// matches reports whether one pattern matches s under IAM rules:',
			'// exact equality, the lone wildcard "*", or a single trailing "*"',
			'// matching by prefix (compare s against pattern[:len(pattern)-1]).',
			'func matches(pattern, s string) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// Evaluate runs the IAM decision procedure over the union of all',
			'// attached statements and returns "ExplicitDeny", "Allow", or',
			'// "ImplicitDeny". A statement matches when ANY action pattern',
			'// matches action AND ANY resource pattern matches resource.',
			'// Order of precedence: explicit deny > allow > implicit deny.',
			'func Evaluate(stmts []Stmt, action, resource string) string {',
			'	// your code here',
			'	return ""',
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
			'		name     string',
			'		stmts    []Stmt',
			'		action   string',
			'		resource string',
			'		want     string',
			'	}',
			'	// Reusable policy fragments.',
			'	plainAllow := []Stmt{',
			'		{"Allow", []string{"s3:GetObject"}, []string{"arn:aws:s3:::logs/app.log"}},',
			'	}',
			'	prefixAllow := []Stmt{',
			'		{"Allow", []string{"s3:Get*"}, []string{"arn:aws:s3:::logs/*"}},',
			'	}',
			'	// Allow listed FIRST so implementations that return on the first',
			'	// matching Allow (the classic bug) get caught by the later Deny.',
			'	denyOverrides := []Stmt{',
			'		{"Allow", []string{"s3:*"}, []string{"*"}},',
			'		{"Deny", []string{"s3:DeleteObject"}, []string{"arn:aws:s3:::prod/*"}},',
			'	}',
			'	adminCarveOut := []Stmt{',
			'		{"Allow", []string{"*"}, []string{"*"}},',
			'		{"Deny", []string{"iam:*"}, []string{"*"}},',
			'	}',
			'	cases := []tc{',
			'		{"no statements -> implicit deny", nil, "s3:GetObject", "arn:aws:s3:::logs/app.log", "ImplicitDeny"},',
			'		{"exact allow", plainAllow, "s3:GetObject", "arn:aws:s3:::logs/app.log", "Allow"},',
			'		{"deny overrides allow", denyOverrides, "s3:DeleteObject", "arn:aws:s3:::prod/users.db", "ExplicitDeny"},',
			'		{"wildcard action + resource prefix", prefixAllow, "s3:GetObject", "arn:aws:s3:::logs/2026/app.log", "Allow"},',
			'		{"action matches, resource does not", prefixAllow, "s3:GetObject", "arn:aws:s3:::secrets/key.pem", "ImplicitDeny"},',
			'		{"admin * with iam carve-out", adminCarveOut, "iam:CreateUser", "arn:aws:iam:::user/intern", "ExplicitDeny"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%s: %s on %s", c.name, c.action, c.resource),',
			'			"want":  c.want,',
			'		}',
			'		runCase(r, func() {',
			'			// Copy the statement slice — Evaluate must not rely on',
			'			// (or be broken by) mutation of the shared fragments.',
			'			got := Evaluate(append([]Stmt(nil), c.stmts...), c.action, c.resource)',
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
			'import "strings"',
			'',
			'// Stmt is one statement from an IAM identity policy. Effect is',
			'// "Allow" or "Deny"; Actions and Resources are pattern lists where',
			'// a pattern is an exact string, "*", or a single trailing-* prefix.',
			'type Stmt struct {',
			'	Effect    string',
			'	Actions   []string',
			'	Resources []string',
			'}',
			'',
			'// matches reports whether one pattern matches s under IAM rules.',
			'// The three cases collapse neatly: "*" is just the empty prefix,',
			'// but it is kept explicit here so each rule reads off the spec.',
			'func matches(pattern, s string) bool {',
			'	if pattern == "*" {',
			'		return true // the universal wildcard',
			'	}',
			'	if strings.HasSuffix(pattern, "*") {',
			'		// Single trailing star: prefix match on everything before it.',
			'		return strings.HasPrefix(s, pattern[:len(pattern)-1])',
			'	}',
			'	return pattern == s // no wildcard: exact equality only',
			'}',
			'',
			'// stmtMatches applies the ANY-of semantics: a statement speaks to',
			'// this request if some action pattern hits AND some resource',
			'// pattern hits. The two lists are independent — IAM does not pair',
			'// Actions[i] with Resources[i].',
			'func stmtMatches(st Stmt, action, resource string) bool {',
			'	actionHit := false',
			'	for _, p := range st.Actions {',
			'		if matches(p, action) {',
			'			actionHit = true',
			'			break',
			'		}',
			'	}',
			'	if !actionHit {',
			'		return false',
			'	}',
			'	for _, p := range st.Resources {',
			'		if matches(p, resource) {',
			'			return true',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
			'// Evaluate runs the IAM decision procedure. Design choice: scan ALL',
			'// statements before answering rather than returning early on the',
			'// first Allow — a Deny later in the union must still win. (Early',
			'// return on Deny alone would also be correct, since nothing can',
			'// override it, but the single full pass keeps the precedence logic',
			'// in one obvious place: deny > allow > implicit deny.)',
			'func Evaluate(stmts []Stmt, action, resource string) string {',
			'	allowed := false',
			'	for _, st := range stmts {',
			'		if !stmtMatches(st, action, resource) {',
			'			continue',
			'		}',
			'		if st.Effect == "Deny" {',
			'			return "ExplicitDeny" // deny wins immediately and finally',
			'		}',
			'		allowed = true // remember, but keep looking for a Deny',
			'	}',
			'	if allowed {',
			'		return "Allow"',
			'	}',
			'	return "ImplicitDeny" // the default: nothing granted access',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The algorithm is the precedence order</h3>' +
			'<p>Everything reduces to one rule: <strong>explicit deny &gt; allow &gt; ' +
			'implicit deny</strong>. The implementation writes itself once you refuse ' +
			'to return early on an Allow — remember that an Allow matched, but keep ' +
			'scanning, because a Deny anywhere in the union vetoes it:</p>',
			{ code: 'if st.Effect == "Deny" {\n\treturn "ExplicitDeny" // final — nothing overrides a deny\n}\nallowed = true // provisional — a later Deny can still veto' },
			'<p>The matcher is the other half of the spec: exact match, the universal ' +
			'<code>"*"</code>, or a single trailing-star prefix. Trailing-star is why ' +
			'<code>s3:Get*</code> grants <code>GetObject</code> <em>and</em> ' +
			'<code>GetBucketPolicy</code> — wildcards are broader than they look, ' +
			'which is exactly why the deny carve-out pattern exists.</p>' +
			'<h3>Why "union" matters</h3>' +
			'<p>A principal’s effective permissions are the union of <em>every</em> ' +
			'attached policy — identity policies, group policies, inline policies. ' +
			'That is why the admin case in the tests works: <code>Allow */*</code> ' +
			'plus <code>Deny iam:*</code> yields an administrator who can do ' +
			'everything except touch IAM. Granting broadly and carving out with ' +
			'explicit denies is the standard guard-rail pattern (it is also how ' +
			'Service Control Policies restrict whole accounts).</p>' +
			'<h3>Exam takeaway</h3>' +
			'<p>Permissions are evaluated over the union of all applicable policies, ' +
			'and the order is fixed: an explicit <code>Deny</code> anywhere always ' +
			'wins, then any <code>Allow</code>, and the default is deny (implicit). ' +
			'When an SAA question shows overlapping policies, find a matching Deny ' +
			'first — if one exists, the action is denied no matter what else says ' +
			'Allow.</p>',
		],
		complexity: { time: 'O(s·p) over statements × patterns', space: 'O(1)' },
	});
})();
