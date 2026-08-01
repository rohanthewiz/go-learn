/* Dictionary Encoding — Compression (Easy). The workhorse compression of
 * every column store: replace repeated strings with small integer codes
 * into a dictionary of distinct values, built in first-appearance order so
 * the encoding is deterministic. The harness pins the low-cardinality win
 * (1000-row country column, 4 distinct values, ~5x smaller), the
 * high-cardinality LOSS (an all-unique column where dict + indexes is
 * bigger than raw), the exact roundtrip, and the minimal-bytes-per-index
 * rule (1 byte up to 256 distinct values, 2 bytes after).
 */
(function () {
	'use strict';
	var T = GoLearnDK;

	// The column splits into a small dictionary of distinct strings plus an
	// index vector of tiny codes; decode is a trivial gather. Marker id
	// namespaced (dgArrowDK03) because every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="a string column of repeated country names is split into a dictionary of the distinct values in first-appearance order plus an index vector of small integer codes; decoding gathers dictionary entries by index">' +
		'<text x="20" y="24" class="lbl">a repetitive string column becomes distinct values + tiny codes</text>' +
		// the raw column
		'<rect x="30" y="44" width="130" height="130" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="95" y="66" text-anchor="middle" class="lbl">raw column</text>' +
		'<text x="95" y="88" text-anchor="middle">USA</text>' +
		'<text x="95" y="108" text-anchor="middle">Brazil</text>' +
		'<text x="95" y="128" text-anchor="middle">USA</text>' +
		'<text x="95" y="148" text-anchor="middle">Japan</text>' +
		'<text x="95" y="168" text-anchor="middle">Brazil</text>' +
		// the dictionary (first-appearance order)
		'<rect x="250" y="44" width="130" height="90" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="315" y="64" text-anchor="middle" class="lbl">dict (1st appearance)</text>' +
		'<text x="315" y="86" text-anchor="middle">0: USA</text>' +
		'<text x="315" y="106" text-anchor="middle">1: Brazil</text>' +
		'<text x="315" y="126" text-anchor="middle">2: Japan</text>' +
		// the index vector
		'<rect x="250" y="150" width="130" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="315" y="173" text-anchor="middle">[0 1 0 2 1]</text>' +
		'<text x="440" y="173" text-anchor="start" class="lbl">1 B each</text>' +
		'<path d="M 164 90 C 200 90 210 80 246 80" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDK03)"/>' +
		'<path d="M 164 150 C 200 150 210 164 246 164" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDK03)"/>' +
		'<text x="20" y="200" class="lbl">decode = dict[index[i]] — a gather; sizes: raw Σ len(s) vs Σ len(dict) + n × bytesPerIndex</text>' +
		'<defs><marker id="dgArrowDK03" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'dictionary-encoding',
		title: 'Dictionary Encoding',
		nav: 'dictionary encoding',
		difficulty: 'Easy',
		category: 'Compression',
		task: 'Build a first-appearance-order dictionary plus index vector from a string column, decode it back exactly, and compare raw vs encoded sizes for low- and high-cardinality data.',

		prose: [
			'<h2>Dictionary Encoding</h2>' +
			'<p>An events table on S3 carries a <code>country</code> column: a ' +
			'billion rows, ~200 distinct values. Stored raw, that column is ' +
			'~6&nbsp;GB of the same two hundred strings repeated five million ' +
			'times each — and every full scan pays egress on all of it. ' +
			'Dictionary-encoded, the same column is the 200 distinct strings ' +
			'<em>once</em> plus one small integer per row: about 1&nbsp;GB, and ' +
			'the strings themselves ~2&nbsp;KB. This is the single most important ' +
			'compression in column stores, and it only works because columnar ' +
			'layout put all the repetitive values next to each other:</p>' +
			'<ul>' +
			'<li><strong>Build:</strong> walk the column once. The first time a ' +
			'value appears, append it to the dictionary and give it the next code ' +
			'(<code>len(dict)</code> at that moment). Every row becomes its ' +
			'value\'s code in an <em>index vector</em>. First-appearance order ' +
			'makes the encoding deterministic — same column in, same bytes out — ' +
			'with no sorting and no reliance on map iteration order.</li>' +
			'<li><strong>Decode:</strong> <code>out[i] = dict[indexes[i]]</code>. ' +
			'A gather, nothing more — which is why engines often don\'t decode at ' +
			'all and execute directly on the codes.</li>' +
			'<li><strong>Size accounting</strong> (the rule this item uses): raw ' +
			'size is <code>Σ len(s)</code> over the column. Encoded size is ' +
			'<code>Σ len(s)</code> over the <em>dictionary</em> plus ' +
			'<code>n × bytesPerIndex</code>, where <strong>bytesPerIndex is the ' +
			'minimal whole bytes that hold the largest code, ' +
			'<code>len(dict) − 1</code></strong>: 1 byte up to 256 distinct ' +
			'values, 2 bytes up to 65,536, and so on.</li>' +
			'</ul>',
			{ lang: 'txt', code: 'country column: 1000 rows cycling USA / Brazil / Japan / Germany\n\nraw     : 250 x (3 + 6 + 5 + 7)          = 5250 B\nencoded : (3+6+5+7) dict + 1000 x 1 B    = 21 + 1000 = 1021 B\nratio   : 5250 / 1021                    = 5.14x smaller\n\nall-unique column: 100 rows of uuid-0000 … uuid-0099 (9 B each)\nraw     : 100 x 9                        = 900 B\nencoded : 900 dict + 100 x 1 B           = 1000 B   — BIGGER than raw' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>BuildDict(col)</code> returning the dictionary in ' +
			'first-appearance order and the index vector; ' +
			'<code>DecodeDict(dict, indexes)</code> reconstructing the column ' +
			'exactly (an out-of-range code is an <code>error</code>, never a ' +
			'panic); <code>RawSize(col)</code> and ' +
			'<code>EncodedSize(dict, indexes)</code> under the size rule above; ' +
			'and the helper <code>BytesPerIndex(dictLen)</code> — minimal whole ' +
			'bytes for code <code>dictLen − 1</code>, with a floor of 1.</p>' +
			'<div class="tip">The all-unique case is not a corner case — it is ' +
			'why real writers <em>measure before committing</em>. DuckDB and ' +
			'Parquet writers both try dictionary encoding first and abandon it ' +
			'mid-segment when the dictionary grows past a threshold, falling ' +
			'back to plain encoding. Compression choices are per-segment ' +
			'decisions, not per-table dogma.</div>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// BuildDict encodes a string column: the dictionary holds each',
			'// distinct value once, in FIRST-APPEARANCE order (a value\'s code is',
			'// len(dict) at the moment it is first seen), and the index vector',
			'// holds one code per row. Deterministic by construction — no',
			'// dependence on map iteration order in anything returned.',
			'func BuildDict(col []string) ([]string, []int) {',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
			'// DecodeDict reconstructs the original column: out[i] =',
			'// dict[indexes[i]]. A code outside [0, len(dict)) is corrupt input',
			'// and returns an error value — storage code never panics.',
			'func DecodeDict(dict []string, indexes []int) ([]string, error) {',
			'	// your code here',
			'	return nil, errors.New("not implemented")',
			'}',
			'',
			'// RawSize is the unencoded footprint: the sum of len(s) over the',
			'// column (string headers/offsets ignored — the payload is the point).',
			'func RawSize(col []string) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// BytesPerIndex is the cost of one code: the minimal whole bytes',
			'// that can hold the largest code, len(dict)-1. Floor of 1 byte —',
			'// even a 1-entry dictionary spends a byte per row. 256 distinct',
			'// values still fit codes 0..255 in 1 byte; 257 needs 2.',
			'func BytesPerIndex(dictLen int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// EncodedSize is the encoded footprint: dictionary payload (sum of',
			'// len(s) over dict) plus len(indexes) * BytesPerIndex(len(dict)).',
			'func EncodedSize(dict []string, indexes []int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// Low cardinality: 1000 rows cycling 4 countries whose lengths',
			'	// sum to 21 — raw 5250 B, encoded 21 + 1000*1 = 1021 B.',
			'	countries := []string{"USA", "Brazil", "Japan", "Germany"}',
			'	country := make([]string, 1000)',
			'	for i := range country {',
			'		country[i] = countries[i%4]',
			'	}',
			'	// High cardinality: 100 all-unique 9-byte ids. The dictionary',
			'	// repeats the entire payload, so encoding can only add bytes.',
			'	unique := make([]string, 100)',
			'	for i := range unique {',
			'		unique[i] = fmt.Sprintf("uuid-%04d", i)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"BuildDict: first-appearance order, codes assigned in discovery order",',
			'			"dict=[b a c] idx=[0 1 0 2 1]",',
			'			func() string {',
			'				d, ix := BuildDict([]string{"b", "a", "b", "c", "a"})',
			'				return fmt.Sprintf("dict=%v idx=%v", d, ix)',
			'			}},',
			'		{"country column: 4 distinct values -> a 4-entry dictionary",',
			'			"4",',
			'			func() string {',
			'				d, _ := BuildDict(country)',
			'				return fmt.Sprintf("%d", len(d))',
			'			}},',
			'		{"roundtrip: DecodeDict(BuildDict(col)) reproduces the column exactly",',
			'			"true",',
			'			func() string {',
			'				d, ix := BuildDict(country)',
			'				out, err := DecodeDict(d, ix)',
			'				if err != nil {',
			'					return "err: " + err.Error()',
			'				}',
			'				if len(out) != len(country) {',
			'					return fmt.Sprintf("len %d != %d", len(out), len(country))',
			'				}',
			'				for i := range out {',
			'					if out[i] != country[i] {',
			'						return fmt.Sprintf("mismatch at row %d", i)',
			'					}',
			'				}',
			'				return "true"',
			'			}},',
			'		{"low-cardinality win: raw 5250 B vs encoded 1021 B",',
			'			"raw=5250 enc=1021",',
			'			func() string {',
			'				d, ix := BuildDict(country)',
			'				return fmt.Sprintf("raw=%d enc=%d", RawSize(country), EncodedSize(d, ix))',
			'			}},',
			'		{"the ratio: 5250/1021, to two decimals",',
			'			"5.14",',
			'			func() string {',
			'				d, ix := BuildDict(country)',
			'				enc := EncodedSize(d, ix)',
			'				if enc == 0 {',
			'					return "no ratio"',
			'				}',
			'				return fmt.Sprintf("%.2f", float64(RawSize(country))/float64(enc))',
			'			}},',
			'		{"high-cardinality LOSS: 100 unique ids — dict repeats the payload, indexes are pure overhead",',
			'			"raw=900 enc=1000 bigger=true",',
			'			func() string {',
			'				d, ix := BuildDict(unique)',
			'				raw := RawSize(unique)',
			'				enc := EncodedSize(d, ix)',
			'				return fmt.Sprintf("raw=%d enc=%d bigger=%v", raw, enc, enc > raw)',
			'			}},',
			'		{"BytesPerIndex: 4 distinct -> 1 B, 256 -> 1 B (codes 0..255), 257 -> 2 B",',
			'			"1 1 2",',
			'			func() string {',
			'				return fmt.Sprintf("%d %d %d", BytesPerIndex(4), BytesPerIndex(256), BytesPerIndex(257))',
			'			}},',
			'		{"empty column: empty dict, empty indexes, zero sizes",',
			'			"dict=0 idx=0 raw=0 enc=0",',
			'			func() string {',
			'				d, ix := BuildDict([]string{})',
			'				return fmt.Sprintf("dict=%d idx=%d raw=%d enc=%d", len(d), len(ix), RawSize(nil), EncodedSize(d, ix))',
			'			}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			got := c.got()',
			'			r["pass"] = got == c.want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'import "errors"',
			'',
			'// BuildDict walks the column once. The map is a lookup accelerator',
			'// ONLY — every ordered artifact (dict, indexes) is built by',
			'// appending in discovery order, so map iteration order never',
			'// touches the output and the encoding is fully deterministic.',
			'func BuildDict(col []string) ([]string, []int) {',
			'	dict := make([]string, 0)',
			'	indexes := make([]int, 0, len(col))',
			'	seen := make(map[string]int, 16)',
			'	for _, v := range col {',
			'		code, ok := seen[v]',
			'		if !ok {',
			'			// First appearance: the code is the dictionary\'s',
			'			// current length — codes are dense, 0..len(dict)-1,',
			'			// which is what makes fixed-width index storage work.',
			'			code = len(dict)',
			'			dict = append(dict, v)',
			'			seen[v] = code',
			'		}',
			'		indexes = append(indexes, code)',
			'	}',
			'	return dict, indexes',
			'}',
			'',
			'// DecodeDict is a gather: out[i] = dict[indexes[i]]. The bounds',
			'// check runs per code because a corrupt index vector is exactly the',
			'// failure mode decode exists to survive — return an error value,',
			'// never index blind.',
			'func DecodeDict(dict []string, indexes []int) ([]string, error) {',
			'	out := make([]string, 0, len(indexes))',
			'	for _, code := range indexes {',
			'		if code < 0 || code >= len(dict) {',
			'			return nil, errors.New("index code out of dictionary range")',
			'		}',
			'		out = append(out, dict[code])',
			'	}',
			'	return out, nil',
			'}',
			'',
			'// RawSize counts string payload only. Offsets/headers exist in both',
			'// representations, so leaving them out of both keeps the comparison',
			'// honest and the arithmetic simple.',
			'func RawSize(col []string) int {',
			'	total := 0',
			'	for _, s := range col {',
			'		total += len(s)',
			'	}',
			'	return total',
			'}',
			'',
			'// BytesPerIndex sizes a code by the LARGEST code the dictionary',
			'// needs, len(dict)-1: shift bytes off until it is exhausted. The',
			'// floor of 1 covers the 0- and 1-entry dictionaries (a code still',
			'// occupies storage per row). Real engines pack at bit granularity',
			'// (9 bits for 300 values, not 16) — whole bytes keep the teaching',
			'// arithmetic clean, and the crossover logic is identical.',
			'func BytesPerIndex(dictLen int) int {',
			'	maxCode := dictLen - 1',
			'	if maxCode <= 0 {',
			'		return 1',
			'	}',
			'	n := 0',
			'	for maxCode > 0 {',
			'		n++',
			'		maxCode >>= 8',
			'	}',
			'	return n',
			'}',
			'',
			'// EncodedSize is the whole bill: the dictionary payload once, plus',
			'// one fixed-width code per row. Note the asymmetry that decides',
			'// win vs loss: the dictionary term is bounded by DISTINCT values,',
			'// the index term grows with ROWS — so repetition is the entire game.',
			'func EncodedSize(dict []string, indexes []int) int {',
			'	if len(dict) == 0 && len(indexes) == 0 {',
			'		return 0',
			'	}',
			'	total := 0',
			'	for _, s := range dict {',
			'		total += len(s)',
			'	}',
			'	return total + len(indexes)*BytesPerIndex(len(dict))',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What DuckDB actually does with this</h3>' +
			'<p>Dictionary encoding in a real column store is not just a smaller ' +
			'file — it changes execution:</p>' +
			'<ul>' +
			'<li><strong>Per-segment choice.</strong> DuckDB compresses each ' +
			'column segment (inside ~120K-row row groups) independently: the ' +
			'writer analyzes the segment, tries candidate encodings — dictionary, ' +
			'RLE, bit-packing, FSST for strings — and keeps the smallest. Your ' +
			'high-cardinality case is precisely the branch where the analyzer ' +
			'rejects dictionary: when <code>EncodedSize &gt; RawSize</code> it ' +
			'stores plain. Parquet writers do the same with a size threshold — ' +
			'the dictionary page grows until a limit (1&nbsp;MB by default in ' +
			'many writers), then the encoder falls back mid-column-chunk.</li>' +
			'<li><strong>Execution on codes.</strong> A filter like ' +
			'<code>country = \'Japan\'</code> against a dictionary-encoded vector ' +
			'does one string comparison <em>per distinct value</em> — find ' +
			'Japan\'s code (or prove it absent, skipping the segment outright), ' +
			'then compare integers per row. GROUP BY country can aggregate ' +
			'straight on codes and decode only the final handful of group keys. ' +
			'2048-value dictionary vectors carry the codes through the pipeline ' +
			'(previous item), so decompression is deferred until output, if it ' +
			'happens at all.</li>' +
			'<li><strong>Pushdown compounds it.</strong> Over Parquet on S3, the ' +
			'reader fetches the dictionary page first; if the predicate\'s value ' +
			'is not in the dictionary, the whole column chunk is skipped without ' +
			'transferring its data pages — dictionary as an accidental index, and ' +
			'a direct egress saving.</li>' +
			'</ul>' +
			'<h3>The break-even arithmetic</h3>' +
			'<p>With average string length L, n rows, d distinct values, and b ' +
			'bytes per code: encoding wins when <code>dL + nb &lt; nL</code>, ' +
			'i.e. when <code>d/n &lt; 1 − b/L</code>. For 9-byte strings and ' +
			'1-byte codes that is d/n &lt; 8/9 — dictionary wins even at 88% ' +
			'cardinality on paper, though real writers bail far earlier because ' +
			'giant dictionaries also wreck cache behavior and dictionary-page ' +
			'fetch latency. At the other extreme (your country column, ' +
			'd/n = 0.004) the index term is the whole cost, which is why engines ' +
			'then bit-pack the codes (2 bits for 4 values, not 8) and often RLE ' +
			'them on top — sorted-by-country data collapses to a handful of ' +
			'runs. Those layers are the next item.</p>' +
			'<h3>Why first-appearance order</h3>' +
			'<p>Any stable rule would compress identically — the bytes saved ' +
			'depend on repetition, not on which value got code 0. ' +
			'First-appearance is the rule real writers use because it is free: ' +
			'one pass, no sort, and deterministic output for a given input, ' +
			'which matters when the same data must produce the same file hash ' +
			'twice (reproducible snapshots, content-addressed storage). Sorted ' +
			'dictionaries buy binary-searchable lookups and range-predicate ' +
			'evaluation on codes, at the price of a second pass — another ' +
			'per-segment engineering trade, not a law.</p>',
		],
		complexity: { time: 'O(n) build and decode — one pass each, O(1) expected per map lookup', space: 'O(d) for the dictionary plus O(n) for the index vector' },
	});
})();
