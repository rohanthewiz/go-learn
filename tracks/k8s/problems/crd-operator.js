/* CRD Operator — Advanced (lesson, capstone). The whole track converges
 * here: a CRD gives the cluster a new API type, and an operator is nothing
 * but a controller running the reconcile loop over it. The learner writes
 * reconcile() for a WebApp custom resource — a pure diff of desired spec
 * against observed Deployment/Service that emits create/update/delete
 * actions — which is exactly the one function kubebuilder scaffolds around.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// Flagship diagram: the operator loop. Desired (the CR) and observed (the
	// informer cache) flow into reconcile, actions flow out to the API
	// server, and the resulting watch events close the loop — forever.
	// Marker ids namespaced (dgArrowKOP*) because every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 270" width="560" height="270" role="img" aria-label="the operator loop: the WebApp custom resource and the observed Deployment and Service feed reconcile, which sends create, update, and delete actions to the API server; watch events update the cache and re-trigger reconcile">' +
		// the custom resource (desired)
		'<rect x="15" y="80" width="155" height="92" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="92" y="102" text-anchor="middle">WebApp "blog"</text>' +
		'<text x="92" y="120" text-anchor="middle" class="lbl">image: blog:v2</text>' +
		'<text x="92" y="136" text-anchor="middle" class="lbl">replicas: 3</text>' +
		'<text x="92" y="152" text-anchor="middle" class="lbl">exposed: true</text>' +
		'<text x="92" y="70" text-anchor="middle" class="lbl" style="fill:var(--accent)">desired (the CR)</text>' +
		// reconcile
		'<rect x="230" y="96" width="120" height="60" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="290" y="121" text-anchor="middle">reconcile()</text>' +
		'<text x="290" y="139" text-anchor="middle" class="lbl">diff desired vs observed</text>' +
		// observed state (informer cache)
		'<rect x="415" y="30" width="130" height="56" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="480" y="52" text-anchor="middle">Deployment</text>' +
		'<text x="480" y="70" text-anchor="middle" class="lbl" style="fill:var(--warn)">image: blog:v1 — drift!</text>' +
		'<rect x="415" y="116" width="130" height="44" rx="6" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="480" y="135" text-anchor="middle">Service</text>' +
		'<text x="480" y="152" text-anchor="middle" class="lbl">matches spec ✓</text>' +
		'<text x="480" y="20" text-anchor="middle" class="lbl">observed (informer cache)</text>' +
		// API server (where actions land)
		'<rect x="230" y="210" width="120" height="44" rx="6" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="290" y="237" text-anchor="middle">API server</text>' +
		// inputs
		'<path d="M 175 126 L 224 126" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowKOPacc)"/>' +
		'<path d="M 410 62 C 380 74 368 88 356 98" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKOPw)"/>' +
		'<path d="M 410 134 L 356 130" fill="none" stroke="var(--edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKOP)"/>' +
		// actions out
		'<path d="M 290 162 L 290 204" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowKOPok)"/>' +
		'<text x="298" y="188" class="lbl" style="fill:var(--ok)">update deployment blog: image blog:v1 → blog:v2</text>' +
		// the loop closes: writes become watch events become the next reconcile
		'<path d="M 356 232 C 480 232 512 190 512 166" fill="none" stroke="var(--edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKOP)"/>' +
		'<text x="452" y="252" text-anchor="middle" class="lbl">watch events update the cache → reconcile runs again</text>' +
		'<text x="15" y="40" class="lbl">no state machine, no "steps" — one pure diff,</text>' +
		'<text x="15" y="54" class="lbl">re-run until the diff is empty</text>' +
		'<defs>' +
		'<marker id="dgArrowKOP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowKOPacc" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowKOPw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowKOPok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'crd-operator',
		title: 'CRDs & Operators: The Reconcile Capstone',
		nav: 'CRD operator',
		category: 'Advanced',

		prose: [
			'<h2>CRDs &amp; Operators: The Reconcile Capstone</h2>' +
			'<p>Deploying your web app takes a Deployment, a Service, and the tribal ' +
			'knowledge of how they fit together. What you <em>wish</em> you could write ' +
			'is one object: <code>kind: WebApp</code>, image, replicas, ' +
			'<code>exposed: true</code> — done. A ' +
			'<strong>CustomResourceDefinition</strong> gets you halfway for free: ' +
			'register the schema and the API server will store, version, and serve ' +
			'your new type immediately — <code>kubectl get webapps</code>, RBAC rules, ' +
			'watches, admission all work on day one, because a CR is just another ' +
			'object in etcd. What a CRD does <em>not</em> provide is behavior. A ' +
			'WebApp you apply sits there, inert, until something reconciles it.</p>' +
			'<p>That something is an <strong>operator</strong> — and after this track, ' +
			'you already know everything it is made of: an informer watching your ' +
			'custom type (and the things it owns), a lease so only one replica leads, ' +
			'and a reconcile loop at the center. The operator encodes the ' +
			'<em>runbook</em>: everything a human SRE would do by hand — diff what the ' +
			'WebApp asks for against the Deployment and Service that actually exist, ' +
			'then create, update, or delete to close the gap — written down as one ' +
			'pure function that runs forever.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>The program on the right replays four scenarios against one WebApp ' +
			'(<code>blog</code>, image <code>blog:v2</code>, 3 replicas, exposed). ' +
			'<code>reconcile()</code> currently returns nothing — the operator that ' +
			'watches the world burn. Implement the diff:</p>' +
			'<ul>' +
			'<li>Deployment missing → <code>"create deployment &lt;name&gt;"</code>; ' +
			'present but drifted → one action per drifted field: ' +
			'<code>"update deployment &lt;name&gt;: image &lt;old&gt; -&gt; &lt;new&gt;"</code> ' +
			'and/or <code>"update deployment &lt;name&gt;: replicas &lt;old&gt; -&gt; ' +
			'&lt;new&gt;"</code>.</li>' +
			'<li><code>Exposed</code> and no Service → ' +
			'<code>"create service &lt;name&gt;"</code>; not <code>Exposed</code> but a ' +
			'Service exists → <code>"delete service &lt;name&gt;"</code>.</li>' +
			'<li>Sort the actions before returning (deterministic output), and return ' +
			'an empty list when everything matches — that is convergence, the loop\'s ' +
			'only goal.</li>' +
			'</ul>' +
			'<div class="tip">Real CRDs split <code>spec</code> (desired, written by ' +
			'users) from <code>status</code> (observed, written by the operator via ' +
			'the <em>status subresource</em>, a separate API endpoint) — so a user ' +
			'editing spec and an operator reporting status can never overwrite each ' +
			'other\'s half of the object.</div>' +
			'<div class="tip">Deletion has a hook too: a <em>finalizer</em> is a string ' +
			'on the object that blocks actual removal until the operator clears it — ' +
			'the mechanism for "deprovision the external database before this CR ' +
			'disappears". An object stuck <code>Terminating</code> is almost always a ' +
			'finalizer whose operator is gone.</div>' +
			'<div class="tip">kubebuilder and controller-runtime scaffold exactly this ' +
			'shape: they generate the CRD, the informers, caching, leader election, ' +
			'and the work queue — and leave you one function to write: ' +
			'<code>Reconcile(ctx, req)</code>. This lesson is that function.</div>',
		],

		task: 'Implement reconcile(): diff the WebApp spec against the observed Deployment/Service and return the sorted create/update/delete actions.',

		starter: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			'// WebApp is the custom resource — the user\'s ENTIRE interface to the',
			'// operator. Everything below it (Deployment, Service) is an',
			'// implementation detail the reconciler derives.',
			'type WebApp struct {',
			'	Name     string',
			'	Image    string',
			'	Replicas int',
			'	Exposed  bool // should a Service front this app?',
			'}',
			'',
			'// Deployment and Service are the OBSERVED child objects, reduced to',
			'// the fields the diff cares about.',
			'type Deployment struct {',
			'	Name     string',
			'	Image    string',
			'	Replicas int',
			'}',
			'',
			'type Service struct {',
			'	Name string',
			'}',
			'',
			'// reconcile diffs the desired WebApp against the observed children and',
			'// returns the actions that close the gap, sorted.',
			'//',
			'// TODO: currently the operator observes everything and does nothing.',
			'// Implement the diff:',
			'//   - no Deployment named cr.Name        -> "create deployment <name>"',
			'//   - Deployment image drifted           -> "update deployment <name>: image <old> -> <new>"',
			'//   - Deployment replicas drifted        -> "update deployment <name>: replicas <old> -> <new>"',
			'//     (both drifted -> both actions)',
			'//   - cr.Exposed and no Service          -> "create service <name>"',
			'//   - !cr.Exposed but a Service exists   -> "delete service <name>"',
			'// Sort the slice before returning; empty slice = converged.',
			'func reconcile(cr WebApp, deps map[string]Deployment, svcs map[string]Service) []string {',
			'	return nil',
			'}',
			'',
			'func main() {',
			'	// One desired state...',
			'	cr := WebApp{Name: "blog", Image: "blog:v2", Replicas: 3, Exposed: true}',
			'	// ...and the same CR with the Service switched off (scenario 4).',
			'	crUnexposed := cr',
			'	crUnexposed.Exposed = false',
			'',
			'	// Four observations of the cluster, in the order an operator would',
			'	// meet them: day zero, drift after a bad rollout, convergence, and',
			'	// a spec change that ORPHANS a child.',
			'	type scenario struct {',
			'		cr   WebApp',
			'		deps map[string]Deployment',
			'		svcs map[string]Service',
			'	}',
			'	scenarios := []scenario{',
			'		// 1: nothing exists yet — first reconcile after kubectl apply.',
			'		{cr, map[string]Deployment{}, map[string]Service{}},',
			'		// 2: someone rolled back the image by hand; replicas match.',
			'		{cr,',
			'			map[string]Deployment{"blog": {Name: "blog", Image: "blog:v1", Replicas: 3}},',
			'			map[string]Service{"blog": {Name: "blog"}}},',
			'		// 3: everything matches the spec.',
			'		{cr,',
			'			map[string]Deployment{"blog": {Name: "blog", Image: "blog:v2", Replicas: 3}},',
			'			map[string]Service{"blog": {Name: "blog"}}},',
			'		// 4: exposed flipped to false, but the Service still exists.',
			'		{crUnexposed,',
			'			map[string]Deployment{"blog": {Name: "blog", Image: "blog:v2", Replicas: 3}},',
			'			map[string]Service{"blog": {Name: "blog"}}},',
			'	}',
			'',
			'	for i, s := range scenarios {',
			'		actions := reconcile(s.cr, s.deps, s.svcs)',
			'		if len(actions) == 0 {',
			'			fmt.Printf("scenario %d: converged\\n", i+1)',
			'		} else {',
			'			fmt.Printf("scenario %d: actions=[%s]\\n", i+1, strings.Join(actions, "; "))',
			'		}',
			'	}',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('scenario 1: actions=[create deployment blog; create service blog]') !== -1 &&
				flat.indexOf('scenario 2: actions=[update deployment blog: image blog:v1 -> blog:v2]') !== -1 &&
				(stdout.match(/converged/g) || []).length === 1 &&
				flat.indexOf('scenario 4: actions=[delete service blog]') !== -1;
		},

		solution: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"sort"',
			'	"strings"',
			')',
			'',
			'// WebApp is the custom resource — the user\'s ENTIRE interface to the',
			'// operator. Everything below it (Deployment, Service) is an',
			'// implementation detail the reconciler derives.',
			'type WebApp struct {',
			'	Name     string',
			'	Image    string',
			'	Replicas int',
			'	Exposed  bool // should a Service front this app?',
			'}',
			'',
			'// Deployment and Service are the OBSERVED child objects, reduced to',
			'// the fields the diff cares about.',
			'type Deployment struct {',
			'	Name     string',
			'	Image    string',
			'	Replicas int',
			'}',
			'',
			'type Service struct {',
			'	Name string',
			'}',
			'',
			'// reconcile diffs the desired WebApp against the observed children and',
			'// returns the actions that close the gap, sorted.',
			'//',
			'// Deliberately a PURE function of (spec, observation) — no memory of',
			'// previous reconciles, no "what changed?" event driving it. That is',
			'// the property that makes the loop self-healing: whether drift came',
			'// from a bad rollout, a deleted child, or a missed watch event, the',
			'// same diff produces the same repair. State machines remember; diffs',
			'// re-derive.',
			'func reconcile(cr WebApp, deps map[string]Deployment, svcs map[string]Service) []string {',
			'	actions := []string{}',
			'',
			'	dep, ok := deps[cr.Name]',
			'	if !ok {',
			'		actions = append(actions, "create deployment "+cr.Name)',
			'	} else {',
			'		// Field-by-field drift, one action per field: a real operator',
			'		// issues one PATCH, but naming each drifted field is what',
			'		// makes the operator\'s log a diagnosis and not just a diary.',
			'		if dep.Image != cr.Image {',
			'			actions = append(actions, fmt.Sprintf(',
			'				"update deployment %s: image %s -> %s", cr.Name, dep.Image, cr.Image))',
			'		}',
			'		if dep.Replicas != cr.Replicas {',
			'			actions = append(actions, fmt.Sprintf(',
			'				"update deployment %s: replicas %d -> %d", cr.Name, dep.Replicas, cr.Replicas))',
			'		}',
			'	}',
			'',
			'	// The Service is CONDITIONAL on spec, so the diff must handle both',
			'	// directions: create what exposure demands, and — the case naive',
			'	// operators forget — delete what a spec change has orphaned.',
			'	// Forgetting the second branch leaks a Service (and its cloud load',
			'	// balancer, and its bill) forever.',
			'	_, svcExists := svcs[cr.Name]',
			'	if cr.Exposed && !svcExists {',
			'		actions = append(actions, "create service "+cr.Name)',
			'	}',
			'	if !cr.Exposed && svcExists {',
			'		actions = append(actions, "delete service "+cr.Name)',
			'	}',
			'',
			'	// Deterministic output: the actions came from map lookups and',
			'	// conditionals, and downstream (tests, logs, dedup queues) should',
			'	// never depend on the order the ifs happened to run in.',
			'	sort.Strings(actions)',
			'	return actions',
			'}',
			'',
			'func main() {',
			'	// One desired state...',
			'	cr := WebApp{Name: "blog", Image: "blog:v2", Replicas: 3, Exposed: true}',
			'	// ...and the same CR with the Service switched off (scenario 4).',
			'	crUnexposed := cr',
			'	crUnexposed.Exposed = false',
			'',
			'	// Four observations of the cluster, in the order an operator would',
			'	// meet them: day zero, drift after a bad rollout, convergence, and',
			'	// a spec change that ORPHANS a child.',
			'	type scenario struct {',
			'		cr   WebApp',
			'		deps map[string]Deployment',
			'		svcs map[string]Service',
			'	}',
			'	scenarios := []scenario{',
			'		// 1: nothing exists yet — first reconcile after kubectl apply.',
			'		{cr, map[string]Deployment{}, map[string]Service{}},',
			'		// 2: someone rolled back the image by hand; replicas match.',
			'		{cr,',
			'			map[string]Deployment{"blog": {Name: "blog", Image: "blog:v1", Replicas: 3}},',
			'			map[string]Service{"blog": {Name: "blog"}}},',
			'		// 3: everything matches the spec.',
			'		{cr,',
			'			map[string]Deployment{"blog": {Name: "blog", Image: "blog:v2", Replicas: 3}},',
			'			map[string]Service{"blog": {Name: "blog"}}},',
			'		// 4: exposed flipped to false, but the Service still exists.',
			'		{crUnexposed,',
			'			map[string]Deployment{"blog": {Name: "blog", Image: "blog:v2", Replicas: 3}},',
			'			map[string]Service{"blog": {Name: "blog"}}},',
			'	}',
			'',
			'	for i, s := range scenarios {',
			'		actions := reconcile(s.cr, s.deps, s.svcs)',
			'		if len(actions) == 0 {',
			'			fmt.Printf("scenario %d: converged\\n", i+1)',
			'		} else {',
			'			fmt.Printf("scenario %d: actions=[%s]\\n", i+1, strings.Join(actions, "; "))',
			'		}',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
