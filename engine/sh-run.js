/* sh-run.js — the shell interpret core shared by the browser runner
 * (engine/runner-sh.js) and the Node verification harness
 * (verify/verify.mjs). UMD-exported like the other run cores: one
 * implementation, zero drift between CI and production.
 *
 * This is a purpose-built, DETERMINISTIC POSIX-subset shell — the same move
 * html-run.js made for markup: no real bash exists that can run offline in
 * this page without dragging in nondeterminism (wall clock, ls order,
 * TTY behavior, PIDs), and determinism is what lets lesson checks pin exact
 * stdout. Everything time- or randomness-shaped is simply absent; `ls` is
 * always sorted; the filesystem is a fresh in-memory seed every run.
 *
 * What IS implemented (each feature is a lesson somewhere):
 *   - words with POSIX quoting: '', "", \  — and the expansions inside them:
 *     $VAR  ${VAR}  ${VAR:-def}  ${#VAR}  ${VAR#pat}/##  ${VAR%pat}/%%
 *     $(cmd)  $((arith))  $?  ~  and, in functions, $1..$9 $# $@
 *   - field splitting of unquoted expansions, then globbing (* ? [set]),
 *     sorted, per path segment; no match leaves the pattern literal
 *   - pipelines |, lists ; && || and newlines, redirections
 *     > >> < 2> 2>> 2>&1 and heredocs <<WORD (expanding; literal when the
 *     delimiter is quoted)
 *   - if/elif/else, for-in, while, case (with | patterns and glob matching),
 *     functions with positional args + local, exit codes throughout
 *   - builtins: cd pwd echo printf export unset local shift test/[ true
 *     false exit return
 *   - utilities over the virtual fs: ls cat mkdir touch rm cp mv grep cut
 *     sort uniq wc head tail tr seq basename dirname find sed xargs
 *
 * Preemption: there is no worker (the interpreter is synchronous and
 * pure), so a `while true` loop is bounded by a STEP BUDGET instead of a
 * watchdog — the same trade js-run.js makes with MAX_FIRES. Output is
 * size-capped for the same reason.
 *
 * The seeded filesystem (fresh each run, so `rm -r /` is a learning
 * experience, not a loss): /home/learner (the cwd) with notes.txt,
 * fruit.txt, .profile, todo/, projects/{alpha,beta}; /var/log/app.log (a
 * fixed 10-line service log the text-tool lessons mine); /etc/motd.
 *
 * run(src) returns (synchronously — callers may still `await` it):
 *   { stdout, stderr, ms }        — stderr is the UNREDIRECTED error stream
 *   { error, line?, ms }          — syntax error / step budget exceeded
 */
