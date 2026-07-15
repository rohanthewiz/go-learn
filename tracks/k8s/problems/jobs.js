/* Jobs — Stateful & Batch (Medium). The Job controller's pod math as one
 * pure function over spec and status: recognize the terminal states
 * (backoff-limit failure, completion), then bound new pods by TWO budgets —
 * parallelism minus active, and completions minus succeeded minus active.
 * The second budget is the overshoot guard the harness leans on: near the
 * finish line, a naive controller creates a pod that runs the workload one
 * extra time.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// Five completion slots: three succeeded, two active. The parallelism
	// budget says one more pod is allowed; the work budget says zero are
	// needed — and min() must side with the work budget. No arrowheads, so
	// no <marker> ids needed here (prefix dgArrowKJB reserved regardless).
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 178" width="520" height="178" role="img" aria-label="job with completions 5: three succeeded, two active, zero pods left to create despite spare parallelism">' +
		'<text x="20" y="20" class="lbl">completions: 5 — succeeded 3, active 2</text>' +
		'<rect x="30" y="34" width="80" height="46" rx="6" fill="var(--ok)" fill-opacity="0.18" stroke="var(--ok)"/>' +
		'<text x="70" y="62" text-anchor="middle" class="lbl" style="fill:var(--ok)">✓ done</text>' +
		'<rect x="125" y="34" width="80" height="46" rx="6" fill="var(--ok)" fill-opacity="0.18" stroke="var(--ok)"/>' +
		'<text x="165" y="62" text-anchor="middle" class="lbl" style="fill:var(--ok)">✓ done</text>' +
		'<rect x="220" y="34" width="80" height="46" rx="6" fill="var(--ok)" fill-opacity="0.18" stroke="var(--ok)"/>' +
		'<text x="260" y="62" text-anchor="middle" class="lbl" style="fill:var(--ok)">✓ done</text>' +
		'<rect x="315" y="34" width="80" height="46" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="355" y="62" text-anchor="middle" class="lbl" style="fill:var(--warn)">active</text>' +
		'<rect x="410" y="34" width="80" height="46" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="450" y="62" text-anchor="middle" class="lbl" style="fill:var(--warn)">active</text>' +
		'<text x="30" y="112" class="lbl">parallelism budget: 3 − 2 active = 1 pod allowed</text>' +
		'<text x="30" y="132" class="lbl" style="fill:var(--warn)">work budget: 5 − 3 succeeded − 2 active = 0 pods needed</text>' +
		'<text x="30" y="162" class="lbl" style="fill:var(--err-fg)">min(1, 0) = 0 → wait — an extra pod would run the workload a 6th time</text>' +
		'</svg>';

	T.problem({
		id: 'jobs',
		title: 'Jobs: Run to Completion',
		nav: 'Jobs & backoff',
		difficulty: 'Medium',
		category: 'Stateful & Batch',
		task: 'Implement Reconcile — terminal states first, then min(parallelism budget, work budget); all 7 tests.',

		prose: [
			'<h2>Jobs: Run to Completion</h2>' +
			'<p>A pod that crashes gets restarted; a pod that finishes gets restarted ' +
			'too — Deployments exist to keep things <em>running</em>. But your database ' +
			'migration must run <em>once, to completion, and then stop</em>. That is a ' +
			'<strong>Job</strong>: a controller whose desired state is not "N pods ' +
			'alive" but "N successes recorded", with a concurrency cap and a failure ' +
			'budget along the way:</p>' +
			'<ul>' +
			'<li><code>completions</code> — how many pods must succeed for the Job to ' +
			'be complete.</li>' +
			'<li><code>parallelism</code> — how many pods may run at once.</li>' +
			'<li><code>backoffLimit</code> — how many pod <em>failures</em> to tolerate ' +
			'before declaring the whole Job failed. It counts retries: limit 3 forgives ' +
			'failures 1–3; the 4th is fatal.</li>' +
			'</ul>' +
			'<p>Each reconcile pass, the controller reads the status ' +
			'(<code>succeeded</code> / <code>failed</code> / <code>active</code>) and ' +
			'decides: is this Job dead, done, or does it need pods? The subtle part is ' +
			'the last one — new pods are bounded by <em>two</em> budgets, and near the ' +
			'finish line they disagree:</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Reconcile(spec, st)</code>, checking in this order: ' +
			'<code>st.Failed &gt; spec.BackoffLimit</code> → ' +
			'<code>"failed: backoff limit exceeded"</code> (strictly greater — the ' +
			'limit is the tolerated count); <code>st.Succeeded &gt;= spec.Completions</code> ' +
			'→ <code>"complete"</code>; otherwise compute ' +
			'<code>create = min(Parallelism − Active, Completions − Succeeded − Active)</code> ' +
			'and return <code>"create N pod(s)"</code> if positive, else ' +
			'<code>"wait"</code>.</p>',
			{ code: 'C=5 P=2, fresh            → "create 2 pod(s)"\nC=5 P=3, S=3 A=2          → "wait"      (work budget is 0)\nC=5 B=3, F=4              → "failed: backoff limit exceeded"\nC=5,     S=5              → "complete"', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// JobSpec is the contract: run to Completions successes, at most',
			'// Parallelism pods at once, tolerating BackoffLimit pod failures.',
			'type JobSpec struct {',
			'	Completions  int',
			'	Parallelism  int',
			'	BackoffLimit int',
			'}',
			'',
			'// JobStatus is the observed state — the same three counters you see',
			'// under status: in `kubectl get job -o yaml`.',
			'type JobStatus struct {',
			'	Succeeded int',
			'	Failed    int',
			'	Active    int',
			'}',
			'',
			'// Reconcile returns the Job controller\'s decision for one pass:',
			'//',
			'//  1. st.Failed > spec.BackoffLimit    → "failed: backoff limit exceeded"',
			'//     (strictly greater: backoffLimit counts tolerated retries, so',
			'//     limit 3 forgives exactly 3 failed pods; the 4th kills the Job)',
			'//  2. st.Succeeded >= spec.Completions → "complete"',
			'//  3. create = min(Parallelism - Active,',
			'//                  Completions - Succeeded - Active)',
			'//     create > 0 → "create N pod(s)" (fmt: create %d pod(s));',
			'//     otherwise  → "wait"',
			'func Reconcile(spec JobSpec, st JobStatus) string {',
			'	// TODO: terminal states first, then the two budgets',
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
			'		name string',
			'		spec JobSpec',
			'		st   JobStatus',
			'		want string',
			'	}',
			'	cases := []tc{',
			'		{"fresh job C=5 P=2: fill the parallelism budget",',
			'			JobSpec{Completions: 5, Parallelism: 2, BackoffLimit: 3},',
			'			JobStatus{},',
			'			"create 2 pod(s)"},',
			'		{"S=1 A=1 F=3: at the backoff limit (not over) — still topping up",',
			'			JobSpec{Completions: 5, Parallelism: 2, BackoffLimit: 3},',
			'			JobStatus{Succeeded: 1, Failed: 3, Active: 1},',
			'			"create 1 pod(s)"},',
			'		{"overshoot guard: C=5 S=3 A=2 — spare parallelism, zero work left",',
			'			JobSpec{Completions: 5, Parallelism: 3, BackoffLimit: 3},',
			'			JobStatus{Succeeded: 3, Active: 2},',
			'			"wait"},',
			'		{"backoff exceeded: F=4 vs limit 3 — failed despite the successes",',
			'			JobSpec{Completions: 5, Parallelism: 2, BackoffLimit: 3},',
			'			JobStatus{Succeeded: 2, Failed: 4},',
			'			"failed: backoff limit exceeded"},',
			'		{"complete: succeeded reached completions",',
			'			JobSpec{Completions: 5, Parallelism: 2, BackoffLimit: 3},',
			'			JobStatus{Succeeded: 5},',
			'			"complete"},',
			'		{"active saturated: A == P caps creation even with work remaining",',
			'			JobSpec{Completions: 10, Parallelism: 3, BackoffLimit: 3},',
			'			JobStatus{Succeeded: 1, Active: 3},',
			'			"wait"},',
			'		{"C=1 P=8: the work budget wins the min — exactly one pod",',
			'			JobSpec{Completions: 1, Parallelism: 8, BackoffLimit: 3},',
			'			JobStatus{},',
			'			"create 1 pod(s)"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		want := c.want',
			'		spec, st := c.spec, c.st',
			'		runCase(r, func() {',
			'			got := Reconcile(spec, st)',
			'			r["pass"] = got == want',
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
			'import "fmt"',
			'',
			'// JobSpec is the contract: run to Completions successes, at most',
			'// Parallelism pods at once, tolerating BackoffLimit pod failures.',
			'type JobSpec struct {',
			'	Completions  int',
			'	Parallelism  int',
			'	BackoffLimit int',
			'}',
			'',
			'// JobStatus is the observed state — the same three counters you see',
			'// under status: in `kubectl get job -o yaml`.',
			'type JobStatus struct {',
			'	Succeeded int',
			'	Failed    int',
			'	Active    int',
			'}',
			'',
			'// Reconcile decides one pass of the Job controller. Terminal states are',
			'// checked before any pod math: a controller must recognize "this Job is',
			'// finished" first, or it will keep planning work for a dead object.',
			'func Reconcile(spec JobSpec, st JobStatus) string {',
			'	// Strictly greater is the real k8s off-by-one: backoffLimit is a',
			'	// RETRY budget, not a failure count. limit=3 forgives failed pods',
			'	// #1..#3; the moment Failed exceeds the limit (the 4th), the Job is',
			'	// marked Failed — even if other pods succeeded along the way.',
			'	// Failure is checked before completion: a Job that blew its budget',
			'	// is dead regardless of how the remaining pods were doing.',
			'	if st.Failed > spec.BackoffLimit {',
			'		return "failed: backoff limit exceeded"',
			'	}',
			'	if st.Succeeded >= spec.Completions {',
			'		return "complete"',
			'	}',
			'',
			'	// Two independent budgets bound new pods, and BOTH must hold:',
			'	//',
			'	//   parallelism budget: Parallelism - Active',
			'	//       the concurrency cap — how many more may run right now',
			'	//   work budget: Completions - Succeeded - Active',
			'	//       how many more are NEEDED, counting every active pod as a',
			'	//       presumed future success',
			'	//',
			'	// The work budget is the overshoot guard. Ignore it and a job at',
			'	// S=3 A=2 of C=5 creates a 6th pod: if the two active ones finish,',
			'	// the workload has run six times for five completions — and Jobs',
			'	// exist precisely because workloads have side effects.',
			'	create := spec.Parallelism - st.Active',
			'	if work := spec.Completions - st.Succeeded - st.Active; work < create {',
			'		create = work',
			'	}',
			'	if create > 0 {',
			'		return fmt.Sprintf("create %d pod(s)", create)',
			'	}',
			'	// Nothing to create, nothing terminal: pods are in flight — the',
			'	// next status change re-triggers reconciliation.',
			'	return "wait"',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the second budget exists</h3>' +
			'<p>The parallelism budget alone looks sufficient — until the finish line. ' +
			'With <code>completions: 5</code>, three succeeded and two active, a naive ' +
			'controller sees spare parallelism and creates a sixth pod. If the two ' +
			'active pods finish, the workload ran <em>six</em> times. For a pure ' +
			'computation nobody notices; for the things Jobs actually run — billing ' +
			'exports, emails, schema migrations — the extra run is a customer-visible ' +
			'bug. Counting every active pod as a presumed success is the pessimistic ' +
			'accounting that prevents it:</p>',
			{ code: 'create := spec.Parallelism - st.Active            // may run\nif work := spec.Completions - st.Succeeded - st.Active; work < create {\n\tcreate = work                                 // are NEEDED\n}' },
			'<p>The trade-off is deliberate: if an active pod later <em>fails</em>, its ' +
			'slot is re-created on the next pass. Kubernetes prefers a slightly slower ' +
			'finish over a duplicated side effect — though the guarantee is only ' +
			'<em>at-least-once</em> overall (a node can die mid-run after the work is ' +
			'done but before status lands), which is why idempotent job code is still ' +
			'on you.</p>' +
			'<p>How failures look depends on the pod\'s <code>restartPolicy</code> — ' +
			'inside a Job it must be <code>Never</code> or <code>OnFailure</code>. ' +
			'<code>Never</code> leaves each failed pod behind and creates a fresh one: ' +
			'<code>Failed</code> climbs visibly and every crash keeps its logs. ' +
			'<code>OnFailure</code> restarts the container <em>in place</em>: tidier, ' +
			'but the retries hide inside one pod\'s restart count and the logs of ' +
			'earlier attempts are gone. Debugging favors <code>Never</code>.</p>' +
			'<div class="tip"><code>completionMode: Indexed</code> gives each pod a ' +
			'stable <code>JOB_COMPLETION_INDEX</code> (0..completions−1) — static work ' +
			'partitioning without a queue: shard N of the export processes slice N. ' +
			'Each index must succeed once, so a failed index is retried as that same ' +
			'index.</div>' +
			'<h3>On the cluster / when debugging</h3>' +
			'<p><code>kubectl get job export -o yaml</code> shows exactly the struct ' +
			'you reconciled: <code>status.succeeded</code>, <code>status.failed</code>, ' +
			'<code>status.active</code>, and a <code>conditions:</code> entry of type ' +
			'<code>Failed</code> with reason <code>BackoffLimitExceeded</code> when the ' +
			'budget blows. <code>kubectl describe job export</code> surfaces the same ' +
			'as events. The pods themselves are one selector away — ' +
			'<code>kubectl get pods -l job-name=export</code> — and with ' +
			'<code>restartPolicy: Never</code> the pile of <code>Error</code> pods ' +
			'there IS your retry history: <code>kubectl logs</code> each one to watch ' +
			'the failure evolve. Note what a completed Job does <em>not</em> do: it ' +
			'never deletes itself. It sits there until you set ' +
			'<code>ttlSecondsAfterFinished</code>, its CronJob\'s history limit prunes ' +
			'it, or someone deletes it — and then the GC cascade from the ownership ' +
			'exercise takes its pods.</p>',
		],
		complexity: { time: 'O(1) — pure arithmetic over the status counters', space: 'O(1)' },
	});
})();
