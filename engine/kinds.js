/* kinds.js — the built-in item kinds: 'lesson' and 'problem'.
 *
 * A kind owns everything item-type-specific about the output side of the
 * bench: which output containers are visible, how a run's result is
 * rendered, and what counts as "solved". The engine only ever calls
 * kind.mount(ctx) on open and kind.run(ctx) per run — new item types
 * (quizzes, diagram exercises) are added by registering a kind, not by
 * editing the engine.
 *
 * ctx (built by the engine per call):
 *   item      — the registered item object
 *   source    — current editor contents
 *   runner    — the track's runner plugin (run(src) returns a Promise)
 *   els       — { out, results, err, status, explain }
 *   hlOn()    — whether syntax highlighting is enabled
 *   stale()   — true if the user navigated away while the run was in flight;
 *               kinds must not touch the DOM once stale
 *   markSolved() — record completion (engine updates nav tick + storage)
 *
 * kind.run returns a Promise of {solved, stale?, ms?, statusText?}.
 */
(function () {
	'use strict';
	var A = window.GoLearnAssemble;
	var esc = function (s) { return goHi.escape(String(s == null ? '' : s)); };

	function showError(ctx, text) {
		ctx.els.err.textContent = text;
		ctx.els.err.style.display = 'block';
	}
	function clearError(ctx) { ctx.els.err.style.display = 'none'; }

	// --- kind: lesson -----------------------------------------------------
	// element-tutorial semantics: run the editor contents as-is, show stdout,
	// pass when check(stdout, flat) returns true.
	GoLearn.registerKind({
		id: 'lesson',
		outputLabel: 'output',

		mount: function (ctx) {
			ctx.els.out.hidden = false;
			ctx.els.results.hidden = true;
		},

		run: function (ctx) {
			return ctx.runner.run(ctx.source).then(function (r) {
				if (ctx.stale()) return { solved: false, stale: true };
				if (r.error !== undefined) {
					showError(ctx, (r.line ? 'line ' + r.line + ':' + r.col + ' — ' : '') + r.error +
						(r.stderr ? '\n' + r.stderr : ''));
					ctx.els.out.style.opacity = '0.45';
					return { solved: false };
				}
				clearError(ctx);
				ctx.els.out.style.opacity = '';
				ctx.els.out.textContent = r.stdout;

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

	// --- kind: problem ------------------------------------------------------
	// LeetCode semantics: merge the user's file with the problem harness,
	// run, parse sentinel-delimited results, render a per-test table plus the
	// user's own prints as console output. All tests passing = solved.
	GoLearn.registerKind({
		id: 'problem',
		outputLabel: 'tests',

		mount: function (ctx) {
			ctx.els.out.hidden = true;
			ctx.els.results.hidden = false;
			ctx.els.results.innerHTML = '';
		},

		run: function (ctx) {
			var self = this;
			var merged = A.mergeProgram(ctx.source, ctx.item.harness);
			return ctx.runner.run(merged.src).then(function (r) {
				if (ctx.stale()) return { solved: false, stale: true };

				if (r.error !== undefined) {
					var where = A.mapErrorLine(merged, r.line);
					var head =
						where.region === 'user' ? 'line ' + where.line + ' — ' :
						where.region === 'harness' ? 'test harness error (please report): ' : '';
					showError(ctx, head + r.error + (r.stderr ? '\n' + r.stderr : ''));
					return { solved: false };
				}
				clearError(ctx);

				var parsed = A.parseSentinel(r.stdout);
				if (!parsed.results) {
					// Program ran but the harness never reported — e.g. the user
					// added their own func main, or exited early.
					showError(ctx, 'no test results — did you remove or rename the solution function?' +
						(r.stderr ? '\n' + r.stderr : ''));
					self.renderConsole(ctx, parsed.console);
					return { solved: false };
				}

				var passed = parsed.results.filter(function (t) { return t.pass; }).length;
				var total = parsed.results.length;
				self.renderResults(ctx, parsed.results, passed, total, r.ms);
				self.renderConsole(ctx, parsed.console);

				var solved = passed === total && total > 0;
				if (solved) ctx.markSolved();
				return { solved: solved, ms: r.ms, statusText: passed + '/' + total + ' passing' };
			});
		},

		renderResults: function (ctx, results, passed, total, ms) {
			var h = '<div class="verdict ' + (passed === total ? 'ok' : 'bad') + '">' +
				(passed === total ? '✓ ' : '') + passed + ' / ' + total + ' tests passing' +
				'<span class="ms">' + (ms != null ? ms.toFixed(1) + ' ms' : '') + '</span></div>';
			h += '<table class="tests"><thead><tr><th></th><th>input</th><th>want</th><th>got</th></tr></thead><tbody>';
			results.forEach(function (t, i) {
				h += '<tr class="' + (t.pass ? 'pass' : 'fail') + '">' +
					'<td class="mark">' + (t.pass ? '✓' : '✗') + '</td>' +
					'<td>' + esc(t.input) + '</td>' +
					'<td>' + esc(t.want) + '</td>' +
					'<td>' + esc(t.got) + '</td></tr>';
			});
			h += '</tbody></table>';
			ctx.els.results.innerHTML = h;
		},

		renderConsole: function (ctx, text) {
			if (!text || !text.trim()) return;
			var box = document.createElement('div');
			box.className = 'console';
			box.innerHTML = '<div class="console-lbl">console</div><pre></pre>';
			box.querySelector('pre').textContent = text;
			ctx.els.results.appendChild(box);
		},
	});
})();
