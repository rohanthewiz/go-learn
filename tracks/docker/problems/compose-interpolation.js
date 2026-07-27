/* Compose Interpolation — Compose (Medium). The variable substitution pass
 * compose runs over the raw YAML text BEFORE parsing services: $VAR, ${VAR},
 * shell-style :- / - defaults, :? / ? required-variable errors, and the $$
 * escape. The harness pins the two eternal confusions — shell env beating
 * .env, and set-but-EMPTY being different from unset (:- fires on empty,
 * plain - does not) — plus the $$ escape and the bare-$VAR name boundary.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// The pipeline: interpolation consumes TEXT and two env sources — shell
	// env winning over .env — and only then does the YAML parser run.
	// env_file: is deliberately drawn bypassing the whole thing. Marker ids
	// namespaced (dgArrowDKCI) because every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 250" width="520" height="250" role="img" aria-label="compose interpolation runs over the raw YAML text before parsing: the shell environment and the .env file feed it, with the shell winning; env_file contents bypass interpolation entirely and only reach the container at runtime">' +
		'<text x="20" y="22" class="lbl">interpolation happens over TEXT — the YAML parser only ever sees the result</text>' +
		// the two interpolation inputs
		'<rect x="20" y="38" width="130" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="85" y="56" text-anchor="middle">shell env</text>' +
		'<text x="85" y="74" text-anchor="middle" class="lbl">export TAG=1.25</text>' +
		'<rect x="20" y="100" width="130" height="44" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="85" y="118" text-anchor="middle">project .env</text>' +
		'<text x="85" y="136" text-anchor="middle" class="lbl">TAG=1.19</text>' +
		// both feed the interpolation stage; the shell wins
		'<path d="M 154 60 C 180 62 200 70 216 80" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDKCIok)"/>' +
		'<text x="182" y="54" class="lbl" style="fill:var(--ok)">wins</text>' +
		'<path d="M 154 122 C 180 120 200 108 216 98" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKCI)"/>' +
		'<text x="168" y="140" class="lbl">fallback</text>' +
		// the interpolation stage itself
		'<rect x="220" y="66" width="140" height="48" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="290" y="95" text-anchor="middle">interpolate ${…}</text>' +
		// ...then, and only then, the parser
		'<path d="M 364 90 L 400 90" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKCI)"/>' +
		'<rect x="404" y="66" width="100" height="48" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="454" y="95" text-anchor="middle">YAML parser</text>' +
		// env_file: the impostor — it never touches interpolation
		'<rect x="20" y="170" width="150" height="44" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="95" y="188" text-anchor="middle">env_file: app.env</text>' +
		'<text x="95" y="206" text-anchor="middle" class="lbl">container runtime env</text>' +
		'<path d="M 174 192 L 470 192" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDKCIwarn)"/>' +
		'<text x="322" y="184" text-anchor="middle" class="lbl" style="fill:var(--warn)">NOT interpolation input — goes straight to the container</text>' +
		'<text x="20" y="240" class="lbl">precedence: shell env &gt; .env — defaults are literal text — $$ is a literal $</text>' +
		'<defs>' +
		'<marker id="dgArrowDKCI" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowDKCIok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowDKCIwarn" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'compose-interpolation',
		title: 'Compose Interpolation: ${VAR:-...} and .env',
		nav: 'compose interpolation',
		difficulty: 'Medium',
		category: 'Compose',
		task: 'Implement Interpolate: Compose\'s ${VAR:-...} substitution over raw YAML text — shell-over-.env precedence, set-but-empty vs unset, :? errors carrying the author\'s message, and $$ escapes.',

		prose: [
			'<h2>Compose Interpolation: <code>${VAR:-...}</code> and <code>.env</code></h2>' +
			'<p>You add <code>DB_PASSWORD</code> to <code>app.env</code>, reference ' +
			'<code>${DB_PASSWORD}</code> under <code>environment:</code>, and deploy. ' +
			'The stack comes up — and Postgres rejects every connection. ' +
			'<code>docker compose config</code> shows <code>PASSWORD: ""</code>, and ' +
			'buried above it: <code>WARN: The "DB_PASSWORD" variable is not set. ' +
			'Defaulting to a blank string</code>. The trap: <code>env_file:</code> is ' +
			'<em>runtime</em> environment handed to the container after it starts. ' +
			'Interpolation — the <code>${...}</code> substitution — reads exactly two ' +
			'sources: the <strong>shell environment</strong> compose was launched ' +
			'from, and the <strong><code>.env</code> file</strong> in the project ' +
			'directory. <code>app.env</code> is neither, so the variable was simply ' +
			'unset.</p>' +
			'<p>Interpolation runs over the raw YAML <em>text</em>, before any ' +
			'service is parsed — it is string rewriting with a small shell-derived ' +
			'grammar:</p>' +
			'<ul>' +
			'<li><strong>Names:</strong> <code>$VAR</code> or <code>${VAR}</code> — ' +
			'letters, digits, underscores, not starting with a digit. In the bare ' +
			'form the name ends at the first non-name byte, so <code>$DATA_DIR/data</code> ' +
			'expands the variable and keeps <code>/data</code>.</li>' +
			'<li><strong>Precedence:</strong> the process environment <em>wins</em> ' +
			'over <code>.env</code>. And “set but empty” is <strong>not</strong> ' +
			'“unset”: <code>export PORT=</code> makes <code>PORT</code> present with ' +
			'value <code>""</code> — it still shadows any <code>.env</code> value.</li>' +
			'<li><strong>Defaults:</strong> <code>${VAR:-def}</code> substitutes ' +
			'<code>def</code> when <code>VAR</code> is unset <em>or</em> empty; ' +
			'<code>${VAR-def}</code> only when it is truly unset. Defaults are ' +
			'literal text.</li>' +
			'<li><strong>Required:</strong> <code>${VAR:?msg}</code> aborts the whole ' +
			'interpolation with an error carrying <code>msg</code> when ' +
			'<code>VAR</code> is unset or empty; <code>${VAR?msg}</code> only when ' +
			'unset. A plain <code>${VAR}</code> that is unset just becomes the empty ' +
			'string (plus that WARN line).</li>' +
			'<li><strong>Escape:</strong> <code>$$</code> is a single literal ' +
			'<code>$</code> — how you get a real dollar sign (or a variable meant for ' +
			'the <em>container\'s</em> shell) past the interpolator.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Interpolate(s, shellEnv, dotEnv)</code> → ' +
			'<code>(result, errMsg)</code>: one pass over <code>s</code> applying the ' +
			'grammar above. The maps model presence exactly — a key mapped to ' +
			'<code>""</code> is <em>set but empty</em>; an absent key is ' +
			'<em>unset</em>. On success <code>errMsg</code> is <code>""</code>; a ' +
			'failed <code>:?</code>/<code>?</code> returns <code>("", "required ' +
			'variable &lt;NAME&gt; is missing a value: &lt;msg&gt;")</code>.</p>',
			{ lang: 'txt', code: 'shell:  TAG=1.25  PORT=            (PORT set but EMPTY)\n.env:   TAG=1.19  REGISTRY=ghcr.io/acme\n\nimage: ${REGISTRY}/api:${TAG}   ->  image: ghcr.io/acme/api:1.25\nports: ${PORT:-8080}:80         ->  ports: 8080:80    (:- fires on empty)\nports: ${PORT-8080}:80          ->  ports: :80        (- does not)\n${DB_PASSWORD:?db password}     ->  error: required variable DB_PASSWORD\n                                    is missing a value: db password' },
			'<div class="tip">Field note: <code>docker compose config</code> prints ' +
			'the file <em>after</em> interpolation and merging — it is the first ' +
			'command to run on any “wrong value in the container” bug. And when a ' +
			'command string must reach the container\'s shell intact — ' +
			'<code>test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER"]</code> — the ' +
			'<code>$$</code> is what stops compose from eating the variable on the ' +
			'way in.</div>',
		],

		starter: [
			'package main',
			'',
			'// Interpolate runs Compose\'s variable substitution over one string of',
			'// raw YAML text — this happens BEFORE any YAML parsing.',
			'//',
			'// Sources (and only these two — env_file contents are runtime env for',
			'// the container, never interpolation input):',
			'//   - shellEnv: the process environment compose was launched with',
			'//   - dotEnv:   the parsed .env file from the project directory',
			'//',
			'// Lookup precedence: shellEnv wins over dotEnv. A key PRESENT with an',
			'// empty value ("") is different from an ABSENT key — the maps model',
			'// "set but empty" as an entry whose value is "".',
			'//',
			'// Grammar (each $ introduces one form):',
			'//   $VAR          name = letter/underscore then letters/digits/_;',
			'//                 the name ends at the first non-name byte ($VAR/data)',
			'//   ${VAR}        same lookup; unset -> empty string, no error',
			'//   ${VAR:-def}   default if VAR is unset OR set-but-empty',
			'//   ${VAR-def}    default only if VAR is unset',
			'//   ${VAR:?msg}   error if VAR is unset OR set-but-empty',
			'//   ${VAR?msg}    error if VAR is unset',
			'//   $$            a single literal \'$\' (both bytes consumed; the text',
			'//                 after it is NOT a variable reference)',
			'//',
			'// Defaults and messages are literal text — no recursive interpolation',
			'// (real compose allows nesting; simplification).',
			'//',
			'// Returns (result, errMsg). errMsg is "" on success. On a failed',
			'// :? / ? the result is "" and errMsg is exactly:',
			'//   "required variable <NAME> is missing a value: <msg>"',
			'func Interpolate(s string, shellEnv, dotEnv map[string]string) (string, string) {',
			'	// your code here',
			'	return "", ""',
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
			'	// The two interpolation inputs. Note what is NOT here: env_file',
			'	// contents — those reach the container at runtime, never the YAML.',
			'	shell := map[string]string{',
			'		"TAG":      "1.25",',
			'		"PORT":     "", // present but EMPTY — different from unset',
			'		"DATA_DIR": "/srv/appdata",',
			'		"HOME":     "/root", // set, to prove $$HOME does NOT look it up',
			'	}',
			'	dotEnv := map[string]string{',
			'		"TAG":      "1.19", // loses to the shell value',
			'		"REGISTRY": "ghcr.io/acme",',
			'		"PORT":     "9999", // never consulted: shell already has PORT',
			'	}',
			'',
			'	show := func(s string) string {',
			'		res, errMsg := Interpolate(s, shell, dotEnv)',
			'		if errMsg != "" {',
			'			return "error: " + errMsg',
			'		}',
			'		return "ok: " + res',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"shell env wins over .env: TAG is 1.25 in the shell, 1.19 in .env",',
			'			"ok: image: nginx:1.25",',
			'			func() string { return show("image: nginx:${TAG}") }},',
			'		{".env supplies what the shell lacks: REGISTRY comes from the file",',
			'			"ok: image: ghcr.io/acme/api",',
			'			func() string { return show("image: ${REGISTRY}/api") }},',
			'		{":- fires on set-but-EMPTY: PORT exists in the shell but is \\"\\"",',
			'			"ok: ports: 8080:80",',
			'			func() string { return show("ports: ${PORT:-8080}:80") }},',
			'		{"- does NOT fire on empty: present-but-empty PORT stays empty",',
			'			"ok: ports: :80",',
			'			func() string { return show("ports: ${PORT-8080}:80") }},',
			'		{"- fires on truly unset: REPLICAS is in neither map",',
			'			"ok: replicas: 1",',
			'			func() string { return show("replicas: ${REPLICAS-1}") }},',
			'		{":? on an unset variable: the error carries the author\'s message",',
			'			"error: required variable DB_PASSWORD is missing a value: db password not set",',
			'			func() string { return show("password: ${DB_PASSWORD:?db password not set}") }},',
			'		{":? satisfied: a set, non-empty variable passes straight through",',
			'			"ok: tag 1.25",',
			'			func() string { return show("tag ${TAG:?TAG required}") }},',
			'		{"$$ escape: $$HOME is a literal $HOME even though HOME is set",',
			'			"ok: command: echo $HOME",',
			'			func() string { return show("command: echo $$HOME") }},',
			'		{"bare $VAR: the name ends at the first non-name byte (/)",',
			'			"ok: device: /srv/appdata/data",',
			'			func() string { return show("device: $DATA_DIR/data") }},',
			'		{"unset plain ${VAR} interpolates to empty string, no error",',
			'			"ok: image: app:",',
			'			func() string { return show("image: app:${GIT_SHA}") }},',
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
			'	"strings"',
			')',
			'',
			'// isNameStart / isNameChar define the variable-name alphabet. Compose',
			'// inherits POSIX shell names: letter or underscore first, then letters,',
			'// digits, underscores. Byte-wise tests are enough — the alphabet is',
			'// pure ASCII, so multi-byte UTF-8 sequences can never be name bytes.',
			'func isNameStart(c byte) bool {',
			'	return c == \'_\' || (c >= \'a\' && c <= \'z\') || (c >= \'A\' && c <= \'Z\')',
			'}',
			'',
			'func isNameChar(c byte) bool {',
			'	return isNameStart(c) || (c >= \'0\' && c <= \'9\')',
			'}',
			'',
			'// lookup resolves one name against the two interpolation sources. The',
			'// bool is the load-bearing part: the entire :- vs - distinction hangs',
			'// on "present" being separate from "value", so a missing key and an',
			'// empty value must never collapse into the same answer.',
			'//',
			'// Shell-over-.env precedence is the point of the design: .env holds',
			'// the checked-in team defaults, and any launcher — CI, a Makefile, a',
			'// one-off `TAG=... docker compose up` — can override without editing',
			'// a file. Note the shell wins even when its value is empty: presence',
			'// decides, not content.',
			'func lookup(name string, shellEnv, dotEnv map[string]string) (string, bool) {',
			'	if v, ok := shellEnv[name]; ok {',
			'		return v, true',
			'	}',
			'	if v, ok := dotEnv[name]; ok {',
			'		return v, true',
			'	}',
			'	return "", false',
			'}',
			'',
			'// resolveBraced evaluates the inside of one ${...}: a name, then an',
			'// optional operator whose argument is the REST of the body, taken',
			'// literally. Returns (value, errMsg); errMsg != "" aborts the whole',
			'// interpolation — a required variable failing must stop `up`, not',
			'// produce a config with a blank secret.',
			'func resolveBraced(body string, shellEnv, dotEnv map[string]string) (string, string) {',
			'	k := 0',
			'	for k < len(body) && isNameChar(body[k]) {',
			'		k++',
			'	}',
			'	name := body[:k]',
			'	rest := body[k:]',
			'	val, present := lookup(name, shellEnv, dotEnv)',
			'',
			'	if rest == "" {',
			'		// Plain ${VAR}. Unset simply yields "" — real compose also',
			'		// prints the famous WARN line to stderr, but the substituted',
			'		// value is the empty string either way.',
			'		return val, ""',
			'	}',
			'	// Operator dispatch. The two-byte forms (:-, :?) test "unset OR',
			'	// empty"; the one-byte forms (-, ?) test presence only. That colon',
			'	// is the single most-misread character in compose files: without',
			'	// it, an accidentally-exported-empty variable sails past a default',
			'	// meant to catch it.',
			'	if strings.HasPrefix(rest, ":-") {',
			'		if !present || val == "" {',
			'			// The default is LITERAL text — no re-interpolation of',
			'			// rest[2:]. (Real compose allows nested ${...} inside',
			'			// defaults; deliberate simplification here.)',
			'			return rest[2:], ""',
			'		}',
			'		return val, ""',
			'	}',
			'	if strings.HasPrefix(rest, ":?") {',
			'		if !present || val == "" {',
			'			return "", "required variable " + name + " is missing a value: " + rest[2:]',
			'		}',
			'		return val, ""',
			'	}',
			'	if strings.HasPrefix(rest, "-") {',
			'		if !present {',
			'			return rest[1:], ""',
			'		}',
			'		// Present-but-empty: the bare - keeps the empty value. This',
			'		// asymmetry with :- is inherited verbatim from POSIX shell',
			'		// parameter expansion.',
			'		return val, ""',
			'	}',
			'	if strings.HasPrefix(rest, "?") {',
			'		if !present {',
			'			return "", "required variable " + name + " is missing a value: " + rest[1:]',
			'		}',
			'		return val, ""',
			'	}',
			'	// Anything else after the name (real compose would reject the',
			'	// syntax) — fall back to the plain lookup rather than guessing.',
			'	return val, ""',
			'}',
			'',
			'// Interpolate is a single left-to-right scan. One pass is correct',
			'// because substituted values are NOT re-scanned — a value containing',
			'// "$" must not trigger another round of expansion (that way lies',
			'// injection: imagine a password containing "${"). Compose, like the',
			'// shell, expands each reference exactly once.',
			'func Interpolate(s string, shellEnv, dotEnv map[string]string) (string, string) {',
			'	out := make([]byte, 0, len(s))',
			'	i := 0',
			'	for i < len(s) {',
			'		if s[i] != \'$\' {',
			'			out = append(out, s[i])',
			'			i++',
			'			continue',
			'		}',
			'		if i+1 >= len(s) {',
			'			// A lone trailing \'$\': nothing to expand, keep it.',
			'			out = append(out, \'$\')',
			'			break',
			'		}',
			'		next := s[i+1]',
			'		if next == \'$\' {',
			'			// "$$" -> one literal \'$\'. Consuming BOTH bytes is what',
			'			// makes "$$HOME" come out as the text "$HOME": the H is',
			'			// plain text now, not the start of a reference.',
			'			out = append(out, \'$\')',
			'			i += 2',
			'			continue',
			'		}',
			'		if next == \'{\' {',
			'			rel := strings.IndexByte(s[i+2:], \'}\')',
			'			if rel < 0 {',
			'				// Unterminated ${ — real compose reports a syntax',
			'				// error; keeping the text literally is the graceful',
			'				// simplification for this exercise.',
			'				out = append(out, s[i:]...)',
			'				break',
			'			}',
			'			// The first \'}\' closes the body, so defaults/messages',
			'			// cannot themselves contain \'}\' (again: real compose',
			'			// tracks nesting; simplification).',
			'			body := s[i+2 : i+2+rel]',
			'			val, errMsg := resolveBraced(body, shellEnv, dotEnv)',
			'			if errMsg != "" {',
			'				return "", errMsg',
			'			}',
			'			out = append(out, val...)',
			'			i = i + 2 + rel + 1',
			'			continue',
			'		}',
			'		if isNameStart(next) {',
			'			// Bare $VAR: the name is the maximal run of name bytes,',
			'			// so "$DATA_DIR/data" splits at the \'/\' — exactly the',
			'			// shell\'s rule.',
			'			j := i + 1',
			'			for j < len(s) && isNameChar(s[j]) {',
			'				j++',
			'			}',
			'			v, _ := lookup(s[i+1:j], shellEnv, dotEnv)',
			'			out = append(out, v...)',
			'			i = j',
			'			continue',
			'		}',
			'		// \'$\' followed by something that cannot start a name (a',
			'		// digit, a space...): treat as a literal dollar sign.',
			'		out = append(out, \'$\')',
			'		i++',
			'	}',
			'	return string(out), ""',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Two files, two phases</h3>' +
			'<p>The <code>.env</code>-vs-<code>env_file:</code> confusion is the ' +
			'single most-asked compose question, and the resolution is that they ' +
			'belong to different <em>phases</em>. Interpolation is a preprocessing ' +
			'step over text: it runs before the YAML parser, so a substitution can ' +
			'land anywhere — an image tag, half a port mapping, a whole YAML value. ' +
			'Its inputs are fixed: the launching shell\'s environment and the ' +
			'project-directory <code>.env</code> file, shell winning. ' +
			'<code>env_file:</code>, by contrast, is a parsed <em>service ' +
			'property</em> — by the time compose reads it, interpolation is long ' +
			'finished. Its contents become the container\'s runtime environment, ' +
			'visible to <code>docker exec ... env</code> but never to ' +
			'<code>${...}</code> in the YAML. When a value seems to “not take”, ask ' +
			'which phase it was supposed to act in — <code>docker compose ' +
			'config</code> answers instantly, because it prints the file exactly as ' +
			'the parser saw it.</p>' +
			'<h3>Why the grammar is shell grammar</h3>' +
			'<p><code>:-</code>, <code>-</code>, <code>:?</code>, <code>?</code> are ' +
			'lifted directly from POSIX parameter expansion, colon-asymmetry ' +
			'included: the colon extends the test from “unset” to “unset or ' +
			'empty”. That distinction earns its keep in CI, where variables are ' +
			'routinely <em>declared</em> but empty — a pipeline with ' +
			'<code>TAG: ""</code> in its env block makes <code>${TAG-latest}</code> ' +
			'produce an image named <code>app:</code> while <code>${TAG:-latest}</code> ' +
			'does what everyone intended. In practice <code>:-</code> is almost ' +
			'always the right default operator, and <code>:?</code> is the right ' +
			'guardrail for secrets: failing <code>up</code> with a named error beats ' +
			'booting a database with an empty password.</p>' +
			'<p>Two design choices in your implementation mirror compose ' +
			'deliberately. Substituted values are never re-scanned — one expansion ' +
			'per reference, so data containing <code>$</code> cannot inject further ' +
			'expansions. And presence is tracked separately from value: the moment ' +
			'an implementation models the environment as a plain ' +
			'<code>string→string</code> lookup with a zero-value fallback, the ' +
			'<code>-</code>/<code>:-</code> distinction silently dies.</p>' +
			'<h3>Field notes</h3>' +
			'<p>The WARN line — <code>The "X" variable is not set. Defaulting to a ' +
			'blank string</code> — is stderr noise right up until it is the answer: ' +
			'an image named <code>app:</code> (empty tag) or a port mapping ' +
			'<code>:80</code> traces back to exactly that warning. The ' +
			'<code>$$</code> escape matters wherever a string must reach the ' +
			'<em>container\'s</em> shell with its dollar intact — healthcheck ' +
			'<code>CMD-SHELL</code> commands and inline <code>sh -c</code> ' +
			'entrypoints are the classic spots; a missing second <code>$</code> ' +
			'means compose substitutes at parse time (usually to empty) and the ' +
			'container runs a hollowed-out command. Last: real compose lets ' +
			'defaults nest (<code>${A:-${B}}</code>) and treats truly malformed ' +
			'<code>${</code> as a hard error — both simplified away here, neither ' +
			'changing the mental model that matters: interpolation is a one-pass ' +
			'text rewrite with two inputs, and the shell always wins.</p>',
		],
		complexity: { time: 'O(n) — one left-to-right scan; each byte is visited once', space: 'O(n) for the rewritten output' },
	});
})();
