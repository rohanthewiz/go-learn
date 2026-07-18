/* html-run.js — the HTML validate-and-outline core shared by the browser
 * runner (engine/runner-html.js) and the Node verification harness
 * (verify/verify.mjs). UMD-exported like ts-run.js / js-run.js: one
 * implementation, zero drift between CI and production.
 *
 * Nothing here EXECUTES — HTML is a document language, so "running" a
 * lesson means parsing it. What the type checker is to the ts-pure track
 * and determinism engineering is to js-pure, the VALIDATOR is to this one:
 * browsers famously render anything (error recovery is specified into
 * HTML5 itself), which is exactly why a learner needs a strict gate that
 * refuses what the browser would silently repair. The page kind shows both
 * side by side — the iframe renders the learner's markup with full browser
 * forgiveness while this parser holds it to the strict rules — and that
 * contrast is the track's core teaching device.
 *
 * run(src) returns (synchronously — callers may still `await` it):
 *   { stdout, ms }                — stdout is the canonical OUTLINE below
 *   { error, line?, col?, ms }   — first validation error, user position
 *
 * The outline is a deterministic, indentation-structured serialization of
 * the document tree; lesson checks pin substrings of it the same way the
 * code tracks pin stdout:
 *
 *   doctype html
 *   html lang="en"
 *     head
 *       title
 *         "My Page"
 *     body
 *       h1 class="hero"
 *         "Hello, web"
 *       # a comment
 *       img src="cat.png" alt="A cat"
 *
 * Serialization rules (all chosen so the same source always yields the
 * same bytes in browser and CI):
 *   - tag/attribute names canonicalized to lowercase; attributes in source
 *     order; values entity-decoded and always double-quoted; boolean
 *     attributes print as the bare name;
 *   - text nodes print quoted with runs of space/tab/newline collapsed to
 *     one space (structure view, not layout view — the preview shows real
 *     rendering). NBSP (&nbsp;) deliberately survives the collapse so a
 *     lesson can prove it is a different character from a plain space;
 *   - comments print as "# text"; <style>/<script> bodies are raw text
 *     (no entity or tag scanning inside — they are different languages).
 *
 * Strictness (each rule is a lesson somewhere in the track):
 *   - every non-void element needs its explicit closing tag, correctly
 *     nested; closing a void element is an error; a trailing "/" on a
 *     non-void start tag is an error (real HTML silently IGNORES that
 *     slash — <div/> leaves the div open — a classic gotcha reported
 *     here instead of inherited);
 *   - duplicate attribute on a tag, duplicate id in the document: errors;
 *   - a bare "&" or stray "<" in text must be written &amp; / &lt;; named
 *     entities must be from the known table (typos like &nbps; error);
 *   - <!doctype> only before any content.
 */
