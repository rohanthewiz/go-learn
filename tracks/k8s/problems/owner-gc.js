/* Owner GC — Controllers (Medium). Cascading deletion as a graph algorithm:
 * ownerReferences form a DAG, and it is the garbage collector — not the API
 * server, not the Deployment — that deletes dependents, wave by wave, once
 * their LAST owner is gone. The harness probes both policies (Background
 * cascade, Orphan), dual ownership across two chained deletes, mid-tree
 * deletes, and the rule that ownerless roots are never collected.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// The ownership tree under the scissors: deleting the Deployment fells
	// the ReplicaSet (wave 1) and two of its pods (wave 2) — but pod-c also
	// lists a second owner, so it survives. Marker ids namespaced dgArrowKGC
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 262" width="520" height="262" role="img" aria-label="deleting a Deployment cascades to the ReplicaSet and its pods via ownerReferences; a pod with a second owner survives">' +
		'<text x="230" y="16" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">✂ kubectl delete deployment web</text>' +
		// the doomed chain
		'<rect x="155" y="26" width="150" height="40" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="230" y="51" text-anchor="middle">Deployment web</text>' +
		'<rect x="155" y="100" width="150" height="40" rx="6" fill="none" stroke="var(--err-edge)" stroke-dasharray="5 4"/>' +
		'<text x="230" y="125" text-anchor="middle">ReplicaSet web-7f9c</text>' +
		'<text x="148" y="124" text-anchor="end" class="lbl" style="fill:var(--err-fg)">wave 1</text>' +
		// the second, surviving owner
		'<rect x="380" y="100" width="120" height="40" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="440" y="125" text-anchor="middle">Job audit</text>' +
		// the pods
		'<rect x="20" y="180" width="120" height="40" rx="6" fill="none" stroke="var(--err-edge)" stroke-dasharray="5 4"/>' +
		'<text x="80" y="205" text-anchor="middle">pod-a</text>' +
		'<rect x="160" y="180" width="120" height="40" rx="6" fill="none" stroke="var(--err-edge)" stroke-dasharray="5 4"/>' +
		'<text x="220" y="205" text-anchor="middle">pod-b</text>' +
		'<rect x="300" y="180" width="120" height="40" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="360" y="205" text-anchor="middle">pod-c</text>' +
		'<text x="150" y="236" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">wave 2</text>' +
		'<text x="360" y="236" text-anchor="middle" class="lbl" style="fill:var(--ok)">survives — Job audit still owns it</text>' +
		// ownership edges, owner → dependent
		'<path d="M 230 66 L 230 96" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKGCerr)"/>' +
		'<path d="M 195 140 C 150 158 110 165 85 176" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKGCerr)"/>' +
		'<path d="M 230 140 L 222 176" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKGCerr)"/>' +
		'<path d="M 265 140 C 305 158 335 165 352 176" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKGCerr)"/>' +
		'<path d="M 435 140 C 420 158 395 166 372 176" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowKGC)"/>' +
		'<text x="20" y="256" class="lbl">the GC collects a dependent only when its LAST owner is gone</text>' +
		'<defs>' +
		'<marker id="dgArrowKGC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowKGCerr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'owner-gc',
		title: 'Ownership & Cascading Deletion',
		nav: 'Owner refs & GC',
		difficulty: 'Medium',
		category: 'Controllers',
		task: 'Implement Delete — Background cascades through ownerReferences wave by wave, Orphan strips them; all 6 tests.',

		prose: [
			'<h2>Ownership &amp; Cascading Deletion</h2>' +
			'<p><code>kubectl delete deployment web</code> — and three seconds later the ' +
			'pods are gone too. But you never deleted a pod, the Deployment controller ' +
			'never deletes pods it can still see, and the API server removed exactly one ' +
			'object: the one you named. So who killed the pods? The ' +
			'<strong>garbage collector</strong> — a controller inside ' +
			'kube-controller-manager that holds the whole ownership graph in memory and ' +
			'collects any object whose owners no longer exist.</p>' +
			'<p>The graph is built from <code>metadata.ownerReferences</code>: every ' +
			'ReplicaSet names its Deployment, every pod names its ReplicaSet. Deleting ' +
			'the Deployment makes the ReplicaSet ownerless → collected (wave 1); that ' +
			'makes the pods ownerless → collected (wave 2). Two rules give the graph its ' +
			'shape:</p>' +
			'<ul>' +
			'<li><strong>One live owner pins an object.</strong> A dependent with two ' +
			'owners survives until <em>every</em> owner is gone — an owner that is ' +
			'absent (deleted, or never existed) no longer pins anything.</li>' +
			'<li><strong>Roots are never collected.</strong> An object with no ' +
			'ownerReferences is somebody\'s top-level intent; the GC only ever follows ' +
			'edges downward.</li>' +
			'</ul>' +
			'<p>And deletion takes a <em>propagation policy</em>: ' +
			'<code>Background</code> (the kubectl default — delete the target, cascade ' +
			'to dependents) or <code>Orphan</code> (delete only the target; survivors ' +
			'get the dangling reference stripped from their metadata).</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Delete(objs, target, policy)</code>. For ' +
			'<code>"Background"</code>: delete the target, then repeatedly collect every ' +
			'object <em>all</em> of whose owners are gone, until nothing more falls. ' +
			'Report <code>deleted</code> deterministically: target first, then wave by ' +
			'wave with each wave sorted alphabetically. For <code>"Orphan"</code>: ' +
			'delete only the target and drop it from every survivor\'s ' +
			'<code>Owners</code> slice. Survivors keep their input order in ' +
			'<code>remaining</code>.</p>',
			{ code: 'chain: deploy ← rs ← {pod-a, pod-b}\nDelete(chain, "deploy", "Background")\n → deleted [deploy rs pod-a pod-b]   (target, wave 1, wave 2)\nDelete(chain, "rs", "Orphan")\n → deleted [rs]; pods survive with Owners emptied', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Obj is the garbage collector\'s view of an API object: a name plus its',
			'// metadata.ownerReferences, distilled to the owners\' names.',
			'type Obj struct {',
			'	Name   string',
			'	Owners []string // empty = root object: never collected',
			'}',
			'',
			'// Delete removes target from objs under the given propagation policy and',
			'// returns the names deleted plus the surviving objects.',
			'//',
			'//	"Background": delete target, then run the collector — repeatedly',
			'//	  collect every object ALL of whose owners are gone. An object with',
			'//	  two owners is pinned by either; it falls only when the LAST owner',
			'//	  is gone. Roots (no owners) are never collected. Order of deleted:',
			'//	  target first, then wave by wave, each wave sorted alphabetically.',
			'//	"Orphan": delete only the target; every survivor that listed it as',
			'//	  an owner drops it from Owners (the dependents live on).',
			'//',
			'// remaining preserves the input order of the survivors.',
			'func Delete(objs []Obj, target, policy string) (deleted []string, remaining []Obj) {',
			'	// TODO: implement both policies',
			'	return nil, objs',
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
			'// copyObjs deep-copies a fixture: an Orphan implementation edits Owners',
			'// slices in place, and a corrupted fixture must not fail later cases.',
			'func copyObjs(objs []Obj) []Obj {',
			'	out := make([]Obj, len(objs))',
			'	for i, o := range objs {',
			'		out[i] = Obj{Name: o.Name, Owners: append([]string(nil), o.Owners...)}',
			'	}',
			'	return out',
			'}',
			'',
			'func main() {',
			'	// The canonical chain: Deployment → ReplicaSet → two pods.',
			'	chain := []Obj{',
			'		{Name: "deploy"},',
			'		{Name: "rs", Owners: []string{"deploy"}},',
			'		{Name: "pod-a", Owners: []string{"rs"}},',
			'		{Name: "pod-b", Owners: []string{"rs"}},',
			'	}',
			'	type tc struct {',
			'		name   string',
			'		objs   []Obj',
			'		target string',
			'		policy string',
			'		want   string',
			'	}',
			'	cases := []tc{',
			'		{"Background: deleting the Deployment cascades wave by wave (rs before pods)",',
			'			chain, "deploy", "Background",',
			'			"deleted=[deploy rs pod-a pod-b] remaining=[]"},',
			'		{"Orphan: pods survive and the dangling ownerRef is stripped",',
			'			chain, "rs", "Orphan",',
			'			"deleted=[rs] remaining=[{deploy []} {pod-a []} {pod-b []}]"},',
			'		{"mid-tree: deleting the rs directly takes the pods, not the Deployment",',
			'			chain, "rs", "Background",',
			'			"deleted=[rs pod-a pod-b] remaining=[{deploy []}]"},',
			'		{"leaf: deleting one pod cascades nothing — it owns nothing",',
			'			chain, "pod-a", "Background",',
			'			"deleted=[pod-a] remaining=[{deploy []} {rs [deploy]} {pod-b [rs]}]"},',
			'		{"roots and unrelated trees are never swept up in a cascade",',
			'			append(copyObjs(chain),',
			'				Obj{Name: "standalone"},',
			'				Obj{Name: "audit-pod", Owners: []string{"standalone"}}),',
			'			"deploy", "Background",',
			'			"deleted=[deploy rs pod-a pod-b] remaining=[{standalone []} {audit-pod [standalone]}]"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases)+1)',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		want := c.want',
			'		objs := c.objs',
			'		target, policy := c.target, c.policy',
			'		runCase(r, func() {',
			'			deleted, remaining := Delete(copyObjs(objs), target, policy)',
			'			got := fmt.Sprintf("deleted=%v remaining=%v", deleted, remaining)',
			'			r["pass"] = got == want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	// Dual ownership needs two chained calls in one case: the shared',
			'	// dependent must survive the first owner\'s deletion and fall with',
			'	// the second — ONE live owner pins an object.',
			'	r := map[string]any{',
			'		"input": "dual owner: survives owner-a\'s deletion, falls only with owner-b\'s",',
			'		"want":  "first=[owner-a] then=[owner-b shared] remaining=[]",',
			'	}',
			'	runCase(r, func() {',
			'		objs := []Obj{',
			'			{Name: "owner-a"},',
			'			{Name: "owner-b"},',
			'			{Name: "shared", Owners: []string{"owner-a", "owner-b"}},',
			'		}',
			'		first, rem := Delete(objs, "owner-a", "Background")',
			'		then, rem2 := Delete(rem, "owner-b", "Background")',
			'		got := fmt.Sprintf("first=%v then=%v remaining=%v", first, then, rem2)',
			'		r["pass"] = got == "first=[owner-a] then=[owner-b shared] remaining=[]"',
			'		r["got"] = got',
			'	})',
			'	results = append(results, r)',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'import "sort"',
			'',
			'// Obj is the garbage collector\'s view of an API object: a name plus its',
			'// metadata.ownerReferences, distilled to the owners\' names.',
			'type Obj struct {',
			'	Name   string',
			'	Owners []string // empty = root object: never collected',
			'}',
			'',
			'// Delete removes target from objs under the given propagation policy.',
			'// Background is modeled the way the real GC works: nobody hands it a',
			'// list of victims — it re-derives collectability from the graph after',
			'// every wave of deletions, until the graph reaches a fixpoint.',
			'func Delete(objs []Obj, target, policy string) (deleted []string, remaining []Obj) {',
			'	if policy == "Orphan" {',
			'		// Orphaning is a metadata edit, not a graph walk: strip the',
			'		// dangling reference from every survivor so nothing looks',
			'		// collectible later. This mirrors the orphan finalizer: the',
			'		// GC patches dependents BEFORE the owner is allowed to go.',
			'		for _, o := range objs {',
			'			if o.Name == target {',
			'				continue',
			'			}',
			'			kept := []string{}',
			'			for _, owner := range o.Owners {',
			'				if owner != target {',
			'					kept = append(kept, owner)',
			'				}',
			'			}',
			'			o.Owners = kept // o is a copy; the caller\'s slice header is untouched',
			'			remaining = append(remaining, o)',
			'		}',
			'		return []string{target}, remaining',
			'	}',
			'',
			'	// Background. live is the GC\'s world view: an owner that is not',
			'	// live — deleted this call, or never present at all (a dangling',
			'	// reference) — no longer pins its dependents. Encoding "gone" as',
			'	// a failed map lookup makes both cases fall out of one check.',
			'	live := map[string]bool{}',
			'	for _, o := range objs {',
			'		live[o.Name] = o.Name != target',
			'	}',
			'	deleted = []string{target}',
			'',
			'	for {',
			'		// Two phases per wave: collect first, THEN mark dead. A wave',
			'		// member must not unlock its own dependents mid-wave — the',
			'		// pods fall in the wave AFTER their ReplicaSet, exactly the',
			'		// order of deletion events observable on a real cluster.',
			'		wave := []string{}',
			'		for _, o := range objs {',
			'			if !live[o.Name] || len(o.Owners) == 0 {',
			'				continue // already gone, or a root — roots are never collected',
			'			}',
			'			pinned := false',
			'			for _, owner := range o.Owners {',
			'				if live[owner] {',
			'					pinned = true // ONE live owner is enough to survive',
			'					break',
			'				}',
			'			}',
			'			if !pinned {',
			'				wave = append(wave, o.Name)',
			'			}',
			'		}',
			'		if len(wave) == 0 {',
			'			break // fixpoint: nothing collectible remains',
			'		}',
			'		// Real deletion order within a wave is nondeterministic (the',
			'		// GC works off a queue); sorting is this exercise\'s stand-in',
			'		// for determinism, not a Kubernetes guarantee.',
			'		sort.Strings(wave)',
			'		for _, name := range wave {',
			'			live[name] = false',
			'		}',
			'		deleted = append(deleted, wave...)',
			'	}',
			'',
			'	remaining = []Obj{}',
			'	for _, o := range objs {',
			'		if live[o.Name] {',
			'			remaining = append(remaining, o)',
			'		}',
			'	}',
			'	return deleted, remaining',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Deletion is a graph algorithm</h3>' +
			'<p>The API server deletes exactly what it is asked to delete — one object. ' +
			'Everything else is the garbage collector reacting to an <em>absence</em>: ' +
			'it maintains the full ownership DAG from informer events, and when an owner ' +
			'disappears it re-evaluates the dependents. That is why the cascade is ' +
			'visibly wave-shaped in <code>kubectl get events -w</code>: the ReplicaSet\'s ' +
			'deletion event lands first, and only that event makes the pods collectible. ' +
			'The core of the model is one predicate re-run to a fixpoint:</p>',
			{ code: 'pinned := false\nfor _, owner := range o.Owners {\n\tif live[owner] { // absent owners — deleted OR dangling — pin nothing\n\t\tpinned = true\n\t\tbreak\n\t}\n}' },
			'<p>Two consequences follow directly. An object with two owners (rare, but ' +
			'legal — e.g. a pod adopted for a debugging Job) survives any one owner\'s ' +
			'deletion; nothing "half-deletes" it. And a dangling reference to an owner ' +
			'that never existed is treated as gone, which is how the real GC cleans up ' +
			'objects whose owners were deleted while the controller-manager was down.</p>' +
			'<div class="tip"><strong>Foreground</strong> is the third policy, and it ' +
			'runs the cascade in <em>reverse</em>: the owner gets a ' +
			'<code>foregroundDeletion</code> finalizer and visibly lingers (with a ' +
			'deletionTimestamp) until every dependent with ' +
			'<code>blockOwnerDeletion: true</code> is gone — children first, then the ' +
			'parent. Use it when "the Deployment is deleted" must mean "and nothing of ' +
			'it remains".</div>' +
			'<h3>On the cluster / when debugging</h3>' +
			'<p>See the edges yourself: <code>kubectl get pod &lt;name&gt; -o yaml</code> ' +
			'and read <code>metadata.ownerReferences</code> — kind, name, uid, and ' +
			'<code>controller: true</code> marking the managing owner. Orphaning is ' +
			'<code>kubectl delete deployment web --cascade=orphan</code>: the pods keep ' +
			'running, ownerless, and <code>kubectl get pods</code> looks eerily normal ' +
			'afterward.</p>' +
			'<p>The classic surprise runs the other way. ' +
			'<code>kubectl delete rs web-7f9c</code> to "clean up" a ReplicaSet — and a ' +
			'new one appears within seconds. The GC dutifully collected the old pods, ' +
			'but the <em>Deployment still exists</em>, its desired state unchanged, so ' +
			'its controller immediately stamps out a replacement ReplicaSet. Deleting a ' +
			'dependent of a live controller never sticks: the desired state is the ' +
			'root, and you deleted a leaf. Meanwhile pods orphaned with ' +
			'<code>--cascade=orphan</code> whose labels still match can be ' +
			'<em>adopted</em> — a new ReplicaSet patches itself in as their owner ' +
			'instead of creating fresh pods. Adoption and orphaning are the same ' +
			'mechanism, ownerReferences editing, run in opposite directions.</p>',
		],
		complexity: { time: 'O(w·n·o) — waves × objects × owners each; worst case w=n', space: 'O(n)' },
	});
})();
