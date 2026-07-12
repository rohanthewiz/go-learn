/* CrashLoopBackOff Timer — Workloads (Easy). The kubelet's restart
 * backoff: delay doubles from 10s, caps at 300s, and resets after the
 * container runs cleanly for 10 minutes. Exact-table harness — the
 * schedule is documented and fully deterministic.
 */
(function () {
	'use strict';
	var T = GoLearnCKA;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 140" width="560" height="140" role="img" aria-label="crash loop timeline: restart gaps double from 10s toward the 300s cap; a long clean run resets the backoff">' +
		// timeline
		'<path d="M 20 70 L 540 70" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowCLB)" fill="none"/>' +
		// crashes at widening gaps
		'<text x="34" y="62" text-anchor="middle" style="fill:var(--err-edge)">✗</text>' +
		'<text x="76" y="62" text-anchor="middle" style="fill:var(--err-edge)">✗</text>' +
		'<text x="126" y="62" text-anchor="middle" style="fill:var(--err-edge)">✗</text>' +
		'<text x="192" y="62" text-anchor="middle" style="fill:var(--err-edge)">✗</text>' +
		'<text x="282" y="62" text-anchor="middle" style="fill:var(--err-edge)">✗</text>' +
		'<text x="396" y="62" text-anchor="middle" style="fill:var(--err-edge)">✗</text>' +
		'<text x="34" y="40" text-anchor="middle" class="lbl">crash</text>' +
		// gap labels
		'<text x="55" y="90" text-anchor="middle" class="lbl">10s</text>' +
		'<text x="101" y="90" text-anchor="middle" class="lbl">20s</text>' +
		'<text x="159" y="90" text-anchor="middle" class="lbl">40s</text>' +
		'<text x="237" y="90" text-anchor="middle" class="lbl">80s</text>' +
		'<text x="339" y="90" text-anchor="middle" class="lbl">160s</text>' +
		'<text x="462" y="90" text-anchor="middle" class="lbl">300s (cap)</text>' +
		'<text x="20" y="115" class="lbl">between crashes the pod sits in Waiting: CrashLoopBackOff — a timer, not an error</text>' +
		'<text x="20" y="131" style="fill:var(--ok)" class="lbl">runs clean for 600s → backoff resets, next delay is 10s again</text>' +
		'<defs><marker id="dgArrowCLB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'crashloop-backoff',
		title: 'CrashLoopBackOff Timer',
		nav: 'CrashLoopBackOff',
		difficulty: 'Easy',
		category: 'Workloads',
		task: 'Implement NextDelay and DelayAfter — doubling, cap, and the 10-minute reset. Make all 5 tests pass.',

		prose: [
			'<h2>CrashLoopBackOff Timer</h2>' +
			'<p><code>kubectl get pods</code> shows <code>web-7d4b… 0/1 CrashLoopBackOff 5 (2m ago)</code>. ' +
			'The container keeps exiting, and the kubelet — whose job under ' +
			'<code>restartPolicy: Always</code> is to restart it — refuses to do so <em>immediately</em>. ' +
			'Restarting a broken container in a tight loop would burn CPU, flood the log ' +
			'pipeline, and hammer every dependency the container touches on startup. So the ' +
			'kubelet waits, and the wait doubles:</p>',
			{ code: 'restart #:  1    2    3    4     5     6     7    ...\ndelay:     10s  20s  40s  80s  160s  300s  300s  ...   (capped at 300s)', lang: 'txt' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Two functions, both returning whole seconds:</p>' +
			'<ul>' +
			'<li><code>NextDelay(restartCount)</code> — the delay before restart number ' +
			'<code>restartCount+1</code>: <code>10 × 2^restartCount</code>, capped at 300. Guard the ' +
			'computation so a huge restart count (a pod that has been crashing for weeks) ' +
			'cannot overflow — note that any count ≥ 5 is already past the cap, since ' +
			'10 × 2⁵ = 320 &gt; 300.</li>' +
			'<li><code>DelayAfter(ranSeconds, restartCount)</code> — the delay the kubelet picks after ' +
			'a container ran for <code>ranSeconds</code> and then exited. The kubelet <strong>resets</strong> ' +
			'the backoff once a container has run successfully for 600s (10 minutes): if ' +
			'<code>ranSeconds ≥ 600</code>, return the fresh first delay of 10; otherwise fall through ' +
			'to <code>NextDelay(restartCount)</code>.</li>' +
			'</ul>' +
			'<p><strong>Simplification:</strong> the real kubelet keys this backoff per container and ' +
			'adds a little randomized jitter to the delay; the doubling schedule, the 300s cap, ' +
			'and the 10-minute reset are exactly as documented.</p>',
		],

		starter: [
			'package main',
			'',
			'// NextDelay returns the seconds the kubelet waits before restart',
			'// number restartCount+1: 10 * 2^restartCount, capped at 300.',
			'// Must not overflow for very large restart counts.',
			'func NextDelay(restartCount int) int {',
			'	// your code here',
			'	return -1',
			'}',
			'',
			'// DelayAfter returns the delay chosen after a container ran for',
			'// ranSeconds and exited. A run of 600s or more resets the backoff',
			'// to the fresh first delay (10s); otherwise the doubling schedule',
			'// continues from restartCount.',
			'func DelayAfter(ranSeconds, restartCount int) int {',
			'	// your code here',
			'	return -1',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"reflect"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// Each case runs one or more restart counts through the same',
			'	// function; `after` selects DelayAfter(ran, rc) over NextDelay(rc).',
			'	type tc struct {',
			'		name  string',
			'		after bool',
			'		ran   int',
			'		rcs   []int',
			'		want  []int',
			'	}',
			'	cases := []tc{',
			'		{"doubling: NextDelay for counts 0,1,2", false, 0, []int{0, 1, 2}, []int{10, 20, 40}},',
			'		{"cap reached: NextDelay(5) — 10*2^5=320 exceeds 300", false, 0, []int{5}, []int{300}},',
			'		{"far past cap: NextDelay(50) must not overflow", false, 0, []int{50}, []int{300}},',
			'		{"reset: ran 700s >= 600s, count 6 — fresh 10s delay", true, 700, []int{6}, []int{10}},',
			'		{"no reset: ran only 30s at count 3 — schedule continues", true, 30, []int{3}, []int{80}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := make([]int, 0, len(c.rcs))',
			'			for _, rc := range c.rcs {',
			'				if c.after {',
			'					got = append(got, DelayAfter(c.ran, rc))',
			'				} else {',
			'					got = append(got, NextDelay(rc))',
			'				}',
			'			}',
			'			r["pass"] = reflect.DeepEqual(got, c.want)',
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
			'// NextDelay returns the seconds the kubelet waits before restart',
			'// number restartCount+1: 10 * 2^restartCount, capped at 300.',
			'//',
			'// The early return IS the overflow guard: 10*2^5 = 320 already',
			'// exceeds the cap, so any count >= 5 answers 300 without ever',
			'// computing the power. Shifting only for counts 0..4 keeps the',
			'// arithmetic tiny — a pod that has crashed 10,000 times never',
			'// reaches the shift.',
			'func NextDelay(restartCount int) int {',
			'	if restartCount >= 5 {',
			'		return 300',
			'	}',
			'	return 10 << uint(restartCount) // 10, 20, 40, 80, 160',
			'}',
			'',
			'// DelayAfter returns the delay chosen after a container ran for',
			'// ranSeconds and exited.',
			'//',
			'// The 600s reset is what separates "crashing" from "crashed once":',
			'// a container that held steady for 10 minutes has proven the image',
			'// basically works, so its next failure is treated as a fresh first',
			'// failure rather than a continuation of an old loop.',
			'func DelayAfter(ranSeconds, restartCount int) int {',
			'	if ranSeconds >= 600 {',
			'		return 10 // backoff state wiped; fresh first delay',
			'	}',
			'	return NextDelay(restartCount)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The kubelet as a retrying client</h3>' +
			'<p>This is <strong>exponential backoff with a cap and a reset</strong> — the identical ' +
			'principle behind client retry loops (see the system-design track\'s ' +
			'retry-with-backoff problem), just with the roles flipped: there the <em>caller</em> ' +
			'backs off a failing service; here the <em>supervisor</em> backs off a failing child ' +
			'process. Each element earns its place:</p>' +
			'<ul>' +
			'<li><strong>Doubling</strong> makes the cost of a persistent failure logarithmic — a ' +
			'container that will never start consumes six restart attempts in the first ten ' +
			'minutes, then one every five minutes, forever.</li>' +
			'<li><strong>The 300s cap</strong> bounds recovery latency. Without it, a pod crashing all ' +
			'weekend would back off into hours — and keep users down long after the bad ' +
			'config or missing dependency was fixed. Capped, the worst-case wait for an ' +
			'external fix to take effect is five minutes.</li>' +
			'<li><strong>The 600s reset</strong> distinguishes flaky from broken. A nightly OOM at ' +
			'2am should not inherit the punishment earned during last week\'s bad deploy.</li>' +
			'</ul>',
			{ code: 'if restartCount >= 5 {\n\treturn 300 // past the cap — and the shift below never sees a big count\n}\nreturn 10 << uint(restartCount)' },
			'<p>The guard doubles as the overflow protection: computing <code>2^restartCount</code> ' +
			'first and capping after would overflow int64 around count 60 — exactly the kind ' +
			'of long-lived counter that looks implausible in review and shows up in month-old ' +
			'clusters.</p>' +
			'<h3>On the exam</h3>' +
			'<p><code>CrashLoopBackOff</code> in <code>kubectl get pods</code> is not an error state — it ' +
			'is <code>Waiting</code> with a timer: the container already crashed, and the kubelet is ' +
			'counting down to the next attempt (the <code>RESTARTS</code> column\'s ' +
			'<code>5 (2m ago)</code> tells you the count and the last attempt). Your first move is ' +
			'<code>kubectl logs web --previous</code> — the <em>current</em> container hasn\'t started, so ' +
			'plain <code>logs</code> is often empty; <code>--previous</code> shows why the last instance ' +
			'died. Follow with <code>kubectl describe pod</code> for the exit code and events. And ' +
			'know its cousin: <code>ImagePullBackOff</code> is the same backoff machinery applied to ' +
			'a failing image pull rather than a crashing process.</p>',
		],
		complexity: { time: 'O(1)', space: 'O(1)' },
	});
})();
