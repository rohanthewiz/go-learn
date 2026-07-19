/* Permissions & Authorization — Touches & Permissions (Medium). iOS's
 * one-shot permission model — the OPPOSITE of Android's two-strike machine
 * from the sibling track: the system alert appears exactly once, ever, and
 * every later request returns the stored answer with no UI. Plus the two
 * genuine wrinkles: photos "limited" access, and provisional notifications —
 * the quiet grant whose later full request is the ONE state other than
 * notDetermined that ever shows an alert. The missing-Info.plist-key crash
 * is a prose/comment contract only — yaegi writes recovered panics to
 * stderr, so no harness case may panic.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// The one-shot machine. Everything interesting is which edges show UI:
	// exactly one solid "alert" fan-out from notDetermined, the quiet
	// provisional edge, its alerting upgrade, and the Settings back-door.
	// Marker ids namespaced (dgArrowIOSPA / dgArrowIOSPAq) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 260" width="560" height="260" role="img" aria-label="permission state machine: notDetermined shows the alert once and moves to authorized, limited, or denied; requestProvisional moves quietly to provisional, whose later full request shows the alert; only Settings leaves denied">' +
		'<text x="20" y="22" class="lbl">the one-shot machine: which Request edges ever show UI</text>' +
		'<rect x="20" y="44" width="140" height="44" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="90" y="64" text-anchor="middle">notDetermined</text>' +
		'<text x="90" y="80" text-anchor="middle" class="lbl">your ONE shot</text>' +
		'<rect x="400" y="34" width="140" height="36" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="470" y="57" text-anchor="middle">authorized</text>' +
		'<rect x="400" y="84" width="140" height="36" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="470" y="103" text-anchor="middle">limited</text>' +
		'<text x="470" y="115" text-anchor="middle" class="lbl">photos only</text>' +
		'<rect x="400" y="140" width="140" height="36" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="470" y="163" text-anchor="middle">denied</text>' +
		// the one alert fan-out
		'<path d="M 160 56 L 396 50" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowIOSPA)"/>' +
		'<path d="M 160 66 L 396 98" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowIOSPA)"/>' +
		'<path d="M 160 76 C 260 96 330 130 396 152" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowIOSPA)"/>' +
		'<text x="255" y="46" class="lbl">request(): the ALERT — shown once, ever</text>' +
		// provisional quiet path
		'<rect x="20" y="180" width="140" height="44" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="6 3"/>' +
		'<text x="90" y="200" text-anchor="middle">provisional</text>' +
		'<text x="90" y="216" text-anchor="middle" class="lbl">quiet delivery</text>' +
		'<path d="M 90 88 L 90 176" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="6 3" marker-end="url(#dgArrowIOSPAq)"/>' +
		'<text x="98" y="136" class="lbl">requestProvisional(): NO alert</text>' +
		'<path d="M 160 208 C 300 224 400 200 428 180" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowIOSPA)"/>' +
		'<text x="268" y="242" text-anchor="middle" class="lbl">full request() from provisional: DOES alert — the one exception</text>' +
		// settings back-door
		'<path d="M 470 140 L 470 74" fill="none" stroke="var(--ok)" stroke-width="1.6" stroke-dasharray="6 3" marker-end="url(#dgArrowIOSPA)"/>' +
		'<text x="482" y="112" class="lbl" style="fill:var(--ok)">Settings only</text>' +
		'<defs>' +
		'<marker id="dgArrowIOSPA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker>' +
		'<marker id="dgArrowIOSPAq" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'permissions-authorization',
		title: 'Permissions: The One-Shot Alert',
		nav: 'permissions authorization',
		difficulty: 'Medium',
		category: 'Touches & Permissions',
		task: 'Implement iOS\'s one-shot permission machine: Request (one alert, ever), photos\' limited state, provisional notifications\' quiet grant and alerting upgrade, SettingsSet, and TraceFold with its alert count.',

		prose: [
			'<h2>Permissions: The One-Shot Alert</h2>' +
			'<p>The one-star review says <em>"camera screen is just black."</em> ' +
			'Support digs in: on first launch, the onboarding flow requested camera ' +
			'access before showing any camera feature, the user reflexively tapped ' +
			'<strong>Don\'t Allow</strong> — and that was the app\'s one shot. ' +
			'Forever after, <code>requestAccess</code> returns <code>false</code> ' +
			'instantly, with no alert, no error, no UI:</p>',
			{ lang: 'swift', code: 'AVCaptureDevice.requestAccess(for: .video) { granted in\n    // FIRST call ever: the system alert appears — your one shot\n    // every later call: the stored answer returns immediately, no alert\n}\n\nswitch AVCaptureDevice.authorizationStatus(for: .video) {\ncase .notDetermined: break  // the alert has never been shown: ask now\ncase .authorized:    break\ncase .denied:        break  // only the Settings app can change this\ncase .restricted:    break  // parental controls (out of this model)\n@unknown default:    break\n}' },
			'<p>If you built the Android track\'s permission item: forget the ' +
			'two-strike rule. iOS gives <strong>one</strong> strike. The system ' +
			'alert for a given permission is shown <em>exactly once in the life of ' +
			'the install</em>; after the user answers, every ' +
			'<code>request()</code> is an instant, silent read of the stored ' +
			'status. There is no rationale API, no second dialog, no re-prompt — ' +
			'the only road back from <code>denied</code> runs through the ' +
			'Settings app. Two permissions add a real state each:</p>' +
			'<ul>' +
			'<li><strong>Photos — <code>limited</code>:</strong> since iOS 14 the ' +
			'alert offers <em>Select Photos...</em>; the app sees only a ' +
			'user-chosen subset. Re-requesting from <code>limited</code> shows ' +
			'<strong>no system alert</strong> — at most the limited-library ' +
			'management sheet, which changes the selection, never the status ' +
			'(modeled here as a plain status return).</li>' +
			'<li><strong>Notifications — <code>provisional</code>:</strong> ' +
			'request with the <code>.provisional</code> option and iOS grants ' +
			'<em>quiet</em> delivery <strong>without showing any alert</strong>: ' +
			'notifications go silently to Notification Center, stamped with ' +
			'keep/turn-off buttons. Because the user was never actually asked, a ' +
			'later <em>full</em> request from <code>provisional</code> ' +
			'<strong>does</strong> show the alert — the single exception to ' +
			'"only notDetermined alerts".</li>' +
			'</ul>',
			{ lang: 'swift', code: 'let center = UNUserNotificationCenter.current()\n// day one: no prompt at all — status becomes .provisional\ntry await center.requestAuthorization(options: [.alert, .sound, .provisional])\n\n// weeks later, after the user has seen value, upgrade for real:\n// THIS one shows the system alert (the user was never asked before)\ntry await center.requestAuthorization(options: [.alert, .sound])' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the machine for three permission kinds — ' +
			'<code>"camera"</code> (the binary baseline), <code>"photos"</code> ' +
			'(adds <code>limited</code>), <code>"notifications"</code> (adds ' +
			'<code>provisional</code>):</p>' +
			'<ul>' +
			'<li><code>Request(userChoice)</code> — from <code>notDetermined</code> ' +
			'(or notifications\' <code>provisional</code>): count one alert, apply ' +
			'the user\'s choice (<code>allow</code>/<code>deny</code>; photos also ' +
			'<code>allowFull</code>/<code>selectPhotos</code>), return ' +
			'<code>"alert:&lt;newState&gt;"</code>. From any other state: no ' +
			'alert, no state change — return <code>"current:&lt;state&gt;"</code> ' +
			'(the userChoice is irrelevant: the user never gets to express it).</li>' +
			'<li><code>RequestProvisional()</code> — notifications only, from ' +
			'<code>notDetermined</code> only: move to <code>provisional</code> ' +
			'with <em>zero</em> alerts, return <code>"quiet:provisional"</code>; ' +
			'anything else is a silent <code>"current:&lt;state&gt;"</code>.</li>' +
			'<li><code>SettingsSet(state)</code> — the user flips the toggle in ' +
			'the Settings app: the state is whatever they set. (In real iOS, ' +
			'changing several of these while the app runs <em>terminates the ' +
			'app</em> — camera and photos grants kill and relaunch you — so apps ' +
			're-read status on launch, not once at startup.)</li>' +
			'<li><code>TraceFold(kind, events)</code> — fold a scenario of ' +
			'<code>request</code> / <code>requestProvisional</code> / ' +
			'<code>settings</code> events over a fresh machine; return the final ' +
			'state and the total alert count.</li>' +
			'</ul>' +
			'<div class="tip">One contract stays out of the harness: calling a ' +
			'privacy API without its <code>Info.plist</code> usage-description ' +
			'key does not return an error — it kills the process on the spot: ' +
			'<code>This app has crashed because it attempted to access ' +
			'privacy-sensitive data without a usage description. The app\'s ' +
			'Info.plist must contain an NSCameraUsageDescription key...</code>. ' +
			'The alert\'s body text IS that string, which is why review flags ' +
			'lazy boilerplate like "we need camera access" — the user reads it ' +
			'mid-decision, on your one shot.</div>',
		],

		starter: [
			'package main',
			'',
			'// Perm is one permission\'s stored authorization, per install.',
			'//   Kind:  "camera" | "photos" | "notifications"',
			'//   State: "notDetermined" | "authorized" | "denied"',
			'//          | "limited" (photos only) | "provisional" (notifications only)',
			'//   Alerts counts system alerts shown so far — the harness pins that',
			'//   it can never exceed 1 for camera-style permissions.',
			'type Perm struct {',
			'	Kind   string',
			'	State  string',
			'	Alerts int',
			'}',
			'',
			'func NewPerm(kind string) *Perm {',
			'	return &Perm{Kind: kind, State: "notDetermined"}',
			'}',
			'',
			'// Request models the framework request call (AVCaptureDevice',
			'// .requestAccess, PHPhotoLibrary.requestAuthorization, UNUserNotif...',
			'// .requestAuthorization with full options). userChoice is what the',
			'// user WOULD pick if an alert appears:',
			'//   camera/notifications: "allow" | "deny"',
			'//   photos:               "allowFull" | "selectPhotos" | "deny"',
			'//',
			'// Only notDetermined shows the alert — plus ONE exception: a full',
			'// request from notifications\' "provisional" state also alerts (the',
			'// user was never actually asked). Alerting: count it, apply the',
			'// choice (photos: allowFull->authorized, selectPhotos->limited,',
			'// deny->denied), return "alert:<newState>". Any other state: no',
			'// alert, no change — return "current:<state>". iOS NEVER re-prompts;',
			'// the userChoice goes unexpressed.',
			'// (Calling any of these without the Info.plist usage-description key',
			'// crashes the process — a contract that lives in prose only.)',
			'func (p *Perm) Request(userChoice string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// RequestProvisional models requestAuthorization(options: [...,',
			'// .provisional]) — notifications only. From notDetermined: grant',
			'// QUIETLY (no alert, Alerts unchanged), state becomes "provisional",',
			'// return "quiet:provisional". From any other state (or any other',
			'// kind): a silent status read — return "current:<state>".',
			'func (p *Perm) RequestProvisional() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// SettingsSet is the user flipping the permission in the Settings',
			'// app — the ONLY exit from "denied". No alert is involved; the state',
			'// simply becomes what they chose.',
			'func (p *Perm) SettingsSet(state string) {',
			'	// your code here',
			'}',
			'',
			'// Ev is one event in a scenario fold.',
			'//   Op:  "request" (Arg = userChoice)',
			'//        "requestProvisional" (Arg unused)',
			'//        "settings" (Arg = new state)',
			'type Ev struct {',
			'	Op  string',
			'	Arg string',
			'}',
			'',
			'// TraceFold runs the events over a fresh Perm of the given kind and',
			'// returns (finalState, totalAlertCount).',
			'func TraceFold(kind string, events []Ev) (string, int) {',
			'	// your code here',
			'	return "", 0',
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
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"first camera request: the system alert shows, Allow -> authorized",',
			'			"r=alert:authorized state=authorized alerts=1",',
			'			func() string {',
			'				p := NewPerm("camera")',
			'				r := p.Request("allow")',
			'				return fmt.Sprintf("r=%s state=%s alerts=%d", r, p.State, p.Alerts)',
			'			}},',
			'		{"one strike: after a denial the user WOULD allow — but iOS never shows a second alert",',
			'			"first=alert:denied second=current:denied alerts=1",',
			'			func() string {',
			'				p := NewPerm("camera")',
			'				first := p.Request("deny")',
			'				second := p.Request("allow") // the choice goes unexpressed',
			'				return fmt.Sprintf("first=%s second=%s alerts=%d", first, second, p.Alerts)',
			'			}},',
			'		{"authorized short-circuits the same way: a later request is a silent status read",',
			'			"first=alert:authorized later=current:authorized alerts=1",',
			'			func() string {',
			'				p := NewPerm("camera")',
			'				first := p.Request("allow")',
			'				later := p.Request("deny")',
			'				return fmt.Sprintf("first=%s later=%s alerts=%d", first, later, p.Alerts)',
			'			}},',
			'		{"pinned invariant: however many times you ask, a camera-style permission alerts at most ONCE",',
			'			"state=denied alerts=1",',
			'			func() string {',
			'				st, al := TraceFold("camera", []Ev{',
			'					{Op: "request", Arg: "deny"},',
			'					{Op: "request", Arg: "allow"},',
			'					{Op: "request", Arg: "allow"},',
			'					{Op: "request", Arg: "allow"},',
			'				})',
			'				return fmt.Sprintf("state=%s alerts=%d", st, al)',
			'			}},',
			'		{"the only road back from denied runs through the Settings app",',
			'			"before=current:denied after=current:authorized alerts=1",',
			'			func() string {',
			'				p := NewPerm("camera")',
			'				p.Request("deny")',
			'				before := p.Request("allow")',
			'				p.SettingsSet("authorized")',
			'				after := p.Request("deny")',
			'				return fmt.Sprintf("before=%s after=%s alerts=%d", before, after, p.Alerts)',
			'			}},',
			'		{"photos: Select Photos -> limited; re-requesting shows NO alert (just the management sheet)",',
			'			"first=alert:limited rerequest=current:limited alerts=1",',
			'			func() string {',
			'				p := NewPerm("photos")',
			'				first := p.Request("selectPhotos")',
			'				rerequest := p.Request("allowFull")',
			'				return fmt.Sprintf("first=%s rerequest=%s alerts=%d", first, rerequest, p.Alerts)',
			'			}},',
			'		{"photos: Allow Access to All Photos -> authorized",',
			'			"r=alert:authorized",',
			'			func() string {',
			'				p := NewPerm("photos")',
			'				return fmt.Sprintf("r=%s", p.Request("allowFull"))',
			'			}},',
			'		{"provisional notifications: granted QUIETLY — no alert is ever shown",',
			'			"r=quiet:provisional state=provisional alerts=0",',
			'			func() string {',
			'				p := NewPerm("notifications")',
			'				r := p.RequestProvisional()',
			'				return fmt.Sprintf("r=%s state=%s alerts=%d", r, p.State, p.Alerts)',
			'			}},',
			'		{"the one exception: a FULL request from provisional DOES alert — count goes 0 then 1",',
			'			"prov=quiet:provisional alerts0=0 full=alert:authorized alerts1=1",',
			'			func() string {',
			'				p := NewPerm("notifications")',
			'				prov := p.RequestProvisional()',
			'				a0 := p.Alerts',
			'				full := p.Request("allow")',
			'				return fmt.Sprintf("prov=%s alerts0=%d full=%s alerts1=%d", prov, a0, full, p.Alerts)',
			'			}},',
			'		{"upgrade declined: the provisional user finally sees the alert, denies — and that was the one shot",',
			'			"full=alert:denied later=current:denied alerts=1",',
			'			func() string {',
			'				p := NewPerm("notifications")',
			'				p.RequestProvisional()',
			'				full := p.Request("deny")',
			'				later := p.Request("allow")',
			'				return fmt.Sprintf("full=%s later=%s alerts=%d", full, later, p.Alerts)',
			'			}},',
			'		{"requestProvisional after a denial is a silent status read — quiet delivery is not a back door",',
			'			"prov=current:denied alerts=1",',
			'			func() string {',
			'				p := NewPerm("notifications")',
			'				p.Request("deny")',
			'				return fmt.Sprintf("prov=%s alerts=%d", p.RequestProvisional(), p.Alerts)',
			'			}},',
			'		{"TraceFold end-to-end: deny in the alert, flip in Settings, request short-circuits — one alert total",',
			'			"state=authorized alerts=1",',
			'			func() string {',
			'				st, al := TraceFold("camera", []Ev{',
			'					{Op: "request", Arg: "deny"},',
			'					{Op: "settings", Arg: "authorized"},',
			'					{Op: "request", Arg: "allow"},',
			'				})',
			'				return fmt.Sprintf("state=%s alerts=%d", st, al)',
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
			'type Perm struct {',
			'	Kind   string',
			'	State  string',
			'	Alerts int',
			'}',
			'',
			'func NewPerm(kind string) *Perm {',
			'	return &Perm{Kind: kind, State: "notDetermined"}',
			'}',
			'',
			'// canAlert isolates the item\'s core rule in one place: the system',
			'// alert exists on exactly two edges — notDetermined (every kind), and',
			'// notifications\' provisional (the user was never actually asked, so',
			'// the upgrade to full authorization gets the real prompt). Every',
			'// other state answers silently, forever. Factoring the rule out keeps',
			'// Request itself free to be a plain two-branch function.',
			'func (p *Perm) canAlert() bool {',
			'	if p.State == "notDetermined" {',
			'		return true',
			'	}',
			'	return p.Kind == "notifications" && p.State == "provisional"',
			'}',
			'',
			'// Request: one silent branch, one alerting branch. Note that the',
			'// silent branch ignores userChoice entirely — that is the point of',
			'// the model: after the one shot, what the user WOULD say never',
			'// matters again, because nothing ever asks.',
			'func (p *Perm) Request(userChoice string) string {',
			'	if !p.canAlert() {',
			'		return "current:" + p.State',
			'	}',
			'	p.Alerts++',
			'	if p.Kind == "photos" {',
			'		// The three-button iOS 14+ photos alert. The default branch',
			'		// treats anything unrecognized as a denial — the conservative',
			'		// reading, matching how the framework maps a dismissed alert.',
			'		switch userChoice {',
			'		case "allowFull":',
			'			p.State = "authorized"',
			'		case "selectPhotos":',
			'			p.State = "limited"',
			'		default:',
			'			p.State = "denied"',
			'		}',
			'		return "alert:" + p.State',
			'	}',
			'	// Binary permissions (camera-style, and notifications\' full ask).',
			'	if userChoice == "allow" {',
			'		p.State = "authorized"',
			'	} else {',
			'		p.State = "denied"',
			'	}',
			'	return "alert:" + p.State',
			'}',
			'',
			'// RequestProvisional: the quiet grant. Both guards matter — the',
			'// option is meaningless outside notifications, and from any state',
			'// but notDetermined it must NOT touch the state: a denied user does',
			'// not get quiet delivery smuggled past their answer, and an',
			'// authorized user is not downgraded.',
			'func (p *Perm) RequestProvisional() string {',
			'	if p.Kind != "notifications" || p.State != "notDetermined" {',
			'		return "current:" + p.State',
			'	}',
			'	p.State = "provisional"',
			'	return "quiet:provisional"',
			'}',
			'',
			'// SettingsSet: the machine\'s only externally-forced transition. No',
			'// alert accounting — Settings is system UI, not the app\'s prompt.',
			'// (Real iOS often TERMINATES a running app whose permission changed',
			'// in Settings; the model folds that into "state is simply different',
			'// next time you look", which is what a relaunched app observes.)',
			'func (p *Perm) SettingsSet(state string) {',
			'	p.State = state',
			'}',
			'',
			'type Ev struct {',
			'	Op  string',
			'	Arg string',
			'}',
			'',
			'// TraceFold replays a scenario on a fresh machine. Unknown ops are',
			'// ignored rather than guessed at — a fold over user events should',
			'// never invent state transitions the machine does not define.',
			'func TraceFold(kind string, events []Ev) (string, int) {',
			'	p := NewPerm(kind)',
			'	for _, e := range events {',
			'		switch e.Op {',
			'		case "request":',
			'			p.Request(e.Arg)',
			'		case "requestProvisional":',
			'			p.RequestProvisional()',
			'		case "settings":',
			'			p.SettingsSet(e.Arg)',
			'		}',
			'	}',
			'	return p.State, p.Alerts',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Mapping the model to the real APIs</h3>' +
			'<p><code>Request</code> stands in for a family: ' +
			'<code>AVCaptureDevice.requestAccess</code> (camera/mic), ' +
			'<code>PHPhotoLibrary.requestAuthorization(for: .readWrite)</code> ' +
			'(photos), <code>UNUserNotificationCenter.requestAuthorization</code> ' +
			'(notifications), <code>CLLocationManager.requestWhenInUseAuthorization</code> ' +
			'(location). <code>SettingsSet</code> is the user inside the Settings ' +
			'app — apps can only deep-link there via ' +
			'<code>UIApplication.openSettingsURLString</code>; no API flips the ' +
			'toggle programmatically, by design. The model skips two real states ' +
			'for focus: <code>.restricted</code> (parental controls / MDM — the ' +
			'user <em>cannot</em> grant, so treating it like denied-without-appeal ' +
			'is the right app behavior), and location\'s extra ' +
			'"Allow Once" answer, which returns the machine to ' +
			'<code>notDetermined</code> on the next launch — the one iOS ' +
			'permission that can genuinely re-prompt.</p>' +
			'<h3>One shot vs two strikes</h3>' +
			'<p>Android\'s machine (the sibling track\'s item) gives two dialogs ' +
			'and an ambiguous rationale signal between them; iOS gives one dialog ' +
			'and a fully readable status. The designs converge on the same app ' +
			'pattern from opposite directions: <strong>never burn the prompt on ' +
			'launch</strong>. On iOS the standard move is the pre-permission ' +
			'screen — your own UI explaining why, shown at the moment of intent ' +
			'(the user taps the camera button), with the real alert only after ' +
			'they opt in on yours. That works <em>because</em> ' +
			'<code>notDetermined</code> is queryable: you always know whether the ' +
			'one shot is still live. And once it is spent, the only honest UI is ' +
			'a "turn it on in Settings" affordance with a deep link — the black ' +
			'camera screen in the prose is what shipping anything else looks ' +
			'like.</p>' +
			'<h3>Why provisional exists</h3>' +
			'<p>Notification prompts convert terribly on day one — decline rates ' +
			'well over half for apps that ask cold. Provisional authorization ' +
			'(iOS 12) is Apple\'s compromise: the app earns a quiet channel with ' +
			'zero prompts, notifications arrive in Notification Center stamped ' +
			'with keep/turn-off buttons, and the user\'s response to <em>real ' +
			'content</em> replaces the abstract yes/no. The upgrade path you ' +
			'implemented — a full request from <code>provisional</code> shows the ' +
			'alert — is the intended endgame: prove value quietly, then ask. That ' +
			'alerting edge is exactly why the harness pins <code>alertCount 0 ' +
			'then 1</code>: quiet delivery defers your one shot, it never spends ' +
			'it.</p>' +
			'<h3>Field notes</h3>' +
			'<ul>' +
			'<li><strong>Re-read status on every foreground pass</strong>, not ' +
			'once at startup: a Settings change can terminate and relaunch you ' +
			'(camera, photos), or silently change what a cached ' +
			'<code>authorizationStatus</code> would now return ' +
			'(notifications).</li>' +
			'<li><strong>Photos <code>limited</code> is a state, not a bug:</strong> ' +
			'code that treats anything but <code>.authorized</code> as denial ' +
			'locks out users who deliberately chose Select Photos. Present the ' +
			'limited picker (<code>presentLimitedLibraryPicker</code>) instead of ' +
			're-requesting — you implemented why: re-requesting is a silent ' +
			'no-op.</li>' +
			'<li><strong>The usage-description crash</strong> from the prose is a ' +
			'release-blocker class of bug precisely because it fires on first API ' +
			'touch of a path you may never exercise in testing. App Store review ' +
			'also rejects vague strings — the text is shown inside your one ' +
			'alert, so it is marketing copy with a crash contract.</li>' +
			'<li><strong>In interviews</strong>, "what does requesting an ' +
			'already-denied permission do on iOS?" is the mirror of Android\'s ' +
			'rationale question — the answer this item drills: nothing, silently, ' +
			'forever; only Settings changes the answer, so your UI must know ' +
			'which world it is in from the status alone.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(1) per operation — every transition is a couple of string checks; TraceFold is O(events)', space: 'O(1) per permission' },
	});
})();
