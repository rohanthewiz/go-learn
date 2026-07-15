/* Labels & Selectors — Pods (Easy). Labels are the ONLY join mechanism in
 * Kubernetes: a Service finds its pods, a ReplicaSet owns its pods, purely by
 * selector match — there are no foreign keys, no registration calls. The
 * learner implements the exact match predicate, including the NotIn-matches-
 * when-the-key-is-absent rule that surprises everyone the first time.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// One selector, three pods: a match, a value mismatch, and the silent
	// dropout — a pod whose label was edited no longer joins the Service.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 210" width="540" height="210" role="img" aria-label="a Service selector matches pods purely by labels; a mislabeled pod silently drops out">' +
		'<rect x="20" y="70" width="150" height="60" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="95" y="94" text-anchor="middle">Service</text>' +
		'<text x="95" y="114" text-anchor="middle" class="lbl">selector: app=web, env=prod</text>' +
		// matching pod
		'<rect x="330" y="20" width="190" height="46" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="425" y="39" text-anchor="middle">pod-a ✓ endpoint</text>' +
		'<text x="425" y="57" text-anchor="middle" class="lbl">{app: web, env: prod, tier: fe}</text>' +
		// value mismatch
		'<rect x="330" y="82" width="190" height="46" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="425" y="101" text-anchor="middle" class="lbl">pod-b ✗ env differs</text>' +
		'<text x="425" y="119" text-anchor="middle" class="lbl">{app: web, env: staging}</text>' +
		// missing key — the silent dropout
		'<rect x="330" y="144" width="190" height="46" rx="6" fill="none" stroke="var(--err-edge)" stroke-dasharray="5 4"/>' +
		'<text x="425" y="163" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">pod-c ✗ app label removed</text>' +
		'<text x="425" y="181" text-anchor="middle" class="lbl">{env: prod}</text>' +
		'<path d="M 175 88 C 240 70 270 52 324 44" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowKLS)"/>' +
		'<path d="M 175 105 L 324 105" fill="none" stroke="var(--edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKLSe)"/>' +
		'<path d="M 175 122 C 240 140 270 158 324 166" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKLSerr)"/>' +
		'<text x="20" y="200" class="lbl">no registration, no foreign keys — the label match IS the membership, re-evaluated on every change</text>' +
		'<defs>' +
		'<marker id="dgArrowKLS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowKLSe" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowKLSerr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'labels-selectors',
		title: 'Labels & Selectors: The Only Join',
		nav: 'Labels & selectors',
		difficulty: 'Easy',
		category: 'Pods',
		task: 'Implement Matches — matchLabels equality plus In/NotIn/Exists/DoesNotExist expressions, all 7 tests.',

		prose: [
			'<h2>Labels &amp; Selectors: The Only Join</h2>' +
			'<p>Your Service suddenly returns 503s. The pods are <code>Running</code>, ' +
			'readiness probes are green — but <code>kubectl get endpoints web</code> ' +
			'shows <code>&lt;none&gt;</code>. Nothing crashed: someone edited a pod ' +
			'template label, and the Service\'s selector quietly stopped matching. ' +
			'There is no error for this, because <strong>labels are the only join ' +
			'mechanism Kubernetes has</strong>: a Service finds its backends, a ' +
			'ReplicaSet counts its replicas, a NetworkPolicy picks its targets — all ' +
			'by evaluating one predicate: <em>does this selector match this pod\'s ' +
			'labels?</em></p>' +
			DIAGRAM +
			'<p>A selector has two halves, ANDed together:</p>' +
			'<ul>' +
			'<li><strong>matchLabels</strong> — every <code>key=value</code> pair must ' +
			'be present-and-equal in the pod\'s labels. Extra pod labels are fine.</li>' +
			'<li><strong>matchExpressions</strong> — set-based requirements, each of ' +
			'which must hold:' +
			'<ul>' +
			'<li><code>In</code>: the key must <em>exist</em> and its value be in ' +
			'<code>Values</code>.</li>' +
			'<li><code>NotIn</code>: the key\'s value must not be in ' +
			'<code>Values</code> — and an <em>absent</em> key matches, because a ' +
			'value that doesn\'t exist is certainly not in the set.</li>' +
			'<li><code>Exists</code>: the key is present (<code>Values</code> ' +
			'ignored).</li>' +
			'<li><code>DoesNotExist</code>: the key is absent.</li>' +
			'</ul></li>' +
			'</ul>' +
			'<div class="tip">The <code>NotIn</code>-matches-absent rule is the classic ' +
			'trap: <code>env NotIn (prod)</code> selects every pod with <em>no</em> ' +
			'<code>env</code> label at all. If you mean "has an env label and it isn\'t ' +
			'prod", you need <code>Exists</code> AND <code>NotIn</code> together.</div>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Matches(sel, labels)</code>: true iff <em>all</em> ' +
			'matchLabels pairs hold <em>and all</em> expressions hold. An empty ' +
			'selector (no pairs, no expressions) matches everything — zero ' +
			'constraints, zero failures.</p>',
			{ code: 'sel: matchLabels {app: web}\n     matchExpressions [{env In [prod, staging]}]\n\nlabels {app: web, env: prod, tier: fe}  → true  (extra label ignored)\nlabels {app: web}                       → false (In needs the key)\nlabels {env: prod}                      → false (app missing)', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Expr is one set-based requirement. Op is "In", "NotIn", "Exists",',
			'// or "DoesNotExist"; Values is consulted only by In and NotIn.',
			'type Expr struct {',
			'	Key    string',
			'	Op     string',
			'	Values []string',
			'}',
			'',
			'// Selector mirrors the API\'s LabelSelector: equality pairs plus',
			'// set-based expressions. BOTH halves must hold — they are ANDed,',
			'// and each expression is ANDed too. Empty selector = match all.',
			'type Selector struct {',
			'	MatchLabels      map[string]string',
			'	MatchExpressions []Expr',
			'}',
			'',
			'// Matches reports whether the selector selects a pod carrying these',
			'// labels. Semantics to implement:',
			'//   - every MatchLabels pair present-and-equal (extra labels fine)',
			'//   - In:           key EXISTS and its value is in Values',
			'//   - NotIn:        value not in Values — an ABSENT key matches',
			'//   - Exists:       key present (Values ignored)',
			'//   - DoesNotExist: key absent',
			'func Matches(sel Selector, labels map[string]string) bool {',
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
			'// copyLabels hands the user a private map: a mutating implementation',
			'// must not corrupt the label sets shared by later cases.',
			'func copyLabels(m map[string]string) map[string]string {',
			'	out := make(map[string]string, len(m))',
			'	for k, v := range m {',
			'		out[k] = v',
			'	}',
			'	return out',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name   string',
			'		sel    Selector',
			'		labels map[string]string',
			'		want   bool',
			'	}',
			'	webProd := map[string]string{"app": "web", "env": "prod", "tier": "fe"}',
			'	appOnly := map[string]string{"app": "web"}',
			'	cases := []tc{',
			'		{"matchLabels: all pairs present-and-equal, extra pod labels ignored",',
			'			Selector{MatchLabels: map[string]string{"app": "web", "env": "prod"}},',
			'			webProd, true},',
			'		{"matchLabels: one missing key fails the whole selector",',
			'			Selector{MatchLabels: map[string]string{"app": "web", "env": "prod"}},',
			'			appOnly, false},',
			'		{"In: an absent key never satisfies In — existence is required",',
			'			Selector{MatchExpressions: []Expr{{Key: "env", Op: "In", Values: []string{"prod", "staging"}}}},',
			'			appOnly, false},',
			'		{"the gotcha: NotIn MATCHES when the key is absent",',
			'			Selector{MatchExpressions: []Expr{{Key: "env", Op: "NotIn", Values: []string{"prod"}}}},',
			'			appOnly, true},',
			'		{"Exists needs presence, DoesNotExist absence — Values ignored",',
			'			Selector{MatchExpressions: []Expr{',
			'				{Key: "app", Op: "Exists"},',
			'				{Key: "canary", Op: "DoesNotExist"},',
			'			}},',
			'			webProd, true},',
			'		{"combined: matchLabels AND every expression must hold",',
			'			Selector{',
			'				MatchLabels: map[string]string{"app": "web"},',
			'				MatchExpressions: []Expr{',
			'					{Key: "env", Op: "In", Values: []string{"prod", "staging"}},',
			'					{Key: "tier", Op: "NotIn", Values: []string{"debug"}},',
			'				},',
			'			},',
			'			webProd, true},',
			'		{"empty selector matches every pod (zero constraints)",',
			'			Selector{},',
			'			map[string]string{"anything": "at-all"}, true},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := Matches(c.sel, copyLabels(c.labels))',
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
			'// Expr is one set-based requirement. Op is "In", "NotIn", "Exists",',
			'// or "DoesNotExist"; Values is consulted only by In and NotIn.',
			'type Expr struct {',
			'	Key    string',
			'	Op     string',
			'	Values []string',
			'}',
			'',
			'// Selector mirrors the API\'s LabelSelector: equality pairs plus',
			'// set-based expressions. BOTH halves must hold — they are ANDed,',
			'// and each expression is ANDed too. Empty selector = match all.',
			'type Selector struct {',
			'	MatchLabels      map[string]string',
			'	MatchExpressions []Expr',
			'}',
			'',
			'// Matches is a pure conjunction: every requirement gets a veto and',
			'// nothing else. Ranging over the SELECTOR (never the labels) makes',
			'// the two boundary rules fall out for free — extra pod labels are',
			'// never even looked at, and the empty selector runs zero checks and',
			'// so matches everything. This one predicate is what a Service\'s',
			'// endpoint controller, a ReplicaSet\'s adoption scan, and kubectl -l',
			'// all evaluate — there is no other join in the system.',
			'func Matches(sel Selector, labels map[string]string) bool {',
			'	for key, want := range sel.MatchLabels {',
			'		// The comma-ok form distinguishes "absent" from "empty":',
			'		// labels[key] alone would let want=="" match a missing key.',
			'		if got, ok := labels[key]; !ok || got != want {',
			'			return false',
			'		}',
			'	}',
			'	for _, e := range sel.MatchExpressions {',
			'		if !exprHolds(e, labels) {',
			'			return false',
			'		}',
			'	}',
			'	return true',
			'}',
			'',
			'// exprHolds evaluates one set-based requirement. The asymmetry',
			'// between In and NotIn is deliberate API semantics, not an accident:',
			'// In asserts a POSITIVE fact (the value is one of these), which an',
			'// absent key cannot supply; NotIn asserts a NEGATIVE one (the value',
			'// is none of these), which an absent key satisfies vacuously — a',
			'// value that does not exist is not in any set.',
			'func exprHolds(e Expr, labels map[string]string) bool {',
			'	val, present := labels[e.Key]',
			'	switch e.Op {',
			'	case "In":',
			'		return present && inSet(val, e.Values)',
			'	case "NotIn":',
			'		return !present || !inSet(val, e.Values)',
			'	case "Exists":',
			'		return present',
			'	case "DoesNotExist":',
			'		return !present',
			'	}',
			'	// Unknown op: fail closed. The real API server rejects the',
			'	// selector at admission, so this branch never selects anything.',
			'	return false',
			'}',
			'',
			'func inSet(v string, set []string) bool {',
			'	for _, s := range set {',
			'		if s == v {',
			'			return true',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>One predicate, every controller</h3>' +
			'<p>What you built is evaluated constantly, everywhere: the endpoints ' +
			'controller re-runs it whenever a pod or Service changes, deciding who ' +
			'receives traffic; a ReplicaSet runs it to count "its" pods — and to ' +
			'<em>adopt</em> an orphaned pod that happens to match (which is why a ' +
			'hand-made pod with a Deployment\'s labels gets absorbed, or deleted as ' +
			'surplus, within seconds). Same predicate, same semantics, no special ' +
			'cases. On the command line it is the <code>-l</code> flag:</p>',
			{ code: "kubectl get pods -l app=web                     # matchLabels form\nkubectl get pods -l 'env in (prod,staging)'     # set-based form\nkubectl get pods -l 'env notin (prod),app'      # notin + exists combined", lang: 'txt' },
			'<p>The load-bearing implementation choice is to range over the ' +
			'<em>selector</em>, never the labels: extra pod labels cost nothing and ' +
			'the empty selector matches all by running zero checks. The comma-ok ' +
			'lookup matters too — <code>labels[key]</code> returns <code>""</code> for ' +
			'a missing key, and without <code>, ok</code> the absent/empty distinction ' +
			'(which In vs NotIn hinges on) silently disappears.</p>' +
			'<h3>On the cluster / when debugging</h3>' +
			'<p>The mislabeled-pod failure is nasty precisely because every ' +
			'per-pod signal is green: the pod runs, readiness passes, logs are clean — ' +
			'but the join predicate now returns false, so the Service\'s endpoint list ' +
			'is empty and clients get connection refused or 503 from the ingress. The ' +
			'triage sequence:</p>',
			{ code: "kubectl get endpoints web                        # <none>? the selector matches nothing\nkubectl get svc web -o jsonpath='{.spec.selector}'\nkubectl get pods --show-labels                   # compare against the selector\nkubectl get pods -l app=web,env=prod             # replay the join by hand", lang: 'txt' },
			'<p>Note the asymmetric direction of the join: pods never declare "I ' +
			'belong to Service X". Membership is recomputed from labels on every ' +
			'change, which is what makes tricks like blue-green cutover ' +
			'(<code>kubectl patch svc</code> to flip the selector) or pulling one pod ' +
			'out of rotation for debugging (<code>kubectl label pod app-</code> — it ' +
			'keeps running, traffic stops, and its ReplicaSet spawns a replacement) ' +
			'possible at all. One caveat for the empty case: an empty ' +
			'<code>Selector</code> struct here matches all pods, but a Service with ' +
			'<em>no selector at all</em> is a different feature — Kubernetes then ' +
			'manages no endpoints and you supply them manually (how you point a ' +
			'Service at an external database).</p>',
		],
		complexity: { time: 'O(p + e·v) — p matchLabels pairs, e expressions × v values each', space: 'O(1)' },
	});
})();
