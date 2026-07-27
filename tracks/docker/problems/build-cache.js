/* Build Cache Invalidation — Images & Builds (Medium). The rule every
 * "why did my whole image rebuild" question comes down to: step i is
 * CACHED iff its parent was CACHED and the step matches — RUN by
 * instruction TEXT, COPY/ADD by text plus a content checksum — and the
 * first miss poisons every later step. The harness pins the full hit,
 * the RUN-text bust, the content-addressed COPY (touch stays cached,
 * byte change busts), appended steps, and the early-metadata cascade.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// One build replayed against the previous build's cached chain: the
	// first mismatch flips the verdict, and the miss cascades because
	// every later step's parent image is now different. Marker id
	// namespaced (dgArrowDKBC) — every track's SVGs share the page's id
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 248" width="520" height="248" role="img" aria-label="five Dockerfile steps compared against the cached chain: the first three match and are CACHED, the fourth has a changed content checksum and is BUILD, and the miss cascades to every step below it">' +
		'<text x="20" y="22" class="lbl">current Dockerfile vs last build’s cached chain — compared top-down</text>' +
		// the five steps, top-down: three hits, then the miss, then the cascade
		'<rect x="20" y="36" width="230" height="28" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="135" y="55" text-anchor="middle">FROM golang:1.24</text>' +
		'<rect x="20" y="74" width="230" height="28" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="135" y="93" text-anchor="middle">COPY go.mod .</text>' +
		'<rect x="20" y="112" width="230" height="28" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="135" y="131" text-anchor="middle">RUN go mod download</text>' +
		'<rect x="20" y="150" width="230" height="28" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="135" y="169" text-anchor="middle">COPY . .</text>' +
		'<rect x="20" y="188" width="230" height="28" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="135" y="207" text-anchor="middle">RUN go build ./...</text>' +
		// middle column: what each comparison actually looked at
		'<text x="268" y="55" class="lbl">text =</text>' +
		'<text x="268" y="93" class="lbl">text = · content =</text>' +
		'<text x="268" y="131" class="lbl">text =  (world may have changed — irrelevant)</text>' +
		'<text x="268" y="169" class="lbl" style="fill:var(--warn)">text = · content ≠  (one .go file edited)</text>' +
		'<text x="268" y="207" class="lbl" style="fill:var(--warn)">parent missed — not even compared</text>' +
		// right column: verdicts
		'<text x="480" y="55" text-anchor="middle" style="fill:var(--ok)">CACHED</text>' +
		'<text x="480" y="93" text-anchor="middle" style="fill:var(--ok)">CACHED</text>' +
		'<text x="480" y="131" text-anchor="middle" style="fill:var(--ok)">CACHED</text>' +
		'<text x="480" y="169" text-anchor="middle" style="fill:var(--warn)">BUILD</text>' +
		'<text x="480" y="207" text-anchor="middle" style="fill:var(--warn)">BUILD</text>' +
		// the cascade: the miss flows down, unconditionally
		'<path d="M 480 174 L 480 196" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDKBC)"/>' +
		'<text x="20" y="240" class="lbl">a miss never heals: a byte-identical later step still rebuilds — its parent image changed</text>' +
		'<defs><marker id="dgArrowDKBC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'build-cache',
		title: 'Build Cache Invalidation',
		nav: 'build cache',
		difficulty: 'Medium',
		category: 'Images & Builds',
		task: 'Implement CacheStates: replay each step against the cached chain — RUN matches by text, COPY/ADD by text + content checksum — and the first miss makes every later step BUILD.',

		prose: [
			'<h2>Build Cache Invalidation</h2>' +
			'<p>You fix a typo in <code>main.go</code>, push, and CI spends four ' +
			'minutes re-running <code>apt-get install</code> and re-downloading every ' +
			'Go module — for a one-line change. The next week the opposite bite: a ' +
			'security rebuild comes back green in nine seconds because ' +
			'<code>RUN apt-get update &amp;&amp; apt-get install curl</code> was ' +
			'<code>CACHED</code>, and you ship last month’s package index. Both ' +
			'mysteries are the same small algorithm — the cache-hit rule the builder ' +
			'runs for every step, top-down:</p>' +
			'<ul>' +
			'<li><strong>A step’s cache key is its parent plus itself.</strong> Step ' +
			'<em>i</em> can only be <code>CACHED</code> if step <em>i−1</em> was ' +
			'<code>CACHED</code> — reusing a layer means reusing it <em>on top of the ' +
			'same parent image</em>. (Step 0’s parent is the base image, which ' +
			'matches by definition here.)</li>' +
			'<li><strong><code>RUN</code> and metadata ops match on instruction text ' +
			'alone.</strong> The builder compares the string, not the world: it has ' +
			'no idea what a command fetched from the network last time, so ' +
			'<code>apt-get update</code> never re-runs just because the mirror ' +
			'changed. Identical text ⇒ hit, full stop.</li>' +
			'<li><strong><code>COPY</code>/<code>ADD</code> are content-addressed.</strong> ' +
			'The instruction text must match <em>and</em> a checksum of the copied ' +
			'files’ <strong>contents</strong> must match. Timestamps are not in the ' +
			'sum — <code>touch main.go</code> without changing bytes stays cached; ' +
			'editing one byte busts it.</li>' +
			'<li><strong>A shorter history means the tail is new.</strong> If the ' +
			'cached chain has fewer steps than the current Dockerfile, everything ' +
			'past its end is <code>BUILD</code>.</li>' +
			'<li><strong>The first miss poisons everything after it.</strong> No ' +
			'exceptions: once one step rebuilds, its output image is new, so no ' +
			'later step’s parent can match — even steps whose text and content are ' +
			'byte-identical to the cache.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>That cascade rule is why instruction <em>order</em> is the whole ' +
			'game. Put the volatile thing (your source tree) as late as possible and ' +
			'the expensive thing (dependency download) before it:</p>',
			{ lang: 'txt', code: '# cache-hostile: ANY source edit re-downloads every module\nCOPY . .\nRUN go mod download\nRUN go build ./...\n\n# cache-friendly: only go.mod/go.sum edits bust the deps layer\nCOPY go.mod go.sum ./\nRUN go mod download\nCOPY . .\nRUN go build ./...' },
			'<h3>Your job</h3>' +
			'<p>Implement <code>CacheStates(cached, current)</code>. Each ' +
			'<code>Step</code> is <code>{Op, Arg, ContentSum}</code> — ' +
			'<code>ContentSum</code> is only meaningful for <code>COPY</code>/' +
			'<code>ADD</code> (a checksum of the copied files’ contents) and empty ' +
			'otherwise. Walk the current steps in order and return one verdict per ' +
			'step, <code>"CACHED"</code> or <code>"BUILD"</code>, applying exactly ' +
			'the rules above.</p>' +
			'<div class="tip">Field note: the gotcha runs both ways. Source edits ' +
			'busting the deps layer is the slow-build complaint; <code>RUN</code> ' +
			'matching by text is the <em>stale</em>-build complaint — a cached ' +
			'<code>apt-get update</code> can pin you to a months-old package index. ' +
			'That’s why CI pipelines pass <code>--no-cache</code> on release builds, ' +
			'and why the old trick of a throwaway <code>ARG CACHEBUST</code> works: ' +
			'changing the arg changes the instruction text, which is the only thing ' +
			'the comparison ever looks at.</div>',
		],

		starter: [
			'package main',
			'',
			'// Step is one build instruction as the cache sees it.',
			'//',
			'//   - Op:  the instruction keyword — "FROM", "RUN", "COPY", "ADD",',
			'//     "ENV", "WORKDIR", ...',
			'//   - Arg: the rest of the instruction line, verbatim',
			'//   - ContentSum: for COPY/ADD only — a checksum of the copied',
			'//     files\' CONTENTS (mtimes are not part of it). Empty for every',
			'//     other op.',
			'type Step struct {',
			'	Op         string',
			'	Arg        string',
			'	ContentSum string',
			'}',
			'',
			'// CacheStates replays the builder\'s cache decision for every step of',
			'// the current Dockerfile against the cached chain left by the last',
			'// build. It returns one verdict per current step: "CACHED" or "BUILD".',
			'//',
			'// Rules:',
			'//   - step i can be CACHED only if step i-1 was CACHED (a layer is',
			'//     only reusable on top of the same parent; step 0\'s parent — the',
			'//     base image — matches by definition)',
			'//   - RUN and metadata ops match on instruction text alone: Op and',
			'//     Arg must equal the cached step\'s',
			'//   - COPY and ADD additionally require an identical ContentSum',
			'//   - if the cached chain is shorter than current, the steps past its',
			'//     end are BUILD',
			'//   - the first BUILD makes every later step BUILD, no exceptions',
			'func CacheStates(cached, current []Step) []string {',
			'	// your code here',
			'	return nil',
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
			'	// The canonical cache-friendly Go service Dockerfile: deps layer',
			'	// (go.mod + download) before the source tree. This is the cached',
			'	// chain the last successful build left behind.',
			'	base := []Step{',
			'		{"FROM", "golang:1.24-alpine", ""},',
			'		{"WORKDIR", "/app", ""},',
			'		{"COPY", "go.mod go.sum ./", "sum:mod-v1"},',
			'		{"RUN", "go mod download", ""},',
			'		{"COPY", ". .", "sum:src-v1"},',
			'		{"RUN", "go build -o /server ./cmd", ""},',
			'	}',
			'	// mod returns a copy of steps with index i replaced — each case',
			'	// perturbs exactly one step of an otherwise identical build.',
			'	mod := func(steps []Step, i int, s Step) []Step {',
			'		out := append([]Step(nil), steps...)',
			'		out[i] = s',
			'		return out',
			'	}',
			'	st := func(cached, current []Step) string {',
			'		return strings.Join(CacheStates(cached, current), " ")',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"first build: no cached chain at all — every step is BUILD",',
			'			"BUILD BUILD BUILD BUILD BUILD BUILD",',
			'			func() string { return st(nil, base) }},',
			'		{"no-op rebuild: identical text and content sums — full cache hit",',
			'			"CACHED CACHED CACHED CACHED CACHED CACHED",',
			'			func() string { return st(base, append([]Step(nil), base...)) }},',
			'		{"RUN text edit (go mod download -x): the string changed, so it and the whole tail rebuild",',
			'			"CACHED CACHED CACHED BUILD BUILD BUILD",',
			'			func() string {',
			'				return st(base, mod(base, 3, Step{"RUN", "go mod download -x", ""}))',
			'			}},',
			'		{"source edit: COPY . . text identical, ContentSum changed — deps layer survives, tail rebuilds",',
			'			"CACHED CACHED CACHED CACHED BUILD BUILD",',
			'			func() string {',
			'				return st(base, mod(base, 4, Step{"COPY", ". .", "sum:src-v2"}))',
			'			}},',
			'		{"touch(1) only: mtimes changed, bytes did not — ContentSum identical, still a full hit",',
			'			"CACHED CACHED",',
			'			func() string {',
			'				a := []Step{{"FROM", "alpine:3.20", ""}, {"COPY", "app.py /app/", "sum:9d2f"}}',
			'				b := []Step{{"FROM", "alpine:3.20", ""}, {"COPY", "app.py /app/", "sum:9d2f"}}',
			'				return st(a, b)',
			'			}},',
			'		{"dependency bump: go.mod ContentSum changed — download re-runs even though its RUN text is identical",',
			'			"CACHED CACHED BUILD BUILD BUILD BUILD",',
			'			func() string {',
			'				return st(base, mod(base, 2, Step{"COPY", "go.mod go.sum ./", "sum:mod-v2"}))',
			'			}},',
			'		{"appended step: cached chain is shorter, so only the new tail builds",',
			'			"CACHED CACHED CACHED CACHED CACHED CACHED BUILD",',
			'			func() string {',
			'				return st(base, append(append([]Step(nil), base...), Step{"RUN", "go vet ./...", ""}))',
			'			}},',
			'		{"early metadata edit (WORKDIR /srv): everything after rebuilds — even byte-identical COPY steps",',
			'			"CACHED BUILD BUILD BUILD BUILD BUILD",',
			'			func() string {',
			'				return st(base, mod(base, 1, Step{"WORKDIR", "/srv", ""}))',
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
			'// Step is one build instruction as the cache sees it. (Redeclared',
			'// here: the solution replaces the starter wholesale, so it must carry',
			'// every type it uses.)',
			'//',
			'//   - Op:  the instruction keyword — "FROM", "RUN", "COPY", "ADD",',
			'//     "ENV", "WORKDIR", ...',
			'//   - Arg: the rest of the instruction line, verbatim',
			'//   - ContentSum: for COPY/ADD only — a checksum of the copied',
			'//     files\' CONTENTS (mtimes are not part of it). Empty for every',
			'//     other op.',
			'type Step struct {',
			'	Op         string',
			'	Arg        string',
			'	ContentSum string',
			'}',
			'',
			'// stepMatches decides whether one current step can reuse its cached',
			'// counterpart, ASSUMING the parent chain already matched — the parent',
			'// condition lives in the caller, because it is a property of the walk,',
			'// not of the pair.',
			'func stepMatches(old, cur Step) bool {',
			'	// Every op compares instruction text first. This is the whole',
			'	// story for RUN: the builder cannot know what a command read from',
			'	// the network or the clock, so it ASSUMES determinism — identical',
			'	// text, identical result. (Hence the classic stale apt-get update,',
			'	// and hence ARG CACHEBUST tricks: changing the text is the only',
			'	// lever this comparison exposes.)',
			'	if old.Op != cur.Op || old.Arg != cur.Arg {',
			'		return false',
			'	}',
			'	// COPY/ADD are the exception: the instruction names files whose',
			'	// bytes live outside the Dockerfile, so the builder hashes the',
			'	// CONTENTS and compares that too. Content-addressing — not mtimes —',
			'	// is why touch(1) keeps the cache and a one-byte edit busts it.',
			'	if cur.Op == "COPY" || cur.Op == "ADD" {',
			'		return old.ContentSum == cur.ContentSum',
			'	}',
			'	return true',
			'}',
			'',
			'// CacheStates walks the current Dockerfile top-down, carrying one bit',
			'// of state: whether the parent chain is still intact. That single bit',
			'// IS the famous cascade — there is no per-step cleverness to recover',
			'// a hit after a miss, because a rebuilt step produces a new parent',
			'// image and cache entries are keyed on their parent.',
			'func CacheStates(cached, current []Step) []string {',
			'	states := make([]string, 0, len(current))',
			'	// live: every step so far was CACHED. Starts true — step 0\'s',
			'	// parent is the base image, which matches by definition in this',
			'	// model.',
			'	live := true',
			'	for i, cur := range current {',
			'		// A hit needs all three: an intact parent chain, a cached',
			'		// counterpart at this index (a shorter history simply ends),',
			'		// and a per-step match under the op\'s comparison rule.',
			'		if live && i < len(cached) && stepMatches(cached[i], cur) {',
			'			states = append(states, "CACHED")',
			'			continue',
			'		}',
			'		// First miss: drop live permanently. Later steps may be',
			'		// byte-identical to their cached versions — irrelevant; their',
			'		// parent image is new, so they rebuild.',
			'		live = false',
			'		states = append(states, "BUILD")',
			'	}',
			'	return states',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the cache is keyed the way it is</h3>' +
			'<p>An image is a chain of layers, each produced by running one step on ' +
			'top of the previous layer’s filesystem. So a cache entry can’t be ' +
			'“the result of <code>RUN go mod download</code>” in the abstract — it ' +
			'is “the result of that instruction <em>on this exact parent</em>”. ' +
			'That’s the whole cascade rule in one sentence: rebuild any step and ' +
			'its output is a new image, so no later step can find a cache entry ' +
			'keyed on it. The single <code>live</code> boolean in the solution is ' +
			'the honest shape of the algorithm; anything cleverer would be wrong.</p>' +
			'<h3>Two comparison rules, two failure modes</h3>' +
			'<p><code>RUN</code> is compared by <strong>text</strong> because the ' +
			'builder can’t do better: it has no model of what a shell command reads ' +
			'from the network, the clock, or <code>/dev/urandom</code>. It assumes ' +
			'determinism. That assumption is exactly wrong for ' +
			'<code>apt-get update</code>, which is <em>designed</em> to observe the ' +
			'outside world — hence the canonical advice to write ' +
			'<code>apt-get update &amp;&amp; apt-get install</code> in <em>one</em> ' +
			'<code>RUN</code>: split across two steps, the <code>update</code> layer ' +
			'can stay cached while the <code>install</code> list changes, and you ' +
			'install new packages against a stale index.</p>' +
			'<p><code>COPY</code>/<code>ADD</code> get the stronger rule because ' +
			'they <em>can</em>: the referenced bytes are right there in the build ' +
			'context, so the builder hashes file contents (BuildKit does this per ' +
			'file, mode bits included, mtimes excluded) and compares checksums. ' +
			'That’s why <code>git checkout</code> touching every file’s mtime ' +
			'doesn’t bust anything, and why a one-character edit does.</p>' +
			'<h3>The ordering pattern, generalized</h3>' +
			'<p>Since volatility flows downward, sort your Dockerfile by <em>rate ' +
			'of change</em>: base image, then OS packages, then the dependency ' +
			'manifest (<code>go.mod</code>/<code>go.sum</code>, ' +
			'<code>package-lock.json</code>, <code>requirements.txt</code>) plus its ' +
			'install step, then — last — the source tree. The manifest copy is the ' +
			'load-bearing trick: it changes weekly while the source changes ' +
			'hourly, so <code>COPY go.mod go.sum ./</code> before ' +
			'<code>RUN go mod download</code> before <code>COPY . .</code> means a ' +
			'source edit rebuilds seconds of <code>go build</code> instead of ' +
			'minutes of module downloads. The same trace, run backwards, is the ' +
			'debugging method: find the <em>first</em> <code>BUILD</code> line in ' +
			'the build output — everything after it is cascade, not cause.</p>' +
			'<h3>Field notes</h3>' +
			'<p>BuildKit prints <code>CACHED</code> on reused steps — the exact ' +
			'strings this exercise emits. <code>docker history &lt;image&gt;</code> ' +
			'shows the per-layer chain your verdicts walk. <code>--no-cache</code> ' +
			'forces all-<code>BUILD</code> (release builds use it to dodge the ' +
			'stale-<code>RUN</code> trap), and <code>--cache-from</code> seeds the ' +
			'chain from a registry image so CI runners with empty local state can ' +
			'still hit. And when a rebuild you expected to be cached isn’t, the ' +
			'usual culprits are exactly the model’s inputs: a changed instruction ' +
			'string (even whitespace counts), a changed file byte in a ' +
			'<code>COPY</code>, or an earlier step you didn’t notice missing — ' +
			'often a <code>COPY . .</code> placed too high sweeping in ' +
			'<code>.git</code> churn that a <code>.dockerignore</code> should have ' +
			'excluded.</p>',
		],
		complexity: { time: 'O(n) — one pass over the current steps, one bool of walk state', space: 'O(n) for the verdict slice' },
	});
})();
