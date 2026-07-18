/* engine.js — the go-learn core: registries + the Learn view UI.
 *
 * The engine knows about tracks, items, kinds, and runners only through
 * their registered interfaces. Everything domain-specific (what a "test"
 * is, what output means, lesson content) lives in kind plugins and track
 * files. Adding a new track — or a new *type* of track — must never require
 * touching this file; that is the invariant that keeps go-learn pluggable.
 *
 * Registration API (called from plain script tags, no build step):
 *   GoLearn.registerRunner({id, isReady, run})
 *   GoLearn.registerKind({id, outputLabel, mount, run})
 *   GoLearn.registerTrack({id, title, runner, order: [itemIds]})
 *   GoLearn.registerItem(trackId, item)     // see kinds.js for item shapes
 *   GoLearn.init()                          // after all registrations
 *   GoLearn.wasmReady()                     // from the page's goRunReady
 *
 * Storage layout (namespaced so tracks never collide):
 *   golearn:track                    — active track id
 *   golearn:<track>:cur              — current item index
 *   golearn:<track>:done             — JSON array of completed item ids
 *   golearn:<track>:draft:<itemId>   — editor draft per item
 */
(function () {
	'use strict';

	var runners = {}, kinds = {}, tracks = {}, trackOrder = [];

	var store = {
		read: function (k, dflt) { try { var v = localStorage.getItem(k); return v == null ? dflt : v; } catch (_) { return dflt; } },
		write: function (k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
		del: function (k) { try { localStorage.removeItem(k); } catch (_) {} },
	};

	// --- UI state (bound in init) ------------------------------------------
	var $ = function (id) { return document.getElementById(id); };
	var els = null;          // DOM handles
	var track = null;        // active track object
	var items = [];          // active track's items, in manifest order
	var cur = 0;
	var done = new Set();
	var repaint = null;      // editor overlay repainter
	var runTimer = 0;
	var onRepaintExtra = null;

	function key(suffix) { return 'golearn:' + track.id + ':' + suffix; }

	function loadTrackState() {
		try { done = new Set(JSON.parse(store.read(key('done'), '[]'))); }
		catch (_) { done = new Set(); }
		cur = Math.min(items.length - 1,
			Math.max(0, parseInt(store.read(key('cur'), '0'), 10) || 0));
	}
	function saveDone() { store.write(key('done'), JSON.stringify(Array.from(done))); }

	var hlOn = function () { return !document.body.classList.contains('nohl'); };

	// block renders one prose segment: a raw HTML string passes through
	// (lesson text, inline SVG diagrams); {code, lang} becomes a highlighted
	// snippet. Same shape the element tutorial used, so content ports easily.
	function block(seg) {
		if (typeof seg === 'string') return seg;
		var lang = seg.lang || 'go';
		var body = lang === 'go' ? goHi.go(seg.code)
			: lang === 'ts' ? goHi.ts(seg.code)
			: lang === 'js' ? goHi.js(seg.code)
			: lang === 'py' ? goHi.py(seg.code)
			: lang === 'sh' ? goHi.sh(seg.code)
			: lang === 'html' ? goHi.html(seg.code)
			: lang === 'css' ? goHi.css(seg.code)
			: goHi.escape(seg.code);
		return '<pre class="snip lang-' + lang + '"><code>' + body + '</code></pre>';
	}

	// --- navigation --------------------------------------------------------
	// Items may carry a `category`; when any do, the nav shows group headers
	// (LeetCode-style). Difficulty renders as a colored pip.
	function renderNav() {
		var nav = els.navList;
		nav.innerHTML = '';
		var lastCat = null;
		items.forEach(function (item, i) {
			if (item.category && item.category !== lastCat) {
				lastCat = item.category;
				var hdr = document.createElement('li');
				hdr.className = 'group';
				hdr.textContent = item.category;
				nav.appendChild(hdr);
			}
			var li = document.createElement('li');
			if (i === cur) li.className = 'cur';
			li.innerHTML = '<span class="n">' + (i + 1) + '</span>' +
				(item.difficulty ? '<span class="pip ' + item.difficulty.toLowerCase() + '" title="' +
					goHi.escape(item.difficulty) + '"></span>' : '') +
				goHi.escape(item.nav || item.title) +
				(done.has(item.id) ? '<span class="tick">✓</span>' : '');
			li.addEventListener('click', function () { open(i); });
			nav.appendChild(li);
		});
		els.pos.textContent = (cur + 1) + ' / ' + items.length;
		$('tut-prev').disabled = cur === 0;
		$('tut-next').disabled = cur === items.length - 1;
		$('tut-solution').style.display = items[cur] && items[cur].solution ? '' : 'none';
		// The playground runs Go only — offering it for a ts item would paste
		// TypeScript into the Go interpreter.
		$('tut-toplay').style.display = items[cur] && items[cur].lang && items[cur].lang !== 'go' ? 'none' : '';
	}

	function open(i) {
		cur = i;
		store.write(key('cur'), String(i));
		var item = items[i];
		var kind = kinds[item.kind];

		// Prose column: statement, then a collapsible explanation section for
		// items that carry one (revealed automatically on solve).
		var html = item.prose.map(block).join('');
		if (item.explanation) {
			html += '<details id="tut-explain"' + (done.has(item.id) ? ' open' : '') + '>' +
				'<summary>Explanation &amp; walkthrough</summary>' +
				item.explanation.map(block).join('') +
				(item.complexity ? '<p class="cx"><strong>Time:</strong> <code>' +
					goHi.escape(item.complexity.time) + '</code> &nbsp; <strong>Space:</strong> <code>' +
					goHi.escape(item.complexity.space) + '</code></p>' : '') +
				'</details>';
		}
		els.doc.innerHTML = html;
		els.doc.scrollTop = 0;

		els.ta.value = store.read(key('draft:' + item.id), null) || item.starter;
		els.task.textContent = item.task || '';
		els.outBar.textContent = kind.outputLabel || 'output';

		// Checkless items (pure reading) complete on visit, like element's.
		if (item.kind === 'lesson' && !item.check && !done.has(item.id)) { done.add(item.id); saveDone(); }

		kind.mount(makeCtx(item));
		renderNav();
		repaint();
		run();
	}

	function makeCtx(item) {
		return {
			item: item,
			source: els.ta.value,
			runner: runners[track.runner],
			els: { out: els.out, results: els.results, err: els.err, status: els.status, explain: $('tut-explain') },
			hlOn: hlOn,
			// A run is stale once the user opened a different item (or track)
			// while it was in flight — kinds must not render stale results.
			stale: function () { return items[cur] !== item; },
			markSolved: function () {
				if (done.has(item.id)) return;
				done.add(item.id);
				saveDone();
				renderNav();
				var ex = $('tut-explain');
				if (ex) ex.open = true;
			},
		};
	}

	function run() {
		var item = items[cur];
		if (!item) return;
		var runner = runners[track.runner];
		// Kind.run is async (the go-wasm runner executes in a web worker);
		// runs requested before the worker is ready queue inside the runner.
		if (runner && !runner.isReady()) {
			els.status.textContent = 'loading interpreter…';
			els.status.className = '';
		}
		Promise.resolve(kinds[item.kind].run(makeCtx(item))).then(function (res) {
			if (!res || res.stale || items[cur] !== item) return;

			var needsWork = item.kind !== 'lesson' || !!item.check;
			if (res.solved) {
				els.status.textContent = '✓ ' + (res.statusText || 'complete');
				els.status.className = 'ok';
			} else if (needsWork) {
				els.status.textContent = res.statusText ||
					(done.has(item.id) ? '✓ solved earlier' : '○ not yet');
				els.status.className = done.has(item.id) ? 'ok' : '';
			} else {
				els.status.textContent = '';
				els.status.className = '';
			}
		});
	}

	// --- track switching ------------------------------------------------------
	function activateTrack(id) {
		track = tracks[id];
		// Skip (with a console warning) manifest ids with no registered item:
		// content lands incrementally during authoring, and the verification
		// harness enforces order↔items completeness before deploy.
		items = track.order.map(function (iid) {
			var it = track.items[iid];
			if (!it) console.warn('track ' + id + ': no item registered for "' + iid + '"');
			return it;
		}).filter(Boolean);
		store.write('golearn:track', id);
		loadTrackState();
		renderNav();
		open(cur);
	}

	// --- public API -------------------------------------------------------------
	window.GoLearn = {
		registerRunner: function (r) { runners[r.id] = r; },
		registerKind: function (k) { kinds[k.id] = k; },
		registerTrack: function (m) {
			tracks[m.id] = { id: m.id, title: m.title, runner: m.runner, order: m.order.slice(), items: {} };
			trackOrder.push(m.id);
		},
		registerItem: function (trackId, item) {
			if (!tracks[trackId]) throw new Error('registerItem: unknown track ' + trackId);
			tracks[trackId].items[item.id] = item;
		},
		// Exposed for the verification harness: read-only view of registries.
		_registries: function () { return { runners: runners, kinds: kinds, tracks: tracks, trackOrder: trackOrder }; },

		init: function (opts) {
			els = {
				doc: $('tut-doc'), navList: $('tut-navlist'),
				ta: $('tsrc'), taHl: $('tsrcHl'),
				out: $('tout'), results: $('tresults'), err: $('terr'),
				task: $('tut-task'), status: $('tut-check'), pos: $('tut-pos'),
				outBar: $('tout-lbl'),
			};
			onRepaintExtra = (opts && opts.onRepaint) || null;
			// The editor overlay follows the current item's language (items may
			// declare lang:'ts'; default is Go) — evaluated per paint, so track
			// and item switches recolor without any extra wiring.
			repaint = goHi.editor(els.ta, els.taHl, hlOn,
				function () { return (items[cur] && items[cur].lang) || 'go'; });

			// Track picker: only rendered when more than one track registered.
			var sel = $('track');
			trackOrder.forEach(function (id) {
				var opt = document.createElement('option');
				opt.value = id;
				opt.textContent = tracks[id].title;
				sel.appendChild(opt);
			});
			sel.parentElement.style.display = trackOrder.length > 1 ? '' : 'none';
			sel.addEventListener('change', function () { activateTrack(sel.value); });

			els.ta.addEventListener('input', function () {
				store.write(key('draft:' + items[cur].id), els.ta.value);
				clearTimeout(runTimer);
				runTimer = setTimeout(run, 300);
			});
			// Tab inserts a real tab (it's Go); Cmd/Ctrl+Enter runs immediately.
			els.ta.addEventListener('keydown', function (e) {
				if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run(); return; }
				if (e.key !== 'Tab') return;
				e.preventDefault();
				var s = els.ta.selectionStart, t = els.ta.selectionEnd, v = els.ta.value;
				els.ta.value = v.slice(0, s) + '\t' + v.slice(t);
				els.ta.selectionStart = els.ta.selectionEnd = s + 1;
				els.ta.dispatchEvent(new Event('input'));
			});

			$('tut-prev').addEventListener('click', function () { if (cur > 0) open(cur - 1); });
			$('tut-next').addEventListener('click', function () { if (cur < items.length - 1) open(cur + 1); });
			$('tut-reset').addEventListener('click', function () {
				store.del(key('draft:' + items[cur].id));
				els.ta.value = items[cur].starter;
				repaint();
				run();
			});
			$('tut-solution').addEventListener('click', function () {
				var item = items[cur];
				if (!item.solution) return;
				els.ta.value = item.solution;
				store.write(key('draft:' + item.id), item.solution);
				repaint();
				run();
			});
			$('tut-toplay').addEventListener('click', function () {
				if (window.playHooks) window.playHooks.openInPlayground(els.ta.value);
			});

			var startId = store.read('golearn:track', trackOrder[0]);
			if (!tracks[startId]) startId = trackOrder[0];
			sel.value = startId;
			activateTrack(startId);

			return {
				run: run,
				repaint: function () { repaint(); if (onRepaintExtra) onRepaintExtra(); },
			};
		},

		// Called by the page when wasm instantiation completes; reruns the
		// current item so "loading interpreter…" resolves into real output.
		wasmReady: function () { if (els) run(); },
	};
})();
