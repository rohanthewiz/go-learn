/* networking — how packets actually move: IP, UDP, and TCP as runnable Go.
 *
 * Networking is usually taught as a stack diagram to memorize; what sticks
 * is implementing the decision procedures the stack runs. Every item here
 * takes one mechanism — the subnet mask, longest-prefix routing, the
 * Internet checksum, fragmentation offsets, socket demultiplexing, the TCP
 * state machine, sliding windows, fast retransmit, AIMD congestion control,
 * iterative DNS — and has the learner implement it against a test harness
 * or a printed-trace check. The extra weight is deliberately on TCP/UDP/IP:
 * the three protocols every backend engineer debugs eventually (why is this
 * pod unreachable? why is throughput collapsing? why is TIME_WAIT eating my
 * ports?). Zero engine changes, same kind:'lesson'/'problem' machinery.
 *
 * Everything is pure functions over declared inputs (addresses, segments,
 * events): no raw sockets — the runner is a wasm sandbox, and the *logic*
 * is the transferable knowledge anyway.
 *
 * Items live in problems/<slug>.js and register through GoLearnNet.
 * HARNESS_RT is duplicated from the other tracks on purpose: tracks are
 * independent plugins, and sharing runtime snippets across tracks would
 * couple their load order.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'networking',
		title: 'Networking: TCP/UDP & IP',
		runner: 'go-wasm',
		order: [
			// IP: addressing and delivery
			'ipv4-addressing', 'cidr-subnetting', 'longest-prefix-match',
			'internet-checksum', 'ip-fragmentation', 'ttl-traceroute',
			// UDP: datagrams and ports
			'udp-header', 'port-demux', 'udp-reorder',
			// TCP: the reliable byte stream
			'tcp-handshake', 'tcp-state-machine', 'sliding-window',
			'retransmission', 'congestion-control', 'tcp-teardown',
			// Application: names to addresses
			'dns-resolution',
		],
	});

	// Every harness splices this in, so every harness import block includes
	// fmt and encoding/json. runCase isolates one test: a panicking user
	// implementation records a failure for that case but the harness still
	// reports every result (the sentinel must always print).
	var HARNESS_RT = [
		'// runCase executes one test body, converting a panic into a failed case.',
		'func runCase(r map[string]any, body func()) {',
		'	defer func() {',
		'		if p := recover(); p != nil {',
		'			r["pass"] = false',
		'			r["got"] = fmt.Sprintf("panic: %v", p)',
		'		}',
		'	}()',
		'	body()',
		'}',
		'',
		'// emitResults prints the sentinel-delimited JSON block the UI parses.',
		'// Printed last, so user output can never spoof it (the parser splits',
		'// on the LAST marker).',
		'func emitResults(results []map[string]any) {',
		'	buf, _ := json.Marshal(results)',
		'	fmt.Println("\\n__GOLEARN_RESULTS__")',
		'	fmt.Println(string(buf))',
		'	fmt.Println("__GOLEARN_END__")',
		'}',
	].join('\n');

	// globalThis (not window) so the Node verification harness can load
	// track files unchanged.
	globalThis.GoLearnNet = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('networking', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('networking', def);
		},
	};
})();
