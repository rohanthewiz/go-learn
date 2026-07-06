// one.mjs — check a single problem file during authoring, without needing
// its <script> tag in index.html yet:
//
//	node verify/one.mjs tracks/leetcode/problems/<slug>.js
//
// Runs the same dynamic checks as verify.mjs (starter compiles and fails
// >=1 test; solution passes all, stderr clean) against the native runner.

import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const A = require(path.join(ROOT, 'engine/assemble.js'));

const items = [];
globalThis.GoLearn = {
	registerTrack() {}, registerRunner() {}, registerKind() {},
	registerItem(_tid, item) { items.push(item); },
};
require(path.join(ROOT, 'tracks/leetcode/track.js'));
for (const rel of process.argv.slice(2)) require(path.resolve(ROOT, rel));

if (!items.length) { console.log('FAIL no items registered'); process.exit(1); }

function run(src) {
	try {
		return JSON.parse(execFileSync('go', ['run', './wasm'], { cwd: ROOT, input: src, encoding: 'utf8' }));
	} catch (e) {
		if (e.stdout) return JSON.parse(e.stdout.toString());
		throw e;
	}
}

let failures = 0;
for (const it of items) {
	const fail = (m) => { failures++; console.log(`FAIL ${it.id}: ${m}`); };
	for (const f of ['harness', 'solution', 'explanation', 'difficulty', 'category', 'complexity', 'prose', 'starter', 'task'])
		if (!it[f]) fail(`missing ${f}`);

	let m = A.mergeProgram(it.starter, it.harness);
	let r = run(m.src);
	if (r.error !== undefined) { fail(`starter errors — ${r.error}`); continue; }
	let p = A.parseSentinel(r.stdout);
	if (!p.results) { fail('starter: no sentinel results'); continue; }
	if (p.results.every(x => x.pass)) fail('starter already passes all tests');

	m = A.mergeProgram(it.solution, it.harness);
	r = run(m.src);
	if (r.error !== undefined) { fail(`solution errors — ${r.error}`); continue; }
	if (r.stderr) fail(`solution stderr: ${r.stderr.slice(0, 200)}`);
	p = A.parseSentinel(r.stdout);
	if (!p.results) { fail('solution: no sentinel results'); continue; }
	const bad = p.results.filter(x => !x.pass);
	if (bad.length) fail(`solution fails ${bad.length}: ${JSON.stringify(bad[0])}`);
	if (!failures) console.log(`ok   ${it.id}: starter fails, solution passes ${p.results.length} tests`);
}
process.exit(failures ? 1 : 0);
