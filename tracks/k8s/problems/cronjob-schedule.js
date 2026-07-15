/* CronJob Schedule — Stateful & Batch (Medium). The CronJob controller
 * answers one question every tick: should a Job start NOW? Two functions
 * carry the whole mechanism: Decide (match the minute, dedupe within it,
 * apply the concurrency policy) and CatchUp (the controller was down —
 * find the MOST RECENT missed tick and honor startingDeadline). The harness
 * ends on the on-call classic: the 03:00 export that silently never ran.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// Timeline of an outage across a scheduled tick: the 03:30 run is missed,
	// the deadline window expires before the controller returns, the run is
	// skipped forever. Marker id namespaced dgArrowKCR because every track's
	// SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 185" width="520" height="185" role="img" aria-label="controller down across the 03:30 tick; it returns after the startingDeadline window, so the run is skipped">' +
		'<text x="20" y="20" class="lbl">the controller was down across 03:30 — does the job still run?</text>' +
		// outage band
		'<rect x="140" y="66" width="200" height="60" fill="var(--edge)" fill-opacity="0.18" stroke="none"/>' +
		'<text x="240" y="58" text-anchor="middle" class="lbl">controller down</text>' +
		// time axis
		'<path d="M 30 96 L 480 96" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowKCR)"/>' +
		// missed tick
		'<path d="M 200 81 L 200 111" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="200" y="128" text-anchor="middle" class="lbl" style="fill:var(--warn)">03:30 tick — missed</text>' +
		// recovery tick
		'<path d="M 340 81 L 340 111" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="346" y="128" class="lbl" style="fill:var(--accent)">controller back</text>' +
		// deadline window
		'<path d="M 200 148 L 280 148" stroke="var(--ok)" stroke-width="2"/>' +
		'<path d="M 280 142 L 280 154" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="200" y="170" class="lbl" style="fill:var(--ok)">startingDeadline window</text>' +
		'<text x="340" y="170" class="lbl" style="fill:var(--err-fg)">back too late → skip: the run never happens</text>' +
		'<defs>' +
		'<marker id="dgArrowKCR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'cronjob-schedule',
		title: 'CronJob: Should a Job Start Now?',
		nav: 'CronJob schedule',
		difficulty: 'Medium',
		category: 'Stateful & Batch',
		task: 'Implement Decide (match, dedupe, concurrency policy) and CatchUp (most recent missed tick vs deadline); all 8 tests.',

		prose: [
			'<h2>CronJob: Should a Job Start Now?</h2>' +
			'<p>At 03:00 the nightly export didn\'t run. Or worse: it ran twice, and ' +
			'finance got two invoices. Both incidents trace to the same small machine — ' +
			'the CronJob controller, which wakes up roughly every 10 seconds and asks ' +
			'one question per CronJob: <strong>should a Job start now?</strong> A ' +
			'CronJob never runs your code; it manufactures Job objects (the previous ' +
			'exercise) on a schedule, and all its failure modes live in the ' +
			'manufacturing decision.</p>' +
			'<p>This exercise distills cron to two fields — <code>Minute</code> and ' +
			'<code>Hour</code>, with <code>-1</code> as the wildcard — and time to ' +
			'minutes-since-midnight. The decision stacks four rules:</p>' +
			'<ul>' +
			'<li><strong>Match the minute</strong> — the <code>matches</code> predicate ' +
			'is given; a non-matching minute is a no-op.</li>' +
			'<li><strong>Dedupe within the minute</strong> — the controller ticks many ' +
			'times per minute, but <code>lastRun == now</code> means this minute ' +
			'already fired.</li>' +
			'<li><strong>Concurrency policy</strong>, when the previous Job is still ' +
			'active: <code>Forbid</code> skips, <code>Replace</code> kills the old Job ' +
			'and starts fresh, <code>Allow</code> — the default! — happily runs them ' +
			'concurrently.</li>' +
			'<li><strong>Otherwise:</strong> start the Job.</li>' +
			'</ul>' +
			'<p>And separately: what if the controller was <em>down</em> when the ' +
			'minute passed? On restart it looks back for the most recent missed tick — ' +
			'but only starts it if the miss is within <code>startingDeadline</code> ' +
			'minutes. Beyond that, the run is skipped. Forever. Silently.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement two functions. <code>Decide(s, now, lastRun, activeJob, ' +
			'policy, startingDeadline)</code> applies the four rules above and returns ' +
			'<code>"no-op"</code>, <code>"skip: previous still running"</code>, ' +
			'<code>"replace: kill old, start job"</code>, ' +
			'<code>"start job (concurrent)"</code>, or <code>"start job"</code>. ' +
			'<code>CatchUp(s, downFrom, downTo, startingDeadline)</code> scans ' +
			'<code>[downFrom, downTo)</code> for the <em>most recent</em> matching ' +
			'minute: none → <code>"no-op"</code>; missed by more than the deadline → ' +
			'<code>"skip: too late (missed by &lt;n&gt;m)"</code>; otherwise → ' +
			'<code>"start job (late)"</code>.</p>',
			{ code: '{30, 3} = "30 3 * * *"; 03:30 = minute 210\nDecide(s, 210, -1, false, "Allow", 10)  → "start job"\nDecide(s, 210, 210, false, "Allow", 10) → "no-op"   (already fired)\nCatchUp(s, 205, 213, 10)                → "start job (late)"    (missed by 3m)\nCatchUp(s, 205, 250, 10)                → "skip: too late (missed by 40m)"', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Schedule is cron distilled to two fields; -1 is the wildcard.',
			'//',
			'//	{Minute: 0, Hour: -1} = "0 * * * *"  — hourly, on the hour',
			'//	{Minute: 30, Hour: 3} = "30 3 * * *" — daily at 03:30',
			'type Schedule struct {',
			'	Minute int',
			'	Hour   int',
			'}',
			'',
			'// matches reports whether minute-of-day t (0..1439) satisfies s.',
			'// GIVEN — the cron predicate is not the exercise; the controller is.',
			'func matches(s Schedule, t int) bool {',
			'	return (s.Minute == -1 || t%60 == s.Minute) && (s.Hour == -1 || t/60 == s.Hour)',
			'}',
			'',
			'// Decide is one tick of the CronJob controller: should a Job start NOW?',
			'//',
			'//	1. !matches(s, now)  → "no-op"',
			'//	2. lastRun == now    → "no-op" (this minute already fired)',
			'//	3. activeJob: policy "Forbid"  → "skip: previous still running"',
			'//	              policy "Replace" → "replace: kill old, start job"',
			'//	              policy "Allow"   → "start job (concurrent)"',
			'//	4. otherwise         → "start job"',
			'//',
			'// startingDeadline is unused here — it only matters for ticks the',
			'// controller missed entirely; see CatchUp.',
			'func Decide(s Schedule, now int, lastRun int, activeJob bool, policy string, startingDeadline int) string {',
			'	// TODO: the four rules, in order',
			'	return ""',
			'}',
			'',
			'// CatchUp models the controller waking up after being down across',
			'// [downFrom, downTo): find the MOST RECENT matching minute in that',
			'// window. No match → "no-op". Missed by more than startingDeadline',
			'// (downTo - missed) → "skip: too late (missed by <n>m)". Otherwise',
			'// → "start job (late)".',
			'func CatchUp(s Schedule, downFrom, downTo, startingDeadline int) string {',
			'	// TODO: scan the window, then apply the deadline',
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
			'	hourly := Schedule{Minute: 0, Hour: -1} // "0 * * * *"',
			'	daily := Schedule{Minute: 30, Hour: 3}  // "30 3 * * *", fires at minute 210',
			'',
			'	type tc struct {',
			'		name string',
			'		got  func() string',
			'		want string',
			'	}',
			'	cases := []tc{',
			'		{"hourly at 02:00: minute matches, nothing running — start",',
			'			func() string { return Decide(hourly, 120, -1, false, "Allow", 10) },',
			'			"start job"},',
			'		{"03:31 does not match 30 3 * * * — no-op",',
			'			func() string { return Decide(daily, 211, -1, false, "Allow", 10) },',
			'			"no-op"},',
			'		{"same-minute dedupe: second tick inside minute 210 must not double-fire",',
			'			func() string { return Decide(daily, 210, 210, false, "Allow", 10) },',
			'			"no-op"},',
			'		{"Forbid: last night\'s export is still running — skip this one",',
			'			func() string { return Decide(daily, 210, -1, true, "Forbid", 10) },',
			'			"skip: previous still running"},',
			'		{"Replace: kill the stuck Job, start fresh",',
			'			func() string { return Decide(daily, 210, -1, true, "Replace", 10) },',
			'			"replace: kill old, start job"},',
			'		{"Allow (the default!): the runs happily stack up",',
			'			func() string { return Decide(daily, 210, -1, true, "Allow", 10) },',
			'			"start job (concurrent)"},',
			'		{"catch-up picks the MOST RECENT missed tick: hourly, down 01:40-04:20, deadline 30m",',
			'			// Missed ticks at 120, 180, 240; only 240 (missed by 20m) is',
			'			// inside the deadline — an implementation that grabs the FIRST',
			'			// match computes 140m and wrongly skips.',
			'			func() string { return CatchUp(hourly, 100, 260, 30) },',
			'			"start job (late)"},',
			'		{"the 3am job that silently never ran: back 40m late, deadline 10m",',
			'			func() string { return CatchUp(daily, 205, 250, 10) },',
			'			"skip: too late (missed by 40m)"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		want, got := c.want, c.got',
			'		runCase(r, func() {',
			'			g := got()',
			'			r["pass"] = g == want',
			'			r["got"] = g',
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
			'// Schedule is cron distilled to two fields; -1 is the wildcard.',
			'//',
			'//	{Minute: 0, Hour: -1} = "0 * * * *"  — hourly, on the hour',
			'//	{Minute: 30, Hour: 3} = "30 3 * * *" — daily at 03:30',
			'type Schedule struct {',
			'	Minute int',
			'	Hour   int',
			'}',
			'',
			'// matches reports whether minute-of-day t (0..1439) satisfies s.',
			'func matches(s Schedule, t int) bool {',
			'	return (s.Minute == -1 || t%60 == s.Minute) && (s.Hour == -1 || t/60 == s.Hour)',
			'}',
			'',
			'// Decide is one tick of the CronJob controller. The rule ORDER is the',
			'// design: cheap absolute vetoes (wrong minute, already fired) run before',
			'// the policy is even consulted — so the concurrency policy can never',
			'// cause a run at an unscheduled time, only modulate a scheduled one.',
			'func Decide(s Schedule, now int, lastRun int, activeJob bool, policy string, startingDeadline int) string {',
			'	if !matches(s, now) {',
			'		return "no-op"',
			'	}',
			'	// The controller ticks every ~10s, so a matching minute is seen',
			'	// several times. lastRun is the idempotency key: one scheduled',
			'	// time, one Job — this dedupe is what makes six ticks in minute',
			'	// 210 produce a single export instead of six.',
			'	if lastRun == now {',
			'		return "no-op"',
			'	}',
			'	if activeJob {',
			'		// The policy only matters under overlap: a slow previous run',
			'		// meeting the next scheduled time. Note "Allow" still starts',
			'		// the Job — the default behavior is concurrency, not safety.',
			'		switch policy {',
			'		case "Forbid":',
			'			return "skip: previous still running"',
			'		case "Replace":',
			'			return "replace: kill old, start job"',
			'		}',
			'		return "start job (concurrent)"',
			'	}',
			'	return "start job"',
			'}',
			'',
			'// CatchUp handles the ticks nobody saw: the controller was down across',
			'// [downFrom, downTo) and must reconstruct what it missed from the',
			'// schedule alone — cron state is derived, never stored.',
			'func CatchUp(s Schedule, downFrom, downTo, startingDeadline int) string {',
			'	// Keep overwriting to end up with the LATEST match: like the real',
			'	// controller, we catch up at most ONE run — the most recent. Firing',
			'	// every missed tick of an hourly schedule after a day-long outage',
			'	// would launch 24 exports into an already-struggling cluster.',
			'	missed := -1',
			'	for t := downFrom; t < downTo; t++ {',
			'		if matches(s, t) {',
			'			missed = t',
			'		}',
			'	}',
			'	if missed == -1 {',
			'		return "no-op"',
			'	}',
			'	// The deadline is measured from the tick that SHOULD have fired to',
			'	// the moment the controller is back — a run this stale may be worse',
			'	// than no run (the 04:00 data load stomping the 06:00 open of',
			'	// business), so staleness is a reason to refuse.',
			'	if late := downTo - missed; late > startingDeadline {',
			'		return fmt.Sprintf("skip: too late (missed by %dm)", late)',
			'	}',
			'	return "start job (late)"',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>A clock that manufactures Jobs</h3>' +
			'<p>Real CronJobs use the full five-field cron spec ' +
			'(<code>30 3 * * 1-5</code> — day-of-month, month, day-of-week on top of ' +
			'our two fields), but the controller you wrote is faithful where it counts: ' +
			'schedule state is <em>derived, never stored</em>. There is no queue of ' +
			'pending runs anywhere — just <code>status.lastScheduleTime</code> and the ' +
			'spec, from which every wake-up recomputes what should have happened. That ' +
			'is why the dedupe and the catch-up scan exist at all: they are the two ' +
			'halves of "recompute, don\'t remember".</p>' +
			'<p>The concurrency defaults are where production surprises live. ' +
			'<code>concurrencyPolicy</code> defaults to <code>Allow</code>: a nightly ' +
			'export that one day takes 25 hours meets its next scheduled run, and now ' +
			'two exports fight over the same table — then three, then four. ' +
			'<code>Forbid</code> is the usual fix; <code>Replace</code> suits ' +
			'freshness-over-completion work like cache warming, where a stale run ' +
			'still in flight is worth killing.</p>' +
			'<div class="tip">With <code>startingDeadlineSeconds</code> unset, a missed ' +
			'run is caught up <em>whenever</em> the controller returns — but still only ' +
			'the most recent one, exactly your <code>CatchUp</code>. And there is a ' +
			'famous cliff: if the controller counts more than <strong>100</strong> ' +
			'missed runs with no deadline to bound the search, it gives up entirely and ' +
			'stops scheduling, logging <code>too many missed start times</code>. A ' +
			'suspended CronJob resumed months later can hit this.</div>' +
			'<p>The deadline check itself is two lines — the subtlety is only ' +
			'<em>which</em> tick it applies to:</p>',
			{ code: 'missed := -1\nfor t := downFrom; t < downTo; t++ {\n\tif matches(s, t) {\n\t\tmissed = t // keep the LATEST — k8s catches up ONE run, not all\n\t}\n}\nif late := downTo - missed; late > startingDeadline { /* skip */ }' },
			'<h3>On the cluster / when debugging</h3>' +
			'<p>"The 3am job didn\'t run" starts with ' +
			'<code>kubectl get cronjob nightly</code> — compare the ' +
			'<code>LAST SCHEDULE</code> column against the wall clock, and check ' +
			'<code>SUSPEND</code> while you\'re there. ' +
			'<code>kubectl describe cronjob nightly</code> shows the controller\'s own ' +
			'account: <code>SuccessfulCreate</code> events for runs that happened, ' +
			'<code>JobAlreadyActive</code> when Forbid skipped, ' +
			'<code>MissedSchedule</code>-style errors for the deadline cases. The Jobs ' +
			'it manufactured are under ' +
			'<code>kubectl get jobs -l cronjob-name=nightly</code> (pruned by ' +
			'<code>successfulJobsHistoryLimit</code> / ' +
			'<code>failedJobsHistoryLimit</code> — an empty list may just mean history ' +
			'limit 0). To re-fire a missed run by hand: ' +
			'<code>kubectl create job --from=cronjob/nightly nightly-manual</code>. ' +
			'And the real fix for both incident flavors is in the workload, not the ' +
			'schedule: runs <em>will</em> occasionally double (Allow, Replace races, ' +
			'controller restarts) and occasionally vanish (deadlines) — an idempotent ' +
			'job, keyed on the date it processes rather than the moment it starts, ' +
			'survives both.</p>',
		],
		complexity: { time: 'O(w) — w = minutes in the down window; Decide is O(1)', space: 'O(1)' },
	});
})();
