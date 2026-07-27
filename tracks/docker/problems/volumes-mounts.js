/* Volumes & Bind Mounts — Running Containers (Medium). What -v actually
 * does: the one-byte sniff that decides bind vs named vs anonymous, the
 * copy-on-first-use rule that seeds empty volumes from the image (and
 * never seeds binds — the "my node_modules disappeared" bug), and
 * longest-prefix mount shadowing on whole path segments. The harness pins
 * the parse grammar with exact error strings, the three seeding verdicts,
 * and the nested -v /app + -v /app/node_modules resolution.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// Mount resolution as a stack: lookups land on the mount with the
	// longest covering target; the image dir under the bind is fully
	// shadowed. Marker ids namespaced (dgArrow DKVM*) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 232" width="520" height="232" role="img" aria-label="mount resolution: each lookup resolves to the mount with the longest target prefix — a nested volume at /app/node_modules beats the bind at /app, and the image directory underneath is fully shadowed">' +
		'<text x="16" y="22" class="lbl">one path, three claimants — the LONGEST mount target (on whole segments) wins</text>' +
		// the stack, deepest mount on top
		'<rect x="252" y="38" width="252" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="378" y="61" text-anchor="middle">volume /app/node_modules</text>' +
		'<rect x="252" y="86" width="252" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="378" y="109" text-anchor="middle">bind $PWD over /app</text>' +
		'<rect x="252" y="134" width="252" height="36" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="378" y="157" text-anchor="middle">image /app (deps baked in)</text>' +
		'<text x="378" y="186" text-anchor="middle" class="lbl">shadowed by the bind for every /app path</text>' +
		// lookups resolving into the stack
		'<text x="16" y="61" class="lbl">/app/node_modules/express</text>' +
		'<path d="M 192 57 L 244 57" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDKVMa)"/>' +
		'<text x="16" y="109" class="lbl">/app/server.js</text>' +
		'<path d="M 112 105 L 244 105" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDKVMw)"/>' +
		'<text x="16" y="157" class="lbl">/application/config</text>' +
		'<path d="M 142 153 L 244 153" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKVMe)"/>' +
		'<text x="16" y="208" class="lbl">segments, not strings: /application is NOT under /app — it falls through to the image fs</text>' +
		'<text x="16" y="226" class="lbl">the volume seeded node_modules from the image on FIRST use; the bind never copies — it only hides</text>' +
		'<defs>' +
		'<marker id="dgArrowDKVMa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowDKVMw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowDKVMe" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'volumes-mounts',
		title: 'Volumes & Bind Mounts',
		nav: 'volumes & mounts',
		difficulty: 'Medium',
		category: 'Running Containers',
		task: 'Implement ParseMount (bind vs named vs anonymous, ro option), SeedsFromImage (only an empty volume copies the image dir in — binds never), and EffectiveMount (longest target prefix on segment boundaries wins).',

		prose: [
			'<h2>Volumes &amp; Bind Mounts</h2>' +
			'<p>Your Dockerfile runs <code>npm ci</code>, so the image ships with ' +
			'<code>/app/node_modules</code> baked into a layer. For live reload in ' +
			'dev you add <code>-v $(pwd):/app</code> — and the container dies on ' +
			'startup with <code>Error: Cannot find module \'express\'</code>. ' +
			'Nothing deleted your deps: the bind mount <em>shadowed</em> the ' +
			'image’s <code>/app</code> wholesale — node_modules included — with ' +
			'your host directory, where you never ran <code>npm ci</code>. The fix ' +
			'everyone cargo-cults, adding <code>-v /app/node_modules</code> after ' +
			'the bind, works because of two rules you are about to implement: ' +
			'<strong>volumes seed themselves from the image on first use (binds ' +
			'never do)</strong>, and <strong>the mount with the longest target ' +
			'wins</strong> for paths beneath it.</p>' +
			'<ul>' +
			'<li><strong>The <code>-v</code> grammar.</strong> A spec is ' +
			'<code>source:target[:options]</code>, or a bare <code>target</code>. ' +
			'No source ⇒ an <strong>anonymous volume</strong> (the daemon invents ' +
			'a name). Otherwise the CLI <em>sniffs the first byte</em> of the ' +
			'source: starts with <code>/</code> ⇒ a <strong>bind mount</strong> ' +
			'(a host path); anything else ⇒ a <strong>named volume</strong> the ' +
			'daemon owns. Options are a comma list; <code>ro</code> sets ' +
			'read-only, <code>rw</code> (the default) clears it.</li>' +
			'<li><strong>Validation.</strong> The target must be non-empty and ' +
			'absolute — there is no working directory to be relative to at ' +
			'mount-setup time. Exact error strings are in the starter’s doc ' +
			'comment.</li>' +
			'<li><strong>Copy-on-first-use.</strong> At container start, a named ' +
			'or anonymous volume that is <em>empty</em> is seeded with whatever ' +
			'the image has at the target path — once. A volume that already has ' +
			'content is left alone (your data outranks the image), and a bind ' +
			'mount <em>never</em> copies anything in either direction: it purely ' +
			'shadows.</li>' +
			'<li><strong>Shadowing.</strong> Mounts stack like the kernel mount ' +
			'table: a lookup resolves to the mount whose target is the longest ' +
			'prefix of the path <em>on whole segments</em> — <code>/app</code> ' +
			'covers <code>/app/server.js</code> and <code>/app</code> itself, ' +
			'never <code>/application</code>. No covering mount ⇒ the image ' +
			'filesystem shows through.</li>' +
			'</ul>',
			{ lang: 'txt', code: '-v /home/dev/src:/app                   source starts with "/"  => bind mount (rw)\n-v pgdata:/var/lib/postgresql/data:ro   bare name               => named volume, read-only\n-v /app/node_modules                    no source at all        => anonymous volume' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>ParseMount(spec)</code> — the grammar and the ' +
			'one-byte sniff, with the exact error strings from the doc comment — ' +
			'<code>SeedsFromImage(m, volumeIsEmpty, imageDirHasContent)</code>, ' +
			'the copy-on-first-use decision, and ' +
			'<code>EffectiveMount(mounts, path)</code>, the ' +
			'longest-segment-prefix resolution that makes the nested ' +
			'<code>node_modules</code> trick work.</p>' +
			'<div class="tip">The seeding rule cuts both ways. It is why the ' +
			'node_modules trick works — and why “I rebuilt the image but the ' +
			'container still serves old files” happens: a volume that already has ' +
			'content <em>never re-seeds</em>, so the fresh files in your new image ' +
			'stay hidden behind last month’s volume. <code>docker compose down ' +
			'-v</code> (or <code>docker volume rm</code>) is the fix — not another ' +
			'rebuild.</div>',
		],

		starter: [
			'package main',
			'',
			'// Mount is one parsed -v specification, normalized to what the daemon',
			'// actually records (compare `docker inspect -f \'{{json .Mounts}}\'`).',
			'type Mount struct {',
			'	Type     string // "bind" | "volume" | "anonymous"',
			'	Source   string // host path (bind) or volume name; "" for anonymous',
			'	Target   string // absolute path inside the container',
			'	ReadOnly bool   // the "ro" option; default is read-write',
			'}',
			'',
			'// ParseMount parses one -v/--volume spec into a Mount. On malformed',
			'// input it returns a zero Mount and a non-empty error string.',
			'//',
			'// Grammar: "source:target[:options]", or just "target".',
			'//   - no source            => Type "anonymous" (daemon invents a name)',
			'//   - source begins with / => Type "bind"   (a host path)',
			'//   - otherwise            => Type "volume" (named, daemon-owned)',
			'//   - options: comma-separated; "ro" sets ReadOnly, "rw" clears it',
			'//',
			'// Errors (exact strings):',
			'//   - more than three :-sections       -> "malformed spec"',
			'//   - empty target                     -> "empty target"',
			'//   - target not starting with /       -> "target is not absolute"',
			'//   - empty source in a 2/3-part form  -> "empty source"',
			'//   - any unrecognized option          -> "unknown option: <opt>"',
			'func ParseMount(spec string) (Mount, string) {',
			'	// your code here',
			'	return Mount{}, ""',
			'}',
			'',
			'// SeedsFromImage reports whether starting the container copies the',
			'// image directory\'s content INTO the mount: true only for a named or',
			'// anonymous volume that is empty, when the image dir has content to',
			'// give. A bind mount never seeds — it shadows the image path with the',
			'// host dir as-is (the classic "my node_modules disappeared" failure).',
			'func SeedsFromImage(m Mount, volumeIsEmpty, imageDirHasContent bool) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// EffectiveMount resolves which mount a container path actually hits:',
			'// the mount whose Target is the longest prefix of path on WHOLE path',
			'// segments ("/app" covers "/app/x" and "/app" itself, but never',
			'// "/application"). It returns that Target, or "" when no mount covers',
			'// the path and the image filesystem shows through.',
			'func EffectiveMount(mounts []Mount, path string) string {',
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
			'	// The classic dev-loop stack: bind the source tree over /app, then',
			'	// punch an anonymous volume through it so the image-built deps',
			'	// survive. Built as literals so EffectiveMount is graded even if',
			'	// ParseMount is still broken.',
			'	mounts := []Mount{',
			'		{Type: "bind", Source: "/home/dev/src", Target: "/app"},',
			'		{Type: "anonymous", Source: "", Target: "/app/node_modules"},',
			'	}',
			'	pg := Mount{Type: "volume", Source: "pgdata", Target: "/var/lib/postgresql/data"}',
			'',
			'	// fm renders a ParseMount result compactly; a non-empty error',
			'	// string wins so malformed-spec cases read naturally in the table.',
			'	fm := func(m Mount, e string) string {',
			'		if e != "" {',
			'			return "err: " + e',
			'		}',
			'		return fmt.Sprintf("%s %q->%q ro=%v", m.Type, m.Source, m.Target, m.ReadOnly)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"absolute source is a bind mount, read-write by default",',
			'			`bind "/home/dev/src"->"/app" ro=false`,',
			'			func() string { m, e := ParseMount("/home/dev/src:/app"); return fm(m, e) }},',
			'		{"bare name is a named volume; the ro option flips ReadOnly",',
			'			`volume "pgdata"->"/var/lib/postgresql/data" ro=true`,',
			'			func() string { m, e := ParseMount("pgdata:/var/lib/postgresql/data:ro"); return fm(m, e) }},',
			'		{"no source at all: an anonymous volume",',
			'			`anonymous ""->"/app/node_modules" ro=false`,',
			'			func() string { m, e := ParseMount("/app/node_modules"); return fm(m, e) }},',
			'		{"relative target rejected — container paths are always absolute",',
			'			"err: target is not absolute",',
			'			func() string { m, e := ParseMount("pgdata:data"); return fm(m, e) }},',
			'		{"trailing colon leaves an empty target",',
			'			"err: empty target",',
			'			func() string { m, e := ParseMount("logs:"); return fm(m, e) }},',
			'		{"empty volumes seed from the image on first use — named and anonymous alike",',
			'			"true true",',
			'			func() string {',
			'				return fmt.Sprintf("%v %v",',
			'					SeedsFromImage(pg, true, true),',
			'					SeedsFromImage(mounts[1], true, true))',
			'			}},',
			'		{"a non-empty volume keeps its data; a bind mount NEVER seeds",',
			'			"nonempty=false bind=false",',
			'			func() string {',
			'				return fmt.Sprintf("nonempty=%v bind=%v",',
			'					SeedsFromImage(pg, false, true),',
			'					SeedsFromImage(mounts[0], true, true))',
			'			}},',
			'		{"nested mount: the longer /app/node_modules target beats the /app bind",',
			'			"/app/node_modules",',
			'			func() string { return EffectiveMount(mounts, "/app/node_modules/express/index.js") }},',
			'		{"a sibling path and the exact target both resolve to the bind",',
			'			`"/app" "/app"`,',
			'			func() string {',
			'				return fmt.Sprintf("%q %q",',
			'					EffectiveMount(mounts, "/app/server.js"),',
			'					EffectiveMount(mounts, "/app"))',
			'			}},',
			'		{"segment boundary: /application is NOT under /app; unmounted paths hit the image fs",',
			'			`"" ""`,',
			'			func() string {',
			'				return fmt.Sprintf("%q %q",',
			'					EffectiveMount(mounts, "/application/config"),',
			'					EffectiveMount(mounts, "/etc/hosts"))',
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
			'// Mount is one parsed -v specification, normalized to what the daemon',
			'// actually records (compare `docker inspect -f \'{{json .Mounts}}\'`).',
			'type Mount struct {',
			'	Type     string // "bind" | "volume" | "anonymous"',
			'	Source   string // host path (bind) or volume name; "" for anonymous',
			'	Target   string // absolute path inside the container',
			'	ReadOnly bool   // the "ro" option; default is read-write',
			'}',
			'',
			'// ParseMount mirrors the CLI\'s real disambiguation: -v has no flag',
			'// that says "this is a bind" — the parser SNIFFS the first byte of',
			'// the source. A leading / means host path; anything else is a volume',
			'// name. (That sniff is why `-v ./data:/app` fails — a relative path',
			'// reads as a volume name with illegal characters — and why compose',
			'// expands relative paths to absolute before handing specs over.)',
			'func ParseMount(spec string) (Mount, string) {',
			'	parts := strings.Split(spec, ":")',
			'	if len(parts) > 3 {',
			'		// In this grammar a fourth section can only be a mistake.',
			'		// (Windows-style sources like C:\\data are the famous victim',
			'		// of colon-splitting in the real CLI.)',
			'		return Mount{}, "malformed spec"',
			'	}',
			'',
			'	m := Mount{}',
			'	target := ""',
			'	options := ""',
			'	switch len(parts) {',
			'	case 1:',
			'		// Bare target: the daemon invents a 64-hex name — an',
			'		// anonymous volume, the "keep this path out of the bind"',
			'		// form from the node_modules trick.',
			'		m.Type = "anonymous"',
			'		target = parts[0]',
			'	case 2:',
			'		m.Source = parts[0]',
			'		target = parts[1]',
			'	case 3:',
			'		m.Source = parts[0]',
			'		target = parts[1]',
			'		options = parts[2]',
			'	}',
			'',
			'	// Target checks come first: they apply to every form, and a spec',
			'	// like "logs:" should read as "you forgot the container path",',
			'	// not as a complaint about the source.',
			'	if target == "" {',
			'		return Mount{}, "empty target"',
			'	}',
			'	if !strings.HasPrefix(target, "/") {',
			'		// Container paths are always absolute — at mount-setup time',
			'		// there is no working directory to be relative TO.',
			'		return Mount{}, "target is not absolute"',
			'	}',
			'	m.Target = target',
			'',
			'	if len(parts) >= 2 {',
			'		if m.Source == "" {',
			'			return Mount{}, "empty source"',
			'		}',
			'		// The one-byte sniff that decides everything downstream:',
			'		// lifecycle, seeding behavior, `docker volume ls` visibility.',
			'		if strings.HasPrefix(m.Source, "/") {',
			'			m.Type = "bind"',
			'		} else {',
			'			m.Type = "volume"',
			'		}',
			'	}',
			'',
			'	if len(parts) == 3 {',
			'		for _, opt := range strings.Split(options, ",") {',
			'			switch opt {',
			'			case "ro":',
			'				m.ReadOnly = true',
			'			case "rw":',
			'				// Explicit rw is legal; last-one-wins against ro,',
			'				// same as the real parser.',
			'				m.ReadOnly = false',
			'			default:',
			'				// Covers the real grammar\'s exotica this model leaves',
			'				// out (z, Z, cached, propagation modes) — and the ""',
			'				// produced by a trailing colon in the options slot.',
			'				return Mount{}, "unknown option: " + opt',
			'			}',
			'		}',
			'	}',
			'',
			'	return m, ""',
			'}',
			'',
			'// SeedsFromImage is the copy-on-first-use rule, verbatim from the',
			'// daemon:',
			'//',
			'//	bind mount       -> never copies, in either direction. The host',
			'//	                    dir shadows the image path as-is; deps built',
			'//	                    into the image simply vanish from view (the',
			'//	                    node_modules bug).',
			'//	volume with data -> left alone. Existing data outranks the image;',
			'//	                    this is what makes re-running a database',
			'//	                    container safe — and what makes stale volumes',
			'//	                    mask freshly rebuilt images.',
			'//	EMPTY volume     -> seeded with the image dir\'s content, once.',
			'func SeedsFromImage(m Mount, volumeIsEmpty, imageDirHasContent bool) bool {',
			'	if m.Type == "bind" {',
			'		// Copying image content out onto a host directory the user',
			'		// owns would be silent data destruction; a bind is strictly',
			'		// a window onto the host, never storage the daemon fills.',
			'		return false',
			'	}',
			'	// Named and anonymous volumes behave identically here — an',
			'	// anonymous volume IS a named volume whose name the daemon',
			'	// invented. Seeding needs both an empty volume and something in',
			'	// the image to copy.',
			'	return volumeIsEmpty && imageDirHasContent',
			'}',
			'',
			'// EffectiveMount resolves a container path against the mount table',
			'// the way the kernel does: the deepest mountpoint covering the path',
			'// wins. Docker guarantees the nesting works by sorting mounts by',
			'// target length and mounting parents before children — so',
			'// /app/node_modules is mounted ONTO the bind at /app, punching a',
			'// hole through it (which is why the CLI order of the two -v flags',
			'// does not matter).',
			'func EffectiveMount(mounts []Mount, path string) string {',
			'	best := ""',
			'	for _, m := range mounts {',
			'		// Longest covering target wins. Ties are impossible: two',
			'		// equal targets would be the same mountpoint.',
			'		if coversPath(m.Target, path) && len(m.Target) > len(best) {',
			'			best = m.Target',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
			'// coversPath is the segment-boundary prefix test: /app covers /app',
			'// and /app/x, but NOT /application — mounts cover subtrees, not',
			'// string prefixes. Appending "/" before the prefix check is what',
			'// enforces the segment boundary.',
			'func coversPath(target, path string) bool {',
			'	if target == path {',
			'		return true',
			'	}',
			'	if target == "/" {',
			'		// Root is every path\'s ancestor; the +"/" trick below would',
			'		// test against "//" and wrongly miss.',
			'		return strings.HasPrefix(path, "/")',
			'	}',
			'	return strings.HasPrefix(path, target+"/")',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the parser sniffs a byte</h3>' +
			'<p>The <code>-v</code> flag predates named volumes: one piece of ' +
			'syntax ended up expressing two very different things, disambiguated ' +
			'by whether the source looks like a path. The distinction matters far ' +
			'beyond parsing. A <strong>bind</strong> is a window onto a host path ' +
			'<em>you</em> own — its lifecycle is the host’s, and Docker never ' +
			'manages its contents. A <strong>named volume</strong> is storage the ' +
			'<em>daemon</em> owns: it survives <code>docker rm</code>, shows up in ' +
			'<code>docker volume ls</code>, and lives inside the Linux VM on ' +
			'Mac/Windows — which is exactly why a database on a volume is fast on ' +
			'a Mac while the same database under a bind crawls through the ' +
			'file-sharing layer. An <strong>anonymous</strong> volume is just a ' +
			'named volume whose name the daemon invented; <code>docker run ' +
			'--rm</code> cleans them up, but plain <code>docker rm</code> does ' +
			'not — the graveyard of 64-hex entries in <code>docker volume ' +
			'ls</code> is anonymous volumes leaking, one per <code>VOLUME</code> ' +
			'instruction per run. The <code>--mount</code> flag exists precisely ' +
			'because the one-byte sniff was judged too clever: it spells ' +
			'<code>type=bind</code> out loud.</p>' +
			'<h3>Copy-on-first-use, and why binds are exempt</h3>' +
			'<p>The seeding rule exists so images can ship default content into ' +
			'persistent storage: first run copies the image dir into the empty ' +
			'volume, and from then on <em>your data outranks the image</em> — ' +
			'that precedence is what makes pulling a newer database image safe ' +
			'for the data directory. Both famous consequences fall out of the ' +
			'same rule. The node_modules trick works because the anonymous ' +
			'volume at <code>/app/node_modules</code> is empty on first run and ' +
			'seeds itself from the image layer where <code>npm ci</code> ran. ' +
			'And the stale-volume trap is the same rule with the polarity ' +
			'reversed: rebuild the image all you want — a non-empty volume never ' +
			're-seeds, so the container keeps serving last month’s files until ' +
			'you delete the volume. Binds are exempt for a blunt reason: copying ' +
			'image content <em>outward</em> onto a host directory would silently ' +
			'overwrite user files, so a bind never copies anything — it only ' +
			'shadows, which is the whole disappearing-deps bug in one word.</p>' +
			'<h3>Longest prefix is just the mount table</h3>' +
			'<p>Nothing about shadowing is Docker-specific: the kernel resolves ' +
			'a path through the deepest mountpoint that covers it, and Docker ' +
			'merely arranges for that to work by sorting mounts by target length ' +
			'and mounting parents before children — <code>/app/node_modules</code> ' +
			'mounts <em>onto</em> the bind at <code>/app</code>, punching a hole ' +
			'through it. Two details in your implementation carry the weight: ' +
			'the prefix must respect segment boundaries (<code>/app</code> must ' +
			'not claim <code>/application</code> — compare with a trailing ' +
			'<code>/</code> appended, not raw <code>HasPrefix</code>), and the ' +
			'empty-string fallback is meaningful: no covering mount means the ' +
			'path resolves into the image’s overlay filesystem, the read-only ' +
			'layers every container of that image shares.</p>' +
			'<h3>When debugging</h3>' +
			'<p><code>docker inspect -f \'{{json .Mounts}}\'</code> shows the ' +
			'daemon’s resolved view — <code>Type</code>, <code>Source</code>, ' +
			'<code>Destination</code>, <code>RW</code> — which settles “is this a ' +
			'bind or a volume” arguments instantly. An empty directory where ' +
			'files should be almost always means a mount is shadowing them: ' +
			're-run without the <code>-v</code> and look again. Use ' +
			'<code>:ro</code> for configs and secrets — a compromised process ' +
			'gets <code>EROFS</code> instead of a persistence mechanism. And ' +
			'when a rebuilt image “does not take effect”, suspect the seeding ' +
			'rule before the build cache: <code>docker compose down -v</code> ' +
			'clears the volume that was masking your new files.</p>',
		],
		complexity: { time: 'O(s) to parse a spec; O(m) per lookup — one segment-boundary prefix compare per mount', space: 'O(1) beyond the parsed Mount' },
	});
})();
