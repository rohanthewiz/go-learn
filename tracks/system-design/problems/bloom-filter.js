/* Bloom Filter — Probabilistic Structures (Medium). "Have I seen this key?"
 * in a few bits per element, with one-sided error. Property harness: the
 * exact bit pattern depends on hashes, so the tests assert the contract —
 * zero false negatives, rare false positives, empty filter rejects all.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 170" width="500" height="170" role="img" aria-label="bloom filter: k hash functions set k bits">' +
		'<text x="20" y="18" class="lbl">Add("cat") — k=3 hashes each set one bit</text>' +
		'<text x="42" y="44">"cat"</text>' +
		// bit array
		'<g>' +
		'<rect x="120" y="70" width="26" height="26" fill="none" stroke="var(--edge)"/>' +
		'<rect x="146" y="70" width="26" height="26" fill="var(--accent)" fill-opacity="0.35" stroke="var(--accent)"/>' +
		'<rect x="172" y="70" width="26" height="26" fill="none" stroke="var(--edge)"/>' +
		'<rect x="198" y="70" width="26" height="26" fill="none" stroke="var(--edge)"/>' +
		'<rect x="224" y="70" width="26" height="26" fill="var(--accent)" fill-opacity="0.35" stroke="var(--accent)"/>' +
		'<rect x="250" y="70" width="26" height="26" fill="none" stroke="var(--edge)"/>' +
		'<rect x="276" y="70" width="26" height="26" fill="none" stroke="var(--edge)"/>' +
		'<rect x="302" y="70" width="26" height="26" fill="var(--accent)" fill-opacity="0.35" stroke="var(--accent)"/>' +
		'<rect x="328" y="70" width="26" height="26" fill="none" stroke="var(--edge)"/>' +
		'<rect x="354" y="70" width="26" height="26" fill="none" stroke="var(--edge)"/>' +
		'<text x="133" y="88" text-anchor="middle">0</text>' +
		'<text x="159" y="88" text-anchor="middle">1</text>' +
		'<text x="185" y="88" text-anchor="middle">0</text>' +
		'<text x="211" y="88" text-anchor="middle">0</text>' +
		'<text x="237" y="88" text-anchor="middle">1</text>' +
		'<text x="263" y="88" text-anchor="middle">0</text>' +
		'<text x="289" y="88" text-anchor="middle">0</text>' +
		'<text x="315" y="88" text-anchor="middle">1</text>' +
		'<text x="341" y="88" text-anchor="middle">0</text>' +
		'<text x="367" y="88" text-anchor="middle">0</text>' +
		'</g>' +
		// hash arrows
		'<path d="M 70 40 C 110 40 140 55 157 66" fill="none" stroke="var(--warn)" stroke-width="1.5" marker-end="url(#dgArrowBF)"/>' +
		'<path d="M 70 44 C 140 46 200 58 235 66" fill="none" stroke="var(--warn)" stroke-width="1.5" marker-end="url(#dgArrowBF)"/>' +
		'<path d="M 70 48 C 170 56 270 60 313 66" fill="none" stroke="var(--warn)" stroke-width="1.5" marker-end="url(#dgArrowBF)"/>' +
		'<text x="150" y="36" class="lbl">h1  h2  h3</text>' +
		// lookup semantics
		'<text x="20" y="130" class="lbl">MayContain: all k bits set → "probably yes" · any bit clear → "definitely no"</text>' +
		'<text x="20" y="150" class="lbl">bits are never cleared, so an added key can never be denied — error is one-sided</text>' +
		'<defs><marker id="dgArrowBF" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'bloom-filter',
		title: 'Bloom Filter',
		nav: 'Bloom Filter',
		difficulty: 'Medium',
		category: 'Probabilistic Structures',
		task: 'Implement Add and MayContain with k double-hashed bit positions.',

		prose: [
			'<h2>Bloom Filter</h2>' +
			'<p>Before a database node touches disk for a key, it would love to know ' +
			'“is that key even <em>in</em> this file?” Storing every key in memory defeats ' +
			'the purpose; a Bloom filter answers set membership in a few <em>bits</em> per ' +
			'element by accepting one-sided error:</p>' +
			'<ul>' +
			'<li><strong>“definitely no”</strong> — always correct (no false negatives), or</li>' +
			'<li><strong>“probably yes”</strong> — occasionally wrong (a tunable false-positive rate).</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p><code>Add</code> sets <code>k</code> bit positions for the key; ' +
			'<code>MayContain</code> reports whether all <code>k</code> are set. Derive the ' +
			'positions by <em>double hashing</em> — two real hashes simulate k of them:</p>',
			{ code: 'h1, h2 := fnv1a(s), fnv1(s)|1   // |1 keeps the stride odd (never 0)\nposition(i) = (h1 + i*h2) % m   // for i in 0..k-1', lang: 'txt' },
			'<p>The bit array is <code>[]uint64</code>: bit <code>p</code> lives in word ' +
			'<code>p/64</code> at offset <code>p%64</code>. Both hash functions are provided ' +
			'in the starter.</p>',
		],

		starter: [
			'package main',
			'',
			SD.FNV_HELPERS,
			'',
			SD.FNV1_HELPER,
			'',
			'// Bloom is a Bloom filter over m bits with k hash positions per key.',
			'// It answers membership with "definitely no" or "probably yes" —',
			'// bits are only ever set, never cleared, so false negatives are',
			'// impossible by construction.',
			'type Bloom struct {',
			'	m    int      // number of bits',
			'	k    int      // hash positions per key',
			'	bits []uint64 // the bit array, 64 bits per word',
			'}',
			'',
			'func NewBloom(m, k int) *Bloom {',
			'	return &Bloom{m: m, k: k, bits: make([]uint64, (m+63)/64)}',
			'}',
			'',
			'// Add sets the k bit positions for s, derived by double hashing:',
			'// position i is (fnv1a(s) + i*(fnv1(s)|1)) % m.',
			'func (f *Bloom) Add(s string) {',
			'	// your code here',
			'}',
			'',
			'// MayContain reports whether s might have been added: true only if',
			'// ALL k of s\'s bit positions are set.',
			'func (f *Bloom) MayContain(s string) bool {',
			'	return false // your code here',
			'}',
			'',
		].join('\n'),

		// Property harness. Sizing m=4096, k=5 over 200 keys gives a
		// theoretical FP rate ≈ 0.05%; measured 0/400 against the reference
		// solution, so the ≤5% ceiling only fails genuinely broken hashing.
		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strconv"',
			')',
			'',
			SD.HARNESS_RT,
			'',
			'func main() {',
			'	results := make([]map[string]any, 0, 4)',
			'	check := func(name string, body func() string) {',
			'		r := map[string]any{"input": name, "want": "ok"}',
			'		runCase(r, func() {',
			'			msg := body()',
			'			r["pass"] = msg == ""',
			'			if msg == "" {',
			'				msg = "ok"',
			'			}',
			'			r["got"] = msg',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	check("no false negatives: 200 added keys all report true (m=4096 k=5)", func() string {',
			'		f := NewBloom(4096, 5)',
			'		for i := 0; i < 200; i++ {',
			'			f.Add("user:" + strconv.Itoa(i))',
			'		}',
			'		misses := 0',
			'		for i := 0; i < 200; i++ {',
			'			if !f.MayContain("user:" + strconv.Itoa(i)) {',
			'				misses++',
			'			}',
			'		}',
			'		if misses > 0 {',
			'			return fmt.Sprintf("%d added keys reported absent — false negatives are forbidden", misses)',
			'		}',
			'		return ""',
			'	})',
			'',
			'	check("false positives stay rare: 400 absent keys, at most 5% may pass", func() string {',
			'		f := NewBloom(4096, 5)',
			'		for i := 0; i < 200; i++ {',
			'			f.Add("user:" + strconv.Itoa(i))',
			'		}',
			'		fp := 0',
			'		for i := 0; i < 400; i++ {',
			'			if f.MayContain("ghost:" + strconv.Itoa(i)) {',
			'				fp++',
			'			}',
			'		}',
			'		if fp > 20 {',
			'			return fmt.Sprintf("%d/400 absent keys reported present — are all k positions independent?", fp)',
			'		}',
			'		return ""',
			'	})',
			'',
			'	check("empty filter rejects everything", func() string {',
			'		f := NewBloom(1024, 4)',
			'		for i := 0; i < 50; i++ {',
			'			if f.MayContain("x:" + strconv.Itoa(i)) {',
			'				return fmt.Sprintf("empty filter claims to contain %q", "x:"+strconv.Itoa(i))',
			'			}',
			'		}',
			'		return ""',
			'	})',
			'',
			'	check("filters are independent: keys added to one don\'t appear in another", func() string {',
			'		a := NewBloom(1024, 4)',
			'		b := NewBloom(1024, 4)',
			'		a.Add("only-in-a")',
			'		if !a.MayContain("only-in-a") {',
			'			return "filter a lost its own key"',
			'		}',
			'		if b.MayContain("only-in-a") {',
			'			return "filter b reports a key added only to filter a (shared state?)"',
			'		}',
			'		return ""',
			'	})',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			SD.FNV_HELPERS,
			'',
			SD.FNV1_HELPER,
			'',
			'// Bloom is a Bloom filter over m bits with k hash positions per key.',
			'type Bloom struct {',
			'	m    int      // number of bits',
			'	k    int      // hash positions per key',
			'	bits []uint64 // the bit array, 64 bits per word',
			'}',
			'',
			'func NewBloom(m, k int) *Bloom {',
			'	return &Bloom{m: m, k: k, bits: make([]uint64, (m+63)/64)}',
			'}',
			'',
			'// positions computes the k probe indices by double hashing. The |1',
			'// forces an odd stride: with h2 even (worst case 0) the probes would',
			'// cycle through a fraction of the table — or all land on one bit.',
			'// uint32 overflow is fine; we only need well-spread values mod m.',
			'func (f *Bloom) position(h1, h2 uint32, i int) int {',
			'	return int((h1 + uint32(i)*h2) % uint32(f.m))',
			'}',
			'',
			'// Add sets the k bit positions for s. Setting an already-set bit is',
			'// a no-op, which is why deletion is impossible: clearing a bit could',
			'// erase evidence of OTHER keys that share it.',
			'func (f *Bloom) Add(s string) {',
			'	h1, h2 := fnv1a(s), fnv1(s)|1',
			'	for i := 0; i < f.k; i++ {',
			'		p := f.position(h1, h2, i)',
			'		f.bits[p/64] |= 1 << uint(p%64)',
			'	}',
			'}',
			'',
			'// MayContain reports whether s might have been added. Any clear bit',
			'// proves s was never added (Add would have set it) — that single',
			'// direction of proof is the filter\'s whole contract.',
			'func (f *Bloom) MayContain(s string) bool {',
			'	h1, h2 := fnv1a(s), fnv1(s)|1',
			'	for i := 0; i < f.k; i++ {',
			'		p := f.position(h1, h2, i)',
			'		if f.bits[p/64]&(1<<uint(p%64)) == 0 {',
			'			return false // definitely absent',
			'		}',
			'	}',
			'	return true // probably present',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the error is one-sided</h3>' +
			'<p>Bits are only ever set. If <code>MayContain</code> finds a clear bit, no ' +
			'<code>Add</code> for that key ever ran — a guaranteed <em>no</em>. A false ' +
			'<em>yes</em> just means other keys happened to cover all k positions. That ' +
			'asymmetry is what makes the filter useful as a cheap gate in front of an ' +
			'expensive lookup: wrong answers only ever cost a wasted lookup, never a ' +
			'wrongly skipped one.</p>' +
			'<h3>Double hashing</h3>',
			{ code: 'h1, h2 := fnv1a(s), fnv1(s)|1\np_i := (h1 + uint32(i)*h2) % uint32(m)' },
			'<p>Running k independent hash functions is k× the CPU; Kirsch–Mitzenmacher ' +
			'showed <code>h1 + i·h2</code> preserves the false-positive bound with just two. ' +
			'The <code>|1</code> guards the degenerate stride: an even <code>h2</code> cycles ' +
			'through only part of the table, and <code>h2 = 0</code> would collapse all k ' +
			'probes onto one bit.</p>' +
			'<h3>Sizing (the numbers interviewers ask for)</h3>' +
			'<p>With n elements in m bits, the optimal hash count is ' +
			'<code>k = (m/n)·ln 2</code>, giving FP rate ≈ <code>0.6185^(m/n)</code>. The ' +
			'useful anchor: <strong>10 bits per element with k=7 gives about 1% false ' +
			'positives</strong> — ~1/13th the memory of storing 16-byte keys, independent of ' +
			'key length.</p>' +
			'<p>In the wild: LSM stores (RocksDB, Cassandra, HBase) keep one filter per ' +
			'SSTable to skip files that can’t contain a key; CDNs use one to avoid caching ' +
			'objects on first touch; Chrome famously screened malicious URLs through one. ' +
			'Need deletion? Count instead of set bits (counting Bloom) or reach for a ' +
			'cuckoo filter.</p>',
		],
		complexity: { time: 'O(k) per op', space: 'm bits (~10 per element at 1% FP)' },
	});
})();
