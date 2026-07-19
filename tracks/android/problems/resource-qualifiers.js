/* Resource Qualifiers — Resources & Permissions (Hard). res/layout-sw600dp-
 * land-night/main.xml — which file actually loads? Android's documented
 * elimination algorithm as code: contradiction filtering first, then a strict
 * precedence walk (locale > swdp > orientation > night > density > version)
 * where density is the one qualifier that is never eliminated, only
 * best-matched. Every expected value in the harness was worked by hand
 * against the pinned algorithm and cross-checked with a reference
 * implementation before being hard-coded.
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// The three-stage funnel: contradictions die first, then the precedence
	// walk thins the survivors one qualifier at a time, and the default wins
	// only by forfeit. Marker id namespaced (dgArrowAndRQ) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 300" width="560" height="300" role="img" aria-label="resource resolution: eliminate contradicting directories, then walk qualifier precedence from locale down to version, then tie-break">' +
		'<text x="20" y="24" class="lbl">how Android picks the directory: a funnel, not a similarity score</text>' +
		'<rect x="40" y="40" width="480" height="52" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="280" y="61" text-anchor="middle">1. eliminate contradictions</text>' +
		'<text x="280" y="80" text-anchor="middle" class="lbl">wrong locale/orientation, sw or v above the device, night on a day device — density NEVER eliminates</text>' +
		'<path d="M 280 92 L 280 112" fill="none" stroke="var(--muted)" stroke-width="1.6" marker-end="url(#dgArrowAndRQ)"/>' +
		'<rect x="40" y="116" width="480" height="88" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="280" y="139" text-anchor="middle">2. precedence walk, one qualifier at a time</text>' +
		'<text x="280" y="160" text-anchor="middle">locale &gt; swdp &gt; orientation &gt; night &gt; density &gt; version</text>' +
		'<text x="280" y="180" text-anchor="middle" class="lbl">any survivor specifies it? drop every candidate that does not</text>' +
		'<text x="280" y="196" text-anchor="middle" class="lbl">(swdp: keep the largest &le; device; density: keep the best match instead of eliminating)</text>' +
		'<path d="M 280 204 L 280 224" fill="none" stroke="var(--muted)" stroke-width="1.6" marker-end="url(#dgArrowAndRQ)"/>' +
		'<rect x="40" y="228" width="480" height="52" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="280" y="249" text-anchor="middle">3. tie-break</text>' +
		'<text x="280" y="268" text-anchor="middle" class="lbl">more matched qualifiers, then input order — the bare default directory wins only by forfeit</text>' +
		'<defs><marker id="dgArrowAndRQ" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'resource-qualifiers',
		title: 'Resource Resolution: How Android Picks the File',
		nav: 'resource qualifiers',
		difficulty: 'Hard',
		category: 'Resources & Permissions',
		task: 'Implement BestMatch: eliminate contradicting resource directories, walk qualifier precedence locale > swdp > orientation > night > density > version (density best-matches instead of eliminating), tie-break deterministically.',

		prose: [
			'<h2>Resource Resolution: How Android Picks the File</h2>' +
			'<p>A bug lands in triage: "tablet layout gone for French users." Nobody ' +
			'touched the tablet layout. What shipped was localization — a new ' +
			'<code>layout-fr/</code> directory — and suddenly French tablets load the ' +
			'phone layout. The code under suspicion is one innocent line:</p>',
			{ lang: 'kotlin', code: 'class MainActivity : AppCompatActivity() {\n    override fun onCreate(savedInstanceState: Bundle?) {\n        super.onCreate(savedInstanceState)\n        setContentView(R.layout.main)   // ...but WHICH main.xml?\n    }\n}' },
			'<p>Because the answer lives in the res/ tree, not in the code:</p>',
			{ lang: 'txt', code: 'res/layout/main.xml\nres/layout-fr/main.xml\nres/layout-sw600dp/main.xml\nres/layout-land-night/main.xml\nres/layout-fr-land/main.xml\n\ndevice: locale fr · sw600dp tablet · landscape · dark theme · 240dpi · API 31\nwhich file loads?  (nearly everyone guesses sw600dp — it is fr-land)' },
			'<p>Android resolves this with a documented <em>elimination</em> ' +
			'algorithm — not a similarity score. Directories are never ranked by how ' +
			'many qualifiers they match overall; they are killed off one qualifier ' +
			'at a time, in a fixed precedence order:</p>' +
			'<ul>' +
			'<li><strong>Step 1 — eliminate contradictions.</strong> A directory ' +
			'that <em>contradicts</em> the device is dead on arrival: wrong locale, ' +
			'wrong orientation, <code>sw</code> larger than the device\'s smallest ' +
			'width, <code>v</code> above the device\'s API level, <code>night</code> ' +
			'on a device not in dark theme (an <em>absent</em> night qualifier never ' +
			'contradicts). One qualifier is exempt: <strong>density never ' +
			'eliminates</strong> — any bitmap can be rescaled, so a "wrong" density ' +
			'is merely a worse match, never a fatal one.</li>' +
			'<li><strong>Step 2 — walk precedence, high to low:</strong> locale ' +
			'&gt; swdp &gt; orientation &gt; night &gt; density &gt; version. At ' +
			'each step, if <em>any</em> surviving candidate specifies the qualifier, ' +
			'every candidate that does <em>not</em> specify it is eliminated — even ' +
			'if it matches five other things. For <code>sw</code>, keep only the ' +
			'<em>largest</em> value at or below the device. For density, best-match ' +
			'instead of eliminating: prefer the largest density at or below the ' +
			'device; if none fits below, the smallest one above; a candidate with no ' +
			'density loses to any candidate that has one at this step.</li>' +
			'<li><strong>Step 3 — tie-break.</strong> The bare default directory ' +
			'wins only when nothing else survives. Any remaining tie goes to the ' +
			'candidate with more matched qualifiers, then to input order.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>Run the bug through it: at the locale step, <code>fr</code> and ' +
			'<code>fr-land</code> specify the device\'s locale — so ' +
			'<code>sw600dp</code> and <code>land-night</code> are eliminated ' +
			'<em>immediately</em>, no matter how tablet-perfect they look. Then the ' +
			'orientation step drops bare <code>fr</code>, and ' +
			'<code>layout-fr-land/main.xml</code> loads. The fix, once you know the ' +
			'algorithm, is obvious and mechanical: the tablet layout must exist ' +
			'<em>inside</em> the locale dimension too (<code>layout-fr-sw600dp/</code>) ' +
			'or the locale must not fork the layout at all.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>BestMatch(device, candidates)</code> over the modeled ' +
			'subset — locales <code>fr</code>/<code>de</code>/<code>en</code>, ' +
			'<code>sw&lt;N&gt;dp</code>, <code>land</code>/<code>port</code>, ' +
			'<code>night</code>, the five density names, <code>v&lt;N&gt;</code>. ' +
			'Candidates are hyphen-joined qualifier strings in canonical order ' +
			'(<code>"fr-land"</code>, <code>"night-v31"</code>, <code>""</code> for ' +
			'the default directory). Return the winning candidate string.</p>' +
			'<div class="tip">Resist the urge to score-and-sort — implement the ' +
			'elimination literally. Every classic resolution bug (the vanished ' +
			'tablet layout, the night-only crash, the wrong drawable on a Pixel) is ' +
			'a case where a human ranked by <em>similarity</em> and the algorithm ' +
			'ranked by <em>precedence</em>.</div>',
		],

		starter: [
			'package main',
			'',
			'// Config is the DEVICE configuration a resource lookup runs against.',
			'type Config struct {',
			'	Locale      string // "fr", "de", "en"',
			'	SwDp        int    // smallest width in dp (sw600dp-class tablet: 600)',
			'	Orientation string // "land" | "port"',
			'	Night       bool   // dark theme active',
			'	DensityDpi  int    // 120 ldpi .. 480 xxhdpi',
			'	Version     int    // API level, e.g. 31',
			'}',
			'',
			'// densityDpi maps this subset\'s density qualifier names to their dpi.',
			'var densityDpi = map[string]int{',
			'	"ldpi": 120, "mdpi": 160, "hdpi": 240, "xhdpi": 320, "xxhdpi": 480,',
			'}',
			'',
			'// BestMatch returns the winning resource directory for this device.',
			'// Each candidate is "" (the default directory) or a hyphen-joined',
			'// qualifier string in canonical order: locale, sw<N>dp, land|port,',
			'// night, density name, v<N> — e.g. "fr-land", "sw600dp", "night-v31".',
			'//',
			'// The pinned algorithm (the documented one, over this subset):',
			'//',
			'//  1. ELIMINATE candidates that CONTRADICT the device: wrong locale,',
			'//     sw > device SwDp, wrong orientation, night when the device is',
			'//     not in night mode (absent night never contradicts), v > device',
			'//     Version. Density NEVER eliminates.',
			'//  2. Walk precedence high -> low:',
			'//       locale > swdp > orientation > night > density > version.',
			'//     At each step, if ANY survivor specifies the qualifier,',
			'//     eliminate every survivor that does NOT — with two twists:',
			'//       - swdp: keep only the LARGEST sw <= device.',
			'//       - density: never eliminate by contradiction; pick the best',
			'//         density instead — the largest specified density <= device,',
			'//         or if none fits below, the SMALLEST one above. Candidates',
			'//         with no density lose to any candidate that has one.',
			'//  3. "" wins only when nothing else survives. Break remaining ties',
			'//     by more matched qualifiers, then first in input order. If step 1',
			'//     eliminated everything, return "".',
			'func BestMatch(device Config, candidates []string) string {',
			'	// your code here',
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
			'	// The bug from the prose: a French sw600dp tablet, landscape,',
			'	// dark theme, 240dpi, API 31 — shared by the first two cases.',
			'	frTablet := Config{Locale: "fr", SwDp: 600, Orientation: "land", Night: true, DensityDpi: 240, Version: 31}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"the prose bug, worked end to end: locale survives first, then orientation splits the fr pair — fr-land beats bare fr (and every tablet-ish candidate)",',
			'			"fr-land",',
			'			func() string {',
			'				return BestMatch(frTablet, []string{"", "fr", "sw600dp", "land-night", "fr-land"})',
			'			}},',
			'		{"the classic surprise: a five-qualifier near-perfect match loses to a bare locale directory, because precedence is a walk, not a similarity score",',
			'			"fr",',
			'			func() string {',
			'				return BestMatch(frTablet, []string{"sw600dp-land-night-hdpi-v31", "fr", ""})',
			'			}},',
			'		{"locale outranks everything below it: night-v31 looks more specific but has no locale, so it dies at the FIRST precedence step; then night picks de-night over de",',
			'			"de-night",',
			'			func() string {',
			'				return BestMatch(Config{Locale: "de", SwDp: 411, Orientation: "port", Night: true, DensityDpi: 480, Version: 34},',
			'					[]string{"de", "de-night", "night-v31", ""})',
			'			}},',
			'		{"smallest-width: sw800dp contradicts a 720dp device and dies at step one; among survivors the LARGEST sw at or below the device wins",',
			'			"sw720dp",',
			'			func() string {',
			'				return BestMatch(Config{Locale: "en", SwDp: 720, Orientation: "land", Night: false, DensityDpi: 240, Version: 34},',
			'					[]string{"sw600dp", "sw720dp", "sw800dp", ""})',
			'			}},',
			'		{"land-night contradicts a portrait device at step one even though its night half matches the dark theme — bare night takes it",',
			'			"night",',
			'			func() string {',
			'				return BestMatch(Config{Locale: "en", SwDp: 360, Orientation: "port", Night: true, DensityDpi: 160, Version: 30},',
			'					[]string{"land-night", "night", ""})',
			'			}},',
			'		{"density never eliminates: on an xhdpi (320) device the best match is the LARGEST density at or below — hdpi beats both ldpi and xxhdpi",',
			'			"hdpi",',
			'			func() string {',
			'				return BestMatch(Config{Locale: "en", SwDp: 411, Orientation: "port", Night: false, DensityDpi: 320, Version: 34},',
			'					[]string{"ldpi", "hdpi", "xxhdpi", ""})',
			'			}},',
			'		{"nothing fits below an ldpi (120) device: take the SMALLEST density above and scale down — hdpi beats xxhdpi",',
			'			"hdpi",',
			'			func() string {',
			'				return BestMatch(Config{Locale: "en", SwDp: 411, Orientation: "port", Night: false, DensityDpi: 120, Version: 34},',
			'					[]string{"hdpi", "xxhdpi", ""})',
			'			}},',
			'		{"the default wins only by forfeit: every qualified candidate contradicts this phone, so the bare directory is all that survives",',
			'			"",',
			'			func() string {',
			'				return BestMatch(Config{Locale: "en", SwDp: 360, Orientation: "port", Night: false, DensityDpi: 160, Version: 24},',
			'					[]string{"fr", "sw600dp", "land", "night", "v31", ""})',
			'			}},',
			'		{"a full tie: both survive every step (same density, both versioned) — matched-count is equal, so INPUT ORDER decides and the first listed wins",',
			'			"hdpi-v19",',
			'			func() string {',
			'				return BestMatch(Config{Locale: "en", SwDp: 411, Orientation: "port", Night: false, DensityDpi: 240, Version: 34},',
			'					[]string{"hdpi-v19", "hdpi-v21"})',
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
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// Config is the DEVICE configuration a resource lookup runs against.',
			'type Config struct {',
			'	Locale      string // "fr", "de", "en"',
			'	SwDp        int    // smallest width in dp (sw600dp-class tablet: 600)',
			'	Orientation string // "land" | "port"',
			'	Night       bool   // dark theme active',
			'	DensityDpi  int    // 120 ldpi .. 480 xxhdpi',
			'	Version     int    // API level, e.g. 31',
			'}',
			'',
			'// densityDpi maps this subset\'s density qualifier names to their dpi.',
			'var densityDpi = map[string]int{',
			'	"ldpi": 120, "mdpi": 160, "hdpi": 240, "xhdpi": 320, "xxhdpi": 480,',
			'}',
			'',
			'// cand is one parsed candidate directory. The zero value of each field',
			'// doubles as "not specified" — safe here because no real qualifier',
			'// parses to a zero (sw0dp, v0 and dpi 0 do not occur in the grammar).',
			'type cand struct {',
			'	raw     string',
			'	locale  string',
			'	sw      int',
			'	orient  string',
			'	night   bool',
			'	density int',
			'	version int',
			'	matched int // how many qualifiers this candidate specifies',
			'}',
			'',
			'// isDigits reports whether s is one or more ASCII digits — the only',
			'// number syntax the qualifier grammar allows.',
			'func isDigits(s string) bool {',
			'	if s == "" {',
			'		return false',
			'	}',
			'	for i := 0; i < len(s); i++ {',
			'		if s[i] < \'0\' || s[i] > \'9\' {',
			'			return false',
			'		}',
			'	}',
			'	return true',
			'}',
			'',
			'// parseCand classifies each hyphen-separated token. Order matters in',
			'// the switch: the keyword-shaped tokens (orientation, night, density',
			'// names) are checked before the pattern-shaped ones (sw<N>dp, v<N>),',
			'// and locale is the fallthrough — mirroring how aapt disambiguates',
			'// the real grammar, where position in canonical order does that job.',
			'func parseCand(raw string) cand {',
			'	c := cand{raw: raw}',
			'	if raw == "" {',
			'		return c // the default directory specifies nothing',
			'	}',
			'	for _, tok := range strings.Split(raw, "-") {',
			'		switch {',
			'		case tok == "land" || tok == "port":',
			'			c.orient = tok',
			'		case tok == "night":',
			'			c.night = true',
			'		case densityDpi[tok] != 0:',
			'			c.density = densityDpi[tok]',
			'		case strings.HasPrefix(tok, "sw") && strings.HasSuffix(tok, "dp") && isDigits(tok[2:len(tok)-2]):',
			'			n, _ := strconv.Atoi(tok[2 : len(tok)-2])',
			'			c.sw = n',
			'		case len(tok) > 1 && tok[0] == \'v\' && isDigits(tok[1:]):',
			'			n, _ := strconv.Atoi(tok[1:])',
			'			c.version = n',
			'		default:',
			'			c.locale = tok',
			'		}',
			'		c.matched++',
			'	}',
			'	return c',
			'}',
			'',
			'// BestMatch is the documented elimination algorithm over the subset.',
			'// The design is deliberately a FUNNEL, not a scorer: candidates only',
			'// ever leave the slice, and each precedence step consults just one',
			'// qualifier — which is exactly why a bare locale directory can beat a',
			'// five-qualifier near-match, and why that behavior is correct.',
			'func BestMatch(device Config, candidates []string) string {',
			'	// Step 1: contradiction filter. A contradicting directory is not a',
			'	// "worse match", it is WRONG (French strings on a German device),',
			'	// so it dies before precedence is even consulted. Density is the',
			'	// designed exception: bitmaps rescale, text does not — so a bad',
			'	// density is survivable and handled by best-match in step 2.',
			'	alive := []cand{}',
			'	for _, raw := range candidates {',
			'		c := parseCand(raw)',
			'		if c.locale != "" && c.locale != device.Locale {',
			'			continue',
			'		}',
			'		if c.sw > device.SwDp {',
			'			continue // a 600dp-wide layout cannot render on a 360dp phone',
			'		}',
			'		if c.orient != "" && c.orient != device.Orientation {',
			'			continue',
			'		}',
			'		if c.night && !device.Night {',
			'			continue // night-only; an ABSENT night qualifier never contradicts',
			'		}',
			'		if c.version > device.Version {',
			'			continue // resources may use APIs the device does not have',
			'		}',
			'		alive = append(alive, c)',
			'	}',
			'',
			'	// keepIf retains survivors satisfying pred — the one move every',
			'	// precedence step makes. Input order is preserved throughout,',
			'	// which is what makes the final tie-break deterministic for free.',
			'	keepIf := func(pred func(cand) bool) {',
			'		kept := []cand{}',
			'		for _, c := range alive {',
			'			if pred(c) {',
			'				kept = append(kept, c)',
			'			}',
			'		}',
			'		alive = kept',
			'	}',
			'',
			'	// Step 2: the precedence walk. Each step asks one question — does',
			'	// ANY survivor specify this qualifier? If yes, specifying it is',
			'	// now mandatory: candidates that do not are eliminated even if',
			'	// they match everything else. This is the rule that makes the',
			'	// walk a strict hierarchy rather than a vote.',
			'',
			'	// locale — the top of the hierarchy: language correctness beats',
			'	// every layout concern below it.',
			'	anyLocale := false',
			'	for _, c := range alive {',
			'		if c.locale != "" {',
			'			anyLocale = true',
			'		}',
			'	}',
			'	if anyLocale {',
			'		keepIf(func(c cand) bool { return c.locale != "" })',
			'	}',
			'',
			'	// swdp — survivors all have sw <= device (step 1 guaranteed it),',
			'	// so "best" is simply the largest: the most specific layout that',
			'	// still fits. Keeping only the max also eliminates non-specifiers',
			'	// (their sw is 0), collapsing the two rules into one comparison.',
			'	bestSw := 0',
			'	for _, c := range alive {',
			'		if c.sw > bestSw {',
			'			bestSw = c.sw',
			'		}',
			'	}',
			'	if bestSw > 0 {',
			'		keepIf(func(c cand) bool { return c.sw == bestSw })',
			'	}',
			'',
			'	// orientation',
			'	anyOrient := false',
			'	for _, c := range alive {',
			'		if c.orient != "" {',
			'			anyOrient = true',
			'		}',
			'	}',
			'	if anyOrient {',
			'		keepIf(func(c cand) bool { return c.orient != "" })',
			'	}',
			'',
			'	// night',
			'	anyNight := false',
			'	for _, c := range alive {',
			'		if c.night {',
			'			anyNight = true',
			'		}',
			'	}',
			'	if anyNight {',
			'		keepIf(func(c cand) bool { return c.night })',
			'	}',
			'',
			'	// density — the special step: best-match, never eliminate-by-wrong.',
			'	// Prefer the largest density at or below the device (downscaling',
			'	// an asset built for a denser screen than needed wastes memory, so',
			'	// the closest fit from below wins); only when nothing fits below',
			'	// take the smallest above (upscaling from far below looks worst).',
			'	// A candidate with no density at all loses to any specified one.',
			'	anyDensity := false',
			'	for _, c := range alive {',
			'		if c.density != 0 {',
			'			anyDensity = true',
			'		}',
			'	}',
			'	if anyDensity {',
			'		bestBelow, bestAbove := 0, 0',
			'		for _, c := range alive {',
			'			if c.density == 0 {',
			'				continue',
			'			}',
			'			if c.density <= device.DensityDpi && c.density > bestBelow {',
			'				bestBelow = c.density',
			'			}',
			'			if c.density > device.DensityDpi && (bestAbove == 0 || c.density < bestAbove) {',
			'				bestAbove = c.density',
			'			}',
			'		}',
			'		want := bestBelow',
			'		if want == 0 {',
			'			want = bestAbove',
			'		}',
			'		keepIf(func(c cand) bool { return c.density == want })',
			'	}',
			'',
			'	// version — plain specifies-or-dies in this modeled subset (step 1',
			'	// already removed versions above the device).',
			'	anyVersion := false',
			'	for _, c := range alive {',
			'		if c.version != 0 {',
			'			anyVersion = true',
			'		}',
			'	}',
			'	if anyVersion {',
			'		keepIf(func(c cand) bool { return c.version != 0 })',
			'	}',
			'',
			'	// Step 3: whatever remains. The default "" reaches this point only',
			'	// when no step found a specifier (it specifies nothing, so any',
			'	// specifying survivor would have eliminated it) — "wins only by',
			'	// forfeit" falls out of the walk rather than needing a rule.',
			'	if len(alive) == 0 {',
			'		return "" // step 1 killed everything, default directory or not',
			'	}',
			'	best := alive[0]',
			'	for _, c := range alive[1:] {',
			'		// Strictly-greater keeps the earliest on equal counts: the',
			'		// pinned "more matched qualifiers, then input order" tie-break',
			'		// in one comparison, since alive preserves input order.',
			'		if c.matched > best.matched {',
			'			best = c',
			'		}',
			'	}',
			'	return best.raw',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What actually runs in the framework</h3>' +
			'<p>The algorithm you implemented is the one documented in "Providing ' +
			'alternative resources" and executed in native code — ' +
			'<code>ResTable::getEntry</code> walking ' +
			'<code>ResTable_config::isBetterThan</code> inside AssetManager2 — every ' +
			'single time any code touches <code>R.anything</code>. It runs at ' +
			'<code>setContentView</code>, at every <code>getString</code>, at every ' +
			'drawable inflate; the results are cached per Configuration, and a ' +
			'configuration change (rotate, locale switch, dark-theme toggle) drops ' +
			'the cache and re-resolves the world — which is precisely why those ' +
			'events recreate Activities in the lifecycle item.</p>' +
			'<h3>The bugs this algorithm generates, over and over</h3>' +
			'<ul>' +
			'<li><strong>The vanished tablet layout</strong> (the prose bug): adding ' +
			'<code>layout-fr/</code> makes locale mandatory at the locale step, ' +
			'eliminating <code>layout-sw600dp/</code> for French users. Locale is ' +
			'the highest-precedence qualifier in this subset (only MCC/MNC outrank ' +
			'it in the real table), so forking a resource on locale silently opts it ' +
			'out of every dimension below. The rule of thumb reviewers apply: ' +
			'<em>never fork layouts on locale; fork strings.</em></li>' +
			'<li><strong>The night-only crash:</strong> <code>values-night/</code> ' +
			'defining a color that <code>values/</code> lacks. In day mode the night ' +
			'directory contradicts and the lookup lands on a default that does not ' +
			'define the resource — <code>Resources$NotFoundException</code> at ' +
			'inflate time, on exactly half your users\' theme settings.</li>' +
			'<li><strong>Density feels "backwards" until you implement it:</strong> ' +
			'density never eliminates, so a mismatched drawable is always available ' +
			'— just rescaled. The subset pins the documented preference (largest at ' +
			'or below, else smallest above); the modern runtime actually prefers ' +
			'scaling a <em>higher</em> density down for quality, one of several ' +
			'places the real <code>isBetterThan</code> is subtler than the doc.</li>' +
			'<li><strong>Version ties:</strong> the real resolver keeps walking and ' +
			'prefers the highest <code>v&lt;N&gt;</code> at or below the device; ' +
			'this subset pins a flat specifies-or-dies step with a deterministic ' +
			'input-order tie-break, so the harness stays order-stable — the walk ' +
			'shape, which is what transfers, is identical.</li>' +
			'</ul>' +
			'<h3>Why elimination, not scoring</h3>' +
			'<p>A similarity score would let five weak matches outvote one critical ' +
			'one — and serve English text to a French user because the layout ' +
			'matched. The strict walk encodes a value judgment: correctness ' +
			'dimensions (language, fitting on the screen at all, API availability) ' +
			'are handled as contradictions or top precedence, cosmetic dimensions ' +
			'(density) degrade gracefully at the bottom. When an interviewer asks ' +
			'"which file loads?", they are really asking whether you know it is a ' +
			'funnel — and when you can answer <em>"walk it: who dies at step one, ' +
			'who dies at locale, who dies at orientation"</em>, resolution bugs stop ' +
			'being mysteries and become table lookups.</p>',
		],
		complexity: { time: 'O(q·n) — parse each of n candidates once, then six linear passes over survivors', space: 'O(n) for the parsed candidate list' },
	});
})();
