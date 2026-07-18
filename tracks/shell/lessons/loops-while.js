/* loops-while — `while` re-runs its condition COMMAND until it exits
 * non-zero: counters via i=$((i+1)), condition-driven loops via [ -e … ]
 * with the body changing the world the condition observes. The forever loop
 * (`while true`) is run in PROSE ONLY — this sandbox's step budget turns it
 * into a red pane by design, and a starter must run clean — so the starter
 * demonstrates the other degenerate case instead: a condition false on
 * entry (i=5, [ $i -lt 5 ]) whose body never runs, which also happens to be
 * the safe home for a missing-increment bug. Checks pin the 0..4 sequence
 * and the 3→96 doubling run as flat substrings, and chain indexOf over the
 * lock-loop passes so order (not mere presence) is graded.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'loops-while',
		title: 'while Loops',
		nav: 'while',
		category: 'Logic & Scripting',

		prose: [
			'<h2>while Loops</h2>' +
			'<p><code>while</code> is <code>if</code> with a spring: it runs its ' +
			'condition <strong>command</strong>, and as long as that command ' +
			'exits 0 it runs the body and comes back to run the condition ' +
			'again. Same rule as <code>if</code> — there is no boolean ' +
			'expression anywhere, only exit codes. Coming from Go it covers ' +
			'<code>for cond { … }</code>, and the counter idiom leans on ' +
			'arithmetic expansion: <code>i=$((i+1))</code> — no ' +
			'<code>i++</code> here.</p>',
			{ lang: 'sh', code: '# The classic forever loop — do NOT paste this one:\nwhile true; do\n  true\ndone\n# Real shells spin until Ctrl-C. This sandbox has no Ctrl-C, so a\n# STEP BUDGET stops the run and paints the pane red instead — a\n# deliberate design: the interpreter is synchronous, so runaway\n# loops are bounded by counting steps, not by a watchdog clock.\n# (POSIX shells have a do-nothing builtin `:` for such bodies;\n# here, use `true` — same exit code, honest name.)' },
			'<p>Because the condition is re-run from scratch each lap, a while ' +
			'loop terminates only if the body (or the world) changes what the ' +
			'condition observes. That gives you two families: ' +
			'<strong>counter-driven</strong> — <code>[ $i -lt 5 ]</code> with ' +
			'<code>i=$((i+1))</code> in the body — and ' +
			'<strong>condition-driven</strong> — <code>[ -e lock.txt ]</code> ' +
			'where the body eventually removes the file. The second family is ' +
			'the honest shape of every "wait for the lock / poll for the file" ' +
			'script you have ever inherited; here the body itself clears the ' +
			'lock after a few passes, so the loop is deterministic.</p>' +
			'<p>Forgetting the increment is the classic bug, and both degenerate ' +
			'cases are worth knowing: if the condition is <em>true</em> and ' +
			'nothing changes, the loop runs forever (red pane here); if the ' +
			'condition is <em>false on entry</em>, the body runs zero times and ' +
			'the loop exits silently — <code>while</code> checks <em>before</em> ' +
			'the first lap. The starter is parked in that second, safe state.</p>' +
			'<h3>Your job</h3>' +
			'<p>Three loops. One: fix the starter so it counts 0 through 4 — ' +
			'start at <code>i=0</code> and add the missing ' +
			'<code>i=$((i+1))</code>. Two: a doubling loop — from ' +
			'<code>n=3</code>, <code>while [ $n -lt 100 ]</code> printing then ' +
			'doubling: 3 6 12 24 48 96. Three: <code>touch lock.txt</code>, then ' +
			'<code>while [ -e lock.txt ]</code> printing <code>pass N</code> and ' +
			'removing the lock on pass 3; close with the released line.</p>' +
			'<div class="tip">Order of operations inside the body matters and is ' +
			'part of the answer: print <em>then</em> step. Doubling before ' +
			'printing would emit 6…192 and lose the 3; incrementing before ' +
			'printing would count 1..5. When a loop is off by one, look at the ' +
			'body\'s line order before touching the condition.</div>',
		],

		task: 'Fix the counter loop (0..4), write the doubling loop (3..96), then drain a lock file with a condition-driven loop.',

		starter: [
			'# A counter loop with its increment missing — parked SAFELY:',
			'# 5 -lt 5 is false on entry, so the body never runs and the loop',
			'# exits silently. (Were i=0 with no increment, the condition would',
			'# stay true forever and the step budget would paint the pane red.)',
			'i=5',
			'while [ $i -lt 5 ]; do',
			'  echo $i',
			'done',
			'',
			'# TODO 1: start at i=0 and add  i=$((i+1))  after the echo,',
			'#         so it prints 0 1 2 3 4 and terminates.',
			'# TODO 2: doubling loop — n=3; while [ $n -lt 100 ]: echo $n,',
			'#         then n=$((n*2)).  Expected: 3 6 12 24 48 96.',
			'# TODO 3: touch lock.txt; p=0; while [ -e lock.txt ]: bump p,',
			'#         echo "pass $p", and rm lock.txt once p reaches 3.',
			'#         After the loop: echo "lock released after $p passes".',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var iCount = flat.indexOf('0 1 2 3 4');
			var iDouble = flat.indexOf('3 6 12 24 48 96');
			var iP1 = flat.indexOf('pass 1');
			var iP2 = iP1 === -1 ? -1 : flat.indexOf('pass 2', iP1 + 1);
			var iP3 = iP2 === -1 ? -1 : flat.indexOf('pass 3', iP2 + 1);
			return iCount !== -1 && iDouble !== -1 && iCount < iDouble &&
				iP1 !== -1 && iP2 !== -1 && iP3 !== -1 && iDouble < iP1 &&
				flat.indexOf('lock released after 3 passes') !== -1;
		},

		solution: [
			'# Counter-driven: the body changes what the condition measures.',
			'# Print THEN increment — swap the lines and you count 1..5.',
			'i=0',
			'while [ $i -lt 5 ]; do',
			'  echo $i',
			'  i=$((i+1))',
			'done',
			'',
			'# Any arithmetic step works — the loop only cares that the',
			'# condition eventually exits non-zero. 3 doubles past 100 in 6 laps.',
			'n=3',
			'while [ $n -lt 100 ]; do',
			'  echo $n',
			'  n=$((n*2))',
			'done',
			'',
			'# Condition-driven: the condition watches the FILESYSTEM, and the',
			'# body clears the flag it is watching — a deterministic stand-in',
			'# for every "wait until the lock is gone" script.',
			'touch lock.txt',
			'p=0',
			'while [ -e lock.txt ]; do',
			'  p=$((p+1))',
			'  echo "pass $p"',
			'  if [ $p -ge 3 ]; then',
			'    rm lock.txt        # the condition sees this next lap',
			'  fi',
			'done',
			'echo "lock released after $p passes"',
			'',
		].join('\n'),

		explanation: [
			'<p>The counter loop is the canonical fix: <code>i=0</code> so the ' +
			'condition holds on entry, <code>i=$((i+1))</code> so it eventually ' +
			'stops holding. Five laps print 0 through 4 — the check pins the ' +
			'whole run <code>0 1 2 3 4</code> as one sequence, so a loop that ' +
			'miscounts or misorders cannot pass.</p>',
			'<p>The doubling loop makes the point that <code>while</code> has no ' +
			'idea it is "counting" — it re-runs <code>[ $n -lt 100 ]</code> and ' +
			'looks at the exit code, nothing more. Any body that moves ' +
			'<code>n</code> toward the boundary terminates; ' +
			'<code>n=$((n*2))</code> gets there in six laps: 3 6 12 24 48 96, ' +
			'with 96 printed <em>before</em> the doubling that ends the loop at ' +
			'192.</p>',
			'<p>The lock loop is the condition-driven family: ' +
			'<code>[ -e lock.txt ]</code> consults the filesystem every lap, and ' +
			'the body removes the file on pass 3 — so lap 4\'s condition check ' +
			'exits 1 and falls through to the released line. Note ' +
			'<code>$p</code> survives the loop: <code>while</code> bodies run in ' +
			'the current shell, so <code>lock released after 3 passes</code> can ' +
			'report the count. In a real shell the "body" clearing the lock ' +
			'would be another process entirely — the loop\'s shape is identical, ' +
			'which is exactly why it is taught this way.</p>',
		],
	});
})();
