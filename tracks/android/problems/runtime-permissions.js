/* Runtime Permissions — Resources & Permissions (Medium). The API 30+
 * two-strike request flow as a state machine: dialog, dialog, then permanent
 * auto-denial — with ShouldShowRationale as the app's ONLY signal, and its
 * notorious ambiguity (false means never-asked OR never-ask-again) pinned by
 * a two-machine indistinguishability case. Note: the correct solution's
 * UserResponds panics on misuse ("no dialog showing"), but no harness case
 * triggers it — yaegi prints a stderr trace for any panic that unwinds an
 * interpreted frame, even a recovered one, and solution stderr must be empty.
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// The two-strike machine. The keyhole note at the bottom is the whole
	// point: the first and third states are observationally identical to the
	// app. Marker id namespaced (dgArrowAndRP) because every track's SVGs
	// share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 244" width="560" height="244" role="img" aria-label="permission state machine: never asked, denied once, permanently denied, granted; rationale is true only in the denied-once state">' +
		'<text x="20" y="24" class="lbl">the two-strike machine (target API 30+): what Request() does in each state</text>' +
		'<rect x="20" y="44" width="150" height="64" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="95" y="64" text-anchor="middle">never asked</text>' +
		'<text x="95" y="80" text-anchor="middle" class="lbl">Request &rarr; dialog</text>' +
		'<text x="95" y="96" text-anchor="middle" class="lbl">rationale = false</text>' +
		'<rect x="215" y="44" width="150" height="64" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="290" y="64" text-anchor="middle">denied &times;1</text>' +
		'<text x="290" y="80" text-anchor="middle" class="lbl">Request &rarr; dialog</text>' +
		'<text x="290" y="96" text-anchor="middle" class="lbl" style="fill:var(--warn)">rationale = TRUE</text>' +
		'<rect x="400" y="44" width="150" height="64" rx="6" fill="none" stroke="var(--warn)" stroke-width="2" stroke-dasharray="6 3"/>' +
		'<text x="475" y="64" text-anchor="middle">denied &times;2</text>' +
		'<text x="475" y="80" text-anchor="middle" class="lbl">Request &rarr; autoDenied</text>' +
		'<text x="475" y="96" text-anchor="middle" class="lbl">rationale = false</text>' +
		'<path d="M 170 76 L 211 76" fill="none" stroke="var(--muted)" stroke-width="1.6" marker-end="url(#dgArrowAndRP)"/>' +
		'<text x="190" y="68" text-anchor="middle" class="lbl">deny</text>' +
		'<path d="M 365 76 L 396 76" fill="none" stroke="var(--muted)" stroke-width="1.6" marker-end="url(#dgArrowAndRP)"/>' +
		'<text x="380" y="68" text-anchor="middle" class="lbl">deny</text>' +
		'<rect x="215" y="156" width="150" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="290" y="183" text-anchor="middle">granted</text>' +
		'<path d="M 95 108 C 95 172 150 178 211 178" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowAndRP)"/>' +
		'<text x="130" y="140" text-anchor="middle" class="lbl" style="fill:var(--ok)">grant</text>' +
		'<path d="M 290 108 L 290 152" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowAndRP)"/>' +
		'<text x="312" y="134" text-anchor="middle" class="lbl" style="fill:var(--ok)">grant</text>' +
		'<path d="M 475 108 C 475 172 430 178 369 178" fill="none" stroke="var(--ok)" stroke-width="1.6" stroke-dasharray="6 3" marker-end="url(#dgArrowAndRP)"/>' +
		'<text x="470" y="140" text-anchor="middle" class="lbl">Settings only</text>' +
		'<text x="20" y="232" class="lbl">the app\'s keyhole is (Granted, ShouldShowRationale) — through it, "never asked" and "denied &times;2" look IDENTICAL</text>' +
		'<defs><marker id="dgArrowAndRP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'runtime-permissions',
		title: 'Runtime Permissions: The Two-Strike State Machine',
		nav: 'runtime permissions',
		difficulty: 'Medium',
		category: 'Resources & Permissions',
		task: 'Implement the API 30+ permission machine: Request (dialog / autoDenied / alreadyGranted), UserResponds, the two-strike permanent denial, the ambiguous ShouldShowRationale signal, and SettingsGrant.',

		prose: [
			'<h2>Runtime Permissions: The Two-Strike State Machine</h2>' +
			'<p>A one-star review: <em>"camera button does nothing."</em> Support ' +
			'confirms it — tap the button, no dialog, no camera, no error. The user ' +
			'denied the permission twice three weeks ago, and since Android 11 that ' +
			'means <strong>the system will never show your dialog again</strong>: the ' +
			'request comes back denied instantly, and the only road back runs through ' +
			'the Settings app. Your code was written for the ask-again world:</p>',
			{ lang: 'kotlin', code: 'val launcher = registerForActivityResult(\n    ActivityResultContracts.RequestPermission()\n) { granted ->\n    when {\n        granted -> startCamera()\n        shouldShowRequestPermissionRationale(Manifest.permission.CAMERA) ->\n            showRationaleUi()      // denied once: explain, then ask again\n        else ->\n            promptForSettings()    // never asked?  or never-ask-again?\n    }                              // this API cannot tell you which!\n}\nlauncher.launch(Manifest.permission.CAMERA)' },
			'<p>Since API 23 dangerous permissions are granted at use, not install; ' +
			'since API 30 the system enforces <em>two strikes</em>: deny, deny again, ' +
			'and every later request is auto-denied without any dialog. The app is ' +
			'told almost nothing. Its entire view of the machine is two booleans:</p>' +
			'<ul>' +
			'<li><strong><code>Granted()</code></strong> — do we have it right now?</li>' +
			'<li><strong><code>ShouldShowRationale()</code></strong> — the odd one: ' +
			'<code>false</code> before any request, <code>true</code> after exactly ' +
			'one denial (the system\'s hint: "explain yourself, you get one more ' +
			'dialog"), and <code>false</code> again after the second denial. That ' +
			'last transition is the trap: <strong>false means either never-asked or ' +
			'never-ask-again</strong>, and no API distinguishes them — an app that ' +
			'wants to know must track its own "have I asked before?" bit.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Perm</code>, the machine above, with target-API-30+ ' +
			'semantics pinned:</p>' +
			'<ul>' +
			'<li><code>Request()</code> — <code>"alreadyGranted"</code> when granted; ' +
			'<code>"autoDenied"</code> once permanently denied (two strikes, no ' +
			'dialog, immediate denial callback); otherwise <code>"dialog"</code> and ' +
			'a system dialog is now showing.</li>' +
			'<li><code>UserResponds(grant)</code> — the user answers the dialog. Only ' +
			'legal while a dialog is showing: calling it otherwise panics with ' +
			'<code>"no dialog showing"</code>. A grant at any point wins outright; a ' +
			'denial counts a strike.</li>' +
			'<li><code>ShouldShowRationale()</code> — exactly the signal described ' +
			'above, derived from strikes and grant state.</li>' +
			'<li><code>SettingsGrant()</code> — the user flips the toggle in ' +
			'Settings: granted, from any state (the only exit from permanent ' +
			'denial). Revocation is out of scope.</li>' +
			'</ul>' +
			'<div class="tip">The harness includes the scenario that justifies the ' +
			'whole design: two machines — one fresh, one permanently denied — ' +
			'interrogated through the public API and found <em>identical</em>. ' +
			'Real apps resolve that ambiguity by persisting their own ' +
			'"asked before" flag (DataStore) next to the system\'s answer; the ' +
			'pattern exists because of exactly this indistinguishability.</div>',
		],

		starter: [
			'package main',
			'',
			'// Perm is one dangerous permission\'s state, target API 30+ semantics.',
			'// The suggested fields: granted, a denial count (two strikes means',
			'// permanently denied), and whether a system dialog is showing now.',
			'type Perm struct {',
			'	granted bool',
			'	denials int',
			'	dialog  bool',
			'}',
			'',
			'func NewPerm() *Perm {',
			'	return &Perm{}',
			'}',
			'',
			'// Request models launcher.launch(permission). Returns what happens:',
			'//   "alreadyGranted" — granted now; no dialog, success callback',
			'//   "autoDenied"     — permanently denied (2 strikes): no dialog,',
			'//                      immediate denial callback',
			'//   "dialog"         — the system dialog is now showing',
			'func (p *Perm) Request() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// UserResponds is the user answering the system dialog. Only legal',
			'// after Request returned "dialog"; calling it with no dialog showing',
			'// must panic with "no dialog showing". grant=true grants outright;',
			'// grant=false counts one strike toward permanent denial.',
			'func (p *Perm) UserResponds(grant bool) {',
			'	// your code here',
			'}',
			'',
			'func (p *Perm) Granted() bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// ShouldShowRationale mirrors shouldShowRequestPermissionRationale:',
			'// false before any request, true after exactly one denial, false',
			'// again once permanently denied (and false when granted). Note the',
			'// designed ambiguity: false alone cannot distinguish "never asked"',
			'// from "never ask again".',
			'func (p *Perm) ShouldShowRationale() bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// SettingsGrant is the user enabling the permission in the Settings',
			'// app — the only way back from permanent denial. Granted from any',
			'// state; any showing dialog is gone (the user left the app).',
			'func (p *Perm) SettingsGrant() {',
			'	// your code here',
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
			'// observe reads a machine through the app\'s complete keyhole — the',
			'// only two signals real Android code ever gets.',
			'func observe(p *Perm) string {',
			'	return fmt.Sprintf("granted=%v rationale=%v", p.Granted(), p.ShouldShowRationale())',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"first launch: Request shows the system dialog, and nothing is granted while it is up",',
			'			"request=dialog granted=false",',
			'			func() string {',
			'				p := NewPerm()',
			'				return fmt.Sprintf("request=%s granted=%v", p.Request(), p.Granted())',
			'			}},',
			'		{"fresh install: ShouldShowRationale is false — the app has never asked, so there is nothing to justify yet",',
			'			"granted=false rationale=false",',
			'			func() string {',
			'				return observe(NewPerm())',
			'			}},',
			'		{"user grants on the first ask: Granted flips, rationale stays false, and later Requests short-circuit to alreadyGranted",',
			'			"granted=true rationale=false next=alreadyGranted",',
			'			func() string {',
			'				p := NewPerm()',
			'				p.Request()',
			'				p.UserResponds(true)',
			'				return fmt.Sprintf("granted=%v rationale=%v next=%s",',
			'					p.Granted(), p.ShouldShowRationale(), p.Request())',
			'			}},',
			'		{"one denial: rationale flips TRUE — the single moment Android tells you to explain yourself before the last dialog",',
			'			"granted=false rationale=true",',
			'			func() string {',
			'				p := NewPerm()',
			'				p.Request()',
			'				p.UserResponds(false)',
			'				return observe(p)',
			'			}},',
			'		{"strike two: the second ask still gets a dialog, but after that denial Request auto-denies with no dialog — and rationale is false again",',
			'			"second=dialog third=autoDenied granted=false rationale=false",',
			'			func() string {',
			'				p := NewPerm()',
			'				p.Request()',
			'				p.UserResponds(false)',
			'				second := p.Request()',
			'				p.UserResponds(false)',
			'				return fmt.Sprintf("second=%s third=%s granted=%v rationale=%v",',
			'					second, p.Request(), p.Granted(), p.ShouldShowRationale())',
			'			}},',
			'		{"the intended happy path of the rationale flow: deny once, see rationale=true, explain, ask again, user grants",',
			'			"rationale=true reask=dialog granted=true",',
			'			func() string {',
			'				p := NewPerm()',
			'				p.Request()',
			'				p.UserResponds(false)',
			'				rationale := p.ShouldShowRationale()',
			'				reask := p.Request()',
			'				p.UserResponds(true)',
			'				return fmt.Sprintf("rationale=%v reask=%s granted=%v", rationale, reask, p.Granted())',
			'			}},',
			'		{"the notorious ambiguity: a never-asked machine and a permanently-denied machine are IDENTICAL through the app\'s keyhole",',
			'			"fresh[granted=false rationale=false] denied2[granted=false rationale=false] indistinguishable=true",',
			'			func() string {',
			'				fresh := NewPerm()',
			'				denied2 := NewPerm()',
			'				denied2.Request()',
			'				denied2.UserResponds(false)',
			'				denied2.Request()',
			'				denied2.UserResponds(false)',
			'				a := observe(fresh)',
			'				b := observe(denied2)',
			'				return fmt.Sprintf("fresh[%s] denied2[%s] indistinguishable=%v", a, b, a == b)',
			'			}},',
			'		{"the only road back from permanent denial runs through Settings: SettingsGrant grants, and Request short-circuits",',
			'			"before=autoDenied granted=true after=alreadyGranted",',
			'			func() string {',
			'				p := NewPerm()',
			'				p.Request()',
			'				p.UserResponds(false)',
			'				p.Request()',
			'				p.UserResponds(false)',
			'				before := p.Request()',
			'				p.SettingsGrant()',
			'				return fmt.Sprintf("before=%s granted=%v after=%s", before, p.Granted(), p.Request())',
			'			}},',
			'		{"a grant after one strike clears the rationale signal: granted machines never ask you to explain anything",',
			'			"granted=true rationale=false",',
			'			func() string {',
			'				p := NewPerm()',
			'				p.Request()',
			'				p.UserResponds(false)',
			'				p.Request()',
			'				p.UserResponds(true)',
			'				return observe(p)',
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
			'// Perm is one dangerous permission\'s state, target API 30+ semantics.',
			'// Three fields carry the whole machine: granted (absorbing, since',
			'// revocation is out of scope), a strike counter (2 = permanently',
			'// denied), and whether a system dialog is currently up. Note what is',
			'// deliberately NOT here: a separate "permanently denied" flag —',
			'// permanence is derived from denials >= 2, so the two facts can',
			'// never disagree.',
			'type Perm struct {',
			'	granted bool',
			'	denials int',
			'	dialog  bool',
			'}',
			'',
			'func NewPerm() *Perm {',
			'	return &Perm{}',
			'}',
			'',
			'// Request models launcher.launch(permission). The order of the two',
			'// short-circuits mirrors the framework: an existing grant wins before',
			'// permanent denial is even considered (a Settings grant after two',
			'// strikes must produce alreadyGranted, not autoDenied).',
			'func (p *Perm) Request() string {',
			'	if p.granted {',
			'		return "alreadyGranted"',
			'	}',
			'	if p.denials >= 2 {',
			'		// Two strikes: since Android 11 the system stops showing your',
			'		// dialog entirely — the callback fires immediately with',
			'		// denied, which is why the UI must not sit waiting for a',
			'		// dialog that will never come.',
			'		return "autoDenied"',
			'	}',
			'	p.dialog = true',
			'	return "dialog"',
			'}',
			'',
			'// UserResponds is the user answering the system dialog. The guard',
			'// panics on misuse because answering a dialog that is not showing is',
			'// a programming error, not a state — same reason the real contracts',
			'// throw IllegalStateException rather than returning a bool.',
			'func (p *Perm) UserResponds(grant bool) {',
			'	if !p.dialog {',
			'		panic("no dialog showing")',
			'	}',
			'	p.dialog = false',
			'	if grant {',
			'		p.granted = true',
			'		return',
			'	}',
			'	// A denial is a strike. The counter is never reset by a later',
			'	// grant — it does not need to be, because granted short-circuits',
			'	// every path that would consult it.',
			'	p.denials++',
			'}',
			'',
			'func (p *Perm) Granted() bool {',
			'	return p.granted',
			'}',
			'',
			'// ShouldShowRationale derives the three-phase signal from the two',
			'// state fields — no third field, so it cannot drift out of sync:',
			'//   0 denials -> false (never asked: nothing to justify)',
			'//   1 denial  -> true  (explain yourself; one dialog remains)',
			'//   2 denials -> false (permanently denied: same false as never-asked,',
			'//                       the ambiguity this whole item is about)',
			'// Granted machines report false too: the question "should I explain',
			'// why I need this?" is moot once you have it.',
			'func (p *Perm) ShouldShowRationale() bool {',
			'	return !p.granted && p.denials == 1',
			'}',
			'',
			'// SettingsGrant is the user flipping the toggle in the Settings app.',
			'// It grants from ANY state — including permanent denial, making it',
			'// the machine\'s only exit from that trap. The dialog flag is cleared',
			'// because leaving for Settings dismisses any showing dialog.',
			'func (p *Perm) SettingsGrant() {',
			'	p.granted = true',
			'	p.dialog = false',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Mapping the model to the real APIs</h3>' +
			'<p><code>Request</code> is ' +
			'<code>registerForActivityResult(RequestPermission()).launch(...)</code>; ' +
			'<code>UserResponds</code> is the result callback; ' +
			'<code>ShouldShowRationale</code> is ' +
			'<code>shouldShowRequestPermissionRationale</code>; ' +
			'<code>SettingsGrant</code> is the user in ' +
			'<code>ACTION_APPLICATION_DETAILS_SETTINGS</code> (the screen apps ' +
			'deep-link to when permanently denied). The two-strike rule is the ' +
			'Android 11 behavior change, verbatim from the docs: deny twice and the ' +
			'system treats every later request as "don\'t ask again" — the checkbox ' +
			'that older versions showed is gone, the policy is now automatic. One ' +
			'refinement the model deliberately skips: on modern Android the OS can ' +
			'also auto-revoke unused apps\' permissions (app hibernation), which ' +
			'reintroduces the never-asked-looking state for a previously granted ' +
			'app — making the ambiguity below even more common in the wild.</p>' +
			'<h3>The ambiguity is the design</h3>' +
			'<p>The harness\'s two-machine case is the heart of the item: a fresh ' +
			'install and a permanently-denied veteran answer <code>(false, ' +
			'false)</code> identically. This is intentional on Google\'s part — a ' +
			'queryable "user said never" bit would let apps nag at exactly the ' +
			'users who opted out hardest. The practical consequence every ' +
			'production codebase reaches: <strong>persist your own "I have asked ' +
			'before" flag</strong> (DataStore), and read the world as:</p>' +
			'<ul>' +
			'<li>rationale=false, never asked &rarr; just launch the request.</li>' +
			'<li>rationale=true &rarr; you get exactly one more dialog — show your ' +
			'explanation UI first, <em>then</em> re-request (the flow the harness ' +
			'walks in the happy-path case).</li>' +
			'<li>rationale=false, but you HAVE asked &rarr; permanently denied: no ' +
			'dialog will ever appear; show a "enable in Settings" affordance and ' +
			'deep-link. Anything else is the one-star "button does nothing" bug ' +
			'from the prose.</li>' +
			'</ul>' +
			'<h3>Field notes and review flags</h3>' +
			'<ul>' +
			'<li><strong>Calling <code>shouldShowRationale</code> before any ' +
			'request and treating false as permanent denial</strong> — the mirror ' +
			'image of the prose bug; it sends first-time users to Settings instead ' +
			'of just asking. Both misreadings come from ignoring the same missing ' +
			'bit.</li>' +
			'<li><strong>Requesting on every resume</strong> once auto-denial is in ' +
			'effect looks free (no dialog appears) but hammers the denial callback ' +
			'and, for location, trips Play policy review. Request on user intent — ' +
			'the button tap — never on lifecycle.</li>' +
			'<li><strong>Play policy</strong> requires the rationale flow for ' +
			'sensitive permissions: ask in context, explain before re-asking, and ' +
			'degrade gracefully when denied. The state machine you implemented is ' +
			'the exact skeleton reviewers expect that UX to hang on.</li>' +
			'<li><strong>In interviews</strong>, the two-strike machine plus "how ' +
			'do you tell never-asked from never-ask-again?" is a standard pair; ' +
			'the answer they want is this item: you cannot from the API alone — ' +
			'track your own asked-bit, and derive everything else from the two ' +
			'booleans.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(1) per operation — every transition is a flag check and a counter bump', space: 'O(1) per permission' },
	});
})();
