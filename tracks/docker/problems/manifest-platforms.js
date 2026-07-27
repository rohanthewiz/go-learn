/* Multi-arch Manifests — Networking & Distribution (Medium). One tag,
 * many images: `docker pull nginx` fetches DIFFERENT bytes on an M-series
 * Mac and an amd64 server, because the tag resolves to a manifest list
 * (OCI image index) mapping platforms to content-addressed manifest
 * digests. The learner implements containerd's platform matcher —
 * exact OS/arch, arm64 v8 ≡ "", the 32-bit arm v8→v7→v6 fallback chain —
 * plus DigestPinned, the supply-chain distinction between a mutable tag
 * and an immutable digest.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// One tag fanning out to per-platform manifests; the pulling host picks
	// exactly one. Marker ids namespaced (dgArrowDKMP) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 240" width="520" height="240" role="img" aria-label="a tag points at a manifest list; the list maps each platform to a per-platform manifest digest; the pulling host selects exactly one entry">' +
		'<text x="20" y="22" class="lbl">one tag, many images: the index maps platform → manifest digest</text>' +
		// the tag: the only mutable pointer in the picture
		'<rect x="20" y="36" width="120" height="36" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="80" y="59" text-anchor="middle">nginx:1.27</text>' +
		'<text x="80" y="88" text-anchor="middle" class="lbl" style="fill:var(--warn)">tag (mutable)</text>' +
		// the manifest list / image index
		'<rect x="230" y="36" width="180" height="36" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="320" y="59" text-anchor="middle">manifest list</text>' +
		'<text x="320" y="88" text-anchor="middle" class="lbl">sha256:91ef… (the index)</text>' +
		'<path d="M 144 54 L 224 54" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKMP)"/>' +
		// three per-platform manifests, each content-addressed
		'<rect x="20" y="130" width="150" height="46" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="95" y="150" text-anchor="middle">linux/amd64</text>' +
		'<text x="95" y="168" text-anchor="middle" class="lbl">sha256:0aab…</text>' +
		'<rect x="190" y="130" width="150" height="46" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="265" y="150" text-anchor="middle">linux/arm64/v8</text>' +
		'<text x="265" y="168" text-anchor="middle" class="lbl">sha256:3de8…</text>' +
		'<rect x="360" y="130" width="140" height="46" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="430" y="150" text-anchor="middle">linux/arm/v7</text>' +
		'<text x="430" y="168" text-anchor="middle" class="lbl">sha256:2cd7…</text>' +
		// index → manifests fan-out
		'<path d="M 280 76 C 220 96 140 108 100 126" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKMP)"/>' +
		'<path d="M 320 76 L 300 124" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKMP)"/>' +
		'<path d="M 360 76 C 400 96 420 108 430 126" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKMP)"/>' +
		// the host picks exactly one
		'<path d="M 265 204 L 265 182" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDKMPok)"/>' +
		'<text x="265" y="218" text-anchor="middle" class="lbl" style="fill:var(--ok)">an M-series Mac (linux/arm64) fetches ONLY these bytes</text>' +
		'<text x="20" y="236" class="lbl">everything below the tag is content-addressed — repoint the tag and every digest under it can change</text>' +
		'<defs>' +
		'<marker id="dgArrowDKMP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowDKMPok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'manifest-platforms',
		title: 'Multi-arch Manifests: how a pull picks a platform',
		nav: 'manifest lists',
		difficulty: 'Medium',
		category: 'Networking & Distribution',
		task: 'Implement Select — containerd\'s platform matcher (exact OS/arch, arm64 v8 ≡ "", 32-bit arm falls DOWN the v8→v7→v6 chain, first equal candidate wins) — and DigestPinned.',

		prose: [
			'<h2>Multi-arch Manifests: how a pull picks a platform</h2>' +
			'<p>The first M-series Mac arrives on the team, and ' +
			'<code>docker pull registry.internal/payments:1.4</code> greets it with ' +
			'<code>no matching manifest for linux/arm64/v8 in the manifest list ' +
			'entries</code> — the same tag CI pulls all day. Meanwhile ' +
			'<code>docker pull nginx</code> works on both machines, and that is the ' +
			'stranger fact: the Mac and the amd64 CI box downloaded ' +
			'<strong>different bytes under the same tag</strong>. A tag does not ' +
			'name an image. It names a <strong>manifest list</strong> (the OCI ' +
			'<em>image index</em>): a small JSON array of descriptors, each mapping ' +
			'a platform to the content-addressed digest of that platform\'s real ' +
			'manifest. The daemon picks one entry, then pulls only those layers:</p>',
			{ lang: 'txt', code: '$ docker manifest inspect nginx:1.27        (abridged)\n{ "manifests": [\n  { "digest": "sha256:0aab…", "platform": { "os": "linux", "architecture": "amd64" } },\n  { "digest": "sha256:2cd7…", "platform": { "os": "linux", "architecture": "arm", "variant": "v7" } },\n  { "digest": "sha256:3de8…", "platform": { "os": "linux", "architecture": "arm64", "variant": "v8" } }\n] }' },
			'<p>The selection rules are containerd\'s matcher, and the corners are ' +
			'where real pulls go wrong:</p>' +
			'<ul>' +
			'<li><strong>OS and Arch must match exactly.</strong> No cross-OS, no ' +
			'cross-architecture magic — <code>linux/amd64</code> never satisfies a ' +
			'<code>linux/arm64</code> request.</li>' +
			'<li><strong>arm64: <code>"v8"</code> and <code>""</code> are the same ' +
			'platform.</strong> Publishers write the variant inconsistently, so the ' +
			'matcher normalizes both to empty — in either direction: a bare ' +
			'<code>arm64</code> request takes a <code>v8</code> descriptor and ' +
			'vice&nbsp;versa.</li>' +
			'<li><strong>32-bit arm falls DOWN the chain v8→v7→v6.</strong> A v7 ' +
			'CPU runs v6 binaries; a v6 CPU cannot run v7. Prefer the exact ' +
			'variant, then the <em>nearest lower</em> one — never a higher one. An ' +
			'<strong>empty variant on arm means v7</strong> (docker\'s default), ' +
			'for the request and for descriptors alike.</li>' +
			'<li><strong>Ties: first in the list wins.</strong> Among equally good ' +
			'candidates the index order decides — the order the publisher wrote.</li>' +
			'<li><strong>No candidate ⇒ empty digest.</strong> That empty result ' +
			'<em>is</em> the <code>no matching manifest</code> error above: the ' +
			'payments image was built amd64-only.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Select(descs, want)</code> — return the digest of ' +
			'the best descriptor under the rules above, or <code>""</code> when ' +
			'nothing matches — and <code>DigestPinned(ref)</code>: true iff the ' +
			'ref contains <code>@sha256:</code>. A tag is a mutable pointer the ' +
			'registry can silently repoint; a digest names the bytes themselves ' +
			'and can never resolve to anything else.</p>' +
			'<div class="tip">Modern <code>buildx</code> indexes also carry ' +
			'<code>unknown/unknown</code> entries — provenance and SBOM ' +
			'attestations riding in the same list. They never match a real ' +
			'platform, which is exactly why the matcher\'s strict OS/arch equality ' +
			'quietly skips them.</div>',
		],

		starter: [
			'package main',
			'',
			'// Desc is one entry in a manifest list (OCI image index): the',
			'// platform a per-platform manifest targets, plus the content-',
			'// addressed digest of that manifest. The index is the only thing a',
			'// tag points at — the real image bytes hang off Digest.',
			'type Desc struct {',
			'	OS      string // "linux", "windows"',
			'	Arch    string // "amd64", "arm64", "arm", "386"',
			'	Variant string // "" | "v6" | "v7" | "v8" (arm families only)',
			'	Digest  string // "sha256:…" of the per-platform manifest',
			'}',
			'',
			'// Platform is what the pulling host asks for (daemon default or',
			'// --platform flag).',
			'type Platform struct {',
			'	OS      string',
			'	Arch    string',
			'	Variant string',
			'}',
			'',
			'// Select picks the descriptor a pull would fetch and returns its',
			'// Digest, or "" when nothing matches (the "no matching manifest"',
			'// error). Rules (containerd\'s matcher, simplified):',
			'//   - OS must match exactly; Arch must match exactly',
			'//   - arm64: variant "v8" and "" are EQUIVALENT (normalize to "")',
			'//   - arm (32-bit): an empty variant means "v7" (docker\'s default);',
			'//     a request falls DOWN the chain v8→v7→v6 — exact variant first,',
			'//     then the nearest LOWER one, never a higher one',
			'//   - among equally good candidates, the first in descs wins',
			'func Select(descs []Desc, want Platform) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// DigestPinned reports whether ref pins content by digest — true iff',
			'// it contains "@sha256:". A tag can be repointed at new bytes; a',
			'// digest ref can only ever resolve to the bytes it names.',
			'func DigestPinned(ref string) bool {',
			'	// your code here',
			'	return false',
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
			'	// The shape of a real published index (think docker.io/library/',
			'	// nginx): one descriptor per platform, digests shortened for',
			'	// readable expectations.',
			'	index := []Desc{',
			'		{OS: "linux", Arch: "amd64", Variant: "", Digest: "sha256:0aab"},',
			'		{OS: "linux", Arch: "arm", Variant: "v7", Digest: "sha256:2cd7"},',
			'		{OS: "linux", Arch: "arm64", Variant: "v8", Digest: "sha256:3de8"},',
			'		{OS: "linux", Arch: "386", Variant: "", Digest: "sha256:4ef0"},',
			'	}',
			'	// An index whose arm64 entry omits the variant — publishers do both.',
			'	bare64 := []Desc{',
			'		{OS: "linux", Arch: "amd64", Variant: "", Digest: "sha256:0aab"},',
			'		{OS: "linux", Arch: "arm64", Variant: "", Digest: "sha256:5aa1"},',
			'	}',
			'	// An older image built only for armv6 (Raspberry Pi 1 era).',
			'	oldArm := []Desc{',
			'		{OS: "linux", Arch: "amd64", Variant: "", Digest: "sha256:0aab"},',
			'		{OS: "linux", Arch: "arm", Variant: "v6", Digest: "sha256:6bb2"},',
			'	}',
			'	// Both 32-bit arm variants published, v6 listed FIRST.',
			'	mixArm := []Desc{',
			'		{OS: "linux", Arch: "arm", Variant: "v6", Digest: "sha256:6bb2"},',
			'		{OS: "linux", Arch: "arm", Variant: "v7", Digest: "sha256:2cd7"},',
			'	}',
			'	// The team-mate-built-it-on-their-laptop special: amd64 only.',
			'	amdOnly := []Desc{',
			'		{OS: "linux", Arch: "amd64", Variant: "", Digest: "sha256:0aab"},',
			'	}',
			'	// Two equally good candidates: index order must decide.',
			'	dup := []Desc{',
			'		{OS: "linux", Arch: "amd64", Variant: "", Digest: "sha256:7cc3"},',
			'		{OS: "linux", Arch: "amd64", Variant: "", Digest: "sha256:8dd4"},',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	q := func(s string) string { return fmt.Sprintf("%q", s) }',
			'	cases := []tc{',
			'		{"linux/amd64 host: OS and arch must both match exactly",',
			'			"\\"sha256:0aab\\"",',
			'			func() string { return q(Select(index, Platform{OS: "linux", Arch: "amd64"})) }},',
			'		{"arm64 host with empty variant takes the v8 descriptor (v8 ≡ \\"\\")",',
			'			"\\"sha256:3de8\\"",',
			'			func() string { return q(Select(index, Platform{OS: "linux", Arch: "arm64"})) }},',
			'		{"other direction: an arm64/v8 request matches an index listing arm64 with NO variant",',
			'			"\\"sha256:5aa1\\"",',
			'			func() string { return q(Select(bare64, Platform{OS: "linux", Arch: "arm64", Variant: "v8"})) }},',
			'		{"arm/v7 host falls DOWN the chain to v6 when no v7 is published",',
			'			"\\"sha256:6bb2\\"",',
			'			func() string { return q(Select(oldArm, Platform{OS: "linux", Arch: "arm", Variant: "v7"})) }},',
			'		{"arm/v6 host must NOT take a v7 image — compatibility never runs up the chain",',
			'			"\\"\\"",',
			'			func() string { return q(Select(index, Platform{OS: "linux", Arch: "arm", Variant: "v6"})) }},',
			'		{"empty variant on arm means v7: exact v7 beats the earlier-listed v6",',
			'			"\\"sha256:2cd7\\"",',
			'			func() string { return q(Select(mixArm, Platform{OS: "linux", Arch: "arm"})) }},',
			'		{"no candidate: linux/arm64 against an amd64-only image — the \\"no matching manifest\\" error",',
			'			"\\"\\"",',
			'			func() string { return q(Select(amdOnly, Platform{OS: "linux", Arch: "arm64"})) }},',
			'		{"two equally good candidates: the FIRST descriptor in the list wins",',
			'			"\\"sha256:7cc3\\"",',
			'			func() string { return q(Select(dup, Platform{OS: "linux", Arch: "amd64"})) }},',
			'		{"DigestPinned: an @sha256: ref can never be repointed",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", DigestPinned("nginx@sha256:91ef0af61f39ece4d6710e465df5ed6ca12112358344fd51ae6a3b886634148b")) }},',
			'		{"DigestPinned: a tag is a mutable pointer",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", DigestPinned("nginx:1.27")) }},',
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
			'import "strings"',
			'',
			'// Desc is one entry in a manifest list (OCI image index): the',
			'// platform a per-platform manifest targets, plus the content-',
			'// addressed digest of that manifest.',
			'type Desc struct {',
			'	OS      string',
			'	Arch    string',
			'	Variant string',
			'	Digest  string',
			'}',
			'',
			'// Platform is what the pulling host asks for.',
			'type Platform struct {',
			'	OS      string',
			'	Arch    string',
			'	Variant string',
			'}',
			'',
			'// normalize canonicalizes the two spellings publishers actually use,',
			'// exactly as containerd\'s platforms package does. Applying the SAME',
			'// normalization to the request and to every descriptor is the whole',
			'// trick: after it, "equivalent" simply means "equal".',
			'//   - arm64 "v8" → "":  there is only one arm64 ISA level in the wild,',
			'//     so the variant carries no information and is dropped',
			'//   - arm ""   → "v7": docker\'s long-standing default for 32-bit arm —',
			'//     a bare linux/arm request (or descriptor) means armv7',
			'func normalize(p Platform) Platform {',
			'	if p.Arch == "arm64" && p.Variant == "v8" {',
			'		p.Variant = ""',
			'	}',
			'	if p.Arch == "arm" && p.Variant == "" {',
			'		p.Variant = "v7"',
			'	}',
			'	return p',
			'}',
			'',
			'// armRank orders the 32-bit arm variant chain v6 < v7 < v8 so',
			'// "can this CPU run that image" becomes plain integer comparison:',
			'// a candidate is runnable iff its rank is <= the host\'s rank.',
			'// Unknown variants rank 0 — they never participate in fallback and',
			'// can only be chosen by exact string equality (handled earlier).',
			'func armRank(v string) int {',
			'	switch v {',
			'	case "v6":',
			'		return 6',
			'	case "v7":',
			'		return 7',
			'	case "v8":',
			'		return 8',
			'	}',
			'	return 0',
			'}',
			'',
			'// Select is the daemon\'s choice at pull time: scan the index once,',
			'// keep the best candidate, return its digest ("" = the "no matching',
			'// manifest" error). Scoring: 0 for an exact (post-normalization)',
			'// variant match, otherwise the DISTANCE down the arm chain — so v7',
			'// beats v6 for a v7 host, and anything above the host loses outright.',
			'// The strict < when comparing scores is what makes the first-listed',
			'// candidate win ties: a later equal score never displaces an earlier one.',
			'func Select(descs []Desc, want Platform) string {',
			'	w := normalize(want)',
			'	best := ""',
			'	bestScore := -1 // -1 = nothing found yet',
			'	for _, d := range descs {',
			'		c := normalize(Platform{OS: d.OS, Arch: d.Arch, Variant: d.Variant})',
			'		// Hard walls first: no cross-OS, no cross-arch. This is also',
			'		// what silently skips buildx\'s unknown/unknown attestation',
			'		// entries — "unknown" never equals a real OS.',
			'		if c.OS != w.OS || c.Arch != w.Arch {',
			'			continue',
			'		}',
			'		score := 0',
			'		if c.Variant != w.Variant {',
			'			// Only 32-bit arm has a compatibility chain; everywhere',
			'			// else a variant mismatch is a miss.',
			'			if w.Arch != "arm" {',
			'				continue',
			'			}',
			'			wr := armRank(w.Variant)',
			'			cr := armRank(c.Variant)',
			'			// cr > wr is the load-bearing comparison: a v6 CPU',
			'			// faulting on v7 instructions is a hardware fact, so',
			'			// compatibility runs DOWN the chain only.',
			'			if wr == 0 || cr == 0 || cr > wr {',
			'				continue',
			'			}',
			'			score = wr - cr // 1 = one step down, 2 = two steps down',
			'		}',
			'		if bestScore == -1 || score < bestScore {',
			'			bestScore = score',
			'			best = d.Digest',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
			'// DigestPinned: "@sha256:" in the ref means content addressing all the',
			'// way down — the registry can repoint a tag at new bytes tomorrow, but',
			'// a digest ref resolves to exactly one manifest forever (or 404s).',
			'// This one check is why production deploy specs and hardened FROM',
			'// lines pin digests: it converts "whatever the tag says today" into',
			'// an immutable, auditable identity.',
			'func DigestPinned(ref string) bool {',
			'	return strings.Contains(ref, "@sha256:")',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why everything below the tag is content-addressed</h3>' +
			'<p>The distribution model is a Merkle tree: a tag points at an index ' +
			'digest, the index lists per-platform manifest digests, each manifest ' +
			'lists layer digests. Naming every node by the hash of its bytes buys ' +
			'the registry world its core properties for free: layers dedupe across ' +
			'images (same digest = same blob, stored once), caches never revalidate ' +
			'(bytes matching a sha256 can\'t have changed), and any node can be ' +
			'fetched from an untrusted mirror and verified locally. The ' +
			'<strong>tag is the single mutable pointer</strong> bolted onto that ' +
			'immutable tree — which is exactly why <code>Select</code> can be pure ' +
			'logic over descriptors: once the index is fetched, everything else is ' +
			'just following hashes.</p>' +
			'<h3>Why the variant rules are so lopsided</h3>' +
			'<p>The arm64 rule exists because there is effectively one 64-bit arm ' +
			'ISA level in the wild, and publishers split roughly evenly between ' +
			'writing <code>"variant": "v8"</code> and omitting it — so containerd ' +
			'normalizes both to empty and moves on. The 32-bit chain is real ' +
			'hardware history: armv6 (original Raspberry Pi) lacks instructions ' +
			'armv7 binaries use, so a v6 CPU running a v7 image dies with ' +
			'<code>SIGILL</code>, while the reverse runs fine — compatibility is a ' +
			'one-way street down the chain, and the matcher encodes that street ' +
			'direction as <code>cr &gt; wr → skip</code>. The famous field failure ' +
			'is exactly this: a Pi&nbsp;1 pulling an image whose index only offers ' +
			'<code>arm/v7</code> gets <code>no matching manifest</code> — and the ' +
			'fix is publishing a v6 build, not fighting the matcher. First-wins ' +
			'tie-breaking matters too: the publisher\'s index order is part of the ' +
			'contract, and <code>buildx</code> writes it deterministically.</p>' +
			'<h3>When debugging</h3>' +
			'<p><code>docker manifest inspect &lt;ref&gt;</code> shows you the ' +
			'index the matcher sees — the first move whenever a pull behaves ' +
			'differently on two machines. <code>no matching manifest for ' +
			'linux/arm64/v8</code> means the index has no arm64 entry: rebuild ' +
			'with <code>docker buildx build --platform linux/amd64,linux/arm64</code>, ' +
			'or force <code>docker pull --platform linux/amd64</code> and run under ' +
			'emulation (Rosetta/QEMU) — and know that the emulation path is also ' +
			'where <code>exec format error</code> comes from when a single-arch ' +
			'amd64 image lands on an arm host <em>without</em> binfmt set up. ' +
			'Don\'t be surprised by <code>unknown/unknown</code> entries in modern ' +
			'indexes: they are buildx provenance/SBOM attestations sharing the ' +
			'list, skipped by the same OS/arch equality you implemented. And the ' +
			'supply-chain angle of <code>DigestPinned</code> is not theoretical: a ' +
			'registry (or an attacker with push rights) can repoint ' +
			'<code>:1.4</code> at different bytes tonight, and every un-pinned ' +
			'puller follows silently — which is why hardened deploy specs and ' +
			'<code>FROM</code> lines pin <code>@sha256:…</code> and let tooling ' +
			'propose digest bumps as reviewable diffs.</p>',
		],
		complexity: { time: 'O(n) — one pass over the descriptor list, constant work per entry', space: 'O(1)' },
	});
})();
