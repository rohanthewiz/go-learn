/* RTO & RPO — Resilient Architectures (lesson). The two numbers every DR
 * question turns on: RPO = how much data you can lose, RTO = how long you
 * can be down. Lesson-style: the learner computes worst-case RPO/RTO for
 * two DR strategies from the same constants; check() matches the printed
 * lines.
 */
(function () {
	'use strict';
	var T = GoLearnAWS;

	// Timeline: disaster strikes just before the next snapshot — that is
	// the worst case the RPO must cover; RTO runs forward from the event.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 150" width="540" height="150" role="img" aria-label="RPO looks backward from the disaster to the last recovery point; RTO looks forward to restored service">' +
		// main timeline
		'<line x1="20" y1="75" x2="520" y2="75" stroke="var(--edge)" stroke-width="1.5"/>' +
		// last snapshot tick
		'<line x1="80" y1="60" x2="80" y2="90" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="80" y="50" text-anchor="middle" class="lbl">last snapshot</text>' +
		// disaster tick
		'<line x1="280" y1="55" x2="280" y2="95" stroke="var(--err-edge)" stroke-width="2.5"/>' +
		'<text x="280" y="44" text-anchor="middle" style="fill:var(--err-edge)">disaster</text>' +
		// service restored tick
		'<line x1="450" y1="60" x2="450" y2="90" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="450" y="50" text-anchor="middle" class="lbl">serving again</text>' +
		// RPO span (backward-looking)
		'<path d="M 84 112 L 276 112" fill="none" stroke="var(--accent)" stroke-width="1.5"/>' +
		'<line x1="84" y1="106" x2="84" y2="118" stroke="var(--accent)" stroke-width="1.5"/>' +
		'<line x1="276" y1="106" x2="276" y2="118" stroke="var(--accent)" stroke-width="1.5"/>' +
		'<text x="180" y="132" text-anchor="middle" style="fill:var(--accent)">RPO — data lost</text>' +
		// RTO span (forward-looking)
		'<path d="M 284 112 L 446 112" fill="none" stroke="var(--dim)" stroke-width="1.5"/>' +
		'<line x1="284" y1="106" x2="284" y2="118" stroke="var(--dim)" stroke-width="1.5"/>' +
		'<line x1="446" y1="106" x2="446" y2="118" stroke="var(--dim)" stroke-width="1.5"/>' +
		'<text x="365" y="132" text-anchor="middle" class="lbl">RTO — time down</text>' +
		'</svg>';

	T.lesson({
		id: 'rto-rpo',
		title: 'RTO & RPO — disaster recovery math',
		nav: 'RTO & RPO',
		category: 'Resilient Architectures',
		prose: [
			'<h2>RTO &amp; RPO</h2>' +
			'<p>You are designing disaster recovery for a company whose primary ' +
			'region can be lost. The business hands you two tolerances, and every DR ' +
			'strategy on the exam is a trade of cost against them:</p>' +
			'<ul>' +
			'<li><strong>RPO (Recovery Point Objective)</strong> — how much <em>data</em> ' +
			'you may lose, measured backward from the disaster to the last usable ' +
			'copy. Worst case = the interval between backups (the disaster strikes ' +
			'the instant <em>before</em> the next one).</li>' +
			'<li><strong>RTO (Recovery Time Objective)</strong> — how long until the ' +
			'system is <em>serving again</em>, measured forward from the disaster.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>The DR strategy ladder</h3>' +
			'<p>AWS names four strategies, in strict order of rising cost and ' +
			'shrinking RTO/RPO — <em>the ordering itself is a guaranteed exam ' +
			'question</em>:</p>',
			{ code: 'strategy            RPO          RTO          standing cost\n1 backup & restore  hours        hours        cheapest (storage only)\n2 pilot light       minutes      tens of min  data live, compute off\n3 warm standby      seconds      minutes      scaled-down full stack\n4 multi-site A/A    ~zero        ~zero        2x everything, always on', lang: 'txt' },
			'<p>Reading the ladder: <em>backup &amp; restore</em> keeps only snapshots ' +
			'in another region; <em>pilot light</em> keeps the data layer replicating ' +
			'but compute stopped; <em>warm standby</em> runs a scaled-down but fully ' +
			'functional copy; <em>multi-site active/active</em> serves live traffic ' +
			'from both regions. Each rung roughly 10×es the standing cost to cut ' +
			'RTO/RPO by an order of magnitude — so the right answer is the ' +
			'<strong>cheapest rung that still meets the stated RTO/RPO</strong>, ' +
			'never the fanciest one.</p>' +
			'<p>Below, compute the worst case for rungs 1 and 3 from the same ' +
			'constants (teaching constants, passed in by the exercise — real ' +
			'snapshot cadences and lag vary).</p>' +
			'<h3>Exam takeaway</h3>' +
			'<p>RPO is set by how often data leaves the primary (backup interval or ' +
			'replication lag); RTO is set by how much infrastructure is already ' +
			'running at the recovery site. Given target numbers, pick the cheapest ' +
			'ladder rung that meets them: hours → backup &amp; restore, tens of ' +
			'minutes → pilot light, minutes/seconds → warm standby, near-zero → ' +
			'multi-site active/active.</p>',
		],
		task: 'Compute worst-case RPO and RTO for backup-and-restore and for warm standby.',
		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	// One database, two candidate DR strategies (teaching constants).',
			'	const snapshotEveryH = 4 // backup & restore: snapshot interval, hours',
			'	const restoreMin = 90    // backup & restore: provision + restore time',
			'	const replicaLagSec = 5  // warm standby: async replication lag',
			'	const failoverMin = 2    // warm standby: promote replica + flip DNS',
			'',
			'	// (a) Backup & restore. Worst case: the region dies the instant',
			'	// BEFORE the next snapshot — everything since the last one is gone.',
			'	backupRPOMin := 0 // TODO: worst-case data loss, in minutes',
			'	backupRTOMin := 0 // TODO: time until serving again, in minutes',
			'',
			'	// (b) Warm standby, async replication. The replica trails the',
			'	// primary by the replication lag; failover is promote + repoint.',
			'	standbyRPOSec := 0 // TODO: worst-case data loss, in seconds',
			'	standbyRTOMin := 0 // TODO: time until serving again, in minutes',
			'',
			'	fmt.Println("backup-restore RPO:", backupRPOMin, "min")',
			'	fmt.Println("backup-restore RTO:", backupRTOMin, "min")',
			'	fmt.Println("warm-standby RPO:", standbyRPOSec, "sec")',
			'	fmt.Println("warm-standby RTO:", standbyRTOMin, "min")',
			'}',
			'',
		].join('\n'),
		check: function (stdout, flat) {
			return flat.indexOf('backup-restore RPO: 240 min') !== -1 &&
				flat.indexOf('backup-restore RTO: 90 min') !== -1 &&
				flat.indexOf('warm-standby RPO: 5 sec') !== -1 &&
				flat.indexOf('warm-standby RTO: 2 min') !== -1;
		},
		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	// One database, two candidate DR strategies (teaching constants).',
			'	const snapshotEveryH = 4 // backup & restore: snapshot interval, hours',
			'	const restoreMin = 90    // backup & restore: provision + restore time',
			'	const replicaLagSec = 5  // warm standby: async replication lag',
			'	const failoverMin = 2    // warm standby: promote replica + flip DNS',
			'',
			'	// (a) Backup & restore. RPO is the FULL snapshot interval: worst',
			'	// case the disaster lands one tick before the next snapshot, so',
			'	// 4 h × 60 = 240 min of writes never left the region. RTO is the',
			'	// restore path itself — nothing is pre-provisioned.',
			'	backupRPOMin := snapshotEveryH * 60',
			'	backupRTOMin := restoreMin',
			'',
			'	// (b) Warm standby. Continuous async replication shrinks RPO from',
			'	// the backup INTERVAL down to the replication LAG — the only',
			'	// writes at risk are those still in flight. RTO collapses too,',
			'	// because the standby stack is already running: just promote it.',
			'	standbyRPOSec := replicaLagSec',
			'	standbyRTOMin := failoverMin',
			'',
			'	fmt.Println("backup-restore RPO:", backupRPOMin, "min")',
			'	fmt.Println("backup-restore RTO:", backupRTOMin, "min")',
			'	fmt.Println("warm-standby RPO:", standbyRPOSec, "sec")',
			'	fmt.Println("warm-standby RTO:", standbyRTOMin, "min")',
			'}',
			'',
		].join('\n'),
	});
})();
