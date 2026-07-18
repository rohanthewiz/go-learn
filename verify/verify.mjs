// verify.mjs — batch-checks every track item against the SAME interpreter
// the browser ships (the native build of ./wasm) and the SAME merge logic
// the browser runs (engine/assemble.js). Run from the repo root:
//
//	node verify/verify.mjs
//
// Checks, per problem:
//   - starter compiles and the harness reports results (table renders on load)
//   - starter does NOT already pass every test (guards vacuous tests)
//   - solution passes every test, with empty stderr
// Per lesson: starter runs but does not pre-pass check(); solution passes.
// Lessons marked starterError: true invert the first clause — the starter
// MUST fail to compile (the diagnostic is the lesson) and the solution must
// run clean.
// Plus static shape checks (ids, manifest order, sentinels, script tags).
//
// Tracks declaring runner 'ts' execute through the SAME compile-and-run core
// the browser worker uses (engine/ts-run.js + third_party/typescript) instead of
// the Go binary — again, no drift between CI and production.
//
// An optional argument scopes the DYNAMIC checks (static checks always run
// on everything — they are cheap and catch cross-track breakage):
//
//	node verify/verify.mjs html-pure          # one track
//	node verify/verify.mjs html-pure/links    # one item
//
// which is what authoring agents iterate with — the Go binary is only
// built if a scoped run actually needs it.
//
// Exits non-zero on any failure; CI runs this before deploying.

