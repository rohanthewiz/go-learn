/* Dockerfile Evaluation — Images & Builds (Medium). A Dockerfile is a
 * program evaluated top-to-bottom into exactly two outputs: filesystem
 * layers (RUN/COPY/ADD) and config metadata (everything else). The learner
 * implements the evaluator: layer counting, build-time $NAME/${NAME}
 * substitution from ENV, relative-WORKDIR joining, EXPOSE accumulation,
 * and last-CMD/ENTRYPOINT-wins. The harness pins each rule separately and
 * then a realistic full build.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// One pass, two outputs: each instruction either appends a filesystem
	// layer or edits the config JSON — never both. Marker ids namespaced
	// (dgArrowDKDF) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 240" width="520" height="240" role="img" aria-label="a Dockerfile evaluated top to bottom: RUN, COPY and ADD append filesystem layers; ENV, WORKDIR, EXPOSE, CMD only edit the image config metadata">' +
		'<text x="20" y="22" class="lbl">one pass, two outputs: every instruction adds a layer OR edits the config</text>' +
		// the Dockerfile, top to bottom
		'<text x="24" y="56">ENV APP=/opt</text>' +
		'<text x="24" y="86">COPY . $APP</text>' +
		'<text x="24" y="116">RUN go build</text>' +
		'<text x="24" y="146">EXPOSE 8080</text>' +
		'<text x="24" y="176">CMD ./s</text>' +
		// filesystem layers: the size-bearing half
		'<text x="410" y="40" text-anchor="middle" class="lbl" style="fill:var(--accent)">filesystem layers</text>' +
		'<rect x="330" y="48" width="160" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="410" y="65" text-anchor="middle" class="lbl">layer 1: COPY . /opt</text>' +
		'<rect x="330" y="80" width="160" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="410" y="97" text-anchor="middle" class="lbl">layer 2: RUN go build</text>' +
		// config: the 0B half
		'<text x="410" y="130" text-anchor="middle" class="lbl" style="fill:var(--ok)">config (metadata JSON)</text>' +
		'<rect x="330" y="138" width="160" height="68" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="340" y="156" class="lbl">Env:     APP=/opt</text>' +
		'<text x="340" y="172" class="lbl">Exposed: [8080]</text>' +
		'<text x="340" y="188" class="lbl">Cmd:     ./s</text>' +
		// routing arrows: which instruction feeds which output
		'<path d="M 132 52 C 220 44 280 90 326 130" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDKDFok)"/>' +
		'<path d="M 132 82 C 200 76 270 66 326 61" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDKDF)"/>' +
		'<path d="M 136 112 C 200 108 270 98 326 93" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDKDF)"/>' +
		'<path d="M 132 142 C 210 148 270 158 326 166" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDKDFok)"/>' +
		'<path d="M 96 172 C 200 178 270 182 326 184" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDKDFok)"/>' +
		'<text x="20" y="230" class="lbl">docker history: layer rows show real sizes — config rows show 0B</text>' +
		'<defs>' +
		'<marker id="dgArrowDKDF" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowDKDFok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'dockerfile-eval',
		title: 'Dockerfile Evaluation: layers vs metadata',
		nav: 'dockerfile eval',
		difficulty: 'Medium',
		category: 'Images & Builds',
		task: 'Implement Eval: fold Dockerfile instructions into layers + config — RUN/COPY/ADD add layers; ENV substitutes $NAME/${NAME} into later args; relative WORKDIR joins on; last CMD/ENTRYPOINT wins.',

		prose: [
			'<h2>Dockerfile Evaluation: layers vs metadata</h2>' +
			'<p>Your service image is 1.2&nbsp;GB, so you add ' +
			'<code>RUN rm -rf /root/.cache</code> at the bottom of the Dockerfile — ' +
			'and the image gets slightly <em>bigger</em>. Meanwhile a teammate ' +
			'swears their <code>COPY config.yaml app/</code> is broken because the ' +
			'file lands in <code>/srv/app</code>, not <code>/app</code>. Then you run ' +
			'<code>docker history</code> and half the rows say <code>0B</code>. All ' +
			'three surprises are the same fact: a Dockerfile is not a shell script — ' +
			'it is a <strong>program the builder evaluates top-to-bottom into two ' +
			'outputs</strong>: a stack of filesystem layers, and one JSON blob of ' +
			'config metadata. Every instruction feeds exactly one of the two:</p>' +
			'<ul>' +
			'<li><strong><code>RUN</code>, <code>COPY</code>, <code>ADD</code> each ' +
			'append a filesystem layer</strong> — a tar of what changed. These are ' +
			'the only size-bearing rows in <code>docker history</code>.</li>' +
			'<li><strong>Everything else only mutates config</strong> — ' +
			'<code>ENV</code>, <code>WORKDIR</code>, <code>EXPOSE</code>, ' +
			'<code>LABEL</code>, <code>USER</code>, <code>CMD</code>, ' +
			'<code>ENTRYPOINT</code> produce no layer at all (the <code>0B</code> ' +
			'rows).</li>' +
			'<li><strong><code>ENV KEY=value</code></strong> sets ' +
			'<code>Env[KEY]</code>; a repeated key <em>overwrites</em>. From that ' +
			'point on, <code>$NAME</code> and <code>${NAME}</code> in later ' +
			'instructions\' args are substituted <em>textually, at build time</em> — ' +
			'bare <code>$NAME</code> reads the longest run of letters, digits and ' +
			'underscores; braces bound the name explicitly; an undefined name ' +
			'expands to the empty string, like a shell.</li>' +
			'<li><strong><code>WORKDIR</code></strong>: an absolute arg replaces the ' +
			'current workdir; a relative arg <em>joins onto it</em> ' +
			'(<code>path.Join</code> semantics). The initial workdir is ' +
			'<code>/</code>.</li>' +
			'<li><strong><code>EXPOSE</code> accumulates</strong> — every port joins ' +
			'the list, in order. <strong><code>CMD</code>, <code>ENTRYPOINT</code> ' +
			'and <code>USER</code>: the last one wins</strong> — each is a single ' +
			'slot in the config, not a list.</li>' +
			'</ul>' +
			DIAGRAM,
			{ lang: 'txt', code: 'ENV  APP=/opt/app      config: Env[APP]=/opt/app       (0B row)\nWORKDIR $APP           config: Workdir=/opt/app        (0B row)\nCOPY . .               layer 1\nRUN  go build -o s .   layer 2\nEXPOSE 8080            config: Exposed=[8080]          (0B row)\nCMD  ./s               config: Cmd=./s                 (0B row, last one wins)' },
			'<h3>Your job</h3>' +
			'<p>The starter declares <code>Instr</code> (one tokenized instruction: ' +
			'<code>Op</code> is the keyword, <code>Arg</code> the rest of the line) ' +
			'and <code>Result</code> (the image, reduced to its two halves). ' +
			'Implement <code>expand(s, env)</code> — the build-time substitution — ' +
			'and <code>Eval(instrs)</code>, the fold that applies every rule above. ' +
			'One wrinkle worth matching: for <code>ENV</code>, split ' +
			'<code>KEY=value</code> on the <em>first</em> <code>=</code> of the raw ' +
			'arg, then expand only the value — keys are never substituted.</p>' +
			'<div class="tip">Field note: <code>ENV</code> persists into the image ' +
			'config forever — <code>docker inspect</code> prints it to anyone who ' +
			'can pull the image, which is why secrets never belong in ' +
			'<code>ENV</code>. And because substitution happens at <em>build</em> ' +
			'time in the builder, not at run time in a shell, exec-form ' +
			'<code>CMD ["echo", "$HOME"]</code> famously prints the literal string ' +
			'<code>$HOME</code>: no shell ever runs.</div>',
		],

		starter: [
			'package main',
			'',
			'// Instr is one Dockerfile instruction, already tokenized: Op is the',
			'// uppercase keyword ("RUN", "ENV", "WORKDIR", ...), Arg is the rest',
			'// of the line, verbatim.',
			'type Instr struct {',
			'	Op  string',
			'	Arg string',
			'}',
			'',
			'// Result is the built image reduced to its two halves: Layers counts',
			'// the filesystem layers; every other field is config metadata.',
			'type Result struct {',
			'	Layers     int               // one per RUN / COPY / ADD',
			'	Env        map[string]string // ENV key=value; same key overwrites',
			'	Workdir    string            // starts at "/"; WORKDIR edits it',
			'	Exposed    []string          // EXPOSE accumulates, in order',
			'	Cmd        string            // last CMD wins',
			'	Entrypoint string            // last ENTRYPOINT wins',
			'	User       string            // last USER wins',
			'}',
			'',
			'// expand performs build-time variable substitution on s:',
			'//   - $NAME  substitutes env[NAME]; NAME is the longest run of',
			'//     letters, digits and underscores after the $',
			'//   - ${NAME} substitutes env[NAME] with an explicit boundary',
			'//   - an undefined NAME expands to "" (like a shell)',
			'//   - a $ followed by neither { nor an identifier char is literal',
			'func expand(s string, env map[string]string) string {',
			'	// your code here',
			'	return s',
			'}',
			'',
			'// Eval runs the Dockerfile program top-to-bottom and returns the',
			'// image it denotes.',
			'//   - RUN / COPY / ADD: Layers++ (filesystem half)',
			'//   - ENV:       split the RAW arg on the first \'=\'; expand only the',
			'//                value; same key overwrites',
			'//   - WORKDIR:   expand; absolute replaces, relative joins onto the',
			'//                current workdir (path.Join); initial workdir is "/"',
			'//   - EXPOSE:    expand; append to Exposed',
			'//   - USER / CMD / ENTRYPOINT: expand; last one wins',
			'//   - LABEL:     config-only; nothing tracked in Result',
			'func Eval(instrs []Instr) Result {',
			'	// your code here',
			'	return Result{}',
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
			'		{"RUN/COPY/ADD lay down layers; ENV/EXPOSE/LABEL/CMD are 0B metadata",',
			'			"layers=3",',
			'			func() string {',
			'				r := Eval([]Instr{',
			'					{"ENV", "LANG=C"},',
			'					{"COPY", "go.mod ."},',
			'					{"RUN", "go mod download"},',
			'					{"EXPOSE", "8080"},',
			'					{"LABEL", "team=payments"},',
			'					{"ADD", "site.tgz /srv"},',
			'					{"CMD", "./server"},',
			'				})',
			'				return fmt.Sprintf("layers=%d", r.Layers)',
			'			}},',
			'		{"ENV substitutes into a later RUN and WORKDIR — $NAME, build time, textual",',
			'			"wd=/opt/app layers=1",',
			'			func() string {',
			'				r := Eval([]Instr{',
			'					{"ENV", "APP_HOME=/opt/app"},',
			'					{"RUN", "mkdir -p $APP_HOME"},',
			'					{"WORKDIR", "$APP_HOME"},',
			'				})',
			'				return fmt.Sprintf("wd=%s layers=%d", r.Workdir, r.Layers)',
			'			}},',
			'		{"relative WORKDIR chains: each one joins onto the last",',
			'			"wd=/srv/app/logs",',
			'			func() string {',
			'				r := Eval([]Instr{',
			'					{"WORKDIR", "/srv"},',
			'					{"WORKDIR", "app"},',
			'					{"WORKDIR", "logs"},',
			'				})',
			'				return fmt.Sprintf("wd=%s", r.Workdir)',
			'			}},',
			'		{"relative WORKDIR joins onto the default /; a later absolute one replaces",',
			'			"wd=/etc/conf",',
			'			func() string {',
			'				r := Eval([]Instr{',
			'					{"WORKDIR", "app"},',
			'					{"WORKDIR", "/etc"},',
			'					{"WORKDIR", "conf"},',
			'				})',
			'				return fmt.Sprintf("wd=%s", r.Workdir)',
			'			}},',
			'		{"CMD, ENTRYPOINT and USER are single slots: the last one wins",',
			'			"entrypoint=/srv/app cmd=two user=app",',
			'			func() string {',
			'				r := Eval([]Instr{',
			'					{"ENTRYPOINT", "/bin/sh"},',
			'					{"USER", "root"},',
			'					{"CMD", "one"},',
			'					{"ENTRYPOINT", "/srv/app"},',
			'					{"CMD", "two"},',
			'					{"USER", "app"},',
			'				})',
			'				return fmt.Sprintf("entrypoint=%s cmd=%s user=%s", r.Entrypoint, r.Cmd, r.User)',
			'			}},',
			'		{"EXPOSE accumulates: every port joins the list, in order",',
			'			"exposed=[80 443 9090/udp]",',
			'			func() string {',
			'				r := Eval([]Instr{',
			'					{"EXPOSE", "80"},',
			'					{"EXPOSE", "443"},',
			'					{"EXPOSE", "9090/udp"},',
			'				})',
			'				return fmt.Sprintf("exposed=%v", r.Exposed)',
			'			}},',
			'		{"repeated ENV overwrites; substitution is textual at eval time — no back-propagation",',
			'			"env=map[A:two B:one]",',
			'			func() string {',
			'				r := Eval([]Instr{',
			'					{"ENV", "A=one"},',
			'					{"ENV", "B=$A"},',
			'					{"ENV", "A=two"},',
			'				})',
			'				return fmt.Sprintf("env=%v", r.Env)',
			'			}},',
			'		{"${NAME} bounds the name where bare $NAME would over-read; undefined expands empty",',
			'			"exposed=[8080] cmd=run-",',
			'			func() string {',
			'				r := Eval([]Instr{',
			'					{"ENV", "V=8"},',
			'					{"EXPOSE", "${V}080"},',
			'					{"CMD", "run-$VERBOSE"},',
			'				})',
			'				return fmt.Sprintf("exposed=%v cmd=%s", r.Exposed, r.Cmd)',
			'			}},',
			'		{"a realistic build: every rule at once",',
			'			"layers=4 wd=/opt/app exposed=[8080] entrypoint=/opt/app/server cmd=--port=8080 user=1000",',
			'			func() string {',
			'				r := Eval([]Instr{',
			'					{"ENV", "APP_HOME=/opt/app"},',
			'					{"WORKDIR", "$APP_HOME"},',
			'					{"COPY", "go.mod ."},',
			'					{"RUN", "go mod download"},',
			'					{"COPY", ". ."},',
			'					{"RUN", "go build -o server ."},',
			'					{"ENV", "PORT=8080"},',
			'					{"EXPOSE", "$PORT"},',
			'					{"USER", "1000"},',
			'					{"ENTRYPOINT", "$APP_HOME/server"},',
			'					{"CMD", "--port=$PORT"},',
			'				})',
			'				return fmt.Sprintf("layers=%d wd=%s exposed=%v entrypoint=%s cmd=%s user=%s",',
			'					r.Layers, r.Workdir, r.Exposed, r.Entrypoint, r.Cmd, r.User)',
			'			}},',
			'		{"empty Dockerfile: zero layers, workdir defaults to /, nothing exposed",',
			'			"layers=0 wd=/ exposed=[]",',
			'			func() string {',
			'				r := Eval(nil)',
			'				return fmt.Sprintf("layers=%d wd=%s exposed=%v", r.Layers, r.Workdir, r.Exposed)',
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
			'	"strings"',
			')',
			'',
			'// Instr is one Dockerfile instruction, already tokenized: Op is the',
			'// uppercase keyword ("RUN", "ENV", "WORKDIR", ...), Arg is the rest',
			'// of the line, verbatim.',
			'type Instr struct {',
			'	Op  string',
			'	Arg string',
			'}',
			'',
			'// Result is the built image reduced to its two halves: Layers counts',
			'// the filesystem layers; every other field is config metadata.',
			'type Result struct {',
			'	Layers     int               // one per RUN / COPY / ADD',
			'	Env        map[string]string // ENV key=value; same key overwrites',
			'	Workdir    string            // starts at "/"; WORKDIR edits it',
			'	Exposed    []string          // EXPOSE accumulates, in order',
			'	Cmd        string            // last CMD wins',
			'	Entrypoint string            // last ENTRYPOINT wins',
			'	User       string            // last USER wins',
			'}',
			'',
			'// identByte reports whether c may appear in a bare $NAME reference.',
			'// The set matters: $APP_HOME must read the WHOLE identifier — the',
			'// classic bug is stopping at the underscore, so $APP_HOME becomes',
			'// env["APP"] + "_HOME" and paths silently point somewhere else.',
			'func identByte(c byte) bool {',
			'	return c == \'_\' ||',
			'		(c >= \'0\' && c <= \'9\') ||',
			'		(c >= \'a\' && c <= \'z\') ||',
			'		(c >= \'A\' && c <= \'Z\')',
			'}',
			'',
			'// expand is the build-time substitution pass. It is a single linear',
			'// scan — no regexp — because the grammar is tiny: a $ either opens',
			'// ${NAME} (read to the closing brace), opens a bare $NAME (read the',
			'// longest identifier run), or is a literal dollar sign. Undefined',
			'// names expand to "": env[NAME] on a missing key already yields the',
			'// zero string, so the shell-like rule costs nothing extra.',
			'func expand(s string, env map[string]string) string {',
			'	var b strings.Builder',
			'	i := 0',
			'	for i < len(s) {',
			'		// Fast path: everything up to the next $ is literal.',
			'		if s[i] != \'$\' || i+1 == len(s) {',
			'			b.WriteByte(s[i])',
			'			i++',
			'			continue',
			'		}',
			'		// ${NAME}: braces give an explicit boundary, which is the',
			'		// whole reason the form exists — ${V}080 splices a value',
			'		// flush against trailing text that would otherwise be',
			'		// swallowed into the identifier.',
			'		if s[i+1] == \'{\' {',
			'			j := i + 2',
			'			for j < len(s) && s[j] != \'}\' {',
			'				j++',
			'			}',
			'			if j == len(s) {',
			'				// Unterminated brace: keep the $ literal and move on',
			'				// rather than erroring — the builder\'s parser would',
			'				// have rejected the line long before evaluation.',
			'				b.WriteByte(\'$\')',
			'				i++',
			'				continue',
			'			}',
			'			b.WriteString(env[s[i+2:j]])',
			'			i = j + 1',
			'			continue',
			'		}',
			'		// Bare $NAME: longest identifier run. Note the deliberate',
			'		// consequence — $VERBOSE with only V defined reads the full',
			'		// name VERBOSE (undefined, so empty), NOT env["V"]+"ERBOSE".',
			'		j := i + 1',
			'		for j < len(s) && identByte(s[j]) {',
			'			j++',
			'		}',
			'		if j == i+1 {',
			'			// $ followed by neither { nor an identifier: literal.',
			'			b.WriteByte(\'$\')',
			'			i++',
			'			continue',
			'		}',
			'		b.WriteString(env[s[i+1:j]])',
			'		i = j',
			'	}',
			'	return b.String()',
			'}',
			'',
			'// Eval folds the instruction list into the image it denotes. The',
			'// shape mirrors what BuildKit actually does per instruction: expand',
			'// args against the env accumulated SO FAR (substitution is temporal',
			'// — a later ENV never rewrites an earlier splice), then dispatch to',
			'// exactly one of the two outputs: the layer counter or a config slot.',
			'func Eval(instrs []Instr) Result {',
			'	r := Result{',
			'		Env:     map[string]string{},',
			'		Workdir: "/", // the root the first relative WORKDIR joins onto',
			'	}',
			'	for _, in := range instrs {',
			'		// Expand once, up front, against the env as of THIS line.',
			'		// ENV is handled from the raw arg below (its key must not be',
			'		// substituted), so the expanded form is simply unused there.',
			'		arg := expand(in.Arg, r.Env)',
			'		switch in.Op {',
			'		case "RUN", "COPY", "ADD":',
			'			// The filesystem half. We do not model the tar contents,',
			'			// only the structural fact: each of these appends exactly',
			'			// one layer — which is why "RUN rm" can never shrink an',
			'			// image (the deletion lives in a NEW layer; the bytes',
			'			// stay in the old one).',
			'			r.Layers++',
			'		case "ENV":',
			'			// Split the RAW arg on the FIRST \'=\': keys are parsed',
			'			// before expansion and never substituted, and values may',
			'			// themselves contain \'=\' (e.g. FLAGS=--opt=1). Only the',
			'			// value side is expanded, so ENV B=$A snapshots A\'s',
			'			// CURRENT value — reassigning A later leaves B alone.',
			'			eq := strings.IndexByte(in.Arg, \'=\')',
			'			if eq >= 0 {',
			'				r.Env[in.Arg[:eq]] = expand(in.Arg[eq+1:], r.Env)',
			'			}',
			'		case "WORKDIR":',
			'			// Absolute replaces; relative joins onto the current',
			'			// value — path.Join semantics, written out by hand (the',
			'			// full generality of Clean is unnecessary for tokenized',
			'			// single-segment args). The daemon applies the same',
			'			// normalization before recording WorkingDir in the config.',
			'			arg = strings.TrimSuffix(arg, "/")',
			'			if strings.HasPrefix(arg, "/") {',
			'				r.Workdir = arg // absolute: wholesale replacement',
			'			} else if arg != "" {',
			'				// Join without doubling the separator when the current',
			'				// workdir is the root "/".',
			'				r.Workdir = strings.TrimSuffix(r.Workdir, "/") + "/" + arg',
			'			}',
			'		case "EXPOSE":',
			'			// The one accumulating slot: ports are a set that only',
			'			// grows, because exposing 443 must not un-expose 80.',
			'			r.Exposed = append(r.Exposed, arg)',
			'		case "USER":',
			'			r.User = arg',
			'		case "CMD":',
			'			// Single slot, last writer wins — this is what lets a',
			'			// child Dockerfile override the CMD it inherited from',
			'			// its base image with one line.',
			'			r.Cmd = arg',
			'		case "ENTRYPOINT":',
			'			r.Entrypoint = arg',
			'		case "LABEL":',
			'			// Config-only, nothing tracked in Result: it exists here',
			'			// to pin the structural point — no layer.',
			'		}',
			'	}',
			'	return r',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the split exists: content addressing</h3>' +
			'<p>An image is a manifest holding an ordered list of <em>layer ' +
			'digests</em> plus the digest of one <em>config blob</em> — the JSON ' +
			'your <code>Result</code> models, the thing <code>docker inspect</code> ' +
			'prints. Layers are content-addressed tars, so two images built from ' +
			'the same base <strong>share</strong> those layers on disk and in the ' +
			'registry: pulling the second image downloads only what differs. That ' +
			'is why the builder is fastidious about which instructions create ' +
			'layers — every layer is a unit of storage, transfer, and (next item ' +
			'in this track) cache. Config edits, by contrast, are nearly free: ' +
			'<code>docker commit -c \'CMD ["/srv/app"]\'</code> mints a new image ' +
			'that reuses every existing layer and swaps only the metadata blob.</p>' +
			'<h3>Why <code>RUN rm</code> makes images bigger</h3>' +
			'<p>Layers are <em>diffs</em>, and diffs are additive: deleting a file ' +
			'writes a <em>whiteout entry</em> into the new layer while the bytes ' +
			'remain untouched in the layer below — the union filesystem merely ' +
			'stops showing them. Hence the two real fixes: chain the cleanup into ' +
			'the same <code>RUN</code> that made the mess (one layer, mess never ' +
			'committed), or use a multi-stage build and <code>COPY</code> only the ' +
			'artifacts into a fresh final stage.</p>' +
			'<h3>Substitution: the builder\'s, not the shell\'s</h3>' +
			'<p>The <code>$NAME</code> expansion you implemented runs in the ' +
			'<em>builder</em>, over the instruction\'s text, before anything ' +
			'executes — which produces two famous surprises. First, exec-form ' +
			'<code>CMD ["echo", "$HOME"]</code> prints the literal ' +
			'<code>$HOME</code> at run time: the builder only substitutes in ' +
			'contexts Docker defines, and no shell runs to expand it later. ' +
			'Second, the substitution is temporal: <code>ENV B=$A</code> splices ' +
			'A\'s value <em>at that line</em>, so reassigning <code>A</code> below ' +
			'never back-propagates — exactly the <code>map[A:two B:one]</code> ' +
			'case in the harness. Keys are parsed before expansion, which is why ' +
			'the solution splits the raw arg on the first <code>=</code> and ' +
			'expands only the value side.</p>' +
			'<h3>When debugging</h3>' +
			'<p><code>docker history --no-trunc IMAGE</code> is this problem in ' +
			'reverse: the size column separates the halves — real sizes are your ' +
			'<code>RUN</code>/<code>COPY</code>/<code>ADD</code> layers, ' +
			'<code>0B</code> rows are config edits. When a path is mysteriously ' +
			'wrong, check <code>docker inspect --format ' +
			'\'{{.Config.WorkingDir}}\'</code> on your <em>base</em> image: if the ' +
			'base set <code>WORKDIR /srv</code>, your relative ' +
			'<code>WORKDIR app</code> lands in <code>/srv/app</code> — the joining ' +
			'rule you implemented, chaining across the <code>FROM</code> boundary. ' +
			'The same inheritance explains phantom behavior in the single-slot ' +
			'fields: a base image\'s <code>CMD</code> or <code>USER</code> stays ' +
			'in force until some later line overwrites it — last one wins, and ' +
			'lines you never wrote still count.</p>',
		],
		complexity: { time: 'O(n·m) — each of n instructions scans its m-byte arg once for substitution', space: 'O(n) — the accumulated config (env entries, exposed ports)' },
	});
})();
