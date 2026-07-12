/* RBAC Evaluation — Security (Medium). The authorizer's question: does
 * any binding in scope contain a rule matching verb+group+resource?
 * Pure union of grants — RBAC has no deny. Exact-table harness.
 */
(function () {
	'use strict';
	var T = GoLearnCKA;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 200" width="560" height="200" role="img" aria-label="subject request flowing through bindings to rules; any matching rule allows">' +
		// request
		'<rect x="14" y="72" width="150" height="56" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="89" y="92" text-anchor="middle">request</text>' +
		'<text x="89" y="109" text-anchor="middle" class="lbl">get pods in ns=dev</text>' +
		'<text x="89" y="122" text-anchor="middle" class="lbl">group="" (core)</text>' +
		// binding 1: in scope
		'<rect x="220" y="16" width="180" height="52" rx="6" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="310" y="36" text-anchor="middle">RoleBinding · ns=dev</text>' +
		'<text x="310" y="53" text-anchor="middle" class="lbl">rule: get,list pods ✓</text>' +
		// binding 2: out of scope
		'<rect x="220" y="80" width="180" height="52" rx="6" fill="none" stroke="var(--dim)" stroke-dasharray="4 3"/>' +
		'<text x="310" y="100" text-anchor="middle" style="fill:var(--dim)">RoleBinding · ns=prod</text>' +
		'<text x="310" y="117" text-anchor="middle" class="lbl">out of scope — skipped</text>' +
		// binding 3: cluster-wide, no matching rule
		'<rect x="220" y="144" width="180" height="52" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="310" y="164" text-anchor="middle">ClusterRoleBinding</text>' +
		'<text x="310" y="181" text-anchor="middle" class="lbl">rule: apps/deployments ✗</text>' +
		// arrows request → bindings
		'<path d="M 164 88 C 195 70 200 56 216 46" fill="none" stroke="var(--dim)" stroke-width="1.4" marker-end="url(#dgArrowRBAC)"/>' +
		'<path d="M 164 100 L 216 104" fill="none" stroke="var(--dim)" stroke-width="1.4" stroke-dasharray="4 3"/>' +
		'<path d="M 164 112 C 195 130 200 152 216 164" fill="none" stroke="var(--dim)" stroke-width="1.4" marker-end="url(#dgArrowRBAC)"/>' +
		// verdict
		'<rect x="452" y="24" width="94" height="40" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="499" y="49" text-anchor="middle" style="fill:var(--ok)">allowed</text>' +
		'<path d="M 400 42 L 448 43" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowRBACok)"/>' +
		'<text x="440" y="120" class="lbl">one matching rule anywhere</text>' +
		'<text x="440" y="135" class="lbl">is enough — grants union,</text>' +
		'<text x="440" y="150" class="lbl">nothing ever subtracts</text>' +
		'<defs>' +
		'<marker id="dgArrowRBAC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker>' +
		'<marker id="dgArrowRBACok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'rbac-eval',
		title: 'RBAC Evaluation',
		nav: 'RBAC Eval',
		difficulty: 'Medium',
		category: 'Security',
		task: 'Implement Allowed — scope check, wildcard-aware rule match, union of grants. Make all 6 tests pass.',

		prose: [
			'<h2>RBAC Evaluation</h2>' +
			'<p>A CI service account suddenly can’t list pods, and a teammate swears ' +
			'“the role is bound”. To settle it you need to run the same procedure the ' +
			'API server’s RBAC authorizer runs on every single request: scan the ' +
			'subject’s bindings, and allow if <em>any</em> rule in <em>any</em> in-scope binding ' +
			'matches the request. Implement that authorizer.</p>' +
			'<p><code>Allowed(bindings, verb, apiGroup, resource, namespace)</code> returns ' +
			'whether the request passes:</p>' +
			'<ul>' +
			'<li><strong>Scope</strong> — a binding applies when <code>ClusterWide</code> is true ' +
			'(a ClusterRoleBinding: every namespace) or its <code>Namespace</code> equals the ' +
			'request namespace (a RoleBinding: that namespace only).</li>' +
			'<li><strong>Rule match</strong> — within an in-scope binding, a rule matches when ' +
			'the verb is in <code>Verbs</code>, the API group in <code>APIGroups</code>, and the ' +
			'resource in <code>Resources</code>. Each list may contain <code>"*"</code>, which ' +
			'matches anything.</li>' +
			'<li><strong>Union</strong> — one matching rule anywhere ⇒ allowed. RBAC has ' +
			'<em>no deny rules</em>: permissions only ever add up.</li>' +
			'</ul>' +
			'<p>One naming trap does real damage: <strong>the core API group is the empty ' +
			'string <code>""</code></strong>. Pods, services, and configmaps live in group ' +
			'<code>""</code>; Deployments live in <code>"apps"</code>. A rule granting ' +
			'<code>apps/deployments</code> says nothing about <code>""/pods</code>.</p>' +
			DIAGRAM +
			'<h3>Example</h3>',
			{ code: '// RoleBinding in ns=dev, rule: verbs [get,list], groups [""], resources [pods]\nAllowed(bindings, "get", "", "pods", "dev")  → true\nAllowed(bindings, "get", "", "pods", "prod") → false   // wrong namespace\nAllowed(bindings, "get", "apps", "deployments", "dev") → false', lang: 'txt' },
			'<p>We fold Role+RoleBinding (and ClusterRole+ClusterRoleBinding) into one ' +
			'<code>Binding</code> struct — the referenced role’s rules inlined — and we skip ' +
			'resourceNames and non-resource URLs. The scoping and matching logic is the ' +
			'documented core.</p>',
		],

		starter: [
			'package main',
			'',
			'// Rule is one RBAC policy rule: which verbs on which resources in',
			'// which API groups. Any of the lists may contain "*" (match all).',
			'type Rule struct {',
			'	APIGroups []string',
			'	Resources []string',
			'	Verbs     []string',
			'}',
			'',
			'// Binding attaches rules to a scope: one namespace (a RoleBinding)',
			'// or the whole cluster (ClusterWide, a ClusterRoleBinding). The',
			'// referenced role\'s rules are inlined for simplicity.',
			'type Binding struct {',
			'	Rules       []Rule',
			'	Namespace   string',
			'	ClusterWide bool',
			'}',
			'',
			'// matchList reports whether want is in list, where a "*" entry',
			'// matches anything. Provided — the interesting logic is the scoping',
			'// and the union over bindings.',
			'func matchList(list []string, want string) bool {',
			'	for _, v := range list {',
			'		if v == "*" || v == want {',
			'			return true',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
			'// Allowed reports whether the request (verb on apiGroup/resource in',
			'// namespace) is granted by any rule of any in-scope binding.',
			'// Remember: the CORE group is the empty string "" — pods are in "",',
			'// deployments are in "apps".',
			'func Allowed(bindings []Binding, verb, apiGroup, resource, namespace string) bool {',
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
			T.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		name     string',
			'		bindings []Binding',
			'		verb     string',
			'		group    string',
			'		resource string',
			'		ns       string',
			'		want     bool',
			'	}',
			'	// One reusable RoleBinding: get/list pods in ns=dev.',
			'	devPods := Binding{',
			'		Rules:     []Rule{{APIGroups: []string{""}, Resources: []string{"pods"}, Verbs: []string{"get", "list"}}},',
			'		Namespace: "dev",',
			'	}',
			'	cases := []tc{',
			'		{"RoleBinding grants get pods in its own namespace",',
			'			[]Binding{devPods}, "get", "", "pods", "dev", true},',
			'		{"the same RoleBinding is invisible from another namespace",',
			'			[]Binding{devPods}, "get", "", "pods", "prod", false},',
			'		{"ClusterWide binding grants in every namespace",',
			'			[]Binding{{Rules: []Rule{{APIGroups: []string{""}, Resources: []string{"pods"}, Verbs: []string{"get"}}}, ClusterWide: true}},',
			'			"get", "", "pods", "prod", true},',
			'		{"\\"*\\" verb wildcard matches any verb",',
			'			[]Binding{{Rules: []Rule{{APIGroups: []string{""}, Resources: []string{"pods"}, Verbs: []string{"*"}}}, Namespace: "dev"}},',
			'			"delete", "", "pods", "dev", true},',
			'		{"apps/deployments grant does NOT cover core-group pods",',
			'			[]Binding{{Rules: []Rule{{APIGroups: []string{"apps"}, Resources: []string{"deployments"}, Verbs: []string{"get"}}}, Namespace: "dev"}},',
			'			"get", "", "pods", "dev", false},',
			'		{"union across bindings: any grant anywhere suffices",',
			'			[]Binding{',
			'				devPods,',
			'				{Rules: []Rule{{APIGroups: []string{"apps"}, Resources: []string{"deployments"}, Verbs: []string{"delete"}}}, ClusterWide: true},',
			'			},',
			'			"delete", "apps", "deployments", "dev", true},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%s — can-i %s %s (group=%q) in ns=%s", c.name, c.verb, c.resource, c.group, c.ns),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := Allowed(append([]Binding(nil), c.bindings...), c.verb, c.group, c.resource, c.ns)',
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
			'// Rule is one RBAC policy rule: which verbs on which resources in',
			'// which API groups. Any of the lists may contain "*" (match all).',
			'type Rule struct {',
			'	APIGroups []string',
			'	Resources []string',
			'	Verbs     []string',
			'}',
			'',
			'// Binding attaches rules to a scope: one namespace (a RoleBinding)',
			'// or the whole cluster (ClusterWide, a ClusterRoleBinding). The',
			'// referenced role\'s rules are inlined for simplicity.',
			'type Binding struct {',
			'	Rules       []Rule',
			'	Namespace   string',
			'	ClusterWide bool',
			'}',
			'',
			'// matchList reports whether want is in list, where a "*" entry',
			'// matches anything. "*" is just another list element — checking it',
			'// alongside equality keeps the wildcard from being a special code',
			'// path anywhere else.',
			'func matchList(list []string, want string) bool {',
			'	for _, v := range list {',
			'		if v == "*" || v == want {',
			'			return true',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
			'// Allowed reports whether the request is granted by any rule of any',
			'// in-scope binding.',
			'//',
			'// The structure mirrors the semantics exactly: an outer loop that',
			'// FILTERS by scope, an inner loop that returns true on the first',
			'// match. There is deliberately no "deny" branch and no precedence',
			'// logic — RBAC is a pure union of grants, so first-match-wins is',
			'// not an optimization shortcut, it IS the model. The default is the',
			'// final return false: unmentioned means forbidden.',
			'func Allowed(bindings []Binding, verb, apiGroup, resource, namespace string) bool {',
			'	for _, b := range bindings {',
			'		// Scope gate: cluster-wide bindings apply everywhere; a',
			'		// namespaced binding only answers for its own namespace.',
			'		if !b.ClusterWide && b.Namespace != namespace {',
			'			continue',
			'		}',
			'		for _, rule := range b.Rules {',
			'			// All three dimensions must match. Note apiGroup=="" is a',
			'			// legitimate value (the core group), matched by equality',
			'			// like any other — no empty-string special-casing.',
			'			if matchList(rule.Verbs, verb) &&',
			'				matchList(rule.APIGroups, apiGroup) &&',
			'				matchList(rule.Resources, resource) {',
			'				return true',
			'			}',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>No deny, ever</h3>' +
			'<p>The striking thing about the correct solution is what’s <em>missing</em>: no ' +
			'precedence, no ordering, no deny branch. That is the principle — RBAC is ' +
			'<strong>additive-only authorization</strong>. Every rule can only grant; the ' +
			'effective permission set is the union of every rule in every in-scope ' +
			'binding, and the implicit default denies whatever no rule mentions.</p>',
			{ code: 'if !b.ClusterWide && b.Namespace != namespace {\n\tcontinue // scope gate\n}\nif matchList(rule.Verbs, verb) && ... {\n\treturn true // first grant wins — nothing can override it\n}' },
			'<p>The consequence for admins: <em>auditing = enumerating grants</em>. You can ' +
			'never carve an exception out of a broad grant (“cluster-admin but not ' +
			'secrets” is unexpressible); you must build up from narrower roles instead. ' +
			'Contrast this with the IAM model in the AWS track, where an explicit deny ' +
			'overrides any allow — two coherent designs, opposite audit stories: IAM ' +
			'answers “what blocks this?”, RBAC only ever answers “what granted this?”.</p>' +
			'<p>The core-group gotcha follows from the API’s history: the original ' +
			'resources (pods, services, configmaps) predate API groups, so they live in ' +
			'the group named <code>""</code>. In YAML that’s <code>apiGroups: [""]</code> — a rule ' +
			'with <code>apiGroups: ["apps"]</code> matches deployments and nothing in core.</p>' +
			'<h3>On the exam</h3>' +
			'<p>Your executable version of this function is <code>kubectl auth can-i get ' +
			'pods -n dev --as system:serviceaccount:dev:ci-bot</code> — use it to verify ' +
			'every RBAC task instead of eyeballing YAML. Know the four combinations: ' +
			'Role+RoleBinding (namespace-scoped), ClusterRole+ClusterRoleBinding ' +
			'(cluster-wide), and the workhorse mixed case — a RoleBinding referencing a ' +
			'ClusterRole, which grants the ClusterRole’s rules <em>only inside the ' +
			'binding’s namespace</em> (how you reuse one role definition across teams). ' +
			'And when writing rules, remember pods need <code>apiGroups: [""]</code>.</p>',
		],
		complexity: { time: 'O(total rule-list entries) per request', space: 'O(1)' },
	});
})();
