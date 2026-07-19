/* Actors: Isolation & Reentrancy — Concurrency & the Main Thread (Hard).
 * Two halves of the actor contract. Compile time: the isolation checker is
 * an ordered decision table — who may touch an actor's state, sync or via
 * await, with the real diagnostics ("Actor-isolated property 'balance' can
 * not be referenced from a nonisolated context", "Expression is 'async'
 * but is not marked with 'await'"). Run time: actors are REENTRANT — every
 * await inside an actor method is a door through which other messages
 * interleave, and the harness pins the classic guard-then-await bug where
 * a balance checked before the suspension is stale after it.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// The reentrancy timeline: buy() suspends at its await, withdraw() runs
	// in the gap, and buy resumes against a balance its guard never saw.
	// Marker id namespaced (dgArrowIOSAIm) because every track's SVGs
	// share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="an actor method suspends at an await; another queued message runs during the suspension and mutates state; the first method resumes with a stale guard">' +
		'<text x="20" y="24" class="lbl">actor reentrancy: every await is a door — the mutex picture is WRONG</text>' +
		// timeline lane for the actor
		'<path d="M 40 150 L 530 150" stroke="var(--muted)" stroke-width="1"/>' +
		'<rect x="40" y="60" width="150" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="115" y="78" text-anchor="middle">buy: guard ok</text>' +
		'<text x="115" y="92" text-anchor="middle" class="lbl">balance 100 ≥ 80</text>' +
		'<rect x="220" y="60" width="140" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="290" y="78" text-anchor="middle">withdraw: −50</text>' +
		'<text x="290" y="92" text-anchor="middle" class="lbl">runs DURING buy\'s await</text>' +
		'<rect x="390" y="60" width="140" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="460" y="78" text-anchor="middle">buy resumes: −80</text>' +
		'<text x="460" y="92" text-anchor="middle" class="lbl">balance = −30 (!)</text>' +
		'<path d="M 190 78 C 200 78 208 78 216 78" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="4 4" marker-end="url(#dgArrowIOSAIm)"/>' +
		'<path d="M 360 78 C 370 78 378 78 386 78" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="4 4" marker-end="url(#dgArrowIOSAIm)"/>' +
		'<path d="M 115 96 L 115 146" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="115" y="168" text-anchor="middle" class="lbl" style="fill:var(--accent)">await payments.confirm()</text>' +
		'<text x="115" y="184" text-anchor="middle" class="lbl" style="fill:var(--accent)">suspension: actor freed</text>' +
		'<path d="M 460 96 L 460 146" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="460" y="168" text-anchor="middle" class="lbl" style="fill:var(--warn)">the guard\'s fact is STALE</text>' +
		'<text x="20" y="210" class="lbl">state is protected BETWEEN suspension points, never ACROSS them — re-check every invariant after every await</text>' +
		'<defs>' +
		'<marker id="dgArrowIOSAIm" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'actors-isolation',
		title: 'Actors: Isolation & Reentrancy',
		nav: 'actors isolation',
		difficulty: 'Hard',
		category: 'Concurrency & the Main Thread',
		task: 'Implement the actor isolation checker as an ordered decision table (real diagnostics, first match wins) and the reentrant mailbox: methods suspend at await, parked continuations resume FIFO behind queued messages.',

		prose: [
			'<h2>Actors: Isolation &amp; Reentrancy</h2>' +
			'<p>You migrate a race-prone class to an <code>actor</code> and the ' +
			'compiler immediately starts arguing with code that used to build:</p>',
			{ lang: 'swift', code: 'actor BankAccount {\n    let id = "ACC-42"                // let: implicitly nonisolated\n    var balance = 100                // isolated state\n    func deposit(_ n: Int) { balance += n }          // isolated method\n    nonisolated func label() -> String { "acct \\(id)" }\n}\n\nfunc report(_ account: BankAccount) {\n    print(account.balance)\n    // error: Actor-isolated property \'balance\' can not be referenced\n    // from a nonisolated context\n}\n\nfunc refresh(_ account: BankAccount) async {\n    let b = account.balance\n    // error: Expression is \'async\' but is not marked with \'await\'\n    let ok = await account.balance   // the hop, made visible\n}' },
			'<p>Each diagnostic is one row of a decision table the type checker ' +
			'walks for every member access. In order, first match wins:</p>' +
			'<ul>' +
			'<li><strong><code>let</code> constants are freely readable.</strong> ' +
			'Immutable means race-free; no isolation needed, from anywhere, ' +
			'synchronously.</li>' +
			'<li><strong><code>nonisolated</code> members opted out.</strong> They ' +
			'cannot touch isolated state, so they run anywhere, synchronously.</li>' +
			'<li><strong>Same isolation domain → synchronous.</strong> Code already ' +
			'isolated to the actor (or to <code>@MainActor</code>, for main-actor ' +
			'members) touches its own state directly — even mutation.</li>' +
			'<li><strong>Cross-actor mutation is forbidden outright.</strong> ' +
			'<code>account.balance = 0</code> from outside errors <em>even with</em> ' +
			'<code>await</code> — writes go through isolated methods.</li>' +
			'<li><strong>Everything else needs <code>await</code>.</strong> With it, ' +
			'the access hops domains legally; without it, properties get the ' +
			'isolation diagnostic and calls get the missing-<code>await</code> ' +
			'one.</li>' +
			'</ul>' +
			'<h3>The runtime half: reentrancy</h3>' +
			'<p>The compile-time rules make people picture a mutex. Wrong picture — ' +
			'and the difference ships bugs. An actor processes one message at a ' +
			'time, but a method that <code>await</code>s <em>suspends and frees the ' +
			'actor</em>; queued messages run in the gap, and the suspended method ' +
			'resumes later against whatever state they left behind:</p>',
			{ lang: 'swift', code: 'actor Store {\n    var balance = 100\n    func buy(price: Int) async throws {\n        guard balance >= price else { throw StoreError.insufficient }\n        try await payments.confirm(price)   // SUSPENSION: actor freed\n        balance -= price   // the guard\'s fact may be stale by now\n    }\n    func withdraw(_ n: Int) { if balance >= n { balance -= n } }\n}\n// buy(price: 80) and withdraw(50) queued together:\n// buy checks 100 >= 80, suspends… withdraw runs: balance 50…\n// buy resumes: balance = 50 - 80 = -30    ← invariant destroyed' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Two functions. <code>CheckAccess(ctx, m, hasAwait)</code> walks the ' +
			'table above over the <code>Member</code> record — contexts are ' +
			'<code>"nonisolated"</code>, <code>"MainActor"</code>, or an actor name ' +
			'like <code>"BankAccount"</code>; return <code>"ok-sync"</code>, ' +
			'<code>"ok-await"</code>, or <code>"error: …"</code> with the pinned ' +
			'diagnostic. <code>RunActor(balance, calls)</code> is the reentrant ' +
			'mailbox: run each queued call\'s steps in order; at ' +
			'<code>"await"</code> park the continuation at the <em>tail</em> of the ' +
			'queue and pick up the next message; a failed <code>guard</code> ends ' +
			'the call. Trace every step.</p>' +
			'<div class="tip">Disclosed simplifications: real resume order after a ' +
			'suspension is unspecified (jobs are prioritized, not FIFO) — the ' +
			'tail-of-queue rule is this model\'s determinism; and the diagnostic ' +
			'wording shifts slightly across Swift versions (5.5\'s ' +
			'<code>can not</code> became <code>cannot</code>, and newer compilers ' +
			'name the target domain too). The table\'s <em>structure</em> is ' +
			'stable.</div>',
		],

		starter: [
			'package main',
			'',
			'import (',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// Member is what the type checker knows about the accessed member.',
			'type Member struct {',
			'	Name   string // used verbatim in diagnostics ("balance")',
			'	Domain string // isolation domain: "BankAccount" | "MainActor"',
			'	Kind   string // "property" | "propertySet" | "method" | "let" | "nonisolatedFunc"',
			'}',
			'',
			'// ctxDesc renders a caller context the way the compiler names it in',
			'// diagnostics. (Provided — the strings are pinned.)',
			'func ctxDesc(ctx string) string {',
			'	if ctx == "nonisolated" {',
			'		return "a nonisolated context"',
			'	}',
			'	if ctx == "MainActor" {',
			'		return "the main actor"',
			'	}',
			'	return "actor \'" + ctx + "\'"',
			'}',
			'',
			'// CheckAccess is the isolation checker: ordered rules, first match',
			'// wins. ctx is the CALLER\'s isolation ("nonisolated", "MainActor",',
			'// or an actor name); hasAwait says whether the access is awaited.',
			'//',
			'//  1. Kind "let"             -> "ok-sync"  (immutable = race-free)',
			'//  2. Kind "nonisolatedFunc" -> "ok-sync"  (opted out of isolation)',
			'//  3. ctx == m.Domain        -> "ok-sync"  (same domain, even writes)',
			'//  4. Kind "propertySet"     -> "error: Actor-isolated property',
			'//     \'<Name>\' can not be mutated from <ctxDesc>" — await or not',
			'//  5. hasAwait               -> "ok-await" (the legal cross-domain hop)',
			'//  6. Kind "property"        -> "error: Actor-isolated property',
			'//     \'<Name>\' can not be referenced from <ctxDesc>"',
			'//  7. otherwise (a call)     -> "error: Expression is \'async\' but is',
			'//     not marked with \'await\'"',
			'func CheckAccess(ctx string, m Member, hasAwait bool) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// Call is one message queued on the actor: a name and a step list.',
			'// Steps:',
			'//   "guard:N" -> if balance >= N trace "<name>: <bal>>=<N> ok",',
			'//                else trace "<name>: <bal><<N> insufficient" and END',
			'//                the call (guard else { throw })',
			'//   "sub:N"   -> balance -= N; trace "<name>: -<N> =<bal>"',
			'//   "add:N"   -> balance += N; trace "<name>: +<N> =<bal>"',
			'//   "await"   -> trace "<name>: await"; SUSPEND: park the rest of',
			'//                this call at the TAIL of the queue, run the next',
			'//                queued message',
			'type Call struct {',
			'	Name  string',
			'	Steps []string',
			'}',
			'',
			'// stepNum extracts the integer from a "kind:N" step. (Provided.)',
			'func stepNum(step, prefix string) int {',
			'	n, _ := strconv.Atoi(strings.TrimPrefix(step, prefix))',
			'	return n',
			'}',
			'',
			'// RunActor is the reentrant mailbox: process the queue until empty,',
			'// returning (trace, final balance). One message runs at a time —',
			'// but every "await" frees the actor for whatever is queued next,',
			'// and the parked continuation waits its turn like any message.',
			'func RunActor(balance int, calls []Call) ([]string, int) {',
			'	// your code here — a continuation is (name, steps, resume index)',
			'	return nil, 0',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// The cast: one actor, one MainActor function — enough to exercise',
			'	// every row of the table.',
			'	balanceProp := Member{Name: "balance", Domain: "BankAccount", Kind: "property"}',
			'	balanceSet := Member{Name: "balance", Domain: "BankAccount", Kind: "propertySet"}',
			'	deposit := Member{Name: "deposit", Domain: "BankAccount", Kind: "method"}',
			'	acctID := Member{Name: "id", Domain: "BankAccount", Kind: "let"}',
			'	label := Member{Name: "label", Domain: "BankAccount", Kind: "nonisolatedFunc"}',
			'	updateUI := Member{Name: "updateUI", Domain: "MainActor", Kind: "method"}',
			'',
			'	actorRun := func(bal int, calls []Call) string {',
			'		tr, b := RunActor(bal, calls)',
			'		return strings.Join(tr, " | ") + fmt.Sprintf(" || bal=%d", b)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"inside the actor, its own state is just state: an isolated method reads balance synchronously",',
			'			"ok-sync",',
			'			func() string { return CheckAccess("BankAccount", balanceProp, false) }},',
			'		{"a plain (nonisolated) function reads balance: the day-one actor migration error, verbatim",',
			'			"error: Actor-isolated property \'balance\' can not be referenced from a nonisolated context",',
			'			func() string { return CheckAccess("nonisolated", balanceProp, false) }},',
			'		{"the same read from @MainActor code: same rule, but the diagnostic names the caller\'s domain — and await fixes it",',
			'			"error: Actor-isolated property \'balance\' can not be referenced from the main actor -> with await: ok-await",',
			'			func() string {',
			'				return CheckAccess("MainActor", balanceProp, false) + " -> with await: " + CheckAccess("MainActor", balanceProp, true)',
			'			}},',
			'		{"await deposit() from a nonisolated async context: the legal cross-domain hop",',
			'			"ok-await",',
			'			func() string { return CheckAccess("nonisolated", deposit, true) }},',
			'		{"deposit() without await in an async context: the hop exists but must be VISIBLE",',
			'			"error: Expression is \'async\' but is not marked with \'await\'",',
			'			func() string { return CheckAccess("nonisolated", deposit, false) }},',
			'		{"cross-actor MUTATION: await does not help — writes go through isolated methods, full stop",',
			'			"error: Actor-isolated property \'balance\' can not be mutated from a nonisolated context",',
			'			func() string { return CheckAccess("nonisolated", balanceSet, true) }},',
			'		{"the two opt-outs: a let constant and a nonisolated func are callable synchronously from anywhere",',
			'			"ok-sync / ok-sync",',
			'			func() string {',
			'				return CheckAccess("nonisolated", acctID, false) + " / " + CheckAccess("MainActor", label, false)',
			'			}},',
			'		{"isolation cuts both ways: actor code calling a @MainActor function needs an await too",',
			'			"error: Expression is \'async\' but is not marked with \'await\'",',
			'			func() string { return CheckAccess("BankAccount", updateUI, false) }},',
			'		{"no awaits, no reentrancy: messages run strictly one after another — withdraw sees buy\'s deduction and fails its guard",',
			'			"buy: 100>=80 ok | buy: -80 =20 | withdraw: 20<50 insufficient || bal=20",',
			'			func() string {',
			'				return actorRun(100, []Call{',
			'					{Name: "buy", Steps: []string{"guard:80", "sub:80"}},',
			'					{Name: "withdraw", Steps: []string{"guard:50", "sub:50"}},',
			'				})',
			'			}},',
			'		{"THE reentrancy bug: buy\'s guard passes, buy suspends, withdraw runs in the gap — buy resumes into a negative balance",',
			'			"buy: 100>=80 ok | buy: await | withdraw: 100>=50 ok | withdraw: -50 =50 | buy: -80 =-30 || bal=-30",',
			'			func() string {',
			'				return actorRun(100, []Call{',
			'					{Name: "buy", Steps: []string{"guard:80", "await", "sub:80"}},',
			'					{Name: "withdraw", Steps: []string{"guard:50", "sub:50"}},',
			'				})',
			'			}},',
			'		{"parked continuations resume FIFO, after everything already queued: a and b suspend, c runs, then a, then b",',
			'			"a: await | b: await | c: +10 =110 | a: +1 =111 | b: +2 =113 || bal=113",',
			'			func() string {',
			'				return actorRun(100, []Call{',
			'					{Name: "a", Steps: []string{"await", "add:1"}},',
			'					{Name: "b", Steps: []string{"await", "add:2"}},',
			'					{Name: "c", Steps: []string{"add:10"}},',
			'				})',
			'			}},',
			'		{"the fix, pinned: re-check the invariant AFTER the await — the guard re-runs against reality and buy aborts cleanly",',
			'			"buy: 100>=80 ok | buy: await | withdraw: 100>=50 ok | withdraw: -50 =50 | buy: 50<80 insufficient || bal=50",',
			'			func() string {',
			'				return actorRun(100, []Call{',
			'					{Name: "buy", Steps: []string{"guard:80", "await", "guard:80", "sub:80"}},',
			'					{Name: "withdraw", Steps: []string{"guard:50", "sub:50"}},',
			'				})',
			'			}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			got := c.got()',
			'			r["pass"] = got == c.want',
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
			'import (',
			'	"fmt"',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// Member is what the type checker knows about the accessed member.',
			'type Member struct {',
			'	Name   string // used verbatim in diagnostics ("balance")',
			'	Domain string // isolation domain: "BankAccount" | "MainActor"',
			'	Kind   string // "property" | "propertySet" | "method" | "let" | "nonisolatedFunc"',
			'}',
			'',
			'// ctxDesc renders a caller context the way the compiler names it in',
			'// diagnostics.',
			'func ctxDesc(ctx string) string {',
			'	if ctx == "nonisolated" {',
			'		return "a nonisolated context"',
			'	}',
			'	if ctx == "MainActor" {',
			'		return "the main actor"',
			'	}',
			'	return "actor \'" + ctx + "\'"',
			'}',
			'',
			'// CheckAccess walks the ordered table. Each early rule is a REASON',
			'// isolation is unnecessary (immutable, opted out, already inside);',
			'// each later rule is a way the access fails. The order encodes the',
			'// compiler\'s logic: it never asks "is await present?" until it has',
			'// established that a hop is required at all — which is why a',
			'// same-domain access with a stray await is still just ok-sync, and',
			'// why cross-actor mutation errors BEFORE the await check (rule 4',
			'// ahead of rule 5: no amount of awaiting legalizes a remote write).',
			'// A cascade of ifs, not a switch, and no named returns — yaegi (the',
			'// interpreter running this) leaks named results across calls when a',
			'// return sits inside a switch.',
			'func CheckAccess(ctx string, m Member, hasAwait bool) string {',
			'	if m.Kind == "let" {',
			'		// Immutable data cannot race: Swift makes actor let',
			'		// constants implicitly nonisolated (within the module).',
			'		return "ok-sync"',
			'	}',
			'	if m.Kind == "nonisolatedFunc" {',
			'		// nonisolated members trade access to isolated state for',
			'		// callability from anywhere — the actor\'s "static shell".',
			'		return "ok-sync"',
			'	}',
			'	if ctx == m.Domain {',
			'		// Same isolation domain: the serial executor already',
			'		// guarantees exclusivity, so access — including writes —',
			'		// is plain synchronous code.',
			'		return "ok-sync"',
			'	}',
			'	if m.Kind == "propertySet" {',
			'		// Cross-actor mutation is banned outright: allowing',
			'		// "await x.prop = v" would split read-modify-write races',
			'		// across the hop. Writes go through isolated methods.',
			'		return "error: Actor-isolated property \'" + m.Name + "\' can not be mutated from " + ctxDesc(ctx)',
			'	}',
			'	if hasAwait {',
			'		// The legal hop: suspend, enqueue on the target executor,',
			'		// resume with the answer. The await is the visible price.',
			'		return "ok-await"',
			'	}',
			'	if m.Kind == "property" {',
			'		return "error: Actor-isolated property \'" + m.Name + "\' can not be referenced from " + ctxDesc(ctx)',
			'	}',
			'	// A call that needs a hop but is not awaited.',
			'	return "error: Expression is \'async\' but is not marked with \'await\'"',
			'}',
			'',
			'// Call is one message queued on the actor (see the starter for the',
			'// step language).',
			'type Call struct {',
			'	Name  string',
			'	Steps []string',
			'}',
			'',
			'// stepNum extracts the integer from a "kind:N" step.',
			'func stepNum(step, prefix string) int {',
			'	n, _ := strconv.Atoi(strings.TrimPrefix(step, prefix))',
			'	return n',
			'}',
			'',
			'// cont is a parked continuation: which call, and where to resume.',
			'// This is the honest shape of what the Swift runtime parks at a',
			'// suspension point — a program counter, not a blocked thread.',
			'type cont struct {',
			'	name  string',
			'	steps []string',
			'	pc    int',
			'}',
			'',
			'// RunActor drains the mailbox. The one structural decision that',
			'// creates reentrancy: "await" does NOT run the awaited thing inline',
			'// and continue — it re-enqueues the remainder at the TAIL and lets',
			'// the head of the queue run. Everything the harness pins (the stale',
			'// guard, FIFO resume) falls out of that single choice.',
			'func RunActor(balance int, calls []Call) ([]string, int) {',
			'	queue := []cont{}',
			'	for _, c := range calls {',
			'		queue = append(queue, cont{name: c.Name, steps: c.Steps})',
			'	}',
			'	trace := []string{}',
			'	for len(queue) > 0 {',
			'		cur := queue[0]',
			'		queue = queue[1:]',
			'		i := cur.pc',
			'		for i < len(cur.steps) {',
			'			step := cur.steps[i]',
			'			if step == "await" {',
			'				// Suspension: the actor is freed. The continuation',
			'				// waits its turn like any other message — when it',
			'				// resumes, NOTHING it observed before the await is',
			'				// guaranteed to still hold.',
			'				trace = append(trace, cur.name+": await")',
			'				queue = append(queue, cont{name: cur.name, steps: cur.steps, pc: i + 1})',
			'				break',
			'			} else if strings.HasPrefix(step, "guard:") {',
			'				n := stepNum(step, "guard:")',
			'				if balance < n {',
			'					// guard else { throw }: the call ends here. In',
			'					// the re-check pattern this is the FIX firing —',
			'					// failing loudly beats corrupting state quietly.',
			'					trace = append(trace, fmt.Sprintf("%s: %d<%d insufficient", cur.name, balance, n))',
			'					break',
			'				}',
			'				trace = append(trace, fmt.Sprintf("%s: %d>=%d ok", cur.name, balance, n))',
			'			} else if strings.HasPrefix(step, "sub:") {',
			'				n := stepNum(step, "sub:")',
			'				balance -= n',
			'				trace = append(trace, fmt.Sprintf("%s: -%d =%d", cur.name, n, balance))',
			'			} else if strings.HasPrefix(step, "add:") {',
			'				n := stepNum(step, "add:")',
			'				balance += n',
			'				trace = append(trace, fmt.Sprintf("%s: +%d =%d", cur.name, n, balance))',
			'			}',
			'			i++',
			'		}',
			'	}',
			'	return trace, balance',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What an actor actually is</h3>' +
			'<p>Not a mutex, not a thread: a <strong>serial executor</strong> plus a ' +
			'compile-time membership test. The executor guarantees at most one ' +
			'<em>partial task</em> — the run between two suspension points — touches ' +
			'the state at a time; the type checker (your decision table) guarantees ' +
			'nobody reaches the state without going through the executor. Data ' +
			'races are gone by construction, which is what Swift 6\'s ' +
			'strict-concurrency mode formalizes — your table is a slice of what its ' +
			'checker proves about every access in the program. Note what the ' +
			'<code>await</code> in <code>await account.balance</code> buys: not ' +
			'blocking, but an enqueue-and-suspend on the target executor. GCD\'s ' +
			'<code>sync</code>-style deadlock from the previous problem is ' +
			'unrepresentable here — there is no way to hold one actor while ' +
			'blocking on another, only a way to suspend and free it.</p>' +
			'<h3>Reentrancy was a choice, and deadlock was the alternative</h3>' +
			'<p>The Swift evolution proposal (SE-0306) is explicit: actors could ' +
			'have stayed locked across <code>await</code>s, but then two actors ' +
			'awaiting each other would deadlock — the deadly embrace again, one ' +
			'abstraction up. Reentrancy trades deadlock-freedom for a new bug ' +
			'class: <strong>invariants do not survive suspension points</strong>. ' +
			'The discipline that follows is mechanical and code-reviewable: treat ' +
			'every <code>await</code> inside an actor method as a barrier past ' +
			'which every previously-checked fact is stale; re-validate guards after ' +
			'resuming (your pinned fix); never hold “half a transaction” across a ' +
			'suspension — stage the work before, commit synchronously after. The ' +
			'same bug wears other masks: the cache actor that fires two identical ' +
			'network fetches because both callers passed the ' +
			'<code>if cache[key] == nil</code> check before either fetch resumed. ' +
			'The standard fix is to store the in-flight <code>Task</code> handle ' +
			'itself in the dictionary — synchronously, before the first await.</p>' +
			'<h3>Reading the table like the compiler</h3>' +
			'<p>Two rows repay attention. The <code>let</code> rule is why ' +
			'migrating a type to an actor often compiles further than expected — ' +
			'immutable config reads keep working untouched. And the mutation row ' +
			'sitting <em>before</em> the <code>await</code> row is why there is no ' +
			'such thing as <code>await account.balance = 0</code>: a remote write ' +
			'would let two clients interleave read-modify-write across hops, ' +
			'recreating the race the actor exists to kill; the API answer is ' +
			'always an isolated method (<code>deposit</code>), which runs the ' +
			'whole transaction inside the domain. The <code>@MainActor</code> row ' +
			'is the same machinery pointed at UIKit: the main actor is an actor ' +
			'whose executor is the main dispatch queue, which is why ' +
			'<code>updateUI()</code> from actor code needs the same ' +
			'<code>await</code> as any other hop. In Go terms: an actor is the ' +
			'“share memory by communicating” pattern — a monitor goroutine ranging ' +
			'over a request channel — with the channel discipline enforced by the ' +
			'compiler instead of the code review.</p>',
		],
		complexity: { time: 'O(1) per CheckAccess; O(s) for RunActor — each step executes once, an await re-enqueues a constant-size continuation', space: 'O(q) for the mailbox queue and the trace' },
	});
})();
