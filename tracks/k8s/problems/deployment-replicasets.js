/* Deployment ReplicaSets — Controllers (Medium). Why `kubectl get rs` shows
 * three ReplicaSets for one Deployment, two of them at 0: a Deployment never
 * edits pods — each pod-template revision gets its OWN ReplicaSet, and
 * rollout AND rollback are nothing but scaling those sets. The harness's
 * killer case is the rollback: the old hash reappears while its RS still
 * exists at 0, and the right answer creates nothing.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// One Deployment, three revisions: the two old ReplicaSets sit at 0 —
	// not garbage, they ARE the rollback history. Marker ids namespaced
	// (dgArrowKDR) — every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 230" width="520" height="230" role="img" aria-label="a Deployment managing three ReplicaSets: revision 1 and 2 scaled to zero as history, revision 3 holding the pods">' +
		'<rect x="185" y="14" width="150" height="46" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="260" y="34" text-anchor="middle">Deployment web</text>' +
		'<text x="260" y="52" text-anchor="middle" class="lbl">template hash: 9c8b7a</text>' +
		'<rect x="15" y="104" width="145" height="52" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="87" y="126" text-anchor="middle" class="lbl">web-5d8f7c (rev 1)</text>' +
		'<text x="87" y="144" text-anchor="middle" class="lbl">replicas: 0</text>' +
		'<rect x="188" y="104" width="145" height="52" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="260" y="126" text-anchor="middle" class="lbl">web-7b6d4f (rev 2)</text>' +
		'<text x="260" y="144" text-anchor="middle" class="lbl">replicas: 0</text>' +
		'<rect x="361" y="104" width="145" height="52" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="433" y="126" text-anchor="middle" class="lbl" style="fill:var(--ok)">web-9c8b7a (rev 3)</text>' +
		'<text x="433" y="144" text-anchor="middle" class="lbl">replicas: 3</text>' +
		'<path d="M 200 64 C 150 78 115 88 95 100" fill="none" stroke="var(--edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKDRe)"/>' +
		'<path d="M 260 64 L 260 100" fill="none" stroke="var(--edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKDRe)"/>' +
		'<path d="M 320 64 C 370 78 405 88 425 100" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowKDR)"/>' +
		'<text x="330" y="86" class="lbl" style="fill:var(--ok)">scale to 3</text>' +
		'<text x="112" y="86" class="lbl">scale to 0</text>' +
		'<path d="M 433 160 L 433 178" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowKDR)"/>' +
		'<text x="433" y="196" text-anchor="middle" class="lbl">web-9c8b7a-x2k9p, web-9c8b7a-m4nq8, web-9c8b7a-t7wz2</text>' +
		'<text x="15" y="222" class="lbl">rollback = scale rev 2 back up — the 0-replica ReplicaSets ARE the undo history</text>' +
		'<defs>' +
		'<marker id="dgArrowKDR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowKDRe" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'deployment-replicasets',
		title: 'Deployments Are Made of ReplicaSets',
		nav: 'deployment → RS',
		difficulty: 'Medium',
		category: 'Controllers',
		task: 'Implement the Deployment\'s Reconcile over its ReplicaSets — create for a new hash, scale for everything else, including rollback. All 6 tests.',

		prose: [
			'<h2>Deployments Are Made of ReplicaSets</h2>' +
			'<p><code>kubectl get rs</code> for a single Deployment shows this:</p>',
			{ code: 'NAME           DESIRED   CURRENT   READY   AGE\nweb-5d8f7c9b   0         0         0       14d\nweb-7b6d4f5c   0         0         0       6d\nweb-9c8b7a6d   3         3         3       2h', lang: 'txt' },
			'<p>Three ReplicaSets, two of them at zero. Not leftovers, not a bug: ' +
			'this is how Deployments work. A Deployment <strong>never touches ' +
			'pods</strong> — it manages ReplicaSets, and ReplicaSets manage pods. ' +
			'Every distinct pod template is hashed (the ' +
			'<code>pod-template-hash</code> label, the suffix in those names), and ' +
			'each hash gets its <em>own</em> ReplicaSet. Change the image and you have ' +
			'a new template → a new hash → a new ReplicaSet; the Deployment scales the ' +
			'new one up and the old one down. The old set is kept at zero, because ' +
			'<strong>rollback is just scaling it back up</strong> — ' +
			'<code>kubectl rollout undo</code> creates nothing at all.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Reconcile(d, existing)</code> — the Deployment ' +
			'controller\'s decision, as ordered action strings (we model the end ' +
			'state; the real controller walks there in maxSurge/maxUnavailable steps):</p>' +
			'<ul>' +
			'<li>No ReplicaSet with <code>Hash == d.TemplateHash</code> → ' +
			'<code>create rs &lt;name&gt;-&lt;hash&gt;</code>. Creation implies size: ' +
			'the new set starts at <code>d.Replicas</code> — no separate scale action.</li>' +
			'<li>The matching set exists but at the wrong size → ' +
			'<code>scale &lt;rsName&gt; to &lt;d.Replicas&gt;</code>.</li>' +
			'<li>Then every <em>other</em> set still above zero → ' +
			'<code>scale &lt;rsName&gt; to 0</code>, in input order.</li>' +
			'<li>Nothing to do → nil (or empty).</li>' +
			'</ul>',
			{ code: 'd = {Name: "web", TemplateHash: "def456", Replicas: 3}\nexisting = [{web-abc123, hash abc123, 3 replicas}]\nReconcile(d, existing) →\n  ["create rs web-def456", "scale web-abc123 to 0"]', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Deployment is the controller\'s view of the Deployment object.',
			'// TemplateHash stands in for the pod-template-hash label: a digest of',
			'// the CURRENT pod template — image, env, resources, all of it.',
			'type Deployment struct {',
			'	Name         string',
			'	TemplateHash string',
			'	Replicas     int',
			'}',
			'',
			'// ReplicaSet is one revision of the Deployment: the template it was',
			'// created from (Hash) and how many pods it currently maintains.',
			'// Its Name is always <deployment>-<hash>.',
			'type ReplicaSet struct {',
			'	Name     string',
			'	Hash     string',
			'	Replicas int',
			'}',
			'',
			'// Reconcile returns the ordered actions that drive the ReplicaSets to',
			'// the Deployment\'s desired end state:',
			'//   1. no RS for d.TemplateHash        → "create rs <name>-<hash>"',
			'//      (created AT d.Replicas — creation implies size, no scale action)',
			'//   2. matching RS at the wrong size   → "scale <rsName> to <n>"',
			'//   3. every OTHER RS above zero       → "scale <rsName> to 0",',
			'//      in input order',
			'// Converged → nil.',
			'func Reconcile(d Deployment, existing []ReplicaSet) []string {',
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
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		name     string',
			'		d        Deployment',
			'		existing []ReplicaSet',
			'		want     []string',
			'	}',
			'	cases := []tc{',
			'		{"fresh deployment: no ReplicaSets yet — create only (born at size 3)",',
			'			Deployment{Name: "web", TemplateHash: "abc123", Replicas: 3},',
			'			[]ReplicaSet{},',
			'			[]string{"create rs web-abc123"}},',
			'		{"template changed: new hash — create the new RS, drain the old to 0",',
			'			Deployment{Name: "web", TemplateHash: "def456", Replicas: 3},',
			'			[]ReplicaSet{{Name: "web-abc123", Hash: "abc123", Replicas: 3}},',
			'			[]string{"create rs web-def456", "scale web-abc123 to 0"}},',
			'		{"rollback = scaling an existing RS back up: kubectl rollout undo creates NOTHING",',
			'			Deployment{Name: "web", TemplateHash: "abc123", Replicas: 3},',
			'			[]ReplicaSet{',
			'				{Name: "web-abc123", Hash: "abc123", Replicas: 0},',
			'				{Name: "web-def456", Hash: "def456", Replicas: 3},',
			'			},',
			'			[]string{"scale web-abc123 to 3", "scale web-def456 to 0"}},',
			'		{"converged: current RS at size, history at 0 — nothing to do",',
			'			Deployment{Name: "web", TemplateHash: "def456", Replicas: 3},',
			'			[]ReplicaSet{',
			'				{Name: "web-abc123", Hash: "abc123", Replicas: 0},',
			'				{Name: "web-def456", Hash: "def456", Replicas: 3},',
			'			},',
			'			[]string{}},',
			'		{"kubectl scale: same template, new count — one scale on the current RS",',
			'			Deployment{Name: "web", TemplateHash: "def456", Replicas: 5},',
			'			[]ReplicaSet{{Name: "web-def456", Hash: "def456", Replicas: 3}},',
			'			[]string{"scale web-def456 to 5"}},',
			'		{"two stale revisions still running — both drained to 0, input order",',
			'			Deployment{Name: "web", TemplateHash: "c3", Replicas: 3},',
			'			[]ReplicaSet{',
			'				{Name: "web-a1", Hash: "a1", Replicas: 2},',
			'				{Name: "web-b2", Hash: "b2", Replicas: 1},',
			'				{Name: "web-c3", Hash: "c3", Replicas: 3},',
			'			},',
			'			[]string{"scale web-a1 to 0", "scale web-b2 to 0"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Copy the RS slice: a user implementation must not be able',
			'			// to corrupt the case table for later comparisons.',
			'			got := Reconcile(c.d, append([]ReplicaSet(nil), c.existing...))',
			'			// %v comparison deliberately treats nil and []string{} the',
			'			// same — "converged" may be either.',
			'			r["pass"] = fmt.Sprintf("%v", got) == fmt.Sprintf("%v", c.want)',
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
			'import "fmt"',
			'',
			'// Deployment is the controller\'s view of the Deployment object.',
			'// TemplateHash stands in for the pod-template-hash label: a digest of',
			'// the CURRENT pod template — image, env, resources, all of it.',
			'type Deployment struct {',
			'	Name         string',
			'	TemplateHash string',
			'	Replicas     int',
			'}',
			'',
			'// ReplicaSet is one revision of the Deployment: the template it was',
			'// created from (Hash) and how many pods it currently maintains.',
			'// Its Name is always <deployment>-<hash>.',
			'type ReplicaSet struct {',
			'	Name     string',
			'	Hash     string',
			'	Replicas int',
			'}',
			'',
			'// Reconcile returns the ordered actions that drive the ReplicaSets to',
			'// the Deployment\'s desired end state.',
			'//',
			'// The design hinge: the target RS is found BY HASH, never by "newest"',
			'// or by position. That single choice is what makes rollback free — an',
			'// old hash reappearing as the desired template finds its old RS and',
			'// scales it, exactly like any other drift. Rollout and rollback are',
			'// not two mechanisms; they are one scaling rule pointed at different',
			'// hashes.',
			'func Reconcile(d Deployment, existing []ReplicaSet) []string {',
			'	actions := []string{}',
			'',
			'	// Phase 1: the RS for the CURRENT template must exist at the',
			'	// desired size. Index (not value) so we can tell "found at the',
			'	// right size" from "not found" without an extra flag.',
			'	current := -1',
			'	for i := range existing {',
			'		if existing[i].Hash == d.TemplateHash {',
			'			current = i',
			'			break',
			'		}',
			'	}',
			'	if current == -1 {',
			'		// A genuinely new revision. Creation implies size: the real',
			'		// controller sets .spec.replicas on the new RS object itself,',
			'		// so a separate scale action would be redundant. The name is',
			'		// <deployment>-<hash> — the same scheme that puts the revision',
			'		// hash in the middle of every pod name.',
			'		actions = append(actions, fmt.Sprintf("create rs %s-%s", d.Name, d.TemplateHash))',
			'	} else if existing[current].Replicas != d.Replicas {',
			'		// The template already has an RS — covering BOTH a plain',
			'		// kubectl scale (current RS, new count) AND a rollback (old',
			'		// hash back as desired, its RS waiting at 0). The controller',
			'		// cannot tell the difference, and does not need to.',
			'		actions = append(actions, fmt.Sprintf("scale %s to %d", existing[current].Name, d.Replicas))',
			'	}',
			'',
			'	// Phase 2: every other revision drains to 0 — scaled, never',
			'	// deleted. Zero-replica ReplicaSets cost nothing to keep and ARE',
			'	// the rollback history (up to revisionHistoryLimit of them).',
			'	for i, rs := range existing {',
			'		if i != current && rs.Replicas > 0 {',
			'			actions = append(actions, fmt.Sprintf("scale %s to 0", rs.Name))',
			'		}',
			'	}',
			'	return actions',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>One rule, three behaviors</h3>' +
			'<p>Rollout, rollback, and plain scaling all fall out of a single rule: ' +
			'<em>the RS matching the desired hash gets <code>d.Replicas</code>; every ' +
			'other RS gets 0</em>. A new image produces an unmatched hash → create. ' +
			'<code>kubectl rollout undo</code> flips the desired hash back to an old ' +
			'one → the lookup <em>finds</em> the parked RS and scales it up — which is ' +
			'why the killer test creates nothing. The controller never knows it is ' +
			'"rolling back"; there is no rollback code path at all.</p>',
			{ code: 'current := -1\nfor i := range existing {           // find BY HASH, never "newest"\n\tif existing[i].Hash == d.TemplateHash { current = i; break }\n}\nif current == -1 { /* create at d.Replicas */ }\nelse if wrongSize { /* scale — rollback and kubectl scale are THIS line */ }' },
			'<p>The layering is the deeper lesson: a Deployment reconciles ' +
			'ReplicaSets, each ReplicaSet reconciles pods (the previous lesson\'s ' +
			'loop), and neither knows the other\'s job. Immutable revisions + scaling ' +
			'is what makes the whole thing safe: pods are never edited in place, only ' +
			'replaced under a different hash.</p>' +
			'<h3>On the cluster / when debugging</h3>' +
			'<p><code>kubectl get rs -o wide</code> shows every revision with its ' +
			'image — the 0/0 rows are your undo history, newest AGE last. Pod names ' +
			'carry the story too: in <code>web-9c8b7a6d-x2k9p</code>, the middle chunk ' +
			'is the pod-template-hash, so you can tell at a glance which revision a ' +
			'misbehaving pod belongs to. <code>kubectl rollout history deploy/web</code> ' +
			'lists revisions; <code>kubectl rollout undo deploy/web --to-revision=2</code> ' +
			'scales the matching old RS back up — watch it happen live with ' +
			'<code>kubectl get rs -w</code>.</p>' +
			'<div class="tip"><code>revisionHistoryLimit</code> (default 10) is how ' +
			'many zero-replica ReplicaSets the Deployment keeps before garbage-' +
			'collecting the oldest. Set it to 0 and rollback silently stops working — ' +
			'the history <em>is</em> those empty ReplicaSets.</div>' +
			'<p>One honest simplification: your Reconcile jumps to the end state in ' +
			'one step. The real controller walks there gradually, bounded by ' +
			'<code>maxSurge</code>/<code>maxUnavailable</code>, scaling new-up/old-down ' +
			'in increments so capacity never dips — the CKA track\'s rolling-update ' +
			'item models that walk. End state here, path there.</p>',
		],
		complexity: { time: 'O(r) — one pass to find the current RS, one to drain the rest', space: 'O(a) actions' },
	});
})();