(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	root.GoLearnShRun = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
	'use strict';

	var MAX_STEPS = 20000;
	var MAX_OUT = 262144;
	var MAX_SUBDEPTH = 8;

	var HOME = '/home/learner';

	// --- the seeded filesystem ------------------------------------------------
	// A tree of {d:{children}} dirs and {f:contents} files. Rebuilt per run.
	function seedFS() {
		function f(s) { return { f: s }; }
		function d(children) { return { d: children }; }
		return d({
			home: d({
				learner: d({
					'notes.txt': f('Remember to water the ferns\nBuy more coffee\nShip the release\n'),
					'fruit.txt': f('banana\napple\ncherry\napple\nbanana\napple\n'),
					'.profile': f('# runs at login\nexport GREETING="hello from .profile"\n'),
					todo: d({}),
					projects: d({
						alpha: d({ 'main.go': f('package main\n\nfunc main() {\n\tprintln("alpha")\n}\n') }),
						beta: d({ 'main.go': f('package main\n\nfunc main() {\n\tprintln("beta")\n}\n'), 'README.md': f('# beta\nThe second experiment.\n') }),
					}),
				}),
			}),
			var: d({
				log: d({
					'app.log': f([
						'2025-03-01 08:00:01 INFO api request /health 12ms',
						'2025-03-01 08:00:03 INFO db connect ok 3ms',
						'2025-03-01 08:01:12 WARN api slow request /users 412ms',
						'2025-03-01 08:02:44 ERROR db connection lost',
						'2025-03-01 08:02:45 INFO db reconnect ok 8ms',
						'2025-03-01 08:03:00 INFO cache hit /users 1ms',
						'2025-03-01 08:04:18 WARN cache evict pressure',
						'2025-03-01 08:05:09 ERROR api upstream timeout /pay 5001ms',
						'2025-03-01 08:05:10 INFO api retry /pay 220ms',
						'2025-03-01 08:06:30 ERROR db connection lost',
					].join('\n') + '\n'),
				}),
			}),
			etc: d({ motd: f('Welcome to learnix — a small, deterministic Unix.\n') }),
		});
	}

	// --- tokenizer ------------------------------------------------------------
	// Produces {t:'word', s, line} (raw text, quotes preserved for the
	// expander), {t:'op', s, line}, {t:'nl', line}. $(...) and $((...))
	// are scanned with nesting so their spaces stay inside one word.
	var OPS = ['&&', '||', ';;', '2>>', '2>&1', '2>', '>>', '<<', '|', ';', '<', '>', '(', ')'];

	function tokenize(src) {
		var toks = [], i = 0, n = src.length, line = 1;
		function err(msg) { var e = new Error(msg); e.shLine = line; throw e; }

		while (i < n) {
			var c = src[i];
			if (c === '\n') { toks.push({ t: 'nl', line: line }); line++; i++; continue; }
			if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
			if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }

			var op = null;
			for (var k = 0; k < OPS.length; k++) {
				if (src.startsWith(OPS[k], i)) { op = OPS[k]; break; }
			}
			// A '<' that begins '<<' was matched above; lone operators here.
			if (op) { toks.push({ t: 'op', s: op, line: line }); i += op.length; continue; }

			// word: consume until unquoted whitespace/operator/newline
			var start = i, buf = '';
			while (i < n) {
				c = src[i];
				if (c === '\\') {
					if (i + 1 < n && src[i + 1] === '\n') { line++; i += 2; continue; } // line continuation
					buf += src.slice(i, i + 2); i += 2; continue;
				}
				if (c === "'") {
					var j = src.indexOf("'", i + 1);
					if (j < 0) err('unterminated single quote');
					for (var q = i; q <= j; q++) if (src[q] === '\n') line++;
					buf += src.slice(i, j + 1); i = j + 1; continue;
				}
				if (c === '"') {
					// double quotes: honor \" and pass $(...) through intact
					var j2 = i + 1;
					while (j2 < n) {
						if (src[j2] === '\\') { j2 += 2; continue; }
						if (src[j2] === '"') break;
						if (src[j2] === '\n') line++;
						j2++;
					}
					if (j2 >= n) err('unterminated double quote');
					buf += src.slice(i, j2 + 1); i = j2 + 1; continue;
				}
				if (c === '$' && (src[i + 1] === '(' )) {
					// $( ... ) or $(( ... )): nesting-aware scan
					var depth = 0, j3 = i + 1;
					while (j3 < n) {
						if (src[j3] === '(') depth++;
						else if (src[j3] === ')') { depth--; if (depth === 0) break; }
						else if (src[j3] === '\n') line++;
						j3++;
					}
					if (j3 >= n) err('unterminated $(');
					buf += src.slice(i, j3 + 1); i = j3 + 1; continue;
				}
				if (c === ' ' || c === '\t' || c === '\r' || c === '\n') break;
				var isOp = false;
				for (var k2 = 0; k2 < OPS.length; k2++) if (src.startsWith(OPS[k2], i)) { isOp = true; break; }
				if (isOp) {
					// "2>" is a redirection operator only when the 2 starts the
					// word (echo 2>err); attached to a word it is just a digit
					// (file2>out == file2 > out), matching real shell tokenizing.
					if (c === '2' && src.startsWith('2>', i) && buf !== '') { buf += c; i++; continue; }
					break;
				}
				buf += c; i++;
			}
			if (buf === '') { err('unexpected character ' + JSON.stringify(src[i])); }
			toks.push({ t: 'word', s: buf, line: line });
		}
		toks.push({ t: 'nl', line: line });
		toks.push({ t: 'eof', line: line });
		return toks;
	}

	// --- parser ---------------------------------------------------------------
	// Grammar (statuses ripple up):
	//   script   := list EOF
	//   list     := andor ((';'|NL)+ andor)*
	//   andor    := pipeline (('&&'|'||') pipeline)*
	//   pipeline := command ('|' command)*
	//   command  := if | for | while | case | funcdef | simple
	var KEYWORDS = { 'if': 1, 'then': 1, 'elif': 1, 'else': 1, 'fi': 1, 'for': 1, 'while': 1, 'do': 1, 'done': 1, 'case': 1, 'esac': 1, 'in': 1, '{': 1, '}': 1 };

	function parse(toks) {
		var p = 0;
		function peek() { return toks[p]; }
		function next() { return toks[p++]; }
		function err(msg, tok) { var e = new Error(msg); e.shLine = (tok || peek()).line; throw e; }
		function skipNl() { while (peek().t === 'nl' || (peek().t === 'op' && peek().s === ';')) p++; }
		function atWord(s) { var t = peek(); return t.t === 'word' && t.s === s; }
		function expectWord(s) { if (!atWord(s)) err("expected '" + s + "'"); return next(); }

		// stops: set of keyword-words that end a list without being consumed
		function parseList(stops) {
			var items = [];
			skipNl();
			while (peek().t !== 'eof' && !(peek().t === 'word' && stops[peek().s]) &&
				!(peek().t === 'op' && (peek().s === ';;' || peek().s === ')'))) {
				items.push(parseAndOr(stops));
				var moved = false;
				while (peek().t === 'nl' || (peek().t === 'op' && peek().s === ';')) { p++; moved = true; }
				if (!moved) break;
			}
			return { type: 'list', items: items };
		}

		function parseAndOr(stops) {
			var first = parsePipeline(stops);
			var rest = [];
			while (peek().t === 'op' && (peek().s === '&&' || peek().s === '||')) {
				var op = next().s;
				skipNl();
				rest.push({ op: op, pl: parsePipeline(stops) });
			}
			return { type: 'andor', first: first, rest: rest };
		}

		function parsePipeline(stops) {
			var cmds = [parseCommand(stops)];
			while (peek().t === 'op' && peek().s === '|') {
				next(); skipNl();
				cmds.push(parseCommand(stops));
			}
			return { type: 'pipeline', cmds: cmds };
		}

		function parseRedirs(redirs) {
			for (;;) {
				var t = peek();
				if (t.t !== 'op') return;
				if (t.s === '>' || t.s === '>>' || t.s === '<' || t.s === '2>' || t.s === '2>>') {
					next();
					var w = peek();
					if (w.t !== 'word') err('redirection needs a target');
					next();
					redirs.push({ op: t.s, target: w.s, line: t.line });
				} else if (t.s === '2>&1') {
					next();
					redirs.push({ op: '2>&1', line: t.line });
				} else if (t.s === '<<') {
					next();
					var dw = peek();
					if (dw.t !== 'word') err('heredoc needs a delimiter');
					next();
					redirs.push({ op: '<<', target: dw.s, line: dw.line, body: dw.heredoc });
				} else return;
			}
		}

		function parseCommand(stops) {
			var t = peek();
			if (t.t === 'word') {
				if (t.s === 'if') return parseIf();
				if (t.s === 'for') return parseFor();
				if (t.s === 'while') return parseWhile();
				if (t.s === 'case') return parseCase();
				if (t.s === '{') return parseGroup();
				// funcdef: NAME ( ) { list }
				if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(t.s) && toks[p + 1] && toks[p + 1].t === 'op' && toks[p + 1].s === '(' &&
					toks[p + 2] && toks[p + 2].t === 'op' && toks[p + 2].s === ')') {
					var name = next().s; next(); next(); skipNl();
					var body = parseGroup();
					return { type: 'funcdef', name: name, body: body, line: t.line };
				}
			}
			// simple command: assignment prefixes, words, redirs interleaved
			var words = [], redirs = [], assigns = [];
			for (;;) {
				parseRedirs(redirs);
				var w = peek();
				if (w.t !== 'word') break;
				if (KEYWORDS[w.s] && words.length === 0 && assigns.length === 0) err("unexpected keyword '" + w.s + "'", w);
				if (words.length === 0 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(w.s) && !/^[A-Za-z_][A-Za-z0-9_]*==/.test(w.s)) {
					assigns.push(next().s);
					continue;
				}
				words.push({ s: next().s, line: w.line });
			}
			if (words.length === 0 && assigns.length === 0 && redirs.length === 0) err('expected a command');
			return { type: 'simple', words: words, assigns: assigns, redirs: redirs, line: t.line };
		}

		function parseGroup() {
			expectWord('{'); skipNl();
			var body = parseList({ '}': 1 });
			expectWord('}');
			return { type: 'group', body: body };
		}

		function parseIf() {
			expectWord('if');
			var branches = [];
			var cond = parseList({ then: 1 });
			expectWord('then');
			var body = parseList({ elif: 1, 'else': 1, fi: 1 });
			branches.push({ cond: cond, body: body });
			while (atWord('elif')) {
				next();
				var c2 = parseList({ then: 1 });
				expectWord('then');
				branches.push({ cond: c2, body: parseList({ elif: 1, 'else': 1, fi: 1 }) });
			}
			var elseBody = null;
			if (atWord('else')) { next(); elseBody = parseList({ fi: 1 }); }
			expectWord('fi');
			return { type: 'if', branches: branches, elseBody: elseBody };
		}

		function parseFor() {
			var t = expectWord('for');
			var nameTok = peek();
			if (nameTok.t !== 'word' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(nameTok.s)) err('for needs a variable name');
			next();
			expectWord('in');
			var words = [];
			while (peek().t === 'word' && !KEYWORDS[peek().s]) words.push(next().s);
			skipNl();
			expectWord('do');
			var body = parseList({ done: 1 });
			expectWord('done');
			return { type: 'for', name: nameTok.s, words: words, body: body, line: t.line };
		}

		function parseWhile() {
			expectWord('while');
			var cond = parseList({ do: 1 });
			expectWord('do');
			var body = parseList({ done: 1 });
			expectWord('done');
			return { type: 'while', cond: cond, body: body };
		}

		function parseCase() {
			expectWord('case');
			var w = peek();
			if (w.t !== 'word') err('case needs a word');
			next();
			expectWord('in'); skipNl();
			var arms = [];
			while (!atWord('esac')) {
				if (peek().t === 'eof') err("expected 'esac'");
				var pats = [];
				if (peek().t === 'op' && peek().s === '(') next(); // optional leading (
				for (;;) {
					var pt = peek();
					if (pt.t !== 'word') err('case pattern expected');
					pats.push(next().s);
					if (peek().t === 'op' && peek().s === '|') { next(); continue; }
					break;
				}
				if (!(peek().t === 'op' && peek().s === ')')) err("expected ')' after case pattern");
				next();
				var body = parseList({ esac: 1 });
				arms.push({ pats: pats, body: body });
				if (peek().t === 'op' && peek().s === ';;') { next(); skipNl(); }
			}
			expectWord('esac');
			return { type: 'case', word: w.s, arms: arms, line: w.line };
		}

		var ast = parseList({});
		if (peek().t !== 'eof') err('unexpected ' + (peek().s || peek().t));
		return ast;
	}

	// Heredocs are collected before tokenizing: for each << WORD on a line,
	// the following lines up to a line equal to WORD are the body, removed
	// from the source and attached by target name (delimiters are unique per
	// program in practice; lessons keep them so).
	function extractHeredocs(src) {
		var lines = src.split('\n');
		var out = [], docs = {}, i = 0;
		while (i < lines.length) {
			var line = lines[i];
			var m = /<<\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/.exec(line);
			if (m) {
				var delim = m[2], quoted = m[1] !== '';
				var body = [], j = i + 1;
				while (j < lines.length && lines[j] !== delim) { body.push(lines[j]); j++; }
				if (j >= lines.length) { var e = new Error('heredoc delimiter ' + delim + ' not found'); e.shLine = i + 1; throw e; }
				docs[delim] = { body: body.join('\n') + (body.length ? '\n' : ''), quoted: quoted };
				// replace body lines with blanks to keep line numbers stable
				out.push(line.replace(m[0], '<< ' + delim));
				for (var k = i + 1; k <= j; k++) out.push('');
				i = j + 1;
				continue;
			}
			out.push(line);
			i++;
		}
		return { src: out.join('\n'), docs: docs };
	}

	// --- glob -----------------------------------------------------------------
	function globToRe(pat, anchored) {
		var re = '', i = 0;
		while (i < pat.length) {
			var c = pat[i];
			if (c === '*') re += '[^/]*';
			else if (c === '?') re += '[^/]';
			else if (c === '[') {
				var j = pat.indexOf(']', i + 1);
				if (j < 0) { re += '\\['; i++; continue; }
				var inner = pat.slice(i + 1, j);
				if (inner[0] === '!') inner = '^' + inner.slice(1);
				re += '[' + inner.replace(/\\/g, '\\\\') + ']';
				i = j + 1; continue;
			}
			else re += c.replace(/[.+^${}()|\\\/]/g, '\\$&');
			i++;
		}
		return new RegExp((anchored === false ? '' : '^') + re + (anchored === false ? '' : '$'));
	}

	// --- the interpreter ------------------------------------------------------
	function create() {
		function run(src) {
			var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
			var msNow = function () { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0; };

			var fs = seedFS();
			var state = {
				cwd: HOME,
				vars: { HOME: HOME, PWD: HOME, PATH: '/usr/bin:/bin', IFS: ' \t\n', '?': '0' },
				funcs: {},
				steps: 0,
				outBytes: 0,
				subDepth: 0,
				frames: [], // function frames: {args:[], locals:{}}
			};
			var topOut = [], topErr = [];

			function budget() {
				if (++state.steps > MAX_STEPS) { var e = new Error('too many steps — infinite loop? (' + MAX_STEPS + ' step budget)'); e.shFatal = true; throw e; }
			}
			function emit(sink, s) {
				state.outBytes += s.length;
				if (state.outBytes > MAX_OUT) { var e = new Error('output limit exceeded (' + MAX_OUT + ' bytes)'); e.shFatal = true; throw e; }
				sink.push(s);
			}

			// --- fs helpers ---------------------------------------------------
			function absPath(pth) {
				if (pth === '') return state.cwd;
				var base = pth[0] === '/' ? [] : state.cwd.split('/').filter(Boolean);
				var parts = pth.split('/');
				for (var i = 0; i < parts.length; i++) {
					var seg = parts[i];
					if (seg === '' || seg === '.') continue;
					if (seg === '..') { base.pop(); continue; }
					base.push(seg);
				}
				return '/' + base.join('/');
			}
			function lookup(pth) {
				var abs = absPath(pth);
				if (abs === '/') return { node: fs, abs: abs };
				var parts = abs.split('/').filter(Boolean);
				var node = fs;
				for (var i = 0; i < parts.length; i++) {
					if (!node.d || !(parts[i] in node.d)) return { node: null, abs: abs };
					node = node.d[parts[i]];
				}
				return { node: node, abs: abs };
			}
			function parentOf(pth) {
				var abs = absPath(pth);
				var idx = abs.lastIndexOf('/');
				var dir = idx === 0 ? '/' : abs.slice(0, idx);
				return { dir: lookup(dir).node, name: abs.slice(idx + 1), dirPath: dir };
			}
			function readFile(pth) {
				var r = lookup(pth);
				if (!r.node) return { err: pth + ': No such file or directory' };
				if (r.node.d) return { err: pth + ': Is a directory' };
				return { data: r.node.f };
			}
			function writeFile(pth, data, append) {
				var pr = parentOf(pth);
				if (!pr.dir || !pr.dir.d) return pth + ': No such file or directory';
				var ex = pr.dir.d[pr.name];
				if (ex && ex.d) return pth + ': Is a directory';
				if (ex && append) ex.f += data;
				else pr.dir.d[pr.name] = { f: (ex && append) ? ex.f : data };
				if (append && ex) { /* already appended above */ }
				return null;
			}

			// --- expansion ----------------------------------------------------
			// Expands one raw word into fields. Returns array of strings.
			function expandWord(raw, opts) {
				opts = opts || {};
				// parts: {s, quoted, glob} — glob true only for unquoted literal
				// text, so quoted metacharacters never glob.
				var parts = [], i = 0, n = raw.length;
				function push(s, quoted) { parts.push({ s: s, q: quoted }); }

				while (i < n) {
					var c = raw[i];
					if (c === "'") {
						var j = raw.indexOf("'", i + 1);
						push(raw.slice(i + 1, j), true);
						i = j + 1; continue;
					}
					if (c === '\\') { push(raw[i + 1] === undefined ? '\\' : raw[i + 1], true); i += 2; continue; }
					if (c === '"') {
						var j2 = i + 1, buf = '';
						while (j2 < n && raw[j2] !== '"') {
							if (raw[j2] === '\\' && '"\\$`'.indexOf(raw[j2 + 1]) >= 0) { buf += raw[j2 + 1]; j2 += 2; continue; }
							if (raw[j2] === '$') {
								var r1 = expandDollar(raw, j2);
								buf += r1.value; j2 = r1.next; continue;
							}
							buf += raw[j2]; j2++;
						}
						push(buf, true);
						i = j2 + 1; continue;
					}
					if (c === '$') {
						var r2 = expandDollar(raw, i);
						// unquoted expansion: field-split later
						parts.push({ s: r2.value, q: false, split: true });
						i = r2.next; continue;
					}
					if (c === '~' && i === 0 && (n === 1 || raw[1] === '/')) {
						push(HOME, true); i++; continue;
					}
					// plain literal run (globbable)
					var buf2 = '';
					while (i < n && "'\"\\$".indexOf(raw[i]) < 0) { buf2 += raw[i]; i++; }
					parts.push({ s: buf2, q: false, lit: true });
				}

				// join parts into fields: split unquoted-expansion parts on IFS.
				// quotedF tracks whether the field ever saw a QUOTED part —
				// "" survives as an empty argument, a bare $EMPTY vanishes.
				var fields = [''], globbable = [true], quotedF = [false];
				for (var k = 0; k < parts.length; k++) {
					var pt = parts[k];
					if (pt.split && !opts.noSplit) {
						var segs = pt.s.split(/[ \t\n]+/);
						for (var s2 = 0; s2 < segs.length; s2++) {
							if (s2 > 0) { fields.push(''); globbable.push(true); quotedF.push(false); }
							if (segs[s2] === '') continue;
							fields[fields.length - 1] += segs[s2];
							globbable[globbable.length - 1] = false; // expansion results never glob
						}
					} else if (pt.q) {
						fields[fields.length - 1] += pt.s;
						quotedF[quotedF.length - 1] = true;
						if (/[*?\[]/.test(pt.s)) globbable[globbable.length - 1] = false;
					} else if (pt.split) {
						// unquoted expansion under noSplit: still never globs
						fields[fields.length - 1] += pt.s;
						globbable[globbable.length - 1] = false;
					} else {
						fields[fields.length - 1] += pt.s;
					}
				}
				var outF = [];
				for (var f2 = 0; f2 < fields.length; f2++) {
					if (fields[f2] === '' && !quotedF[f2]) continue; // unquoted-empty vanishes
					outF.push({ s: fields[f2], glob: globbable[f2] });
				}
				if (outF.length === 0) return [];

				// glob expansion
				if (opts.noGlob) return outF.map(function (x) { return x.s; });
				var result = [];
				for (var g = 0; g < outF.length; g++) {
					var fld = outF[g];
					if (fld.glob && /[*?\[]/.test(fld.s)) {
						var matches = globMatch(fld.s);
						if (matches.length) { result = result.concat(matches); continue; }
					}
					result.push(fld.s);
				}
				return result;
			}

			function getVar(name) {
				for (var i = state.frames.length - 1; i >= 0; i--) {
					var fr = state.frames[i];
					if (name in fr.locals) return fr.locals[name];
					if (/^[0-9]$/.test(name)) return fr.args[Number(name) - 1] || '';
					if (name === '#') return String(fr.args.length);
					if (name === '@' || name === '*') return fr.args.join(' ');
					break; // only nearest frame provides positionals
				}
				if (/^[0-9]$/.test(name) || name === '#') return name === '#' ? '0' : '';
				if (name === '@' || name === '*') return '';
				return name in state.vars ? state.vars[name] : '';
			}
			function setVar(name, val) {
				for (var i = state.frames.length - 1; i >= 0; i--) {
					if (name in state.frames[i].locals) { state.frames[i].locals[name] = val; return; }
					break;
				}
				state.vars[name] = val;
			}

			// expand $... at raw[i]; returns {value, next}
			function expandDollar(raw, i) {
				// $(( arith ))
				if (raw.startsWith('$((', i)) {
					var d = 0, j = i + 1;
					while (j < raw.length) {
						if (raw[j] === '(') d++;
						else if (raw[j] === ')') { d--; if (d === 0) break; }
						j++;
					}
					var inner = raw.slice(i + 3, j - 1);
					return { value: String(arith(inner)), next: j + 1 };
				}
				// $( cmd )
				if (raw[i + 1] === '(') {
					var d2 = 0, j2 = i + 1;
					while (j2 < raw.length) {
						if (raw[j2] === '(') d2++;
						else if (raw[j2] === ')') { d2--; if (d2 === 0) break; }
						j2++;
					}
					var sub = raw.slice(i + 2, j2);
					return { value: commandSub(sub), next: j2 + 1 };
				}
				// ${...}
				if (raw[i + 1] === '{') {
					var j3 = raw.indexOf('}', i);
					if (j3 < 0) return { value: '$', next: i + 1 };
					var body = raw.slice(i + 2, j3);
					return { value: expandParam(body), next: j3 + 1 };
				}
				// $? $# $@ $* $0-9 $NAME
				var m = /^\$([?#@*0-9]|[A-Za-z_][A-Za-z0-9_]*)/.exec(raw.slice(i));
				if (!m) return { value: '$', next: i + 1 };
				return { value: getVar(m[1]), next: i + m[0].length };
			}

			function expandParam(body) {
				var m;
				if ((m = /^#(.+)$/.exec(body))) return String(getVar(m[1]).length);
				if ((m = /^([A-Za-z_][A-Za-z0-9_]*|\?)(:-|##|#|%%|%)(.*)$/.exec(body))) {
					var val = getVar(m[1]), op = m[2], pat = m[3];
					if (op === ':-') return val !== '' ? val : pat;
					// prefix/suffix trims via glob→regex; shortest/longest by
					// greedy flag on the wildcard translation
					var reSrc = '', i2 = 0, greedy = (op === '##' || op === '%%');
					while (i2 < pat.length) {
						var c2 = pat[i2];
						if (c2 === '*') reSrc += '[\\s\\S]*' + (greedy ? '' : '?');
						else if (c2 === '?') reSrc += '[\\s\\S]';
						else reSrc += c2.replace(/[.+^${}()|\\\/\[\]]/g, '\\$&');
						i2++;
					}
					if (op === '#' || op === '##') {
						var re1 = new RegExp('^' + reSrc);
						return val.replace(re1, '');
					}
					var re2 = new RegExp(reSrc + '$');
					return val.replace(re2, '');
				}
				return getVar(body);
			}

			function arith(src2) {
				// tiny recursive-descent: + - * / % and parens over ints & vars
				var i2 = 0;
				function ws() { while (/[ \t]/.test(src2[i2])) i2++; }
				function atom() {
					ws();
					if (src2[i2] === '(') { i2++; var v = expr(); ws(); i2++; return v; }
					if (src2[i2] === '-') { i2++; return -atom(); }
					var m2 = /^\d+/.exec(src2.slice(i2));
					if (m2) { i2 += m2[0].length; return Number(m2[0]); }
					var m3 = /^\$?([A-Za-z_][A-Za-z0-9_]*)/.exec(src2.slice(i2));
					if (m3) { i2 += m3[0].length; var n2 = Number(getVar(m3[1])); return isNaN(n2) ? 0 : n2; }
					i2++; return 0;
				}
				function term() {
					var v = atom();
					for (;;) {
						ws();
						if (src2[i2] === '*') { i2++; v *= atom(); }
						else if (src2[i2] === '/') { i2++; var d3 = atom(); v = d3 === 0 ? 0 : Math.trunc(v / d3); }
						else if (src2[i2] === '%') { i2++; var d4 = atom(); v = d4 === 0 ? 0 : v % d4; }
						else return v;
					}
				}
				function expr() {
					var v = term();
					for (;;) {
						ws();
						if (src2[i2] === '+') { i2++; v += term(); }
						else if (src2[i2] === '-') { i2++; v -= term(); }
						else return v;
					}
				}
				return expr();
			}

			function commandSub(sub) {
				if (++state.subDepth > MAX_SUBDEPTH) { var e = new Error('command substitution nested too deeply'); e.shFatal = true; throw e; }
				var out = [];
				try {
					var pre = extractHeredocs(sub);
					var ast = parse(tokenize(pre.src));
					// bash runs $() in a subshell: variable writes do not escape.
					var saved = state.vars;
					state.vars = Object.assign({}, state.vars);
					try { execList(ast, '', out, topErr, pre.docs); }
					finally { state.vars = saved; }
				} finally { state.subDepth--; }
				return out.join('').replace(/\n+$/, '');
			}

			function globMatch(pat) {
				var segs = absStyleSplit(pat);
				var startNodes;
				if (segs.abs) startNodes = [{ node: fs, path: '' }];
				else startNodes = [{ node: lookup(state.cwd).node, path: '' }];
				var cur = startNodes;
				for (var i3 = 0; i3 < segs.parts.length; i3++) {
					var part = segs.parts[i3];
					var nextN = [];
					for (var c3 = 0; c3 < cur.length; c3++) {
						var nd = cur[c3].node;
						if (!nd || !nd.d) continue;
						if (part === '.' || part === '..') {
							var tgt = part === '.' ? cur[c3] : null; // '..' in globs: rare, skip
							if (tgt) nextN.push({ node: tgt.node, path: cur[c3].path + (cur[c3].path ? '/' : '') + part });
							continue;
						}
						if (/[*?\[]/.test(part)) {
							var re3 = globToRe(part);
							var names = Object.keys(nd.d).sort();
							for (var n3 = 0; n3 < names.length; n3++) {
								if (names[n3][0] === '.' && part[0] !== '.') continue;
								if (re3.test(names[n3])) nextN.push({ node: nd.d[names[n3]], path: cur[c3].path + (cur[c3].path ? '/' : '') + names[n3] });
							}
						} else {
							if (part in nd.d) nextN.push({ node: nd.d[part], path: cur[c3].path + (cur[c3].path ? '/' : '') + part });
						}
					}
					cur = nextN;
				}
				return cur.map(function (x) { return (segs.abs ? '/' : '') + x.path; }).sort();
			}
			function absStyleSplit(pat) {
				var abs = pat[0] === '/';
				return { abs: abs, parts: pat.split('/').filter(Boolean) };
			}

			// --- execution ----------------------------------------------------
			// Every exec* returns an exit status (number). Output flows through
			// explicit sinks so pipelines and redirections stay simple strings.
			function execList(node, stdin, out, errOut, docs) {
				var status = 0;
				for (var i4 = 0; i4 < node.items.length; i4++) {
					status = execAndOr(node.items[i4], stdin, out, errOut, docs);
				}
				return status;
			}
			function execAndOr(node, stdin, out, errOut, docs) {
				var status = execPipeline(node.first, stdin, out, errOut, docs);
				for (var i5 = 0; i5 < node.rest.length; i5++) {
					var r = node.rest[i5];
					if (r.op === '&&' && status !== 0) continue;
					if (r.op === '||' && status === 0) continue;
					status = execPipeline(r.pl, stdin, out, errOut, docs);
				}
				state.vars['?'] = String(status);
				return status;
			}
			function execPipeline(node, stdin, out, errOut, docs) {
				var input = stdin, status = 0;
				for (var i6 = 0; i6 < node.cmds.length; i6++) {
					var last = i6 === node.cmds.length - 1;
					var sink = last ? out : [];
					status = execCommand(node.cmds[i6], input, sink, errOut, docs);
					if (!last) input = sink.join('');
				}
				return status;
			}

			function execCommand(node, stdin, out, errOut, docs) {
				budget();
				switch (node.type) {
					case 'group': return execList(node.body, stdin, out, errOut, docs);
					case 'funcdef':
						state.funcs[node.name] = node.body;
						return 0;
					case 'if': {
						for (var b = 0; b < node.branches.length; b++) {
							if (execList(node.branches[b].cond, stdin, [], errOut, docs) === 0) {
								return execList(node.branches[b].body, stdin, out, errOut, docs);
							}
						}
						if (node.elseBody) return execList(node.elseBody, stdin, out, errOut, docs);
						return 0;
					}
					case 'while': {
						var st = 0;
						while (execList(node.cond, stdin, [], errOut, docs) === 0) {
							budget();
							st = execList(node.body, stdin, out, errOut, docs);
						}
						return st;
					}
					case 'for': {
						var vals = [];
						for (var w2 = 0; w2 < node.words.length; w2++) {
							vals = vals.concat(expandWord(node.words[w2]));
						}
						var st2 = 0;
						for (var v2 = 0; v2 < vals.length; v2++) {
							budget();
							setVar(node.name, vals[v2]);
							st2 = execList(node.body, stdin, out, errOut, docs);
						}
						return st2;
					}
					case 'case': {
						var w3 = expandWord(node.word, { noSplit: true, noGlob: true }).join(' ');
						for (var a2 = 0; a2 < node.arms.length; a2++) {
							for (var p2 = 0; p2 < node.arms[a2].pats.length; p2++) {
								var patX = expandWord(node.arms[a2].pats[p2], { noSplit: true, noGlob: true }).join(' ');
								if (globToRe(patX).test(w3)) {
									return execList(node.arms[a2].body, stdin, out, errOut, docs);
								}
							}
						}
						return 0;
					}
					case 'simple': return execSimple(node, stdin, out, errOut, docs);
				}
				return 0;
			}

			function execSimple(node, stdin, out, errOut, docs) {
				// expand words → argv
				var argv = [];
				for (var i7 = 0; i7 < node.words.length; i7++) {
					argv = argv.concat(expandWord(node.words[i7].s));
				}

				// assignments (VAR=value): no field splitting on the value
				if (argv.length === 0) {
					for (var a3 = 0; a3 < node.assigns.length; a3++) {
						var eq = node.assigns[a3].indexOf('=');
						var nm = node.assigns[a3].slice(0, eq);
						var vv = expandWord(node.assigns[a3].slice(eq + 1), { noSplit: true, noGlob: true }).join(' ');
						setVar(nm, vv);
					}
					// redirections on a bare assignment still create files
					if (node.redirs.length) applyRedirs(node.redirs, docs, '', function () { return 0; }, out, errOut);
					return 0;
				}
				// temp assignments before a command: apply for the duration
				var savedTmp = null;
				if (node.assigns.length) {
					savedTmp = {};
					for (var a4 = 0; a4 < node.assigns.length; a4++) {
						var eq2 = node.assigns[a4].indexOf('=');
						var nm2 = node.assigns[a4].slice(0, eq2);
						savedTmp[nm2] = nm2 in state.vars ? state.vars[nm2] : null;
						state.vars[nm2] = expandWord(node.assigns[a4].slice(eq2 + 1), { noSplit: true, noGlob: true }).join(' ');
					}
				}
				try {
					return applyRedirs(node.redirs, docs, stdin, function (stdin2, out2, err2) {
						return dispatch(argv, stdin2, out2, err2, node.line);
					}, out, errOut);
				} finally {
					if (savedTmp) {
						for (var nm3 in savedTmp) {
							if (savedTmp[nm3] === null) delete state.vars[nm3];
							else state.vars[nm3] = savedTmp[nm3];
						}
					}
				}
			}

			// applyRedirs wires stdin/out/err per the redirection list, calls
			// body(stdin, outSink, errSink), then flushes file-bound sinks.
			function applyRedirs(redirs, docs, stdin, body, out, errOut) {
				var outSink = out, errSink = errOut;
				var outFile = null, errFile = null, outAppend = false, errAppend = false;
				var stdinData = stdin;
				for (var i8 = 0; i8 < redirs.length; i8++) {
					var r2 = redirs[i8];
					if (r2.op === '>' || r2.op === '>>') {
						outFile = expandWord(r2.target, { noSplit: true, noGlob: true }).join(' ');
						outAppend = r2.op === '>>';
						outSink = [];
					} else if (r2.op === '2>' || r2.op === '2>>') {
						errFile = expandWord(r2.target, { noSplit: true, noGlob: true }).join(' ');
						errAppend = r2.op === '2>>';
						errSink = [];
					} else if (r2.op === '2>&1') {
						errSink = outSink; errFile = null;
					} else if (r2.op === '<') {
						var fname = expandWord(r2.target, { noSplit: true, noGlob: true }).join(' ');
						var rf = readFile(fname);
						if (rf.err !== undefined) { emit(errOut, 'sh: ' + rf.err + '\n'); return 1; }
						stdinData = rf.data;
					} else if (r2.op === '<<') {
						var doc = docs[r2.target];
						if (!doc) { emit(errOut, 'sh: heredoc ' + r2.target + ' missing\n'); return 1; }
						stdinData = doc.quoted ? doc.body : expandHeredoc(doc.body);
					}
				}
				var status = body(stdinData, outSink, errSink);
				if (outFile !== null) {
					var werr = writeFile(outFile, outSink.join(''), outAppend);
					if (werr) { emit(errOut, 'sh: ' + werr + '\n'); return 1; }
				}
				if (errFile !== null) {
					var werr2 = writeFile(errFile, errSink.join(''), errAppend);
					if (werr2) { emit(errOut, 'sh: ' + werr2 + '\n'); return 1; }
				}
				return status;
			}

			function expandHeredoc(body) {
				// $ expansions only (no quoting, no globbing) — bash semantics.
				var outS = '', i9 = 0;
				while (i9 < body.length) {
					if (body[i9] === '$') {
						var r3 = expandDollar(body, i9);
						outS += r3.value; i9 = r3.next; continue;
					}
					outS += body[i9]; i9++;
				}
				return outS;
			}

			// --- command dispatch ---------------------------------------------
			var EXIT = {}; // sentinel for exit/return unwinding

			function dispatch(argv, stdin, out, errOut, line) {
				budget();
				var name = argv[0], args = argv.slice(1);

				if (state.funcs[name]) {
					state.frames.push({ args: args, locals: {} });
					try {
						return execList(state.funcs[name].body, stdin, out, errOut, {});
					} catch (e) {
						if (e === EXIT.ret) return Number(state.vars['?']) || 0;
						throw e;
					} finally {
						state.frames.pop();
					}
				}
				if (builtins[name]) return builtins[name](args, stdin, out, errOut);
				if (utils[name]) return utils[name](args, stdin, out, errOut);
				emit(errOut, 'sh: line ' + line + ': ' + name + ': command not found\n');
				return 127;
			}

			// --- builtins -----------------------------------------------------
			var builtins = {
				cd: function (args, _in, _out, errOut2) {
					var target = args[0] || HOME;
					var r4 = lookup(target);
					if (!r4.node || !r4.node.d) { emit(errOut2, 'cd: ' + target + ': No such file or directory\n'); return 1; }
					state.cwd = r4.abs === '' ? '/' : r4.abs;
					state.vars.PWD = state.cwd;
					return 0;
				},
				pwd: function (_a, _in, out2) { emit(out2, state.cwd + '\n'); return 0; },
				echo: function (args, _in, out2) {
					var noNl = false;
					if (args[0] === '-n') { noNl = true; args = args.slice(1); }
					emit(out2, args.join(' ') + (noNl ? '' : '\n'));
					return 0;
				},
				printf: function (args, _in, out2, errOut2) {
					if (!args.length) { emit(errOut2, 'printf: missing format\n'); return 1; }
					var fmt2 = args[0].replace(/\\n/g, '\n').replace(/\\t/g, '\t');
					var rest = args.slice(1), ri = 0, s3 = '';
					// one pass; if args remain, real printf reuses the format —
					// support that loop since lessons enjoy it
					do {
						s3 += fmt2.replace(/%[sd%]/g, function (m4) {
							if (m4 === '%%') return '%';
							var v3 = rest[ri++];
							if (m4 === '%d') { var n4 = parseInt(v3, 10); return String(isNaN(n4) ? 0 : n4); }
							return v3 === undefined ? '' : v3;
						});
					} while (ri < rest.length && /%[sd]/.test(fmt2));
					emit(out2, s3);
					return 0;
				},
				export: function (args) {
					for (var i10 = 0; i10 < args.length; i10++) {
						var eq3 = args[i10].indexOf('=');
						if (eq3 > 0) setVar(args[i10].slice(0, eq3), args[i10].slice(eq3 + 1));
					}
					return 0;
				},
				unset: function (args) { for (var i11 = 0; i11 < args.length; i11++) delete state.vars[args[i11]]; return 0; },
				local: function (args) {
					var fr2 = state.frames[state.frames.length - 1];
					if (!fr2) return 1;
					for (var i12 = 0; i12 < args.length; i12++) {
						var eq4 = args[i12].indexOf('=');
						if (eq4 > 0) fr2.locals[args[i12].slice(0, eq4)] = args[i12].slice(eq4 + 1);
						else fr2.locals[args[i12]] = '';
					}
					return 0;
				},
				shift: function () {
					var fr3 = state.frames[state.frames.length - 1];
					if (fr3) fr3.args.shift();
					return 0;
				},
				'true': function () { return 0; },
				'false': function () { return 1; },
				exit: function (args) { state.vars['?'] = String(args[0] !== undefined ? Number(args[0]) : Number(state.vars['?'])); throw EXIT.exit; },
				'return': function (args) { if (args[0] !== undefined) state.vars['?'] = String(Number(args[0])); throw EXIT.ret; },
				test: function (args) { return testExpr(args) ? 0 : 1; },
				'[': function (args) {
					if (args[args.length - 1] !== ']') return 2;
					return testExpr(args.slice(0, -1)) ? 0 : 1;
				},
			};
			EXIT.exit = { exit: true };
			EXIT.ret = { ret: true };

			function testExpr(a) {
				if (a.length === 0) return false;
				if (a[0] === '!') return !testExpr(a.slice(1));
				if (a.length === 1) return a[0] !== '';
				if (a.length === 2) {
					var op2 = a[0], f3 = a[1], r5;
					switch (op2) {
						case '-z': return f3 === '';
						case '-n': return f3 !== '';
						case '-f': r5 = lookup(f3); return !!(r5.node && r5.node.f !== undefined);
						case '-d': r5 = lookup(f3); return !!(r5.node && r5.node.d);
						case '-e': r5 = lookup(f3); return !!r5.node;
						case '-s': r5 = lookup(f3); return !!(r5.node && r5.node.f && r5.node.f.length > 0);
					}
					return false;
				}
				if (a.length === 3) {
					var l = a[0], op3 = a[1], r6 = a[2];
					switch (op3) {
						case '=': return l === r6;
						case '!=': return l !== r6;
						case '-eq': return Number(l) === Number(r6);
						case '-ne': return Number(l) !== Number(r6);
						case '-lt': return Number(l) < Number(r6);
						case '-le': return Number(l) <= Number(r6);
						case '-gt': return Number(l) > Number(r6);
						case '-ge': return Number(l) >= Number(r6);
					}
					return false;
				}
				return false;
			}

			// --- utilities ----------------------------------------------------
			function inputLines(args, stdin, errOut2, cmd) {
				// shared "files or stdin" plumbing; returns {lines, multi, err}
				if (!args.length) return { texts: [{ name: null, data: stdin }] };
				var texts = [];
				for (var i13 = 0; i13 < args.length; i13++) {
					var rf2 = readFile(args[i13]);
					if (rf2.err !== undefined) { emit(errOut2, cmd + ': ' + rf2.err + '\n'); return { err: true }; }
					texts.push({ name: args[i13], data: rf2.data });
				}
				return { texts: texts };
			}
			function splitLines(s4) {
				var ls = s4.split('\n');
				if (ls[ls.length - 1] === '') ls.pop();
				return ls;
			}

			var utils = {
				ls: function (args, _in, out2, errOut2) {
					var all = false, paths = [];
					for (var i14 = 0; i14 < args.length; i14++) {
						if (args[i14] === '-a') all = true;
						else if (args[i14] === '-la' || args[i14] === '-al') { all = true; }
						else paths.push(args[i14]);
					}
					if (!paths.length) paths = ['.'];
					var st3 = 0;
					for (var p3 = 0; p3 < paths.length; p3++) {
						var r7 = lookup(paths[p3]);
						if (!r7.node) { emit(errOut2, 'ls: ' + paths[p3] + ': No such file or directory\n'); st3 = 1; continue; }
						if (paths.length > 1) emit(out2, (p3 ? '\n' : '') + paths[p3] + ':\n');
						if (r7.node.f !== undefined) { emit(out2, paths[p3] + '\n'); continue; }
						var names2 = Object.keys(r7.node.d).sort();
						for (var n5 = 0; n5 < names2.length; n5++) {
							if (!all && names2[n5][0] === '.') continue;
							emit(out2, names2[n5] + (r7.node.d[names2[n5]].d ? '/' : '') + '\n');
						}
					}
					return st3;
				},
				cat: function (args, stdin, out2, errOut2) {
					var num = false;
					if (args[0] === '-n') { num = true; args = args.slice(1); }
					var inp = inputLines(args, stdin, errOut2, 'cat');
					if (inp.err) return 1;
					if (!num) { for (var t2 = 0; t2 < inp.texts.length; t2++) emit(out2, inp.texts[t2].data); return 0; }
					var ln = 1;
					for (var t3 = 0; t3 < inp.texts.length; t3++) {
						var ls2 = splitLines(inp.texts[t3].data);
						for (var l2 = 0; l2 < ls2.length; l2++) emit(out2, String(ln++).padStart(6) + '\t' + ls2[l2] + '\n');
					}
					return 0;
				},
				mkdir: function (args, _in, _out, errOut2) {
					var pFlag = false, paths2 = [];
					for (var i15 = 0; i15 < args.length; i15++) {
						if (args[i15] === '-p') pFlag = true; else paths2.push(args[i15]);
					}
					var st4 = 0;
					for (var p4 = 0; p4 < paths2.length; p4++) {
						var abs2 = absPath(paths2[p4]);
						var parts2 = abs2.split('/').filter(Boolean);
						var node2 = fs, ok = true;
						for (var s5 = 0; s5 < parts2.length; s5++) {
							var lastSeg = s5 === parts2.length - 1;
							if (!(parts2[s5] in node2.d)) {
								if (lastSeg || pFlag) node2.d[parts2[s5]] = { d: {} };
								else { emit(errOut2, 'mkdir: ' + paths2[p4] + ': No such file or directory\n'); st4 = 1; ok = false; break; }
							} else if (lastSeg && !pFlag) {
								emit(errOut2, 'mkdir: ' + paths2[p4] + ': File exists\n'); st4 = 1; ok = false; break;
							}
							if (ok) node2 = node2.d[parts2[s5]];
							if (!node2.d) { emit(errOut2, 'mkdir: ' + paths2[p4] + ': Not a directory\n'); st4 = 1; break; }
						}
					}
					return st4;
				},
				touch: function (args, _in, _out, errOut2) {
					for (var i16 = 0; i16 < args.length; i16++) {
						var pr2 = parentOf(args[i16]);
						if (!pr2.dir || !pr2.dir.d) { emit(errOut2, 'touch: ' + args[i16] + ': No such file or directory\n'); return 1; }
						if (!(pr2.name in pr2.dir.d)) pr2.dir.d[pr2.name] = { f: '' };
					}
					return 0;
				},
				rm: function (args, _in, _out, errOut2) {
					var rec = false, force = false, paths3 = [];
					for (var i17 = 0; i17 < args.length; i17++) {
						if (args[i17] === '-r' || args[i17] === '-rf' || args[i17] === '-fr') { rec = true; force = args[i17] !== '-r'; }
						else if (args[i17] === '-f') force = true;
						else paths3.push(args[i17]);
					}
					var st5 = 0;
					for (var p5 = 0; p5 < paths3.length; p5++) {
						var pr3 = parentOf(paths3[p5]);
						var ex2 = pr3.dir && pr3.dir.d ? pr3.dir.d[pr3.name] : null;
						if (!ex2) { if (!force) { emit(errOut2, 'rm: ' + paths3[p5] + ': No such file or directory\n'); st5 = 1; } continue; }
						if (ex2.d && !rec) { emit(errOut2, 'rm: ' + paths3[p5] + ': is a directory\n'); st5 = 1; continue; }
						delete pr3.dir.d[pr3.name];
					}
					return st5;
				},
				cp: function (args, _in, _out, errOut2) {
					var rec2 = false, rest2 = [];
					for (var i18 = 0; i18 < args.length; i18++) {
						if (args[i18] === '-r') rec2 = true; else rest2.push(args[i18]);
					}
					if (rest2.length < 2) { emit(errOut2, 'cp: needs source and destination\n'); return 1; }
					var dst = rest2.pop();
					var dstR = lookup(dst);
					for (var s6 = 0; s6 < rest2.length; s6++) {
						var srcR = lookup(rest2[s6]);
						if (!srcR.node) { emit(errOut2, 'cp: ' + rest2[s6] + ': No such file or directory\n'); return 1; }
						if (srcR.node.d && !rec2) { emit(errOut2, 'cp: ' + rest2[s6] + ': is a directory (use -r)\n'); return 1; }
						var name2 = rest2[s6].split('/').filter(Boolean).pop();
						var clone = JSON.parse(JSON.stringify(srcR.node));
						if (dstR.node && dstR.node.d) dstR.node.d[name2] = clone;
						else {
							var pr4 = parentOf(dst);
							if (!pr4.dir || !pr4.dir.d) { emit(errOut2, 'cp: ' + dst + ': No such file or directory\n'); return 1; }
							pr4.dir.d[pr4.name] = clone;
						}
					}
					return 0;
				},
				mv: function (args, _in, _out, errOut2) {
					if (args.length < 2) { emit(errOut2, 'mv: needs source and destination\n'); return 1; }
					var dst2 = args[args.length - 1], srcs = args.slice(0, -1);
					var dstR2 = lookup(dst2);
					for (var s7 = 0; s7 < srcs.length; s7++) {
						var pr5 = parentOf(srcs[s7]);
						var ex3 = pr5.dir && pr5.dir.d ? pr5.dir.d[pr5.name] : null;
						if (!ex3) { emit(errOut2, 'mv: ' + srcs[s7] + ': No such file or directory\n'); return 1; }
						if (dstR2.node && dstR2.node.d) dstR2.node.d[pr5.name] = ex3;
						else {
							var pr6 = parentOf(dst2);
							if (!pr6.dir || !pr6.dir.d) { emit(errOut2, 'mv: ' + dst2 + ': No such file or directory\n'); return 1; }
							pr6.dir.d[pr6.name] = ex3;
						}
						delete pr5.dir.d[pr5.name];
					}
					return 0;
				},
				grep: function (args, stdin, out2, errOut2) {
					var flags = { i: false, v: false, n: false, c: false };
					var pat2 = null, files = [];
					for (var i19 = 0; i19 < args.length; i19++) {
						var a5 = args[i19];
						if (a5[0] === '-' && pat2 === null) {
							for (var f4 = 1; f4 < a5.length; f4++) flags[a5[f4]] = true;
						} else if (pat2 === null) pat2 = a5;
						else files.push(a5);
					}
					if (pat2 === null) { emit(errOut2, 'grep: missing pattern\n'); return 2; }
					var re4;
					try { re4 = new RegExp(pat2, flags.i ? 'i' : ''); }
					catch (e2) { emit(errOut2, 'grep: bad pattern: ' + pat2 + '\n'); return 2; }
					var inp2 = inputLines(files, stdin, errOut2, 'grep');
					if (inp2.err) return 2;
					var multi = inp2.texts.length > 1, any = false;
					for (var t4 = 0; t4 < inp2.texts.length; t4++) {
						var ls3 = splitLines(inp2.texts[t4].data);
						var count = 0;
						for (var l3 = 0; l3 < ls3.length; l3++) {
							var hit = re4.test(ls3[l3]);
							if (flags.v) hit = !hit;
							if (!hit) continue;
							any = true; count++;
							if (flags.c) continue;
							var prefix = (multi ? inp2.texts[t4].name + ':' : '') + (flags.n ? (l3 + 1) + ':' : '');
							emit(out2, prefix + ls3[l3] + '\n');
						}
						if (flags.c) emit(out2, (multi ? inp2.texts[t4].name + ':' : '') + count + '\n');
					}
					return any ? 0 : 1;
				},
				cut: function (args, stdin, out2, errOut2) {
					var delim = '\t', fieldsSpec = null, files2 = [];
					for (var i20 = 0; i20 < args.length; i20++) {
						if (args[i20] === '-d') delim = args[++i20];
						else if (args[i20].startsWith('-d')) delim = args[i20].slice(2);
						else if (args[i20] === '-f') fieldsSpec = args[++i20];
						else if (args[i20].startsWith('-f')) fieldsSpec = args[i20].slice(2);
						else files2.push(args[i20]);
					}
					if (!fieldsSpec) { emit(errOut2, 'cut: missing -f\n'); return 1; }
					var wanted = [];
					fieldsSpec.split(',').forEach(function (part3) {
						var m5 = /^(\d+)-(\d+)?$/.exec(part3);
						if (m5) {
							var lo = Number(m5[1]), hi = m5[2] ? Number(m5[2]) : 99;
							for (var x2 = lo; x2 <= hi; x2++) wanted.push(x2);
						} else wanted.push(Number(part3));
					});
					var inp3 = inputLines(files2, stdin, errOut2, 'cut');
					if (inp3.err) return 1;
					for (var t5 = 0; t5 < inp3.texts.length; t5++) {
						var ls4 = splitLines(inp3.texts[t5].data);
						for (var l4 = 0; l4 < ls4.length; l4++) {
							var cols = ls4[l4].split(delim);
							var picked = [];
							for (var w4 = 0; w4 < wanted.length; w4++) {
								if (wanted[w4] <= cols.length) picked.push(cols[wanted[w4] - 1]);
							}
							emit(out2, picked.join(delim) + '\n');
						}
					}
					return 0;
				},
				sort: function (args, stdin, out2, errOut2) {
					var num2 = false, rev = false, uniqF = false, keyN = 0, tDelim = null, files3 = [];
					for (var i21 = 0; i21 < args.length; i21++) {
						var a6 = args[i21];
						if (a6 === '-n') num2 = true;
						else if (a6 === '-r') rev = true;
						else if (a6 === '-u') uniqF = true;
						else if (a6 === '-nr' || a6 === '-rn') { num2 = true; rev = true; }
						else if (a6 === '-t') tDelim = args[++i21];
						else if (a6 === '-k') keyN = Number(args[++i21]);
						else files3.push(a6);
					}
					var inp4 = inputLines(files3, stdin, errOut2, 'sort');
					if (inp4.err) return 1;
					var all2 = [];
					for (var t6 = 0; t6 < inp4.texts.length; t6++) all2 = all2.concat(splitLines(inp4.texts[t6].data));
					function keyOf(s8) {
						if (!keyN) return s8;
						var cols2 = s8.split(tDelim !== null ? tDelim : /\s+/);
						return cols2[keyN - 1] !== undefined ? cols2[keyN - 1] : '';
					}
					all2.sort(function (x3, y3) {
						var kx = keyOf(x3), ky = keyOf(y3);
						var cmp;
						if (num2) cmp = (parseFloat(kx) || 0) - (parseFloat(ky) || 0);
						else cmp = kx < ky ? -1 : kx > ky ? 1 : 0;
						if (cmp === 0) cmp = x3 < y3 ? -1 : x3 > y3 ? 1 : 0; // stable-ish total order
						return rev ? -cmp : cmp;
					});
					var prev = null;
					for (var l5 = 0; l5 < all2.length; l5++) {
						if (uniqF && all2[l5] === prev) continue;
						prev = all2[l5];
						emit(out2, all2[l5] + '\n');
					}
					return 0;
				},
				uniq: function (args, stdin, out2, errOut2) {
					var countF = false, dupF = false, files4 = [];
					for (var i22 = 0; i22 < args.length; i22++) {
						if (args[i22] === '-c') countF = true;
						else if (args[i22] === '-d') dupF = true;
						else files4.push(args[i22]);
					}
					var inp5 = inputLines(files4, stdin, errOut2, 'uniq');
					if (inp5.err) return 1;
					var ls5 = [];
					for (var t7 = 0; t7 < inp5.texts.length; t7++) ls5 = ls5.concat(splitLines(inp5.texts[t7].data));
					var i23 = 0;
					while (i23 < ls5.length) {
						var j4 = i23;
						while (j4 < ls5.length && ls5[j4] === ls5[i23]) j4++;
						var runLen = j4 - i23;
						if (!dupF || runLen > 1) {
							if (countF) emit(out2, String(runLen).padStart(4) + ' ' + ls5[i23] + '\n');
							else emit(out2, ls5[i23] + '\n');
						}
						i23 = j4;
					}
					return 0;
				},
				wc: function (args, stdin, out2, errOut2) {
					var mode = null, files5 = [];
					for (var i24 = 0; i24 < args.length; i24++) {
						if (args[i24] === '-l' || args[i24] === '-w' || args[i24] === '-c') mode = args[i24];
						else files5.push(args[i24]);
					}
					var inp6 = inputLines(files5, stdin, errOut2, 'wc');
					if (inp6.err) return 1;
					for (var t8 = 0; t8 < inp6.texts.length; t8++) {
						var data = inp6.texts[t8].data;
						var nl = splitLines(data).length;
						var nw = data.split(/\s+/).filter(Boolean).length;
						var nc = data.length;
						var suffix = inp6.texts[t8].name ? ' ' + inp6.texts[t8].name : '';
						if (mode === '-l') emit(out2, nl + suffix + '\n');
						else if (mode === '-w') emit(out2, nw + suffix + '\n');
						else if (mode === '-c') emit(out2, nc + suffix + '\n');
						else emit(out2, String(nl).padStart(8) + String(nw).padStart(8) + String(nc).padStart(8) + suffix + '\n');
					}
					return 0;
				},
				head: function (args, stdin, out2, errOut2) { return headTail(args, stdin, out2, errOut2, true); },
				tail: function (args, stdin, out2, errOut2) { return headTail(args, stdin, out2, errOut2, false); },
				tr: function (args, stdin, out2, errOut2) {
					var del = false, sets = [];
					for (var i25 = 0; i25 < args.length; i25++) {
						if (args[i25] === '-d') del = true; else sets.push(args[i25]);
					}
					function expandSet(s9) {
						var outC = '';
						for (var x4 = 0; x4 < s9.length; x4++) {
							if (s9[x4 + 1] === '-' && s9[x4 + 2]) {
								for (var cc = s9.charCodeAt(x4); cc <= s9.charCodeAt(x4 + 2); cc++) outC += String.fromCharCode(cc);
								x4 += 2;
							} else outC += s9[x4];
						}
						return outC;
					}
					var s1 = expandSet(sets[0] || '');
					var s22 = expandSet(sets[1] || '');
					var res = '';
					for (var ch = 0; ch < stdin.length; ch++) {
						var idx2 = s1.indexOf(stdin[ch]);
						if (idx2 >= 0) {
							if (del) continue;
							res += s22[Math.min(idx2, s22.length - 1)] || '';
						} else res += stdin[ch];
					}
					emit(out2, res);
					return 0;
				},
				seq: function (args, _in, out2) {
					var lo2 = 1, hi2 = 1, step = 1;
					if (args.length === 1) hi2 = Number(args[0]);
					else if (args.length === 2) { lo2 = Number(args[0]); hi2 = Number(args[1]); }
					else if (args.length >= 3) { lo2 = Number(args[0]); step = Number(args[1]); hi2 = Number(args[2]); }
					if (step === 0) return 1;
					for (var v4 = lo2; step > 0 ? v4 <= hi2 : v4 >= hi2; v4 += step) {
						budget();
						emit(out2, v4 + '\n');
					}
					return 0;
				},
				basename: function (args, _in, out2) {
					var base2 = (args[0] || '').split('/').filter(Boolean).pop() || '/';
					if (args[1] && base2.endsWith(args[1]) && base2 !== args[1]) base2 = base2.slice(0, -args[1].length);
					emit(out2, base2 + '\n');
					return 0;
				},
				dirname: function (args, _in, out2) {
					var pth2 = args[0] || '.';
					var idx3 = pth2.replace(/\/+$/, '').lastIndexOf('/');
					emit(out2, (idx3 < 0 ? '.' : idx3 === 0 ? '/' : pth2.slice(0, idx3)) + '\n');
					return 0;
				},
				find: function (args, _in, out2, errOut2) {
					var root2 = args[0] && args[0][0] !== '-' ? args[0] : '.';
					var namePat = null, typeF = null;
					for (var i26 = 0; i26 < args.length; i26++) {
						if (args[i26] === '-name') namePat = args[++i26];
						else if (args[i26] === '-type') typeF = args[++i26];
					}
					var r8 = lookup(root2);
					if (!r8.node) { emit(errOut2, 'find: ' + root2 + ': No such file or directory\n'); return 1; }
					var re5 = namePat ? globToRe(namePat) : null;
					function walk(node3, pathStr, name3) {
						budget();
						var isDir = !!node3.d;
						var nm4 = name3 === null ? root2 : pathStr;
						var typeOk = !typeF || (typeF === 'd' ? isDir : !isDir);
						var nameOk = !re5 || (name3 !== null && re5.test(name3)) || (name3 === null && re5.test(root2.split('/').filter(Boolean).pop() || root2));
						if (typeOk && nameOk) emit(out2, nm4 + '\n');
						if (isDir) {
							var names3 = Object.keys(node3.d).sort();
							for (var c4 = 0; c4 < names3.length; c4++) {
								walk(node3.d[names3[c4]], nm4 + '/' + names3[c4], names3[c4]);
							}
						}
					}
					walk(r8.node, root2, null);
					return 0;
				},
				sed: function (args, stdin, out2, errOut2) {
					var script = null, files6 = [];
					for (var i27 = 0; i27 < args.length; i27++) {
						if (script === null) script = args[i27];
						else files6.push(args[i27]);
					}
					var m6 = /^s(.)((?:\\.|[^\\])*?)\1((?:\\.|[^\\])*?)\1(g?)$/.exec(script || '');
					if (!m6) { emit(errOut2, "sed: only 's/pattern/replacement/[g]' is supported here\n"); return 1; }
					var re6;
					try { re6 = new RegExp(m6[2], m6[4] ? 'g' : ''); }
					catch (e3) { emit(errOut2, 'sed: bad pattern\n'); return 1; }
					var inp7 = inputLines(files6, stdin, errOut2, 'sed');
					if (inp7.err) return 1;
					for (var t9 = 0; t9 < inp7.texts.length; t9++) {
						var ls6 = splitLines(inp7.texts[t9].data);
						for (var l6 = 0; l6 < ls6.length; l6++) {
							emit(out2, ls6[l6].replace(re6, m6[3].replace(/\\(\d)/g, '$$$1').replace(/&/g, '$$&')) + '\n');
						}
					}
					return 0;
				},
				xargs: function (args, stdin, out2, errOut2) {
					var extra = stdin.split(/\s+/).filter(Boolean);
					var argv2 = args.length ? args.concat(extra) : ['echo'].concat(extra);
					return dispatch(argv2, '', out2, errOut2, 0);
				},
			};

			function headTail(args, stdin, out2, errOut2, isHead) {
				var count2 = 10, files7 = [];
				for (var i28 = 0; i28 < args.length; i28++) {
					if (args[i28] === '-n') count2 = Number(args[++i28]);
					else if (/^-n\d+$/.test(args[i28])) count2 = Number(args[i28].slice(2));
					else if (/^-\d+$/.test(args[i28])) count2 = Number(args[i28].slice(1));
					else files7.push(args[i28]);
				}
				var inp8 = inputLines(files7, stdin, errOut2, isHead ? 'head' : 'tail');
				if (inp8.err) return 1;
				for (var t10 = 0; t10 < inp8.texts.length; t10++) {
					var ls7 = splitLines(inp8.texts[t10].data);
					var pick = isHead ? ls7.slice(0, count2) : ls7.slice(Math.max(0, ls7.length - count2));
					for (var l7 = 0; l7 < pick.length; l7++) emit(out2, pick[l7] + '\n');
				}
				return 0;
			}

			// --- top-level run ------------------------------------------------
			try {
				var pre2 = extractHeredocs(src);
				var ast2 = parse(tokenize(pre2.src));
				try {
					execList(ast2, '', topOut, topErr, pre2.docs);
				} catch (e4) {
					// `exit` (and a stray top-level `return`) unwind cleanly
					if (e4 !== EXIT.exit && e4 !== EXIT.ret) throw e4;
				}
				return { stdout: topOut.join(''), stderr: topErr.join('').replace(/\n$/, ''), ms: msNow() };
			} catch (e5) {
				if (e5 && (e5.shLine !== undefined || e5.shFatal)) {
					var r9 = { error: (e5.shFatal ? '' : 'syntax error: ') + e5.message, ms: msNow() };
					if (e5.shLine !== undefined) r9.line = e5.shLine;
					// partial output is still useful context for step-budget kills
					if (e5.shFatal) r9.stderr = topErr.join('');
					return r9;
				}
				throw e5; // a bug in the interpreter, not the learner's script — surface it loudly
			}
		}

		return { run: run };
	}

	return {
		MAX_STEPS: MAX_STEPS,
		HOME: HOME,
		create: create,
	};
});
