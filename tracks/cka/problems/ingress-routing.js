/* Ingress Routing — Networking (Medium). The ingress controller's rule
 * matching: host tier, Exact beats Prefix, longest segment-aware prefix
 * wins. Exact-table harness — every request resolves to one backend
 * (or the 404 default).
 */
(function () {
	'use strict';
	var T = GoLearnCKA;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 190" width="560" height="190" role="img" aria-label="ingress decision funnel: host tier, then exact match, then longest prefix">' +
		// request
		'<rect x="14" y="70" width="150" height="50" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="89" y="90" text-anchor="middle">request</text>' +
		'<text x="89" y="108" text-anchor="middle" class="lbl">shop.example.com /api/v2</text>' +
		// stage 1: host
		'<rect x="204" y="70" width="106" height="50" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="257" y="90" text-anchor="middle">host tier</text>' +
		'<text x="257" y="108" text-anchor="middle" class="lbl">exact host, else ""</text>' +
		// stage 2: exact
		'<rect x="350" y="70" width="90" height="50" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="395" y="90" text-anchor="middle">Exact?</text>' +
		'<text x="395" y="108" text-anchor="middle" class="lbl">wins outright</text>' +
		// stage 3: longest prefix
		'<rect x="350" y="132" width="120" height="46" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="410" y="151" text-anchor="middle">longest Prefix</text>' +
		'<text x="410" y="168" text-anchor="middle" class="lbl">per path segment</text>' +
		// backend
		'<rect x="480" y="70" width="66" height="50" rx="6" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="513" y="99" text-anchor="middle">svc</text>' +
		// arrows
		'<path d="M 164 95 L 200 95" fill="none" stroke="var(--dim)" stroke-width="1.6" marker-end="url(#dgArrowING)"/>' +
		'<path d="M 310 95 L 346 95" fill="none" stroke="var(--dim)" stroke-width="1.6" marker-end="url(#dgArrowING)"/>' +
		'<path d="M 395 120 L 400 128" fill="none" stroke="var(--dim)" stroke-width="1.4" marker-end="url(#dgArrowING)"/>' +
		'<text x="330" y="130" class="lbl" style="fill:var(--dim)">no exact</text>' +
		'<path d="M 440 95 L 476 95" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowINGok)"/>' +
		'<path d="M 470 148 C 500 145 510 130 513 124" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowINGok)"/>' +
		// trap note
		'<text x="14" y="160" class="lbl">segment trap: rule /api matches /api and /api/v1,</text>' +
		'<text x="14" y="175" class="lbl">but NOT /apix — prefixes end on "/" boundaries</text>' +
		'<defs>' +
		'<marker id="dgArrowING" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker>' +
		'<marker id="dgArrowINGok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'ingress-routing',
		title: 'Ingress Routing',
		nav: 'Ingress Routing',
		difficulty: 'Medium',
		category: 'Networking',
		task: 'Implement Route — host tier, Exact wins, then longest segment-aware Prefix. Make all 6 tests pass.',

		prose: [
			'<h2>Ingress Routing</h2>' +
			'<p>One load balancer, many services: an Ingress maps incoming HTTP requests ' +
			'to backends by host and path. When two teams’ rules overlap — <code>/api</code> ' +
			'here, <code>/api/v2</code> there, a catch-all <code>/</code> somewhere — the ingress ' +
			'controller must pick exactly one winner, and admins must be able to predict ' +
			'which. Implement that decision.</p>' +
			'<p><code>Route(rules, host, path)</code> returns the winning rule’s ' +
			'<code>Backend</code>, or <code>""</code> when nothing matches (the request falls ' +
			'through to the default backend — the 404 case):</p>' +
			'<ol>' +
			'<li><strong>Host tier.</strong> A rule is a candidate when its <code>Host</code> equals ' +
			'the request host, or its <code>Host</code> is <code>""</code> (a catch-all). ' +
			'<em>Simplification we make on purpose:</em> evaluate specific-host candidates ' +
			'first and fall back to catch-all rules only when <em>no</em> specific-host rule ' +
			'matched — real controllers interleave these with the same effect in common ' +
			'configs, but our two-tier pass is easier to reason about and we test it ' +
			'as such.</li>' +
			'<li><strong>Exact wins outright.</strong> Within a tier, an <code>Exact</code> rule whose ' +
			'<code>Path</code> equals the request path beats every prefix rule.</li>' +
			'<li><strong>Longest Prefix wins.</strong> Otherwise the longest matching ' +
			'<code>Prefix</code> rule takes it. Prefix matching is per <em>path segment</em>: rule ' +
			'<code>/api</code> matches <code>/api</code> and <code>/api/v1</code> but <em>not</em> ' +
			'<code>/apix</code>; <code>/</code> matches everything.</li>' +
			'</ol>' +
			DIAGRAM +
			'<h3>Example</h3>',
			{ code: 'rules:\n  {Host: "", Path: "/",       PathType: "Prefix", Backend: "root"}\n  {Host: "", Path: "/api",    PathType: "Prefix", Backend: "api"}\n  {Host: "", Path: "/api/v2", PathType: "Prefix", Backend: "api-v2"}\n\nRoute(rules, "example.com", "/api/v2/users") → "api-v2"  (longest prefix)\nRoute(rules, "example.com", "/apix")         → "root"    (segment trap!)', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// IngRule is one ingress rule. PathType is "Exact" or "Prefix";',
			'// Host "" means the rule applies to any request host (catch-all).',
			'type IngRule struct {',
			'	Host     string',
			'	Path     string',
			'	PathType string',
			'	Backend  string',
			'}',
			'',
			'// Route returns the Backend of the winning rule, or "" when no rule',
			'// matches (the default-backend / 404 case).',
			'//',
			'// Decision order:',
			'//  1. Rules whose Host equals the request host; only if NONE match',
			'//     the path, fall back to catch-all rules (Host == "").',
			'//  2. Within a tier, an Exact rule with Path == path wins outright.',
			'//  3. Otherwise the LONGEST matching Prefix rule wins. Prefixes',
			'//     match whole path segments: "/api" matches "/api" and',
			'//     "/api/v1" but NOT "/apix"; "/" matches everything.',
			'func Route(rules []IngRule, host, path string) string {',
			'	// your code here — hint: strings.HasPrefix, then require the',
			'	// remainder to be empty or start with \'/\' (segment boundary).',
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
			'		name  string',
			'		rules []IngRule',
			'		host  string',
			'		path  string',
			'		want  string',
			'	}',
			'	cases := []tc{',
			'		{"Exact beats a Prefix rule on the same path",',
			'			[]IngRule{',
			'				{"", "/api", "Prefix", "api-prefix"},',
			'				{"", "/api", "Exact", "api-exact"},',
			'			},',
			'			"example.com", "/api", "api-exact"},',
			'		{"longest matching Prefix wins among prefixes",',
			'			[]IngRule{',
			'				{"", "/", "Prefix", "root"},',
			'				{"", "/api", "Prefix", "api"},',
			'				{"", "/api/v2", "Prefix", "api-v2"},',
			'			},',
			'			"example.com", "/api/v2/users", "api-v2"},',
			'		{"segment trap: /apix does NOT match prefix /api",',
			'			[]IngRule{',
			'				{"", "/", "Prefix", "root"},',
			'				{"", "/api", "Prefix", "api"},',
			'			},',
			'			"example.com", "/apix", "root"},',
			'		{"host mismatch with no catch-all → 404",',
			'			[]IngRule{',
			'				{"shop.example.com", "/", "Prefix", "shop"},',
			'			},',
			'			"blog.example.com", "/", ""},',
			'		{"unknown host falls back to catch-all rules",',
			'			[]IngRule{',
			'				{"shop.example.com", "/", "Prefix", "shop"},',
			'				{"", "/", "Prefix", "default"},',
			'			},',
			'			"blog.example.com", "/cart", "default"},',
			'		{"a matching specific-host rule beats a longer catch-all match",',
			'			[]IngRule{',
			'				{"shop.example.com", "/", "Prefix", "shop-root"},',
			'				{"", "/api", "Prefix", "generic-api"},',
			'			},',
			'			"shop.example.com", "/api/v1", "shop-root"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%s — GET http://%s%s", c.name, c.host, c.path),',
			'			"want":  fmt.Sprintf("%q", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := Route(append([]IngRule(nil), c.rules...), c.host, c.path)',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%q", got)',
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
			'// IngRule is one ingress rule. PathType is "Exact" or "Prefix";',
			'// Host "" means the rule applies to any request host (catch-all).',
			'type IngRule struct {',
			'	Host     string',
			'	Path     string',
			'	PathType string',
			'	Backend  string',
			'}',
			'',
			'// Route returns the Backend of the winning rule, or "" when no rule',
			'// matches (the default-backend / 404 case).',
			'//',
			'// Two tiers, most specific first: rules pinned to the request host,',
			'// then catch-all rules. Falling back only when the whole first tier',
			'// misses is a deliberate simplification (stated in the prose) — it',
			'// keeps precedence a strict host-then-path lexicographic order.',
			'func Route(rules []IngRule, host, path string) string {',
			'	if b, ok := matchTier(rules, host, path, false); ok {',
			'		return b',
			'	}',
			'	if b, ok := matchTier(rules, host, path, true); ok {',
			'		return b',
			'	}',
			'	return ""',
			'}',
			'',
			'// matchTier evaluates one host tier: catchAll=false takes rules whose',
			'// Host equals the request host, catchAll=true takes Host=="" rules.',
			'// The ok flag is separate from the backend string so a legitimately',
			'// matched rule can never be confused with "no match".',
			'func matchTier(rules []IngRule, host, path string, catchAll bool) (string, bool) {',
			'	best, bestLen, found := "", -1, false',
			'	for _, r := range rules {',
			'		if catchAll {',
			'			if r.Host != "" {',
			'				continue',
			'			}',
			'		} else if r.Host != host {',
			'			continue',
			'		}',
			'		if r.PathType == "Exact" {',
			'			if r.Path == path {',
			'				// Exact beats every prefix regardless of length, so',
			'				// return immediately — nothing can outrank it in-tier.',
			'				return r.Backend, true',
			'			}',
			'			continue',
			'		}',
			'		// Prefix: track the longest match; strict > keeps the first',
			'		// rule on ties, so results stay deterministic in input order.',
			'		if prefixMatch(r.Path, path) && len(r.Path) > bestLen {',
			'			best = r.Backend',
			'			bestLen = len(r.Path)',
			'			found = true',
			'		}',
			'	}',
			'	return best, found',
			'}',
			'',
			'// prefixMatch is the segment-aware prefix test: after stripping the',
			'// rule path, the remainder must be empty or begin a new segment.',
			'// This is the difference between path routing and string routing —',
			'// without the boundary check, /api would capture /apix.',
			'func prefixMatch(rulePath, reqPath string) bool {',
			'	if rulePath == "/" {',
			'		return true // root prefix matches every path',
			'	}',
			'	if !strings.HasPrefix(reqPath, rulePath) {',
			'		return false',
			'	}',
			'	rest := reqPath[len(rulePath):]',
			'	return rest == "" || rest[0] == \'/\'',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Precedence as a sort key</h3>' +
			'<p>The temptation is to return the first rule that matches — but ingress ' +
			'rules are unordered YAML; correctness cannot depend on list position. ' +
			'Instead the winner is defined by a precedence: specific host over catch-all, ' +
			'Exact over Prefix, longer prefix over shorter. That is ' +
			'<strong>most-specific-match-wins routing</strong> — the same rule IP routers use ' +
			'(longest-prefix match on address bits) and the same rule HTTP frameworks use ' +
			'for route tables. Wherever overlapping patterns coexist, specificity, not ' +
			'ordering, must break the tie, or configs become append-order-fragile.</p>' +
			'<h3>The segment boundary</h3>' +
			'<p>The one genuinely tricky line is the boundary check:</p>',
			{ code: 'rest := reqPath[len(rulePath):]\nreturn rest == "" || rest[0] == \'/\' // /api → /api/v1 ✓, /apix ✗' },
			'<p>Kubernetes defines <code>Prefix</code> as an <em>element-wise</em> match over ' +
			'<code>/</code>-split path segments, precisely so <code>/api</code> can’t leak requests ' +
			'meant for <code>/apix</code>. A plain <code>strings.HasPrefix</code> passes five of the ' +
			'six tests here and fails the trap — which mirrors production, where this bug ' +
			'ships and then routes a stranger’s traffic.</p>' +
			'<p>We simplified the host tier: real controllers also support wildcard hosts ' +
			'(<code>*.example.com</code>) and merge rules across multiple Ingress objects. The ' +
			'exact-host-then-catch-all skeleton is the part the docs specify and the part ' +
			'you must be able to predict.</p>' +
			'<h3>On the exam</h3>' +
			'<p>Ingress tasks hinge on <code>pathType</code>: know that <code>Exact</code> matches the ' +
			'path verbatim while <code>Prefix</code> matches whole segments, and that the most ' +
			'specific rule wins when they overlap. When a route misbehaves, ' +
			'<code>kubectl describe ingress &lt;name&gt;</code> shows the host/path→backend table ' +
			'the controller actually built — check it before editing YAML, and remember a ' +
			'backend listed as an unknown service (or with no endpoints) 404s even though ' +
			'the rule itself matched.</p>',
		],
		complexity: { time: 'O(r) per request — one scan per tier', space: 'O(1)' },
	});
})();
