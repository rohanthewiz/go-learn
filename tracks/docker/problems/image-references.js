/* Image References — Images & Builds (Easy). The normalization every
 * `docker pull`, Compose file, and Kubernetes pod spec goes through before
 * anything touches the network: `nginx` is really
 * `docker.io/library/nginx:latest`, and the only thing deciding whether the
 * first path component is YOUR registry is whether it contains a dot, a
 * colon, or equals `localhost`. The harness pins the registry heuristic, the
 * `library/` prefix, the `:latest` default (and its digest exception), and
 * the Familiar rendering `docker images` shows.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// Anatomy of a full reference on top; underneath, the three defaults
	// that inflate a bare `nginx` into a fully-qualified pull target.
	// Marker id namespaced (dgArrowDKIR) because every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 236" width="520" height="236" role="img" aria-label="anatomy of an image reference: registry, repository, tag, digest — and how a bare name like nginx normalizes to docker.io/library/nginx:latest">' +
		'<text x="16" y="22" class="lbl">anatomy of a full reference — and how a bare name grows into one</text>' +
		// the four segments of a fully-spelled reference
		'<rect x="16" y="36" width="170" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="101" y="58" text-anchor="middle">myreg.example.com:5000</text>' +
		'<rect x="194" y="36" width="96" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="242" y="58" text-anchor="middle">team/app</text>' +
		'<rect x="298" y="36" width="56" height="34" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="326" y="58" text-anchor="middle">:v2</text>' +
		'<rect x="362" y="36" width="142" height="34" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="433" y="58" text-anchor="middle">@sha256:9f2c…</text>' +
		'<text x="101" y="90" text-anchor="middle" class="lbl" style="fill:var(--warn)">looks like a host → registry</text>' +
		'<text x="242" y="90" text-anchor="middle" class="lbl">repository</text>' +
		'<text x="326" y="90" text-anchor="middle" class="lbl">tag</text>' +
		'<text x="433" y="90" text-anchor="middle" class="lbl">digest — pins content</text>' +
		// normalization: what a bare name becomes
		'<rect x="16" y="126" width="76" height="32" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="54" y="147" text-anchor="middle">nginx</text>' +
		'<path d="M 96 142 L 190 142" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDKIR)"/>' +
		'<text x="143" y="134" text-anchor="middle" class="lbl">normalize</text>' +
		'<rect x="196" y="126" width="252" height="32" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="322" y="147" text-anchor="middle">docker.io/library/nginx:latest</text>' +
		'<text x="322" y="178" text-anchor="middle" class="lbl">no registry → docker.io</text>' +
		'<text x="322" y="192" text-anchor="middle" class="lbl">lone name on docker.io → library/ prefix</text>' +
		'<text x="322" y="206" text-anchor="middle" class="lbl">no tag and no digest → :latest</text>' +
		'<text x="16" y="228" class="lbl">a digest pins exact bytes — when present, the tag is display-only</text>' +
		'<defs><marker id="dgArrowDKIR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'image-references',
		title: 'Image References: registry, repo, tag, digest',
		nav: 'image references',
		difficulty: 'Easy',
		category: 'Images & Builds',
		task: 'Implement ParseRef (normalize [registry/][path/]name[:tag][@digest] — hostname heuristic, library/ prefix, :latest default) and Familiar (what docker images displays).',

		prose: [
			'<h2>Image References: registry, repo, tag, digest</h2>' +
			'<p>A deploy to the air-gapped cluster fails with <code>pull access ' +
			'denied for team/app, repository does not exist or may require ' +
			'\'docker login\'</code> — but you pushed that image to the internal ' +
			'registry an hour ago. The Compose file says <code>image: ' +
			'team/app:v2</code>, and that is the bug: with no registry prefix, ' +
			'Docker normalized it to <code>docker.io/team/app:v2</code> and asked ' +
			'Docker Hub for a repository owned by a user named <code>team</code>. ' +
			'The image was never going to come from your registry. Every reference ' +
			'— in <code>docker pull</code>, a Dockerfile <code>FROM</code>, a ' +
			'Compose file, a Kubernetes pod spec — goes through the same ' +
			'normalization before anything touches the network:</p>' +
			'<ul>' +
			'<li><strong>Split off the digest first.</strong> Everything after ' +
			'<code>@</code> is a digest (<code>sha256:…</code>). A digest ' +
			'content-addresses the exact manifest bytes; a tag is a mutable ' +
			'pointer that can move between pushes.</li>' +
			'<li><strong>The registry heuristic.</strong> The first ' +
			'<code>/</code>-separated component is a registry <em>only</em> if it ' +
			'contains a <code>.</code> or a <code>:</code>, or equals ' +
			'<code>localhost</code> — i.e. only if it could plausibly be a ' +
			'hostname. <code>grafana/grafana</code> is a Hub user, not a registry; ' +
			'<code>ghcr.io/owner/app</code> and <code>localhost/app</code> are ' +
			'registries. No registry → <code>docker.io</code>.</li>' +
			'<li><strong>The <code>library/</code> prefix.</strong> On ' +
			'<code>docker.io</code> only, a single-component repository gets ' +
			'<code>library/</code> prepended — <code>nginx</code> is really ' +
			'<code>library/nginx</code>, the namespace of official images. Other ' +
			'registries keep their path exactly as written.</li>' +
			'<li><strong>The tag default.</strong> The tag is whatever follows ' +
			'the last <code>:</code> <em>after</em> the last <code>/</code> — so ' +
			'a registry port is never mistaken for a tag. No tag and no digest → ' +
			'<code>latest</code>. A digest alone invents no tag: the digest ' +
			'already pins the content, and when both appear the tag rides along ' +
			'for display only.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>ParseRef(s)</code>, returning a fully-normalized ' +
			'<code>Ref</code> and <code>true</code> — or <code>Ref{}, false</code> ' +
			'for malformed input (empty string, empty name, empty tag like ' +
			'<code>app:</code>, a lone digest), never a panic. Then implement ' +
			'<code>Familiar(r)</code>, the inverse cosmetic step <code>docker ' +
			'images</code> performs: strip the default registry and the ' +
			'<code>library/</code> prefix, keep any other registry, and render ' +
			'<code>name@digest</code> when a digest is present, else ' +
			'<code>name:tag</code>.</p>',
			{ lang: 'txt', code: 'nginx                          -> docker.io/library/nginx:latest\ngrafana/grafana                -> docker.io/grafana/grafana:latest   (user, not registry)\nmyreg.example.com:5000/app     -> registry myreg.example.com:5000     (the : is a port)\nubuntu@sha256:9f2c...          -> digest pinned, NO :latest invented' },
			'<div class="tip">The heuristic has a famous sharp edge: ' +
			'<code>myregistry/app</code> — no dot, no port — is <em>not</em> your ' +
			'registry; it is Docker Hub user <code>myregistry</code>. Internal ' +
			'registries must be referenced with a dot or a port for the parser to ' +
			'treat them as hosts. The same code (the <code>distribution/reference</code> ' +
			'Go package) runs inside containerd and Kubernetes, which is why ' +
			'<code>image: nginx</code> in a pod spec pulls ' +
			'<code>docker.io/library/nginx:latest</code> too.</div>',
		],

		starter: [
			'package main',
			'',
			'// Ref is a fully-normalized image reference: every field the daemon',
			'// needs before it can open a connection and ask for a manifest.',
			'type Ref struct {',
			'	Registry   string // host[:port], e.g. "docker.io", "myreg.example.com:5000"',
			'	Repository string // path within the registry, e.g. "library/nginx", "team/app"',
			'	Tag        string // "latest" if defaulted; empty when only a digest pins the ref',
			'	Digest     string // "sha256:..." when the reference is content-pinned',
			'}',
			'',
			'// ParseRef normalizes s = [registry/][path/]name[:tag][@digest]:',
			'//   - everything after "@" is the digest',
			'//   - the FIRST "/"-component is a registry only if it contains "."',
			'//     or ":" or equals "localhost"; otherwise the registry is "docker.io"',
			'//   - on docker.io a single-component repository gets the "library/" prefix',
			'//   - the tag is what follows the last ":" AFTER the last "/" (so a',
			'//     registry port is never a tag); no tag and no digest -> "latest"',
			'//   - a digest alone invents no tag',
			'// Malformed input (empty string, empty name, empty tag or digest,',
			'// empty path component) returns Ref{}, false — never a panic.',
			'func ParseRef(s string) (Ref, bool) {',
			'	// your code here',
			'	return Ref{}, false',
			'}',
			'',
			'// Familiar renders r the way `docker images` displays it: the default',
			'// registry (docker.io) and the "library/" prefix are stripped; any',
			'// other registry stays. A digest-pinned ref shows "name@digest",',
			'// otherwise "name:tag".',
			'func Familiar(r Ref) string {',
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
			'	// A realistic content digest, shared by every digest case.',
			'	dig := "sha256:e5c0fb4a5d9f3a1b8c7d6e2f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b"',
			'',
			'	// norm renders a parsed Ref as one canonical line so every field',
			'	// shows up in the case output; "malformed" when ParseRef refuses.',
			'	norm := func(s string) string {',
			'		r, ok := ParseRef(s)',
			'		if !ok {',
			'			return "malformed"',
			'		}',
			'		out := r.Registry + "/" + r.Repository',
			'		if r.Tag != "" {',
			'			out += ":" + r.Tag',
			'		}',
			'		if r.Digest != "" {',
			'			out += "@" + r.Digest',
			'		}',
			'		return out',
			'	}',
			'	// fam parses then re-renders — the round trip docker images does.',
			'	fam := func(s string) string {',
			'		r, _ := ParseRef(s)',
			'		return Familiar(r)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"bare official name: registry, library/ and :latest all filled in",',
			'			"docker.io/library/nginx:latest",',
			'			func() string { return norm("nginx") }},',
			'		{"explicit tag survives; everything else still defaults",',
			'			"docker.io/library/nginx:1.25",',
			'			func() string { return norm("nginx:1.25") }},',
			'		{"digest pin: no :latest is invented alongside a digest",',
			'			"docker.io/library/ubuntu@" + dig,',
			'			func() string { return norm("ubuntu@" + dig) }},',
			'		{"two components, no dot: a Hub user, NOT a registry — and no library/",',
			'			"docker.io/grafana/grafana:latest",',
			'			func() string { return norm("grafana/grafana") }},',
			'		{"registry with port: the colon before the slash is a port, not a tag",',
			'			"myreg.example.com:5000/team/app:v2",',
			'			func() string { return norm("myreg.example.com:5000/team/app:v2") }},',
			'		{"localhost is a registry despite having no dot or port",',
			'			"localhost/app:latest",',
			'			func() string { return norm("localhost/app") }},',
			'		{"non-Hub registry: path kept as-is, no library/ prefix",',
			'			"ghcr.io/owner/app:latest",',
			'			func() string { return norm("ghcr.io/owner/app") }},',
			'		{"tag and digest together: both kept — the digest is what pulls",',
			'			"docker.io/library/redis:7@" + dig,',
			'			func() string { return norm("redis:7@" + dig) }},',
			'		{"malformed inputs (empty, trailing colon, lone digest) refuse, no panic",',
			'			"false false false",',
			'			func() string {',
			'				_, ok1 := ParseRef("")',
			'				_, ok2 := ParseRef("app:")',
			'				_, ok3 := ParseRef("@" + dig)',
			'				return fmt.Sprintf("%v %v %v", ok1, ok2, ok3)',
			'			}},',
			'		{"Familiar: docker images strips docker.io and library/, keeps the rest",',
			'			"nginx:latest | ghcr.io/owner/app:latest | ubuntu@" + dig,',
			'			func() string {',
			'				return fam("nginx") + " | " + fam("ghcr.io/owner/app") + " | " + fam("ubuntu@"+dig)',
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
			'import "strings"',
			'',
			'// Ref is a fully-normalized image reference: every field the daemon',
			'// needs before it can open a connection and ask for a manifest.',
			'type Ref struct {',
			'	Registry   string // host[:port], e.g. "docker.io", "myreg.example.com:5000"',
			'	Repository string // path within the registry, e.g. "library/nginx", "team/app"',
			'	Tag        string // "latest" if defaulted; empty when only a digest pins the ref',
			'	Digest     string // "sha256:..." when the reference is content-pinned',
			'}',
			'',
			'// ParseRef normalizes [registry/][path/]name[:tag][@digest]. The order',
			'// of the splits is the whole design: digest first (its own ":" would',
			'// otherwise look like a tag separator), registry second (its port ":"',
			'// would otherwise look like a tag), tag last, scoped to the text after',
			'// the final "/". This mirrors how the distribution/reference grammar',
			'// disambiguates — each split removes the characters that would confuse',
			'// the next one.',
			'func ParseRef(s string) (Ref, bool) {',
			'	if s == "" {',
			'		return Ref{}, false',
			'	}',
			'	ref := Ref{}',
			'	rest := s',
			'',
			'	// 1) Digest: everything after "@". Splitting this off first means',
			'	// the "sha256:..." colon can never be mistaken for a tag separator.',
			'	if i := strings.Index(rest, "@"); i >= 0 {',
			'		ref.Digest = rest[i+1:]',
			'		rest = rest[:i]',
			'		if ref.Digest == "" || rest == "" {',
			'			// "app@" or a lone "@sha256:..." — nothing to pull.',
			'			return Ref{}, false',
			'		}',
			'	}',
			'',
			'	// 2) Registry: the first component, but ONLY if it could be a',
			'	// hostname — contains "." or ":" or is exactly "localhost". This',
			'	// heuristic exists for backward compatibility: "grafana/grafana"',
			'	// predates private registries and must keep meaning a Hub user,',
			'	// so a hostless registry simply cannot be expressed.',
			'	if i := strings.Index(rest, "/"); i >= 0 {',
			'		first := rest[:i]',
			'		if strings.ContainsAny(first, ".:") || first == "localhost" {',
			'			ref.Registry = first',
			'			rest = rest[i+1:]',
			'		}',
			'	}',
			'	if ref.Registry == "" {',
			'		ref.Registry = "docker.io"',
			'	}',
			'',
			'	// 3) Tag: the last ":" — but only if it sits AFTER the last "/".',
			'	// With the registry already stripped this guard is belt-and-braces,',
			'	// but it is what makes the rule composable: a ":" inside a path',
			'	// component to the left of the name can never be a tag.',
			'	slash := strings.LastIndex(rest, "/")',
			'	if i := strings.LastIndex(rest, ":"); i > slash {',
			'		ref.Tag = rest[i+1:]',
			'		rest = rest[:i]',
			'		if ref.Tag == "" {',
			'			// "app:" — an empty tag is a typo, not a default.',
			'			return Ref{}, false',
			'		}',
			'	}',
			'',
			'	// What remains is the repository path. Reject emptiness anywhere:',
			'	// "" (nothing left) or "team//app" (empty component) are malformed.',
			'	if rest == "" {',
			'		return Ref{}, false',
			'	}',
			'	for _, part := range strings.Split(rest, "/") {',
			'		if part == "" {',
			'			return Ref{}, false',
			'		}',
			'	}',
			'',
			'	// 4) The library/ namespace — docker.io ONLY. Official images live',
			'	// in a real repository namespace on the Hub; other registries have',
			'	// no such convention, so their paths pass through untouched.',
			'	if ref.Registry == "docker.io" && !strings.Contains(rest, "/") {',
			'		rest = "library/" + rest',
			'	}',
			'	ref.Repository = rest',
			'',
			'	// 5) Default tag — but never alongside a digest. A digest already',
			'	// pins the exact manifest; inventing :latest next to it would',
			'	// suggest a tag lookup that will never happen.',
			'	if ref.Tag == "" && ref.Digest == "" {',
			'		ref.Tag = "latest"',
			'	}',
			'	return ref, true',
			'}',
			'',
			'// Familiar is the cosmetic inverse: `docker images` hides exactly the',
			'// parts ParseRef invented. Strip docker.io and the library/ prefix,',
			'// keep any explicit registry, and prefer the digest form when pinned —',
			'// the digest is what a pull would actually resolve.',
			'func Familiar(r Ref) string {',
			'	name := r.Repository',
			'	if r.Registry == "docker.io" {',
			'		// Only the Hub gets its prefix trimmed; on other registries',
			'		// "library/" would be a real user-chosen path segment.',
			'		name = strings.TrimPrefix(name, "library/")',
			'	} else if r.Registry != "" {',
			'		name = r.Registry + "/" + name',
			'	}',
			'	if r.Digest != "" {',
			'		return name + "@" + r.Digest',
			'	}',
			'	if r.Tag != "" {',
			'		return name + ":" + r.Tag',
			'	}',
			'	return name',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why a heuristic instead of a syntax</h3>' +
			'<p>The registry rule — first component is a host only if it contains ' +
			'<code>.</code> or <code>:</code> or is <code>localhost</code> — looks ' +
			'like a hack because it is one, frozen by backward compatibility. When ' +
			'Docker launched, <em>every</em> image lived on the Hub and ' +
			'<code>user/name</code> meant a Hub user. Private registries arrived ' +
			'later and had to be squeezed into the same string, so the parser ' +
			'guesses: anything that could not be a DNS hostname must be a Hub ' +
			'namespace. The consequence is permanent — a registry reachable by a ' +
			'bare single-label name (<code>myregistry/app</code>) cannot be ' +
			'expressed at all; teams work around it with a dot ' +
			'(<code>myregistry.local</code>), a port, or an explicit FQDN. The ' +
			'canonical implementation is the <code>distribution/reference</code> ' +
			'Go package, vendored into Docker, containerd, and Kubernetes alike — ' +
			'which is why all three normalize <code>nginx</code> identically.</p>' +
			'<h3>Tags are pointers; digests are the content</h3>' +
			'<p>A tag is a mutable name-to-manifest mapping in the registry: ' +
			'<code>redis:7</code> silently moves every time upstream pushes a new ' +
			'7.x. A digest is the SHA-256 of the manifest bytes themselves — it ' +
			'cannot move, and pulling by digest re-verifies the hash end-to-end. ' +
			'That is why <code>ubuntu@sha256:…</code> invents no <code>:latest</code>: ' +
			'the digest fully determines the pull, and when both are written ' +
			'(<code>redis:7@sha256:…</code>) the daemon pulls by digest and keeps ' +
			'the tag purely as a human label. Production systems pin digests for ' +
			'exactly this reason — it is the container world\'s lockfile, and ' +
			'tools like <code>docker buildx imagetools inspect</code> exist to ' +
			'resolve a tag to today\'s digest so you can commit it.</p>' +
			'<h3>Field notes</h3>' +
			'<p><code>docker inspect</code> shows both faces of this lesson: ' +
			'<code>RepoTags</code> holds Familiar-style names ' +
			'(<code>nginx:latest</code>) while <code>RepoDigests</code> holds the ' +
			'fully-qualified pinned form. When a pull fails, read the error ' +
			'through this parser\'s eyes: <code>pull access denied for team/app</code> ' +
			'means the normalizer chose <code>docker.io</code> — the fix is ' +
			'spelling the registry, not <code>docker login</code>. And ' +
			'<code>:latest</code> deserves its bad reputation twice over: it is ' +
			'merely the <em>default tag name</em>, not "the newest build" — a push ' +
			'tagged <code>v2</code> does not move it — and in Kubernetes it ' +
			'flips the default <code>imagePullPolicy</code> to <code>Always</code>, ' +
			'so two nodes can silently run different bytes under the same spec. ' +
			'Every one of those incidents is this one string-normalization ' +
			'procedure, applied somewhere you forgot it would be.</p>',
		],
		complexity: { time: 'O(n) — a constant number of index scans over the reference string', space: 'O(1) beyond the returned fields' },
	});
})();