(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	root.GoLearnHTMLRun = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
	'use strict';

	var MAX_SRC = 200000; // parsing is linear; this is a sanity cap, not a perf one

	// The void set is the HTML5 spec list. RAWTEXT elements swallow their
	// body verbatim until the matching close tag — their content is CSS/JS,
	// where "&" and "<" are ordinary characters.
	var VOID = { area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1, input: 1, link: 1, meta: 1, source: 1, track: 1, wbr: 1 };
	var RAWTEXT = { style: 1, script: 1 };

	// Named entities the track teaches or that page-ish prose plausibly
	// needs. Deliberately a closed table: an unknown name is an ERROR (the
	// browser would render "&nbps;" literally — the validator catches the
	// typo instead).
	var ENTITIES = {
		amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
		nbsp: ' ', copy: '©', reg: '®', trade: '™',
		mdash: '—', ndash: '–', hellip: '…',
		laquo: '«', raquo: '»', ldquo: '“', rdquo: '”',
		lsquo: '‘', rsquo: '’',
		times: '×', divide: '÷', deg: '°', middot: '·',
		bull: '•', sect: '§', para: '¶',
		euro: '€', pound: '£', yen: '¥', cent: '¢',
		larr: '←', rarr: '→', uarr: '↑', darr: '↓', harr: '↔',
		frac12: '½', frac14: '¼', plusmn: '±', ne: '≠', le: '≤', ge: '≥',
	};

	function create() {
		function run(src) {
			var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());

			// Errors carry the source INDEX; line/col are derived once at the
			// end — cheaper than tracking line state through every token, and
			// only the failing path pays for it.
			function fail(msg, at) {
				var e = new Error(msg);
				e.htmlPos = at;
				throw e;
			}
			function lineCol(at) {
				var upto = src.slice(0, at);
				var line = 1, last = -1;
				for (var i = 0; i < upto.length; i++) {
					if (upto.charCodeAt(i) === 10) { line++; last = i; }
				}
				return { line: line, col: at - last };
			}

			// decodeEntities validates as it decodes — shared by text runs and
			// attribute values, which follow the same escaping rules.
			function decodeEntities(text, baseAt) {
				var out = '', i = 0, m;
				while (i < text.length) {
					var ch = text[i];
					if (ch !== '&') { out += ch; i++; continue; }
					var rest = text.slice(i);
					if ((m = /^&#x([0-9a-fA-F]+);/.exec(rest))) { out += String.fromCodePoint(parseInt(m[1], 16)); i += m[0].length; continue; }
					if ((m = /^&#(\d+);/.exec(rest))) { out += String.fromCodePoint(parseInt(m[1], 10)); i += m[0].length; continue; }
					if ((m = /^&([a-zA-Z][a-zA-Z0-9]*);/.exec(rest))) {
						var name = m[1];
						if (!(name in ENTITIES)) fail('unknown entity &' + name + '; — check the spelling (did you mean one of &amp; &lt; &gt; &quot; &nbsp;?)', baseAt + i);
						out += ENTITIES[name];
						i += m[0].length;
						continue;
					}
					fail('bare "&" in ' + (arguments.length > 2 ? arguments[2] : 'text') + ' — the browser may guess what you meant, strict HTML writes it as &amp;', baseAt + i);
				}
				return out;
			}

			function parse() {
				var i = 0, n = src.length;
				var roots = [];                 // fragments are welcome: lessons often start below <html>
				var stack = [];                 // open elements; top = current parent
				var ids = {};                   // id value -> source index of first use
				var seenContent = false;        // any element or non-blank text yet (gates the doctype rule)
				var m;

				function children() { return stack.length ? stack[stack.length - 1].children : roots; }
				function addText(text) {
					var kids = children();
					var last = kids[kids.length - 1];
					// Merge adjacent runs (text, entity, text...) into one node so
					// the outline prints one quoted string per contiguous run.
					if (last && last.type === 'text') last.text += text;
					else kids.push({ type: 'text', text: text });
				}

				while (i < n) {
					var rest = src.slice(i);

					// --- comment ------------------------------------------------
					if (rest.startsWith('<!--')) {
						var end = src.indexOf('-->', i + 4);
						if (end < 0) fail('unterminated comment — no closing --> before end of input', i);
						children().push({ type: 'comment', text: src.slice(i + 4, end) });
						i = end + 3;
						continue;
					}

					// --- doctype ------------------------------------------------
					if ((m = /^<!doctype\s+([^>]*)>/i.exec(rest))) {
						if (stack.length) fail('<!doctype> inside <' + stack[stack.length - 1].tag + '> — the doctype is the very first line of a document, before <html>', i);
						if (seenContent) fail('<!doctype> after content — the doctype must be the FIRST thing in the file so the browser never enters quirks mode', i);
						roots.push({ type: 'doctype', text: m[1] });
						seenContent = true;
						i += m[0].length;
						continue;
					}
					if (/^<!/.test(rest)) fail('malformed "<!" — only <!doctype html> and <!-- comments --> start this way', i);

					// --- closing tag --------------------------------------------
					if ((m = /^<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>/.exec(rest))) {
						var cname = m[1].toLowerCase();
						if (VOID[cname]) fail('</' + cname + '> — ' + cname + ' is a void element: it has no content and never a closing tag', i);
						if (!stack.length) fail('unexpected closing tag </' + cname + '> — nothing is open here', i);
						var top = stack[stack.length - 1];
						if (top.tag !== cname) {
							var openedAt = lineCol(top.at);
							fail('mismatched closing tag </' + cname + '> — <' + top.tag + '> opened at line ' + openedAt.line + ' must be closed first (tags close in reverse order of opening)', i);
						}
						stack.pop();
						i += m[0].length;
						continue;
					}
					if (/^<\//.test(rest)) fail('malformed closing tag — expected </tagname>', i);

					// --- opening tag --------------------------------------------
					if ((m = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(rest))) {
						var tagAt = i;
						var tag = m[1].toLowerCase();
						i += m[0].length;
						var node = { type: 'el', tag: tag, attrs: [], children: [], at: tagAt };
						var seenAttrs = {};
						var selfClosed = false;

						// attribute loop: name [= value], until > or />
						for (;;) {
							var am, arest;
							if ((am = /^\s+/.exec(src.slice(i)))) i += am[0].length;
							arest = src.slice(i);
							if (!arest.length) fail('unterminated tag <' + tag + '> — no closing ">" before end of input', tagAt);
							if (arest[0] === '>') { i++; break; }
							if (arest.startsWith('/>')) { selfClosed = true; i += 2; break; }
							if (!(am = /^[^\s"'>\/=]+/.exec(arest))) fail('unexpected "' + arest[0] + '" inside tag <' + tag + '>', i);
							var aname = am[0].toLowerCase();
							var aAt = i;
							i += am[0].length;
							if (seenAttrs[aname] !== undefined) fail('duplicate attribute "' + aname + '" on <' + tag + '> — each attribute may appear once per tag', aAt);
							seenAttrs[aname] = 1;
							var value = null;
							if ((am = /^\s*=\s*/.exec(src.slice(i)))) {
								i += am[0].length;
								var vrest = src.slice(i);
								if ((am = /^"([^"]*)"/.exec(vrest)) || (am = /^'([^']*)'/.exec(vrest))) {
									value = decodeEntities(am[1], i + 1, 'the ' + aname + ' attribute');
									i += am[0].length;
								} else if ((am = /^[^\s>'"=`]+/.exec(vrest))) {
									value = decodeEntities(am[0], i, 'the ' + aname + ' attribute');
									i += am[0].length;
								} else {
									fail('attribute "' + aname + '" has "=" but no value — write ' + aname + '="..."', aAt);
								}
							}
							node.attrs.push({ name: aname, value: value });
							if (aname === 'id' && value) {
								if (ids[value] !== undefined) fail('duplicate id "' + value + '" — first used at line ' + lineCol(ids[value]).line + '; an id must be unique in the whole document', aAt);
								ids[value] = aAt;
							}
						}

						seenContent = true;
						if (VOID[tag]) {
							// The slash on a void element (<br/>) is tolerated XML
							// style; it changes nothing.
							children().push(node);
							continue;
						}
						if (selfClosed) fail('"<' + tag + '/>" does not close the element — in HTML the trailing slash on a non-void tag is IGNORED and <' + tag + '> stays open; write an explicit </' + tag + '>', tagAt);
						children().push(node);

						if (RAWTEXT[tag]) {
							// Swallow the body verbatim; its language is not HTML.
							var closeRe = new RegExp('</' + tag + '\\s*>', 'i');
							var cm = closeRe.exec(src.slice(i));
							if (!cm) fail('unclosed <' + tag + '> — its raw-text body runs to </' + tag + '>, which never appears', tagAt);
							if (cm.index > 0) node.children.push({ type: 'text', text: src.slice(i, i + cm.index) });
							i += cm.index + cm[0].length;
							continue;
						}
						stack.push(node);
						continue;
					}
					if (rest[0] === '<') fail('stray "<" in text — start a tag (<p>, </p>...) or write the character as &lt;', i);

					// --- text run -----------------------------------------------
					// The run regex stops at both '<' and '&', so entities never
					// hide inside a run — the branch below owns them.
					if ((m = /^[^<&]+/.exec(rest))) {
						if (/\S/.test(m[0])) seenContent = true;
						addText(m[0]);
						i += m[0].length;
						continue;
					}
					// --- entity in text (rest[0] === '&' is all that remains) ----
					if ((m = /^&#x[0-9a-fA-F]+;|^&#\d+;|^&[a-zA-Z][a-zA-Z0-9]*;/.exec(rest))) {
						addText(decodeEntities(m[0], i));
						seenContent = true;
						i += m[0].length;
						continue;
					}
					fail('bare "&" in text — strict HTML writes it as &amp;', i);
				}

				if (stack.length) {
					var open = stack[stack.length - 1];
					var at = lineCol(open.at);
					fail('unclosed <' + open.tag + '> — opened at line ' + at.line + ' and still open at the end of the file; add </' + open.tag + '>', open.at);
				}
				return roots;
			}

			// --- the outline serializer ----------------------------------------
			// Collapse only ASCII layout whitespace so NBSP (U+00A0) survives —
			// see the header comment for why that is a feature.
			function collapse(s) { return s.replace(/[ \t\r\n\f]+/g, ' ').trim(); }

			function outline(nodes, depth, out) {
				var pad = new Array(depth + 1).join('  ');
				for (var i = 0; i < nodes.length; i++) {
					var nd = nodes[i];
					if (nd.type === 'doctype') { out.push(pad + 'doctype ' + collapse(nd.text).toLowerCase()); continue; }
					if (nd.type === 'comment') { out.push(pad + '# ' + collapse(nd.text)); continue; }
					if (nd.type === 'text') {
						var t = collapse(nd.text);
						if (t) out.push(pad + '"' + t + '"');
						continue;
					}
					var line = pad + nd.tag;
					for (var a = 0; a < nd.attrs.length; a++) {
						var at = nd.attrs[a];
						line += ' ' + at.name + (at.value == null ? '' : '="' + at.value.replace(/[ \t\r\n\f]+/g, ' ') + '"');
					}
					out.push(line);
					outline(nd.children, depth + 1, out);
				}
			}

			var msNow = function () { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0; };
			try {
				if (src.length > MAX_SRC) fail('input too large (' + src.length + ' chars)', 0);
				var roots = parse();
				var lines = [];
				outline(roots, 0, lines);
				var stdout = lines.join('\n');
				if (stdout) stdout += '\n';
				return { stdout: stdout, ms: msNow() };
			} catch (e) {
				var r = { error: 'invalid HTML: ' + e.message, ms: msNow() };
				if (typeof e.htmlPos === 'number') {
					var pos = lineCol(e.htmlPos);
					r.line = pos.line;
					r.col = pos.col;
				} else {
					throw e; // a bug in the parser, not in the learner's HTML — surface it loudly
				}
				return r;
			}
		}

		return { run: run };
	}

	return {
		VOID: VOID,
		ENTITIES: ENTITIES,
		create: create,
	};
});
