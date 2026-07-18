/* kind-app.js — the 'app' item kind: lesson semantics for component
 * frameworks, where one compilation is worth rendering twice.
 *
 *   ┌ preview ──────────────────────────┐
 *   │ <iframe sandbox="allow-scripts">: │  ← the LIVE render — real DOM,
 *   │ the compiled program + React     │    real state, clicks work
 *   ├ structure ────────────────────────┤
 *   │ server-rendered outline +        │  ← the DETERMINISTIC render;
 *   │ console (runner stdout)          │    checks pin substrings of this
 *   └───────────────────────────────────┘
 *
 * The split mirrors kind-page.js but the two panes divide differently:
 * there the browser pane shows forgiveness and the text pane strictness;
 * here the iframe shows the component ALIVE (effects run, events fire)
 * while the outline shows the initial render frozen — the exact output
 * renderToStaticMarkup produced in the worker, which is what CI verifies.
 * A learner clicking a counter sees state change in the preview while the
 * outline stays at the initial frame: that difference is itself the
 * useState lesson.
 *
 * Unlike kind-page (raw markup, inert, empty sandbox), the preview must
 * EXECUTE the learner's program, so the sandbox grants allow-scripts —
 * and nothing else. No allow-same-origin: the frame runs with an opaque
 * origin, so learner code cannot reach this page's DOM, storage, or the
 * solved-state records. The runner result's `js` field carries the
 * compiled program (compile once in the worker, mount here), and the
 * vendored React scripts load into the frame by relative URL — srcdoc
 * documents resolve against this page's base, and script tags are not
 * blocked by the opaque origin.
 *
 * On a failed run (syntax, runtime, render) there is no fresh `js`, so the
 * LAST GOOD preview stays up next to the red error pane — the learner keeps
 * seeing the app they had while reading what broke, matching how a hot-
 * reload dev server behaves on a bad edit.
 */
(function () {
	'use strict';

	function showError(ctx, text) {
		ctx.els.err.textContent = text;
		ctx.els.err.style.display = 'block';
	}

	// The compiled program is inlined into a <script>; the only sequence that
	// could terminate that block early is "</script" inside a string literal,
	// where "<\/script" is byte-equivalent JS. srcdoc is assigned as a
	// property, so no attribute escaping applies.
	function inlineJs(js) {
		return js.replace(/<\/script/gi, '<\\/script');
	}

	function previewDoc(js) {
		return '<!doctype html><html><head><style>' +
			// An unstyled learner app must look like an unstyled page in any
			// real browser — white, black text — regardless of the site theme.
			'body{background:#fff;color:#111;color-scheme:light;font-family:system-ui,sans-serif;margin:10px}' +
			'</style></head><body><div id="root"></div>' +
			'<script src="third_party/react/react.development.js"><\/script>' +
			'<script src="third_party/react/react-dom.development.js"><\/script>' +
			'<script>\n' +
			'try {\n' + inlineJs(js) + '\n' +
			'  if (typeof App === "function") {\n' +
			'    ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));\n' +
			'  }\n' +
			'} catch (e) {\n' +
			'  document.body.innerHTML = "<pre style=\\"color:#b00020;white-space:pre-wrap\\"></pre>";\n' +
			'  document.body.firstChild.textContent = String(e);\n' +
			'}\n' +
			'<\/script></body></html>';
	}

	// Preview visibility is a USER preference, not per-item state: one key,
	// shared with kind-page.js (same skeleton, same pane), read at skeleton
	// build so the choice survives lesson switches, track switches, reloads.
	var pvKey = 'golearn:pv-hidden';
	function pvHidden() { try { return localStorage.getItem(pvKey) === '1'; } catch (_) { return false; } }

	// Wires the show/hide button built by skeleton(). Collapsing is a class
	// flip, not DOM removal: srcdoc keeps rendering while hidden, so the
	// last-good-preview guarantee (see file comment) holds across a toggle.
	function wirePvToggle(box) {
		var pk = box.querySelector('.pagekind');
		var btn = box.querySelector('.pv-toggle');
		btn.textContent = pvHidden() ? 'show' : 'hide';
		btn.onclick = function () {
			var off = pk.classList.toggle('pv-off');
			btn.textContent = off ? 'show' : 'hide';
			try { localStorage.setItem(pvKey, off ? '1' : '0'); } catch (_) {}
		};
	}

	// Same skeleton classes as kind-page.js — the .pagekind CSS already lays
	// out a preview/outline split, and reusing it keeps index.html untouched
	// by this kind. Only the sandbox grant and the labels differ.
	function skeleton(ctx) {
		var box = ctx.els.results;
		box.innerHTML =
			'<div class="pagekind' + (pvHidden() ? ' pv-off' : '') + '">' +
			'<div class="pv-sec"><div class="pane-lbl">preview — live in the browser (interactive)' +
			'<button type="button" class="pv-toggle"></button></div>' +
			'<iframe class="pv" sandbox="allow-scripts" title="live preview"></iframe></div>' +
			'<div class="ol-sec"><div class="pane-lbl">structure — initial render + console (what checks see)</div>' +
			'<pre class="ol"></pre></div>' +
			'</div>';
		wirePvToggle(box);
	}

	GoLearn.registerKind({
		id: 'app',
		outputLabel: 'app',

		mount: function (ctx) {
			ctx.els.out.hidden = true;
			ctx.els.results.hidden = false;
			skeleton(ctx);
		},

		run: function (ctx) {
			var box = ctx.els.results;
			var iframe = box.querySelector('iframe.pv');
			var ol = box.querySelector('pre.ol');
			if (!iframe) { skeleton(ctx); iframe = box.querySelector('iframe.pv'); ol = box.querySelector('pre.ol'); }

			return ctx.runner.run(ctx.source).then(function (r) {
				if (ctx.stale()) return { solved: false, stale: true };
				if (r.error !== undefined) {
					showError(ctx, (r.line ? 'line ' + r.line + ':' + r.col + ' — ' : '') + r.error +
						(r.stderr ? '\n' + r.stderr : ''));
					ol.style.opacity = '0.45'; // dim, don't clear: the outline is from the last good run
					return { solved: false };
				}
				ctx.els.err.style.display = 'none';
				ol.style.opacity = '';
				ol.textContent = r.stdout;
				if (r.js !== undefined) iframe.srcdoc = previewDoc(r.js);

				var solved = false;
				if (ctx.item.check) {
					var flat = r.stdout.replace(/\s+/g, ' ');
					solved = !!ctx.item.check(r.stdout, flat);
					if (solved) ctx.markSolved();
				}
				return { solved: solved, ms: r.ms };
			});
		},
	});
})();
