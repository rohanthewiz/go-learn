/* kind-page.js — the 'page' item kind: lesson semantics for document
 * languages, where a run has two truths worth showing at once.
 *
 * The output pane splits horizontally:
 *
 *   ┌ preview ──────────────────────────┐
 *   │ sandboxed <iframe srcdoc>: what   │  ← the browser's view, with all
 *   │ the BROWSER renders               │    its specified error recovery
 *   ├ structure ────────────────────────┤
 *   │ the validator's outline of the    │  ← the strict view; checks pin
 *   │ document tree (runner stdout)     │    substrings of this text
 *   └───────────────────────────────────┘
 *
 * The split is the pedagogy: invalid markup STILL previews (browsers
 * repair by spec — a learner must see that silence), while the validator
 * refuses it in red. Solving is judged exactly like kind 'lesson':
 * check(stdout, flat) over the runner's stdout — here the outline — so
 * the verify harness treats 'page' items through the same code path.
 *
 * The iframe carries an empty sandbox attribute: no scripts, no forms
 * submitting anywhere, no navigation — learner markup is inert content.
 * srcdoc is set even on validation failure, and set BEFORE the runner is
 * consulted, so the preview always tracks the editor byte-for-byte.
 */
(function () {
	'use strict';

	function showError(ctx, text) {
		ctx.els.err.textContent = text;
		ctx.els.err.style.display = 'block';
	}

	// Preview visibility is a USER preference, not per-item state: one key,
	// shared with kind-app.js (same skeleton, same pane), read at skeleton
	// build so the choice survives lesson switches, track switches, reloads.
	var pvKey = 'golearn:pv-hidden';
	function pvHidden() { try { return localStorage.getItem(pvKey) === '1'; } catch (_) { return false; } }

	// Wires the show/hide button built by skeleton(). The collapsed state is
	// a class on .pagekind (CSS collapses the pane, the outline absorbs the
	// height) — the iframe is display:none'd, NOT removed, so srcdoc set
	// while hidden is already rendered when the learner reopens the pane.
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

	// The kind owns everything inside #tresults; mount rebuilds the split
	// skeleton per item open (cheap, and it clears any previous kind's DOM).
	function skeleton(ctx) {
		var box = ctx.els.results;
		box.innerHTML =
			'<div class="pagekind' + (pvHidden() ? ' pv-off' : '') + '">' +
			'<div class="pv-sec"><div class="pane-lbl">preview — what the browser renders' +
			'<button type="button" class="pv-toggle"></button></div>' +
			'<iframe class="pv" sandbox title="rendered preview"></iframe></div>' +
			'<div class="ol-sec"><div class="pane-lbl">structure — what the validator sees</div>' +
			'<pre class="ol"></pre></div>' +
			'</div>';
		wirePvToggle(box);
	}

	GoLearn.registerKind({
		id: 'page',
		outputLabel: 'page',

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

			// Preview first, unconditionally — the browser has no opinion on
			// validity and neither should this pane.
			iframe.srcdoc = ctx.source;

			return ctx.runner.run(ctx.source).then(function (r) {
				if (ctx.stale()) return { solved: false, stale: true };
				if (r.error !== undefined) {
					showError(ctx, (r.line ? 'line ' + r.line + ':' + r.col + ' — ' : '') + r.error);
					ol.textContent = '';
					ol.style.opacity = '0.45';
					return { solved: false };
				}
				ctx.els.err.style.display = 'none';
				ol.style.opacity = '';
				ol.textContent = r.stdout;

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
