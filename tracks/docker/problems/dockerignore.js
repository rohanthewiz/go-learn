/* .dockerignore — Images & Builds (Medium). The build-context filter: the
 * client tars the context directory and ships it to the daemon, and
 * .dockerignore decides what goes into that tar — segment-by-segment
 * filepath.Match semantics, ** spanning segments, directory patterns taking
 * their whole subtree, ! re-includes, and last-match-wins. The harness pins
 * root-anchoring (*.log vs **­/*.log), subtree exclusion, the re-include
 * ordering flip, and ** matching zero segments.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// The pipeline: context dir -> .dockerignore filter -> tar upload ->
	// daemon. Excluded files simply never exist on the daemon side. Marker
	// ids namespaced (dgArrowDKDI) — every track's SVGs share the page's id
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 214" width="520" height="214" role="img" aria-label="docker build: the client filters the context directory through .dockerignore, then tars and uploads only the survivors to the daemon; excluded files never reach the build">' +
		'<text x="20" y="24" class="lbl">docker build . — the CLIENT filters the context before anything reaches the daemon</text>' +
		// left: the context directory on disk
		'<rect x="20" y="44" width="140" height="118" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="90" y="62" text-anchor="middle" class="lbl">context dir</text>' +
		'<text x="34" y="86">main.go</text>' +
		'<text x="34" y="106" style="fill:var(--warn)">.env</text>' +
		'<text x="34" y="126" style="fill:var(--warn)">.git/… (1.9 GB)</text>' +
		'<text x="34" y="146" style="fill:var(--warn)">srv/http.log</text>' +
		// middle: the filter
		'<rect x="204" y="62" width="128" height="82" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="268" y="84" text-anchor="middle" class="lbl" style="fill:var(--warn)">.dockerignore</text>' +
		'<text x="268" y="106" text-anchor="middle" class="lbl">.env&#160;&#160;.git</text>' +
		'<text x="268" y="124" text-anchor="middle" class="lbl">**/*.log</text>' +
		// right: what the daemon receives
		'<rect x="384" y="62" width="116" height="82" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="442" y="88" text-anchor="middle" class="lbl" style="fill:var(--ok)">daemon</text>' +
		'<text x="442" y="114" text-anchor="middle">main.go</text>' +
		// arrows through the pipeline
		'<path d="M 164 103 L 199 103" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKDI)"/>' +
		'<path d="M 336 103 L 379 103" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDKDIok)"/>' +
		'<text x="358" y="94" text-anchor="middle" class="lbl" style="fill:var(--ok)">tar</text>' +
		'<text x="20" y="182" class="lbl">excluded files do not exist to the build: COPY .env → “file not found” — for a file sitting right there</text>' +
		'<text x="20" y="202" class="lbl">last matching pattern wins: a later !pattern can carve files back into the tar</text>' +
		'<defs>' +
		'<marker id="dgArrowDKDI" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowDKDIok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'dockerignore',
		title: '.dockerignore: what the daemon never sees',
		nav: 'dockerignore',
		difficulty: 'Medium',
		category: 'Images & Builds',
		task: 'Implement Excluded: segment-by-segment pattern matching (*, ?, ** across segments), directory patterns cover their subtree, ! re-includes, last match wins.',

		prose: [
			'<h2>.dockerignore: what the daemon never sees</h2>' +
			'<p><code>docker build .</code> — and the terminal sits for two minutes on ' +
			'<code>transferring context: 2.1GB</code>. The build hasn\'t started: the ' +
			'client is tarring your entire working directory — the full ' +
			'<code>.git</code> history, <code>node_modules</code>, last week\'s ' +
			'<code>pg_dump</code> — and streaming it to the daemon. Worse, ' +
			'<code>COPY . .</code> just baked <code>.env</code> into a layer that ' +
			'anyone with the image can read back out with <code>docker save</code>. ' +
			'And the mirror-image failure: <code>COPY config.yml .</code> dies with ' +
			'<em>file not found</em> for a file that is <em>right there</em> in the ' +
			'directory — because a <code>.dockerignore</code> pattern swallowed it ' +
			'before the daemon ever saw the context. All three incidents are the ' +
			'same mechanism:</p>' +
			'<ul>' +
			'<li><strong>The filter runs client-side, before upload.</strong> ' +
			'<code>.dockerignore</code> (read from the context root) decides what ' +
			'goes into the tar. Excluded files do not exist as far as the build is ' +
			'concerned — no <code>COPY</code>, no <code>ADD</code>, no cache key ' +
			'ever sees them.</li>' +
			'<li><strong>Matching is per path segment.</strong> Each pattern is ' +
			'compared against the whole slash-separated context-relative path, one ' +
			'segment at a time, with Go\'s <code>filepath.Match</code> — this is ' +
			'literally what the Docker client runs. <code>*</code> matches within ' +
			'a single segment; <code>?</code> matches exactly one character. So ' +
			'<code>*.log</code> is anchored to the root: it is one segment and can ' +
			'never reach <code>srv/http.log</code>.</li>' +
			'<li><strong><code>**</code> spans segments.</strong> A pattern segment ' +
			'of exactly <code>**</code> matches any number of path segments — ' +
			'<em>including zero</em> — so <code>**/*.log</code> catches logs at ' +
			'every depth, the root included, and <code>a/**/b</code> covers ' +
			'<code>a/b</code> itself.</li>' +
			'<li><strong>A matched directory takes its subtree.</strong> If the ' +
			'pattern runs out of segments while the path still has some, the path ' +
			'is under a directory the pattern named — excluded. <code>.git</code> ' +
			'alone buries <code>.git/objects/4b/825dc9</code>.</li>' +
			'<li><strong><code>!</code> re-includes, and the LAST match wins.</strong> ' +
			'Patterns apply in file order; the final say belongs to the last one ' +
			'that matched. <code>!docs/README.md</code> after a broad ' +
			'<code>docs</code> carves one file back into the tar — the same line ' +
			'<em>before</em> the exclude is dead. Leading and trailing slashes are ' +
			'trimmed off a pattern before any of this.</li>' +
			'</ul>' +
			DIAGRAM +
			{ lang: 'txt', code: 'patterns:  .git    **/*.log    docs    !docs/README.md\n\n.git/objects/4b/825dc9   -> excluded  (.git names a parent directory)\nsrv/http.log             -> excluded  (**/*.log reaches any depth)\ndocs/README.md           -> KEPT      (the ! re-include is the LAST match)\ndocs/adr/001-tls.md      -> excluded  (docs matched; nothing later unmatched it)' },
			'<h3>Your job</h3>' +
			'<p>Implement <code>Excluded(patterns, path)</code> — <code>path</code> ' +
			'is context-relative, slash-separated, no leading slash. Walk every ' +
			'pattern in order, tracking the verdict of the last one that matched. ' +
			'Do the per-pattern work in a recursive helper ' +
			'<code>matchSegments(patSegs, pathSegs)</code>: exhausted pattern → ' +
			'match (the directory rule); <code>**</code> → try consuming zero ' +
			'segments, then one, and so on; otherwise <code>filepath.Match</code> ' +
			'the head segments and recurse on the tails.</p>' +
			'<div class="tip">Unlike <code>.gitignore</code> — whose syntax this ' +
			'file deliberately resembles — a <code>!</code> here <em>can</em> ' +
			're-include a file whose parent directory was excluded. Git refuses ' +
			'(it prunes whole directories for speed); Docker just re-runs the ' +
			'pattern list per path. Teams porting a <code>.gitignore</code> ' +
			'straight into <code>.dockerignore</code> hit both this and the ' +
			'root-anchoring difference: git\'s bare <code>*.log</code> applies at ' +
			'every level, Docker\'s only at the context root.</div>',
		],

		starter: [
			'package main',
			'',
			'// Excluded reports whether path — context-relative, slash-separated,',
			'// no leading slash — is filtered out of the build context by patterns,',
			'// the lines of a .dockerignore file, applied in order.',
			'//',
			'// Matching rules (what the Docker client actually does):',
			'//   - each pattern is matched against the whole path, one slash-separated',
			'//     segment at a time, via filepath.Match: `*` matches within a single',
			'//     segment, `?` matches exactly one character',
			'//   - a pattern segment of exactly `**` matches any number of path',
			'//     segments, INCLUDING zero',
			'//   - a pattern that matches a directory excludes everything beneath it',
			'//   - a leading `!` re-includes paths matched by earlier patterns',
			'//   - the LAST matching pattern wins',
			'//   - leading/trailing slashes are trimmed off a pattern before matching;',
			'//     a pattern that is empty after trimming is skipped',
			'func Excluded(patterns []string, path string) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// matchSegments reports whether the pattern segments match the path',
			'// segments. An exhausted pattern is a match even if path segments',
			'// remain — that is the directory rule: a pattern naming a parent',
			'// directory covers its whole subtree. A `**` segment may match zero',
			'// path segments.',
			'func matchSegments(patSegs, pathSegs []string) bool {',
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
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	// ex probes one pattern list against several paths and joins the',
			'	// verdicts, so a single case can pin a rule AND its counterexample.',
			'	ex := func(patterns []string, paths ...string) string {',
			'		out := ""',
			'		for i, p := range paths {',
			'			if i > 0 {',
			'				out += " "',
			'			}',
			'			out += fmt.Sprintf("%v", Excluded(patterns, p))',
			'		}',
			'		return out',
			'	}',
			'	cases := []tc{',
			'		{"plain name matches at the context root only",',
			'			"true false",',
			'			func() string { return ex([]string{"Dockerfile"}, "Dockerfile", "app/Dockerfile") }},',
			'		{"*.log is one segment — anchored to the root, logs one level down escape",',
			'			"true false",',
			'			func() string { return ex([]string{"*.log"}, "build.log", "srv/http.log") }},',
			'		{"**/*.log reaches any depth — including depth zero at the root",',
			'			"true true",',
			'			func() string { return ex([]string{"**/*.log"}, "srv/ci/http.log", "build.log") }},',
			'		{"a directory pattern buries its whole subtree",',
			'			"true",',
			'			func() string { return ex([]string{".git"}, ".git/objects/4b/825dc9") }},',
			'		{"! re-includes one file after a broad exclude; siblings stay excluded",',
			'			"false true",',
			'			func() string { return ex([]string{"docs", "!docs/README.md"}, "docs/README.md", "docs/adr/001-tls.md") }},',
			'		{"LAST match wins — flip the order and the re-include is dead",',
			'			"true",',
			'			func() string { return ex([]string{"!docs/README.md", "docs"}, "docs/README.md") }},',
			'		{"** matches zero segments: a/**/b covers a/b as well as a/x/y/b",',
			'			"true true",',
			'			func() string { return ex([]string{"a/**/b"}, "a/b", "a/x/y/b") }},',
			'		{"leading slash on a pattern is trimmed before matching",',
			'			"true",',
			'			func() string { return ex([]string{"/secret.env"}, "secret.env") }},',
			'		{"? matches exactly one character within a segment",',
			'			"true false",',
			'			func() string { return ex([]string{"config.???"}, "config.yml", "config.yaml") }},',
			'		{"no pattern matches — nothing excluded",',
			'			"false",',
			'			func() string { return ex([]string{"*.md", "vendor"}, "main.go") }},',
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
			'	"path/filepath"',
			'	"strings"',
			')',
			'',
			'// Excluded walks the pattern list IN ORDER and keeps overwriting the',
			'// verdict with each pattern that matches — last-match-wins falls out',
			'// of the loop structure for free, no lookahead or priority needed.',
			'// This mirrors the real client: it cannot short-circuit on the first',
			'// exclude, because a later !pattern may still flip the answer.',
			'func Excluded(patterns []string, path string) bool {',
			'	excluded := false',
			'	pathSegs := strings.Split(path, "/")',
			'	for _, pat := range patterns {',
			'		// A ! prefix flips what a match MEANS (re-include), not how',
			'		// matching works — strip it first, then match identically.',
			'		negate := strings.HasPrefix(pat, "!")',
			'		if negate {',
			'			pat = pat[1:]',
			'		}',
			'		// Leading/trailing slashes carry no information in a context-',
			'		// relative world (there is no absolute root inside the tar),',
			'		// so the client trims them before matching. "/secret.env"',
			'		// and "secret.env" are the same pattern.',
			'		pat = strings.Trim(pat, "/")',
			'		if pat == "" {',
			'			continue',
			'		}',
			'		if matchSegments(strings.Split(pat, "/"), pathSegs) {',
			'			excluded = !negate',
			'		}',
			'	}',
			'	return excluded',
			'}',
			'',
			'// matchSegments matches pattern segments against path segments,',
			'// recursively. Structuring the walk per SEGMENT (rather than per',
			'// character over the whole string) is what makes `*` stop at slashes:',
			'// filepath.Match never sees a "/" at all, so `*.log` cannot leak',
			'// across directories.',
			'func matchSegments(patSegs, pathSegs []string) bool {',
			'	// Pattern exhausted: match — even with path segments left over.',
			'	// This one base case IS the directory rule: pattern ".git" ran',
			'	// out after matching the first segment of ".git/objects/...",',
			'	// so the path sits under a directory the pattern named.',
			'	if len(patSegs) == 0 {',
			'		return true',
			'	}',
			'	if patSegs[0] == "**" {',
			'		// ** = "any number of segments, including zero". Two moves:',
			'		//   skip it   -> ** consumed zero segments (a/**/b vs a/b)',
			'		//   eat one   -> ** absorbs pathSegs[0], stays in play',
			'		// Trying zero-width FIRST also lets a trailing ** match a',
			'		// directory itself, not only its contents.',
			'		if matchSegments(patSegs[1:], pathSegs) {',
			'			return true',
			'		}',
			'		if len(pathSegs) > 0 && matchSegments(patSegs, pathSegs[1:]) {',
			'			return true',
			'		}',
			'		return false',
			'	}',
			'	// A literal pattern segment still to consume, but no path left:',
			'	// pattern "docs/README.md" cannot match the bare path "docs".',
			'	if len(pathSegs) == 0 {',
			'		return false',
			'	}',
			'	// One segment vs one segment — Go\'s own glob. A malformed pattern',
			'	// (filepath.ErrBadPattern, e.g. an unclosed \'[\') is treated as',
			'	// matching nothing rather than failing the build.',
			'	ok, err := filepath.Match(patSegs[0], pathSegs[0])',
			'	if err != nil || !ok {',
			'		return false',
			'	}',
			'	return matchSegments(patSegs[1:], pathSegs[1:])',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the filter is client-side</h3>' +
			'<p>The daemon is a server. On Linux it is at least across a Unix ' +
			'socket; on macOS and Windows it lives inside a VM, and with ' +
			'<code>DOCKER_HOST</code> or a CI build farm it is across a network. ' +
			'The only way the build can read your files is for the client to ' +
			'<em>send</em> them — as a tar stream — so the only place filtering ' +
			'can save you anything is before that tar is written. That is also ' +
			'why the effects are absolute: an excluded file isn\'t "hidden", it ' +
			'was never uploaded. <code>COPY</code> fails on it, and no ' +
			'<code>RUN find /</code> inside the build will ever locate it.</p>' +
			'<p>The second payoff is cache stability. <code>COPY</code> steps are ' +
			'keyed on the <em>content checksums</em> of the files they copy, so a ' +
			'context polluted with churning files — logs, <code>.git</code> (which ' +
			'changes on every commit), editor swap files — busts the build cache ' +
			'on every run even though nothing the image needs has changed. A tight ' +
			'<code>.dockerignore</code> is as much a cache tool as a bandwidth ' +
			'tool.</p>' +
			'<h3>Why last-match-wins, and the .gitignore trap</h3>' +
			'<p>Last-match-wins is the simplest semantics that makes ' +
			'<code>!</code> useful: you write broad excludes first and surgical ' +
			're-includes after, reading top to bottom like the file executes. It ' +
			'also means <em>order is behavior</em> — the harness\'s ordering-flip ' +
			'case is a real code-review bug, a <code>!</code> line someone sorted ' +
			'alphabetically above its exclude, silently dead.</p>' +
			'<p>The syntax was borrowed from <code>.gitignore</code> but the ' +
			'engine was not, and two differences bite people porting files over. ' +
			'Git applies a bare <code>*.log</code> at every directory level; ' +
			'Docker anchors every pattern at the context root, so you need ' +
			'<code>**/*.log</code>. And git cannot re-include a file under an ' +
			'excluded directory (it prunes whole subtrees for performance and ' +
			'never descends); Docker\'s matcher re-evaluates the full pattern ' +
			'list for every path, so <code>docs</code> + ' +
			'<code>!docs/README.md</code> works. Same file format, different ' +
			'decision procedure — which is exactly why it\'s worth implementing ' +
			'once.</p>' +
			'<h3>When debugging</h3>' +
			'<p>Secrets first: if <code>.env</code> ever reached the daemon and a ' +
			'<code>COPY . .</code> ran, it is in a layer <em>forever</em> — ' +
			'deleting it in a later <code>RUN rm</code> removes it from the final ' +
			'filesystem view but not from the earlier layer, and ' +
			'<code>docker save image | tar -x</code> reads it right back out. The ' +
			'fix is rotation, not rebuild. To see what the daemon actually ' +
			'receives, build a one-line probe stage — <code>FROM busybox</code>, ' +
			'<code>COPY . /ctx</code>, <code>RUN find /ctx</code> — and read the ' +
			'log. Two placement gotchas round it out: <code>.dockerignore</code> ' +
			'is read from the <em>context root</em>, not from next to a ' +
			'<code>-f path/to/Dockerfile</code>; and BuildKit additionally honors ' +
			'a per-Dockerfile <code>&lt;name&gt;.dockerignore</code>, which ' +
			'silently overrides the root one for that build — a classic "works ' +
			'on my machine" source when only one of the two files gets ' +
			'updated.</p>',
		],
		complexity: { time: 'O(p · n) per typical pattern — p patterns walked against n path segments; each ** adds a backtracking choice point', space: 'O(n) — recursion depth of the segment matcher' },
	});
})();
