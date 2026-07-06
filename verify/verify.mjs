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
// Plus static shape checks (ids, manifest order, sentinels, script tags).
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
const KNOWN_KINDS = new Set(['lesson', 'problem']);
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
const bin = path.join(mkdtempSync(path.join(tmpdir(), 'golearn-')), 'runner');
execFileSync('go', ['build', '-o', bin, './wasm'], { cwd: ROOT, stdio: 'inherit' });

function run(src) {
	try {
		return JSON.parse(execFileSync(bin, [], { input: src, encoding: 'utf8' }));
	} catch (e) {
		if (e.stdout) return JSON.parse(e.stdout.toString()); // exit 2 = interp error
		throw e;
	}
}

// --- dynamic checks ----------------------------------------------------------
for (const tid of registered.order) {
	const t = registered.tracks[tid];
	for (const id of t.order) {
		const it = t.items[id];
		if (!it) continue; // already failed above

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
			const rs = run(it.starter);
			if (rs.error !== undefined) { fail(`${tid}/${id}: starter errors — ${rs.error}`); continue; }
			if (it.check) {
				const flatS = rs.stdout.replace(/\s+/g, ' ');
				if (it.check(rs.stdout, flatS) === true) fail(`${tid}/${id}: starter already passes check`);
				if (!it.solution) { fail(`${tid}/${id}: has check but no solution`); continue; }
				const r = run(it.solution);
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