import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import { readFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const A = require(path.join(ROOT, 'engine/assemble.js'));

let failures = 0;
const fail = (msg) => { failures++; console.log('FAIL ' + msg); };
const ok = (msg) => console.log('ok   ' + msg);

// --- load track files exactly as the browser does -------------------------
// The registration order comes from index.html's script tags, which also
// verifies every track/problem file is actually included in the page.
const registered = { tracks: {}, order: [] };
globalThis.GoLearn = {
	registerTrack(m) {
		registered.tracks[m.id] = { ...m, items: {} };
		registered.order.push(m.id);
	},
	registerItem(tid, item) {
		if (!registered.tracks[tid]) { fail(`registerItem for unknown track ${tid}`); return; }
		registered.tracks[tid].items[item.id] = item;
	},
	registerRunner() {}, registerKind() {},
};

const indexHtml = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const trackScripts = [...indexHtml.matchAll(/<script src="(tracks\/[^"]+)"><\/script>/g)].map(m => m[1]);
if (trackScripts.length === 0) fail('index.html: no track <script> tags found');
for (const rel of trackScripts) require(path.join(ROOT, rel));

// --- static shape checks ------------------------------------------------------
const KNOWN_KINDS = new Set(['lesson', 'problem', 'page']);
for (const tid of registered.order) {
	const t = registered.tracks[tid];
	const seen = new Set();
	for (const id of t.order) {
		if (seen.has(id)) fail(`${tid}: duplicate id ${id} in order`);
		seen.add(id);
		if (!t.items[id]) fail(`${tid}: manifest orders "${id}" but no item registered (script tag missing from index.html?)`);
	}
	for (const id of Object.keys(t.items)) {
		if (!seen.has(id)) fail(`${tid}: item "${id}" registered but not in manifest order`);
		const it = t.items[id];
		if (!KNOWN_KINDS.has(it.kind)) fail(`${tid}/${id}: unknown kind ${it.kind}`);
		if (!it.title || !it.prose || !it.prose.length || !it.starter) fail(`${tid}/${id}: missing title/prose/starter`);
		if (it.kind === 'problem') {
			for (const f of ['harness', 'solution', 'explanation', 'difficulty', 'category', 'complexity']) {
				if (!it[f]) fail(`${tid}/${id}: problem missing ${f}`);
			}
			if (it.harness && (!it.harness.includes(A.RESULTS_MARK) && !it.harness.includes('emitResults')))
				fail(`${tid}/${id}: harness never emits the results sentinel`);
		}
	}
}
ok(`static checks: ${registered.order.length} tracks, ` +
	registered.order.map(tid => `${tid}=${Object.keys(registered.tracks[tid].items).length}`).join(' '));

// --- build the native runner once (much faster than go run per case) ----------
// Built LAZILY since the scoped-run argument arrived: a run scoped to a
// ts/js/html track never touches the Go interpreter, and authoring agents
// iterating on one item should not pay a Go build per iteration.
let bin = null;
function run(src) {
	if (!bin) {
		bin = path.join(mkdtempSync(path.join(tmpdir(), 'golearn-')), 'runner');
		execFileSync('go', ['build', '-o', bin, './wasm'], { cwd: ROOT, stdio: 'inherit' });
	}
	try {
		return JSON.parse(execFileSync(bin, [], { input: src, encoding: 'utf8' }));
	} catch (e) {
		if (e.stdout) return JSON.parse(e.stdout.toString()); // exit 2 = interp error
		throw e;
	}
}

// --- the TypeScript runner (runner: 'ts' tracks) ---------------------------
// Built lazily: the compiler is a 9 MB parse, pointless when no ts track is
// registered. ts-run.js's run() is async (it settles a macrotask so promise
// chains print); the Go run() result is plain — `await` tolerates both, so
// the per-item loop below treats the two runners uniformly.
let tsRunner = null;
function tsRun(src) {
	if (!tsRunner) {
		const tsc = require(path.join(ROOT, 'third_party/typescript/typescript.js'));
		const TR = require(path.join(ROOT, 'engine/ts-run.js'));
		const libs = {};
		for (const f of TR.LIB_FILES) {
			libs[f] = readFileSync(path.join(ROOT, 'third_party/typescript', f), 'utf8');
		}
		tsRunner = TR.create(tsc, libs);
	}
	return tsRunner.run(src);
}

// --- the JavaScript runner (runner: 'js' tracks) ----------------------------
// Node IS the production engine family (V8), and engine/js-run.js is the
// exact core the browser worker imports — virtual timers included, so timer
// ordering checked here is the ordering the browser shows. The
// unhandledRejection no-op mirrors worker-js.js's onunhandledrejection
// swallow: a starter that intentionally drops a rejection must fail its
// stdout check, not crash the whole verify process.
let jsRunner = null;
function jsRun(src) {
	if (!jsRunner) {
		process.on('unhandledRejection', () => {});
		jsRunner = require(path.join(ROOT, 'engine/js-run.js')).create();
	}
	return jsRunner.run(src);
}

// --- the HTML runner (runner: 'html' tracks) --------------------------------
// engine/html-run.js is the exact validate-and-outline core the browser
// page kind consults — the outline pinned by a check here is the outline
// the structure pane shows. run() is synchronous; `await` tolerates that.
let htmlRunner = null;
function htmlRun(src) {
	if (!htmlRunner) htmlRunner = require(path.join(ROOT, 'engine/html-run.js')).create();
	return htmlRunner.run(src);
}

// --- dynamic checks ----------------------------------------------------------
// `only` is "track" or "track/item" (see header). Unknown scopes fail loudly
// rather than green-lighting a typo'd run.
const only = process.argv[2] || null;
if (only) {
	const [otid, oid] = only.split('/');
	if (!registered.tracks[otid]) fail(`scope "${only}": no track "${otid}"`);
	else if (oid && !registered.tracks[otid].items[oid]) fail(`scope "${only}": no item "${oid}" in ${otid}`);
}
const inScope = (tid, id) => {
	if (!only) return true;
	const [otid, oid] = only.split('/');
	return tid === otid && (!oid || id === oid);
};

for (const tid of registered.order) {
	const t = registered.tracks[tid];
	const exec = t.runner === 'ts' ? tsRun : t.runner === 'js' ? jsRun : t.runner === 'html' ? htmlRun : run;
	for (const id of t.order) {
		const it = t.items[id];
		if (!it) continue; // already failed above
		if (!inScope(tid, id)) continue;

		if (it.kind === 'problem') {
			// Starter: must compile and produce a results table with >=1 failure.
			let m = A.mergeProgram(it.starter, it.harness);
			let r = run(m.src);
			if (r.error !== undefined) { fail(`${tid}/${id}: starter errors — ${r.error}`); continue; }
			let p = A.parseSentinel(r.stdout);
			if (!p.results) { fail(`${tid}/${id}: starter run produced no sentinel results`); continue; }
			if (p.results.every(x => x.pass)) fail(`${tid}/${id}: starter already passes all tests (vacuous?)`);

			// Solution: all tests pass, stderr clean.
			m = A.mergeProgram(it.solution, it.harness);
			r = run(m.src);
			if (r.error !== undefined) { fail(`${tid}/${id}: solution errors — ${r.error}`); continue; }
			if (r.stderr) fail(`${tid}/${id}: solution stderr: ${r.stderr.slice(0, 200)}`);
			p = A.parseSentinel(r.stdout);
			if (!p.results) { fail(`${tid}/${id}: solution run produced no sentinel results`); continue; }
			const failed = p.results.filter(x => !x.pass);
			if (failed.length) fail(`${tid}/${id}: solution fails ${failed.length} test(s): ${JSON.stringify(failed[0])}`);
			else ok(`${tid}/${id}: starter fails, solution passes ${p.results.length} tests (${r.ms.toFixed(1)} ms)`);
		} else {
			// Lessons: starter runs; check() not pre-passed; solution passes.
			// starterError lessons invert the first two clauses: the starter is
			// REQUIRED to fail compilation (the diagnostic is the lesson).
			const rs = await exec(it.starter);
			if (it.starterError) {
				if (rs.error === undefined) { fail(`${tid}/${id}: starterError set but starter runs clean`); continue; }
			} else if (rs.error !== undefined) { fail(`${tid}/${id}: starter errors — ${rs.error}`); continue; }
			if (it.check) {
				if (!it.starterError) {
					const flatS = rs.stdout.replace(/\s+/g, ' ');
					if (it.check(rs.stdout, flatS) === true) fail(`${tid}/${id}: starter already passes check`);
				}
				if (!it.solution) { fail(`${tid}/${id}: has check but no solution`); continue; }
				const r = await exec(it.solution);
				if (r.error !== undefined) { fail(`${tid}/${id}: solution errors — ${r.error}`); continue; }
				const flat = r.stdout.replace(/\s+/g, ' ');
				if (it.check(r.stdout, flat) !== true) fail(`${tid}/${id}: solution does not satisfy check`);
				else ok(`${tid}/${id}: lesson starter/solution behave (${r.ms.toFixed(1)} ms)`);
			} else ok(`${tid}/${id}: checkless lesson runs`);
		}
	}
}

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS');
process.exit(failures ? 1 : 0);
