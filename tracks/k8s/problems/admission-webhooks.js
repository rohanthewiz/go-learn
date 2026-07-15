/* Admission Webhooks — Advanced (Medium). The gauntlet between kubectl apply
 * and etcd as a pure function: mutating hooks patch the object in sequence,
 * validating hooks vote on the final form, and failurePolicy decides what an
 * unreachable webhook does to the request. The harness probes the ordering
 * rules, both failure policies, and the copy-don't-mutate contract.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// The admission pipeline: sequential mutating chain (the object morphs at
	// each hop), then the validating fan (parallel — any ✗ rejects), then
	// etcd. Marker ids namespaced (dgArrowKAW*) because every track's SVGs
	// share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 250" width="560" height="250" role="img" aria-label="admission pipeline: API server sends the object through mutating webhooks in sequence, then validating webhooks in parallel, then to etcd; any validating deny rejects the request">' +
		'<text x="130" y="80" text-anchor="middle" class="lbl">mutating: SEQUENTIAL — each sees the previous patch</text>' +
		'<text x="440" y="24" text-anchor="middle" class="lbl">validating: PARALLEL — vote on the FINAL object</text>' +
		// API server
		'<rect x="15" y="100" width="80" height="48" rx="6" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="55" y="121" text-anchor="middle">API</text>' +
		'<text x="55" y="138" text-anchor="middle">server</text>' +
		// mutating chain
		'<rect x="125" y="100" width="90" height="48" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="170" y="121" text-anchor="middle">defaulter</text>' +
		'<text x="170" y="138" text-anchor="middle" class="lbl">+tier=gold</text>' +
		'<rect x="245" y="100" width="90" height="48" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="290" y="121" text-anchor="middle">injector</text>' +
		'<text x="290" y="138" text-anchor="middle" class="lbl">+sidecar</text>' +
		// validating fan
		'<rect x="385" y="40" width="110" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="440" y="59" text-anchor="middle">policy-check</text>' +
		'<text x="440" y="76" text-anchor="middle" class="lbl" style="fill:var(--ok)">allow ✓</text>' +
		'<rect x="385" y="160" width="110" height="44" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="440" y="179" text-anchor="middle">quota-guard</text>' +
		'<text x="440" y="196" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">deny ✗ — request rejected</text>' +
		// etcd
		'<rect x="505" y="100" width="45" height="48" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="527" y="128" text-anchor="middle">etcd</text>' +
		// chain arrows with the object morphing
		'<path d="M 100 124 L 119 124" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowKAW)"/>' +
		'<text x="110" y="164" text-anchor="middle" class="lbl">obj</text>' +
		'<path d="M 220 124 L 239 124" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowKAWw)"/>' +
		'<text x="230" y="164" text-anchor="middle" class="lbl">obj′</text>' +
		// fan out to both validators
		'<path d="M 340 112 C 358 96 366 76 379 68" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowKAWw)"/>' +
		'<path d="M 340 136 C 358 152 366 172 379 180" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowKAWw)"/>' +
		'<text x="360" y="130" text-anchor="middle" class="lbl">obj″</text>' +
		// verdicts
		'<path d="M 500 66 C 516 74 522 86 527 94" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowKAWok)"/>' +
		'<path d="M 500 186 C 516 178 522 166 527 154" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKAWerr)"/>' +
		'<text x="15" y="238" class="lbl">nothing reaches etcd until every mutating hook has run and every validating hook has said yes</text>' +
		'<defs>' +
		'<marker id="dgArrowKAW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowKAWw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowKAWok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowKAWerr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'admission-webhooks',
		title: 'Admission Webhooks: Mutate, Then Validate',
		nav: 'Admission webhooks',
		difficulty: 'Medium',
		category: 'Advanced',
		task: 'Implement Admit — the mutating chain, the validating vote, and failurePolicy; all 7 tests.',

		prose: [
			'<h2>Admission Webhooks: Mutate, Then Validate</h2>' +
			'<p>You <code>kubectl apply</code> a plain three-container pod spec, and ' +
			'the pod that comes back has <em>four</em> containers, extra labels, and a ' +
			'resource limit you never wrote. Nobody edited your YAML — your object ran ' +
			'a gauntlet on its way into etcd. After authentication and authorization, ' +
			'every write passes through <strong>admission</strong>, and clusters extend ' +
			'it with webhooks: HTTP callbacks to services <em>you</em> run, in two ' +
			'strictly ordered phases:</p>' +
			'<ul>' +
			'<li><strong>Mutating</strong> webhooks run first, <em>in sequence</em>. ' +
			'Each receives the object and may return a patch; the next hook sees the ' +
			'already-patched object. This is how istio injects its sidecar and ' +
			'cert-manager fills in defaults.</li>' +
			'<li><strong>Validating</strong> webhooks run after <em>all</em> mutation, ' +
			'conceptually in parallel. They cannot change anything — each just votes, ' +
			'and a single deny rejects the whole request with the webhook\'s reason. ' +
			'Crucially they judge the <em>final, mutated</em> form — a validator ' +
			'requiring the istio sidecar passes precisely because the injector already ' +
			'ran.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>One more field does most of the operational damage: ' +
			'<code>failurePolicy</code>. Webhooks are network calls to a service that ' +
			'can be down. <code>Fail</code> means "no answer → reject the request"; ' +
			'<code>Ignore</code> means "no answer → pretend the hook wasn\'t there". ' +
			'Which one you pick decides whether an outage in your webhook is an outage ' +
			'in your <em>cluster</em>.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Admit(obj, hooks)</code> → ' +
			'<code>(finalObj, allowed, reason)</code>. Phase 1: every ' +
			'<code>mutating</code> hook in list order — on <code>Err</code>, ' +
			'<code>FailurePolicy "Fail"</code> returns ' +
			'<code>(nil, false, "webhook &lt;name&gt; failed")</code> and ' +
			'<code>"Ignore"</code> skips the hook; otherwise apply its ' +
			'<code>Patch</code> keys. Phase 2: every <code>validating</code> hook — ' +
			'same <code>Err</code> handling; <code>Deny</code> returns ' +
			'<code>(nil, false, "denied by &lt;name&gt;")</code>. All pass → the ' +
			'patched object, <code>true</code>, <code>""</code>. Never mutate the ' +
			'caller\'s map — patch a copy (a test checks).</p>',
			{ code: 'obj: {app: web}\nmutating  sidecar-injector: patch {sidecar: injected}\nvalidating quota-guard:     deny\nAdmit(obj, hooks) → nil, false, "denied by quota-guard"\n// drop the deny → {app: web, sidecar: injected}, true, ""', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Webhook is one registered admission webhook, reduced to what the',
			'// pipeline logic needs. Kind is "mutating" or "validating".',
			'//   Patch: keys a mutating hook sets on the object (its JSONPatch)',
			'//   Deny:  a validating hook\'s verdict',
			'//   Err:   the CALL itself failed — timeout, service down, bad TLS',
			'//   FailurePolicy: "Fail" (reject the request) or "Ignore" (skip the hook)',
			'type Webhook struct {',
			'	Name          string',
			'	Kind          string',
			'	Patch         map[string]string',
			'	Deny          bool',
			'	Err           bool',
			'	FailurePolicy string',
			'}',
			'',
			'// Admit runs the object through the admission pipeline and returns the',
			'// final object, whether the request is allowed, and the reason when not.',
			'//   Phase 1 — mutating hooks, in list order: Err + "Fail" -> reject with',
			'//     "webhook <name> failed"; Err + "Ignore" -> skip; else apply Patch',
			'//     (later hooks see earlier patches).',
			'//   Phase 2 — validating hooks, on the FINAL object: Err -> same policy',
			'//     handling; Deny -> reject with "denied by <name>".',
			'// The caller\'s obj map must never be modified — patch a copy.',
			'func Admit(obj map[string]string, hooks []Webhook) (map[string]string, bool, string) {',
			'	// your code here',
			'	return obj, true, ""',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"sort"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'// dump renders an object with sorted keys so map iteration order can',
			'// never flake a comparison.',
			'func dump(obj map[string]string) string {',
			'	if obj == nil {',
			'		return "<nil>"',
			'	}',
			'	keys := make([]string, 0, len(obj))',
			'	for k := range obj {',
			'		keys = append(keys, k)',
			'	}',
			'	sort.Strings(keys)',
			'	parts := make([]string, 0, len(keys))',
			'	for _, k := range keys {',
			'		parts = append(parts, k+"="+obj[k])',
			'	}',
			'	return "{" + strings.Join(parts, " ") + "}"',
			'}',
			'',
			'func main() {',
			'	results := make([]map[string]any, 0, 7)',
			'',
			'	type tc struct {',
			'		name  string',
			'		obj   map[string]string',
			'		hooks []Webhook',
			'		want  string',
			'	}',
			'	cases := []tc{',
			'		{"mutating chain is sequential: the later patch wins the key",',
			'			map[string]string{"app": "web"},',
			'			[]Webhook{',
			'				{Name: "set-tier-bronze", Kind: "mutating", Patch: map[string]string{"tier": "bronze"}},',
			'				{Name: "set-tier-gold", Kind: "mutating", Patch: map[string]string{"tier": "gold"}},',
			'			},',
			'			`{app=web tier=gold} allowed=true reason=""`},',
			'		{"two phases, not one pass: a validator listed FIRST still judges the final mutated object",',
			'			map[string]string{"app": "web"},',
			'			[]Webhook{',
			'				{Name: "require-sidecar", Kind: "validating"},',
			'				{Name: "sidecar-injector", Kind: "mutating", Patch: map[string]string{"sidecar": "injected"}},',
			'			},',
			'			`{app=web sidecar=injected} allowed=true reason=""`},',
			'		{"validator denies: rejected, and the reason names the hook",',
			'			map[string]string{"app": "web"},',
			'			[]Webhook{',
			'				{Name: "sidecar-injector", Kind: "mutating", Patch: map[string]string{"sidecar": "injected"}},',
			'				{Name: "quota-guard", Kind: "validating", Deny: true},',
			'			},',
			'			`<nil> allowed=false reason="denied by quota-guard"`},',
			'		{"webhook backend down + failurePolicy Fail: the request is rejected",',
			'			map[string]string{"app": "web"},',
			'			[]Webhook{',
			'				{Name: "cert-defaulter", Kind: "mutating", Err: true, FailurePolicy: "Fail", Patch: map[string]string{"cert": "issued"}},',
			'			},',
			'			`<nil> allowed=false reason="webhook cert-defaulter failed"`},',
			'		{"webhook backend down + failurePolicy Ignore: admission proceeds without it",',
			'			map[string]string{"app": "web"},',
			'			[]Webhook{',
			'				{Name: "flaky-defaulter", Kind: "mutating", Err: true, FailurePolicy: "Ignore", Patch: map[string]string{"never": "applied"}},',
			'				{Name: "team-labeler", Kind: "mutating", Patch: map[string]string{"team": "payments"}},',
			'			},',
			'			`{app=web team=payments} allowed=true reason=""`},',
			'		{"no webhooks configured: passthrough, allowed",',
			'			map[string]string{"app": "web"},',
			'			nil,',
			'			`{app=web} allowed=true reason=""`},',
			'	}',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			// Copy the hook slice: user code must not be able to',
			'			// corrupt the case table for later comparisons.',
			'			gotObj, allowed, reason := Admit(c.obj, append([]Webhook(nil), c.hooks...))',
			'			got := fmt.Sprintf("%s allowed=%v reason=%q", dump(gotObj), allowed, reason)',
			'			r["got"] = got',
			'			r["pass"] = got == c.want',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	// The copy contract, probed directly: after Admit, the map the',
			'	// caller handed in must be byte-for-byte what it was. (The real',
			'	// API server keeps the original around for audit and retries.)',
			'	r := map[string]any{',
			'		"input": "the caller\'s object is never mutated: webhooks patch a copy",',
			'		"want":  "{app=web}",',
			'	}',
			'	runCase(r, func() {',
			'		original := map[string]string{"app": "web"}',
			'		Admit(original, []Webhook{',
			'			{Name: "sidecar-injector", Kind: "mutating", Patch: map[string]string{"sidecar": "injected"}},',
			'		})',
			'		got := dump(original)',
			'		r["got"] = got',
			'		r["pass"] = got == "{app=web}"',
			'	})',
			'	results = append(results, r)',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// Webhook is one registered admission webhook, reduced to what the',
			'// pipeline logic needs. Kind is "mutating" or "validating".',
			'//   Patch: keys a mutating hook sets on the object (its JSONPatch)',
			'//   Deny:  a validating hook\'s verdict',
			'//   Err:   the CALL itself failed — timeout, service down, bad TLS',
			'//   FailurePolicy: "Fail" (reject the request) or "Ignore" (skip the hook)',
			'type Webhook struct {',
			'	Name          string',
			'	Kind          string',
			'	Patch         map[string]string',
			'	Deny          bool',
			'	Err           bool',
			'	FailurePolicy string',
			'}',
			'',
			'// Admit runs the object through the admission pipeline: mutate in',
			'// sequence, then validate the final form.',
			'//',
			'// Two passes over the SAME slice, filtered by Kind, rather than one',
			'// pass dispatching per hook: phase separation is the semantic core of',
			'// admission — a validating hook must never see a half-mutated object,',
			'// no matter where it sits in the registration list — so the structure',
			'// of the code should make interleaving impossible, not merely avoided.',
			'func Admit(obj map[string]string, hooks []Webhook) (map[string]string, bool, string) {',
			'	// Patch a copy. The caller\'s map is the request as SUBMITTED —',
			'	// the API server needs it intact for audit logs and retries, and',
			'	// a rejected request must leave no trace of partial mutation.',
			'	patched := make(map[string]string, len(obj))',
			'	for k, v := range obj {',
			'		patched[k] = v',
			'	}',
			'',
			'	// Phase 1: mutating hooks, in list order. Later hooks see earlier',
			'	// patches — that ordering is what lets a validator-style defaulter',
			'	// build on a previous hook\'s work (and what makes hook order a',
			'	// real operational concern).',
			'	for _, h := range hooks {',
			'		if h.Kind != "mutating" {',
			'			continue',
			'		}',
			'		if h.Err {',
			'			// The call failed, so there is no patch to apply either',
			'			// way — failurePolicy only decides whether the REQUEST',
			'			// survives the hook\'s absence.',
			'			if h.FailurePolicy == "Fail" {',
			'				return nil, false, "webhook " + h.Name + " failed"',
			'			}',
			'			continue',
			'		}',
			'		for k, v := range h.Patch {',
			'			patched[k] = v',
			'		}',
			'	}',
			'',
			'	// Phase 2: validating hooks judge the final object. First deny',
			'	// wins — the real server runs these in parallel and any single',
			'	// deny rejects, so which one reports first is immaterial.',
			'	for _, h := range hooks {',
			'		if h.Kind != "validating" {',
			'			continue',
			'		}',
			'		if h.Err {',
			'			if h.FailurePolicy == "Fail" {',
			'				return nil, false, "webhook " + h.Name + " failed"',
			'			}',
			'			continue',
			'		}',
			'		if h.Deny {',
			'			return nil, false, "denied by " + h.Name',
			'		}',
			'	}',
			'	return patched, true, ""',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why two phases</h3>' +
			'<p>Mutation and validation are separated because they answer different ' +
			'questions: "what should this object <em>become</em>?" and "may this ' +
			'object <em>exist</em>?" Running all mutation first means validators judge ' +
			'the truth — the object that will actually be persisted. That is the whole ' +
			'trick behind test 2: a policy requiring the istio sidecar does not care ' +
			'that <em>you</em> never wrote a sidecar, only that the injector (a ' +
			'mutating hook) put one there before validation ran. One caveat from the ' +
			'real system: because one mutating hook can invalidate another\'s ' +
			'assumptions, the API server may <em>reinvoke</em> the mutating chain ' +
			'(<code>reinvocationPolicy: IfNeeded</code>) until the object stabilizes — ' +
			'so mutating hooks must be idempotent.</p>' +
			'<h3>The load-bearing lines</h3>',
			{ code: 'patched := make(map[string]string, len(obj)) // never touch the request\nfor k, v := range obj { patched[k] = v }\n\nif h.Err {\n\tif h.FailurePolicy == "Fail" { return nil, false, ... }\n\tcontinue // Ignore: the hook simply wasn\'t there\n}' },
			'<p>The copy is not defensive fussiness: admission can <em>reject</em>, ' +
			'and a rejected request must leave the submitted object untouched — ' +
			'half-applied patches on a denied write would be corruption. And the ' +
			'<code>Err</code> branch is where cluster reliability is decided, one ' +
			'boolean at a time: <code>Fail</code> buys enforcement (nothing sneaks ' +
			'past a dead policy hook) at the price of availability; ' +
			'<code>Ignore</code> buys availability at the price of unenforced windows. ' +
			'Security hooks usually choose <code>Fail</code>; convenience defaulting ' +
			'chooses <code>Ignore</code>.</p>' +
			'<h3>On the cluster / when debugging</h3>' +
			'<p>The production horror story every operator eventually lives: a ' +
			'validating webhook with <code>failurePolicy: Fail</code> whose backing ' +
			'service is down. Every write it intercepts is rejected — deployments, ' +
			'ConfigMap edits, sometimes the very pods that would fix the webhook. If ' +
			'it matches too broadly, the fix cannot be deployed <em>through</em> the ' +
			'gate it needs to fix. This is why webhook configurations should carry a ' +
			'<code>namespaceSelector</code> excluding <code>kube-system</code> (and ' +
			'the webhook\'s own namespace), and why <code>timeoutSeconds</code> ' +
			'defaults to a value far below "forever".</p>' +
			'<p>When applies start failing mysteriously, look at the gauntlet first: ' +
			'<code>kubectl get validatingwebhookconfigurations,mutatingwebhookconfigurations</code> ' +
			'lists every registered hook; the error message on a failed apply names ' +
			'the guilty one verbatim (<code>admission webhook "quota-guard" denied ' +
			'the request</code> — exactly the reason string you built). ' +
			'<code>kubectl get &lt;kind&gt; &lt;name&gt; -o yaml</code> after an apply ' +
			'shows you what mutation did to your object; diff it against your YAML ' +
			'when a field you never set keeps appearing.</p>',
		],
		complexity: { time: 'O(h·p) — h hooks × p patch keys', space: 'O(k) — the object copy' },
	});
})();
