/* Reconcile Loop — Controllers (lesson). THE idea Kubernetes is built on:
 * you never command "start 3 pods" — you declare replicas: 3, and a
 * controller forever closes the gap between what it observes and what the
 * spec desires. The learner implements the diff step of the loop, and main()
 * replays it level-triggered: after acting, the controller re-observes and
 * must find nothing left to do. The signature diagram of the whole track
 * lives here: observe → diff → act → (cluster changes) → observe.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// The control loop as a circle, with the spec feeding the diff from
	// OUTSIDE the loop: desired state is data, not a command. Marker ids
	// namespaced (dgArrowKRL) — every track's SVGs share the page's id
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 230" width="520" height="230" role="img" aria-label="the reconcile loop: observe cluster state, diff against the desired spec, act, and the changed cluster state is observed again — forever">' +
		// the four stations of the loop
		'<rect x="150" y="16" width="100" height="34" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="200" y="38" text-anchor="middle">observe</text>' +
		'<rect x="292" y="94" width="100" height="34" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="342" y="116" text-anchor="middle">diff</text>' +
		'<rect x="150" y="172" width="100" height="34" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="200" y="194" text-anchor="middle">act</text>' +
		'<rect x="8" y="94" width="110" height="34" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="63" y="116" text-anchor="middle">cluster state</text>' +
		// clockwise arcs
		'<path d="M 254 44 C 300 56 322 68 336 90" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowKRL)"/>' +
		'<path d="M 336 132 C 322 154 300 166 254 178" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowKRL)"/>' +
		'<path d="M 146 178 C 100 166 78 154 64 132" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowKRL)"/>' +
		'<path d="M 64 90 C 78 68 100 56 146 44" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowKRL)"/>' +
		'<text x="272" y="160" text-anchor="middle" class="lbl">create / delete</text>' +
		'<text x="100" y="58" text-anchor="middle" class="lbl">watch / list</text>' +
		// the spec, outside the loop, feeding the diff
		'<rect x="404" y="16" width="108" height="50" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="458" y="36" text-anchor="middle" class="lbl" style="fill:var(--ok)">spec (desired)</text>' +
		'<text x="458" y="54" text-anchor="middle" class="lbl">replicas: 3</text>' +
		'<path d="M 448 70 C 430 82 400 90 372 92" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowKRLok)"/>' +
		'<text x="14" y="222" class="lbl">the loop has no memory of what it did — it re-observes; etcd is the memory</text>' +
		'<defs>' +
		'<marker id="dgArrowKRL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowKRLok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'reconcile-loop',
		title: 'The Reconcile Loop',
		nav: 'reconcile loop',
		category: 'Controllers',

		prose: [
			'<h2>The Reconcile Loop</h2>' +
			'<p>Delete a Deployment\'s pod — <code>kubectl delete pod web-7f9c-x2k9p</code> ' +
			'— and watch <code>kubectl get pods -w</code>: a replacement appears within ' +
			'seconds. Nobody re-ran your deploy pipeline. Nothing "restarted" the pod. ' +
			'A controller <em>noticed</em> that the world had drifted from the spec, ' +
			'and closed the gap.</p>' +
			'<p>This is the idea the entire system is built on. You never command ' +
			'Kubernetes to <em>start three pods</em>; you declare ' +
			'<code>replicas: 3</code> — a row of desired state in etcd — and a ' +
			'controller runs the same loop forever: <strong>observe</strong> the ' +
			'current state, <strong>diff</strong> it against the desired state, ' +
			'<strong>act</strong> to close the gap. The actions change the cluster, ' +
			'the next observation sees the change, and the loop converges. ' +
			'<code>kubectl scale --replicas=5</code> starts nothing — it edits one ' +
			'number in the spec and lets the loop do the rest.</p>' +
			DIAGRAM +
			'<p>The crucial design choice is that the loop is ' +
			'<strong>level-triggered</strong>, not edge-triggered. An edge-triggered ' +
			'controller would react to <em>events</em> ("a pod died → create one") — ' +
			'and one missed event, one crash at the wrong moment, leaves it wrong ' +
			'forever. A level-triggered controller instead repeatedly compares the ' +
			'<em>full observed state</em> to the desired state, so a missed event ' +
			'self-heals on the next pass. That is why controllers survive their own ' +
			'restarts: the loop keeps no memory of what it did — it re-observes. ' +
			'The controller has no memory; <strong>etcd is the memory</strong>.</p>' +
			'<div class="tip">This is also why hand-editing a controller-owned object ' +
			'never sticks: <code>kubectl delete pod</code> on a ReplicaSet\'s pod, or ' +
			'hand-scaling its pods, is just another observed deviation — the next ' +
			'reconcile puts it back. To change the outcome you must change the ' +
			'<em>desired</em> state.</div>' +
			'<h3>Your job</h3>' +
			'<p>The program on the right replays three drift scenarios through a tiny ' +
			'replica controller. <code>reconcile(desired, pods)</code> currently ' +
			'proposes nothing — implement the diff: too few pods → ' +
			'<code>create pod-&lt;next&gt;</code> actions (numbering past the highest ' +
			'existing suffix); too many → <code>delete</code> the highest-suffix ' +
			'extras; exact → nil. <code>main</code> is already level-triggered: it ' +
			'applies your actions and reconciles <em>again</em>, and a scenario only ' +
			'prints <code>converged</code> once a pass proposes nothing while the ' +
			'count matches.</p>',
		],

		task: 'Implement reconcile: create the missing pods, delete the highest-suffix extras, return nil when observed == desired — every scenario must reach "converged".',

		starter: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			'// Pod is the controller\'s view of one running pod.',
			'type Pod struct {',
			'	Name  string',
			'	Ready bool',
			'}',
			'',
			'// reconcile is the DIFF step of the loop: compare the observed pods',
			'// against the desired count and return the actions that close the gap.',
			'//   - too few  → "create pod-<n>" for each missing pod, numbering past',
			'//                the highest existing pod-<n> suffix',
			'//   - too many → "delete pod-<n>" for the highest-suffix extras',
			'//   - exact    → nil: proposing nothing IS the converged signal',
			'func reconcile(desired int, pods []Pod) []string {',
			'	// TODO: right now the controller proposes nothing, ever — drifted',
			'	// scenarios stay drifted and main() reports them as stuck.',
			'	return nil',
			'}',
			'',
			'func main() {',
			'	const desired = 3 // the spec: replicas: 3',
			'',
			'	scenarios := []struct {',
			'		label string',
			'		pods  []Pod',
			'	}{',
			'		{"one pod short (someone ran kubectl delete pod)",',
			'			[]Pod{{"pod-1", true}, {"pod-2", true}}},',
			'		{"one pod extra (a scale-down raced a node restart)",',
			'			[]Pod{{"pod-1", true}, {"pod-2", true}, {"pod-3", true}, {"pod-4", true}}},',
			'		{"steady state",',
			'			[]Pod{{"pod-1", true}, {"pod-2", true}, {"pod-3", true}}},',
			'	}',
			'',
			'	for _, sc := range scenarios {',
			'		fmt.Printf("-- %s --\\n", sc.label)',
			'		pods := append([]Pod(nil), sc.pods...)',
			'		// Level-triggered: act, then RE-OBSERVE and reconcile again.',
			'		// Convergence is not "I did the thing" — it is a fresh pass',
			'		// over fresh state proposing nothing.',
			'		for round := 0; round < 5; round++ {',
			'			actions := reconcile(desired, pods)',
			'			ready := 0',
			'			for _, p := range pods {',
			'				if p.Ready {',
			'					ready++',
			'				}',
			'			}',
			'			fmt.Printf("reconcile: observed=%d desired=%d actions=[%s]\\n",',
			'				ready, desired, strings.Join(actions, ", "))',
			'			if len(actions) == 0 {',
			'				if ready == desired {',
			'					fmt.Println("converged")',
			'				} else {',
			'					fmt.Println("stuck: nothing proposed but observed != desired")',
			'				}',
			'				break',
			'			}',
			'			pods = apply(pods, actions)',
			'		}',
			'	}',
			'}',
			'',
			'// apply plays the actions back onto the observed state. In a real',
			'// cluster this is the API server and kubelets doing the work — the',
			'// controller never sees the effect except through its next observation.',
			'func apply(pods []Pod, actions []string) []Pod {',
			'	for _, a := range actions {',
			'		f := strings.Fields(a)',
			'		if len(f) != 2 {',
			'			continue',
			'		}',
			'		switch f[0] {',
			'		case "create":',
			'			pods = append(pods, Pod{Name: f[1], Ready: true})',
			'		case "delete":',
			'			next := make([]Pod, 0, len(pods))',
			'			for _, p := range pods {',
			'				if p.Name != f[1] {',
			'					next = append(next, p)',
			'				}',
			'			}',
			'			pods = next',
			'		}',
			'	}',
			'	return pods',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// The two gap-closing actions, and exactly one "converged" per
			// scenario. The starter never emits actions and reports drifted
			// scenarios as stuck, so it converges only once (steady state).
			return flat.indexOf('actions=[create pod-3]') !== -1 &&
				flat.indexOf('actions=[delete pod-4]') !== -1 &&
				(stdout.match(/converged/g) || []).length === 3 &&
				flat.indexOf('stuck') === -1;
		},

		solution: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"sort"',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// Pod is the controller\'s view of one running pod.',
			'type Pod struct {',
			'	Name  string',
			'	Ready bool',
			'}',
			'',
			'// reconcile is the DIFF step of the loop: compare the observed pods',
			'// against the desired count and return the actions that close the gap.',
			'//',
			'// Deliberately a PURE function of (desired, observed): no memory of',
			'// previous rounds, no record of pending work. That is the whole',
			'// level-triggered contract — feed it the same state twice and it',
			'// proposes the same actions twice; feed it converged state and it',
			'// proposes nothing, no matter what it did last round.',
			'func reconcile(desired int, pods []Pod) []string {',
			'	// Sort a copy by name: the observed list arrives in watch-cache',
			'	// order, and deterministic decisions need deterministic input.',
			'	sorted := append([]Pod(nil), pods...)',
			'	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Name < sorted[j].Name })',
			'',
			'	n := len(sorted)',
			'	switch {',
			'	case n < desired:',
			'		// Too few: create the gap. Numbering continues past the',
			'		// highest LIVE suffix so a replacement never collides with',
			'		// an existing pod (the real controller solves this with a',
			'		// random name suffix — same goal, less readable output).',
			'		next := maxIndex(sorted) + 1',
			'		actions := []string{}',
			'		for i := 0; i < desired-n; i++ {',
			'			actions = append(actions, fmt.Sprintf("create pod-%d", next+i))',
			'		}',
			'		return actions',
			'	case n > desired:',
			'		// Too many: delete from the END of the sorted list — the',
			'		// youngest, highest-suffix pods go first, echoing the real',
			'		// ReplicaSet controller\'s preference for keeping the oldest,',
			'		// most-proven pods alive during a scale-down.',
			'		actions := []string{}',
			'		for _, p := range sorted[desired:] {',
			'			actions = append(actions, fmt.Sprintf("delete %s", p.Name))',
			'		}',
			'		return actions',
			'	}',
			'	// Converged. Returning nil rather than a "do nothing" action',
			'	// matters: silence is how the loop knows it can go back to sleep.',
			'	return nil',
			'}',
			'',
			'// maxIndex extracts the largest numeric suffix among pod-<n> names, so',
			'// new pods continue the sequence instead of reusing a live name.',
			'func maxIndex(pods []Pod) int {',
			'	max := 0',
			'	for _, p := range pods {',
			'		if i, err := strconv.Atoi(strings.TrimPrefix(p.Name, "pod-")); err == nil && i > max {',
			'			max = i',
			'		}',
			'	}',
			'	return max',
			'}',
			'',
			'func main() {',
			'	const desired = 3 // the spec: replicas: 3',
			'',
			'	scenarios := []struct {',
			'		label string',
			'		pods  []Pod',
			'	}{',
			'		{"one pod short (someone ran kubectl delete pod)",',
			'			[]Pod{{"pod-1", true}, {"pod-2", true}}},',
			'		{"one pod extra (a scale-down raced a node restart)",',
			'			[]Pod{{"pod-1", true}, {"pod-2", true}, {"pod-3", true}, {"pod-4", true}}},',
			'		{"steady state",',
			'			[]Pod{{"pod-1", true}, {"pod-2", true}, {"pod-3", true}}},',
			'	}',
			'',
			'	for _, sc := range scenarios {',
			'		fmt.Printf("-- %s --\\n", sc.label)',
			'		pods := append([]Pod(nil), sc.pods...)',
			'		// Level-triggered: act, then RE-OBSERVE and reconcile again.',
			'		// Convergence is not "I did the thing" — it is a fresh pass',
			'		// over fresh state proposing nothing.',
			'		for round := 0; round < 5; round++ {',
			'			actions := reconcile(desired, pods)',
			'			ready := 0',
			'			for _, p := range pods {',
			'				if p.Ready {',
			'					ready++',
			'				}',
			'			}',
			'			fmt.Printf("reconcile: observed=%d desired=%d actions=[%s]\\n",',
			'				ready, desired, strings.Join(actions, ", "))',
			'			if len(actions) == 0 {',
			'				if ready == desired {',
			'					fmt.Println("converged")',
			'				} else {',
			'					fmt.Println("stuck: nothing proposed but observed != desired")',
			'				}',
			'				break',
			'			}',
			'			pods = apply(pods, actions)',
			'		}',
			'	}',
			'}',
			'',
			'// apply plays the actions back onto the observed state. In a real',
			'// cluster this is the API server and kubelets doing the work — the',
			'// controller never sees the effect except through its next observation.',
			'func apply(pods []Pod, actions []string) []Pod {',
			'	for _, a := range actions {',
			'		f := strings.Fields(a)',
			'		if len(f) != 2 {',
			'			continue',
			'		}',
			'		switch f[0] {',
			'		case "create":',
			'			pods = append(pods, Pod{Name: f[1], Ready: true})',
			'		case "delete":',
			'			next := make([]Pod, 0, len(pods))',
			'			for _, p := range pods {',
			'				if p.Name != f[1] {',
			'					next = append(next, p)',
			'				}',
			'			}',
			'			pods = next',
			'		}',
			'	}',
			'	return pods',
			'}',
			'',
		].join('\n'),
	});
})();
