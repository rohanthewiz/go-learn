/* Type Affinity: The Five Rules — Semantics (Medium). SQLite columns
 * don't have types; they have AFFINITIES — preferences applied to each
 * incoming value. The declared type string is pattern-matched by five
 * rules IN ORDER (INT -> INTEGER, CHAR/CLOB/TEXT -> TEXT, BLOB/empty ->
 * BLOB, REAL/FLOA/DOUB -> REAL, else NUMERIC), and the harness pins the
 * exam classics — "FLOATING POINT" is INTEGER affinity because of the
 * INT in POINT — plus the insert-time coercions each affinity performs.
 */
(function () {
	'use strict';
	var T = GoLearnSQ;

	// The five rules as an ordered decision chain — order IS the spec.
	// Marker id namespaced (dgArrowSQ06) because every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="the five affinity rules applied in order: contains INT gives INTEGER; then CHAR, CLOB or TEXT gives TEXT; then BLOB or empty gives BLOB; then REAL, FLOA or DOUB gives REAL; otherwise NUMERIC">' +
		'<text x="20" y="22" class="lbl">match the declared type against each rule IN ORDER — first hit wins</text>' +
		'<rect x="20" y="36" width="180" height="30" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="110" y="56" text-anchor="middle">1. contains "INT"?</text>' +
		'<text x="300" y="56" class="lbl">→ INTEGER   (BIGINT, but also FLOATING POINT!)</text>' +
		'<path d="M 110 66 L 110 76" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ06)"/>' +
		'<rect x="20" y="80" width="180" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="110" y="100" text-anchor="middle">2. CHAR / CLOB / TEXT?</text>' +
		'<text x="300" y="100" class="lbl">→ TEXT   (VARCHAR(255))</text>' +
		'<path d="M 110 110 L 110 120" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ06)"/>' +
		'<rect x="20" y="124" width="180" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="110" y="144" text-anchor="middle">3. BLOB or empty?</text>' +
		'<text x="300" y="144" class="lbl">→ BLOB   (no coercion at all)</text>' +
		'<path d="M 110 154 L 110 164" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ06)"/>' +
		'<rect x="20" y="168" width="180" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="110" y="188" text-anchor="middle">4. REAL / FLOA / DOUB?</text>' +
		'<text x="300" y="188" class="lbl">→ REAL,  else  5. → NUMERIC  (STRING, DATETIME)</text>' +
		'<defs><marker id="dgArrowSQ06" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'type-affinity',
		title: 'Type Affinity: The Five Rules',
		nav: 'type affinity',
		difficulty: 'Medium',
		category: 'Semantics',
		task: 'Implement Affinity (the five ordered substring rules over the declared type) and Coerce (what each affinity does to an inserted value: TEXT stringifies numbers, INTEGER/NUMERIC parse lossless numerics, BLOB touches nothing).',

		prose: [
			'<h2>Type Affinity: The Five Rules</h2>' +
			'<p>A bug report: “zip codes are losing their leading zeros.” The ' +
			'schema says <code>zip DECIMAL(5)</code>, the app inserted the string ' +
			'<code>\'07030\'</code>, and <code>SELECT</code> returns ' +
			'<code>7030</code>. Nothing truncated it — SQLite <em>coerced</em> ' +
			'it. Column “types” in SQLite are affinities: a preference, applied ' +
			'per inserted value, derived from the declared type by five substring ' +
			'rules. <code>DECIMAL(5)</code> hits none of the first four rules, ' +
			'falls to NUMERIC, and NUMERIC affinity converts the string ' +
			'<code>\'07030\'</code> losslessly to the integer 7030. The fix is to ' +
			'declare the column <code>TEXT</code> — and to be able to predict ' +
			'that, you need the rules:</p>',
			{ lang: 'txt', code: 'affinity of a declared type — apply IN ORDER, first match wins\n(match is case-insensitive substring):\n\n1. contains "INT"                  -> INTEGER\n2. contains "CHAR"/"CLOB"/"TEXT"   -> TEXT\n3. contains "BLOB" or type empty   -> BLOB   (a.k.a. "no affinity")\n4. contains "REAL"/"FLOA"/"DOUB"   -> REAL\n5. anything else                   -> NUMERIC\n\ninsert-time coercion of value v into a column with affinity A:\n  TEXT    : numbers become their text rendering; text stays\n  INTEGER : text that is a lossless numeric becomes int (or real);\n  NUMERIC   a real with an exact integer value becomes int;\n            text like "42abc" stays text — NO partial parses\n  REAL    : ints and numeric text become float; other text stays\n  BLOB    : nothing is touched, ever' },
			'<ul>' +
			'<li><strong>Order matters more than intuition.</strong> Rule 1 runs ' +
			'first, so <code>FLOATING POINT</code> — which any human reads as a ' +
			'float — gets INTEGER affinity from the <code>INT</code> hiding in ' +
			'<code>POINT</code>. <code>CHARINT</code> is INTEGER too, for the ' +
			'same reason.</li>' +
			'<li><strong>Unknown words are NUMERIC, not errors.</strong> ' +
			'<code>STRING</code>, <code>DATETIME</code>, <code>BOOLEAN</code>, ' +
			'<code>JSON</code> — SQLite accepts any declared type and shrugs it ' +
			'into rule 5. Declaring a column <code>STRING</code> and being ' +
			'surprised it stores <code>\'123\'</code> as an integer is a rite of ' +
			'passage.</li>' +
			'<li><strong>Coercion is lossless or nothing.</strong> ' +
			'<code>\'42abc\'</code> into an INTEGER column stays the text ' +
			'<code>\'42abc\'</code> — SQLite never half-parses. This is why ' +
			'<code>typeof()</code> can differ row to row in one column.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Affinity(decl string) string</code> returning ' +
			'<code>"INTEGER" | "TEXT" | "BLOB" | "REAL" | "NUMERIC"</code>, and ' +
			'<code>Coerce(affinity string, v Value) Value</code> over a small ' +
			'tagged union (int / real / text), implementing the coercion table ' +
			'above. Integer parsing must be exact (<code>strconv</code>); a real ' +
			'converts to int only when the round trip is lossless.</p>',
		],

		starter: [
			'package main',
			'',
			'import (',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// Value is a stored value in this lesson\'s model: Kind is "int",',
			'// "real", or "text"; the matching field carries the payload.',
			'type Value struct {',
			'	Kind string',
			'	Int  int64',
			'	Real float64',
			'	Text string',
			'}',
			'',
			'// Affinity applies the five rules, IN ORDER, to a declared column',
			'// type (case-insensitive substring match):',
			'//',
			'//   1. "INT"                    -> "INTEGER"',
			'//   2. "CHAR", "CLOB", "TEXT"   -> "TEXT"',
			'//   3. "BLOB" or empty string   -> "BLOB"',
			'//   4. "REAL", "FLOA", "DOUB"   -> "REAL"',
			'//   5. otherwise                -> "NUMERIC"',
			'func Affinity(decl string) string {',
			'	_ = strings.ToUpper // imports stay while the body is unwritten',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// Coerce applies affinity A to an inserted value:',
			'//',
			'//   TEXT:    int/real become their text rendering (FormatInt /',
			'//            FormatFloat \'g\' -1); text passes through',
			'//   INTEGER, NUMERIC: text parsing exactly as an integer becomes',
			'//            int; text parsing as a float becomes real, then a real',
			'//            with a lossless integer value becomes int; other text',
			'//            stays text ("42abc" never half-parses)',
			'//   REAL:    ints become real; numeric text becomes real',
			'//   BLOB:    everything passes through untouched',
			'func Coerce(affinity string, v Value) Value {',
			'	_ = strconv.ParseInt',
			'	// your code here',
			'	return v',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'// showVal renders a Value deterministically; reals go through',
			'// fixed-precision Sprintf, never raw floats.',
			'func showVal(v Value) string {',
			'	if v.Kind == "int" {',
			'		return fmt.Sprintf("int:%d", v.Int)',
			'	}',
			'	if v.Kind == "real" {',
			'		return fmt.Sprintf("real:%.2f", v.Real)',
			'	}',
			'	return "text:" + v.Text',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	affs := func(decls ...string) string {',
			'		out := make([]string, 0, len(decls))',
			'		for _, d := range decls {',
			'			out = append(out, Affinity(d))',
			'		}',
			'		return strings.Join(out, " ")',
			'	}',
			'	cases := []tc{',
			'		{"one representative per rule: BIGINT, VARCHAR(255), BLOB, DOUBLE, DECIMAL(10,5)",',
			'			"INTEGER TEXT BLOB REAL NUMERIC",',
			'			func() string { return affs("BIGINT", "VARCHAR(255)", "BLOB", "DOUBLE", "DECIMAL(10,5)") }},',
			'		{"the exam classic: FLOATING POINT is INTEGER — the INT hides in POINT",',
			'			"INTEGER",',
			'			func() string { return affs("FLOATING POINT") }},',
			'		{"STRING is not a SQLite type: rule 5 gives NUMERIC",',
			'			"NUMERIC",',
			'			func() string { return affs("STRING") }},',
			'		{"rule order: CHARINT contains both CHAR and INT — rule 1 wins",',
			'			"INTEGER",',
			'			func() string { return affs("CHARINT") }},',
			'		{"empty declared type (CREATE TABLE t(x)) is BLOB affinity",',
			'			"BLOB",',
			'			func() string { return affs("") }},',
			'		{"matching is case-insensitive: text, Clob, tinyint",',
			'			"TEXT TEXT INTEGER",',
			'			func() string { return affs("text", "Clob", "tinyint") }},',
			'		{"more strays into NUMERIC: DATETIME, BOOLEAN, JSON",',
			'			"NUMERIC NUMERIC NUMERIC",',
			'			func() string { return affs("DATETIME", "BOOLEAN", "JSON") }},',
			'		{"TEXT affinity stringifies numbers: 42 and 3.5 become text",',
			'			"text:42 text:3.5",',
			'			func() string {',
			'				a := Coerce("TEXT", Value{Kind: "int", Int: 42})',
			'				b := Coerce("TEXT", Value{Kind: "real", Real: 3.5})',
			'				return showVal(a) + " " + showVal(b)',
			'			}},',
			'		{"INTEGER affinity parses \'42\' to int but keeps \'42abc\' as text",',
			'			"int:42 text:42abc",',
			'			func() string {',
			'				a := Coerce("INTEGER", Value{Kind: "text", Text: "42"})',
			'				b := Coerce("INTEGER", Value{Kind: "text", Text: "42abc"})',
			'				return showVal(a) + " " + showVal(b)',
			'			}},',
			'		{"the zip-code bug: \'07030\' under NUMERIC affinity becomes int 7030",',
			'			"int:7030",',
			'			func() string { return showVal(Coerce("NUMERIC", Value{Kind: "text", Text: "07030"})) }},',
			'		{"lossless demotion: real 3.0 -> int 3, but 3.5 stays real",',
			'			"int:3 real:3.50",',
			'			func() string {',
			'				a := Coerce("NUMERIC", Value{Kind: "real", Real: 3.0})',
			'				b := Coerce("NUMERIC", Value{Kind: "real", Real: 3.5})',
			'				return showVal(a) + " " + showVal(b)',
			'			}},',
			'		{"text float into INTEGER affinity: \'3.0\' -> int 3, \'2.75\' -> real",',
			'			"int:3 real:2.75",',
			'			func() string {',
			'				a := Coerce("INTEGER", Value{Kind: "text", Text: "3.0"})',
			'				b := Coerce("INTEGER", Value{Kind: "text", Text: "2.75"})',
			'				return showVal(a) + " " + showVal(b)',
			'			}},',
			'		{"REAL affinity promotes: int 7 -> real, \'2.5\' -> real, \'abc\' stays text",',
			'			"real:7.00 real:2.50 text:abc",',
			'			func() string {',
			'				a := Coerce("REAL", Value{Kind: "int", Int: 7})',
			'				b := Coerce("REAL", Value{Kind: "text", Text: "2.5"})',
			'				c := Coerce("REAL", Value{Kind: "text", Text: "abc"})',
			'				return showVal(a) + " " + showVal(b) + " " + showVal(c)',
			'			}},',
			'		{"BLOB affinity is hands-off: \'42\' stays text, 42 stays int",',
			'			"text:42 int:42",',
			'			func() string {',
			'				a := Coerce("BLOB", Value{Kind: "text", Text: "42"})',
			'				b := Coerce("BLOB", Value{Kind: "int", Int: 42})',
			'				return showVal(a) + " " + showVal(b)',
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
			'import (',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// Value is a stored value: Kind "int" | "real" | "text".',
			'type Value struct {',
			'	Kind string',
			'	Int  int64',
			'	Real float64',
			'	Text string',
			'}',
			'',
			'// Affinity applies the five rules in spec order. The sequence of',
			'// early returns IS the algorithm — reordering any two rules changes',
			'// real answers (FLOATING POINT, CHARINT), so the code mirrors the',
			'// spec\'s ordering literally rather than trying to be clever.',
			'func Affinity(decl string) string {',
			'	d := strings.ToUpper(decl)',
			'	if strings.Contains(d, "INT") {',
			'		return "INTEGER"',
			'	}',
			'	if strings.Contains(d, "CHAR") || strings.Contains(d, "CLOB") || strings.Contains(d, "TEXT") {',
			'		return "TEXT"',
			'	}',
			'	if strings.Contains(d, "BLOB") || d == "" {',
			'		return "BLOB"',
			'	}',
			'	if strings.Contains(d, "REAL") || strings.Contains(d, "FLOA") || strings.Contains(d, "DOUB") {',
			'		return "REAL"',
			'	}',
			'	return "NUMERIC"',
			'}',
			'',
			'// intFromReal demotes a float to int only when the round trip is',
			'// exact — the "lossless and reversible" test the spec requires.',
			'// The magnitude guard keeps the int64 conversion itself defined:',
			'// beyond 2^53 floats skip integers, and near 2^63 the conversion',
			'// overflows, so both ends must be checked before converting.',
			'func intFromReal(r float64) (int64, bool) {',
			'	if r < -9007199254740992 || r > 9007199254740992 { // ±2^53',
			'		return 0, false',
			'	}',
			'	i := int64(r)',
			'	if float64(i) == r {',
			'		return i, true',
			'	}',
			'	return 0, false',
			'}',
			'',
			'// numericText parses text as a number the way NUMERIC/INTEGER',
			'// affinity does: an exact integer parse wins, then a float parse',
			'// (demoted to int when lossless), and anything else — "42abc",',
			'// "abc", "" — is not a number at all. All-or-nothing: SQLite never',
			'// keeps the parsed prefix of a partly-numeric string.',
			'func numericText(s string) (Value, bool) {',
			'	i, err := strconv.ParseInt(s, 10, 64)',
			'	if err == nil {',
			'		return Value{Kind: "int", Int: i}, true',
			'	}',
			'	r, ferr := strconv.ParseFloat(s, 64)',
			'	if ferr == nil {',
			'		di, ok := intFromReal(r)',
			'		if ok {',
			'			return Value{Kind: "int", Int: di}, true',
			'		}',
			'		return Value{Kind: "real", Real: r}, true',
			'	}',
			'	return Value{}, false',
			'}',
			'',
			'// Coerce applies affinity to an inserted value. BLOB is the',
			'// untouched default, so it needs no branch: any affinity this',
			'// function does not recognize passes values through — the same',
			'// posture SQLite takes.',
			'func Coerce(affinity string, v Value) Value {',
			'	if affinity == "TEXT" {',
			'		// TEXT affinity is the only one that makes values LESS',
			'		// structured: numbers become their canonical rendering.',
			'		if v.Kind == "int" {',
			'			return Value{Kind: "text", Text: strconv.FormatInt(v.Int, 10)}',
			'		}',
			'		if v.Kind == "real" {',
			'			return Value{Kind: "text", Text: strconv.FormatFloat(v.Real, \'g\', -1, 64)}',
			'		}',
			'		return v',
			'	}',
			'	if affinity == "INTEGER" || affinity == "NUMERIC" {',
			'		// INTEGER and NUMERIC coerce identically on storage — the',
			'		// difference between them only surfaces in CAST expressions,',
			'		// which this model does not cover.',
			'		if v.Kind == "text" {',
			'			nv, ok := numericText(v.Text)',
			'			if ok {',
			'				return nv',
			'			}',
			'			return v',
			'		}',
			'		if v.Kind == "real" {',
			'			i, ok := intFromReal(v.Real)',
			'			if ok {',
			'				return Value{Kind: "int", Int: i}',
			'			}',
			'		}',
			'		return v',
			'	}',
			'	if affinity == "REAL" {',
			'		if v.Kind == "int" {',
			'			return Value{Kind: "real", Real: float64(v.Int)}',
			'		}',
			'		if v.Kind == "text" {',
			'			r, err := strconv.ParseFloat(v.Text, 64)',
			'			if err == nil {',
			'				return Value{Kind: "real", Real: r}',
			'			}',
			'		}',
			'		return v',
			'	}',
			'	return v // BLOB / unknown: hands off',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why affinity instead of types</h3>' +
			'<p>SQLite inherited its typing posture from Tcl and from its own ' +
			'history as a replacement for flat files: values carry their type, ' +
			'containers merely express a preference. The five substring rules ' +
			'exist for a pragmatic reason — SQLite wanted to accept <em>any</em> ' +
			'schema written for MySQL or PostgreSQL without error, so ' +
			'<code>VARCHAR(255)</code>, <code>BIGINT UNSIGNED</code>, and ' +
			'<code>DOUBLE PRECISION</code> all had to map to <em>something</em> ' +
			'sensible. Substring matching over an open vocabulary is what makes ' +
			'that possible, and the misfires (<code>FLOATING POINT</code>, ' +
			'<code>STRING</code>) are the accepted cost. The rules are frozen: ' +
			'changing them would silently change how existing databases coerce ' +
			'inserts, which the compatibility promise forbids.</p>' +
			'<h3>Connecting to the storage layer</h3>' +
			'<p>Affinity is pure front-end: by the time a value reaches the ' +
			'record format from the earlier lesson, coercion has already ' +
			'happened, and the serial type simply records what survived. The ' +
			'zip-code bug is visible end to end now — <code>\'07030\'</code> → ' +
			'NUMERIC coercion → integer 7030 → serial type 2, two ' +
			'twos-complement bytes on disk. The leading zero was gone before ' +
			'storage. <code>SELECT typeof(zip) FROM addr</code> is the ' +
			'diagnostic: a column that reports a mix of <code>integer</code> and ' +
			'<code>text</code> across rows is affinity leaving its fingerprints.</p>' +
			'<h3>The modern escape hatch: STRICT tables</h3>' +
			'<p>Twenty years of these surprises produced <code>CREATE TABLE ... ' +
			'STRICT</code> (SQLite 3.37, 2021): columns must use one of six real ' +
			'type names (<code>INT</code>, <code>INTEGER</code>, ' +
			'<code>REAL</code>, <code>TEXT</code>, <code>BLOB</code>, ' +
			'<code>ANY</code>), and a value that cannot coerce losslessly is a ' +
			'constraint error instead of a silent keep-as-is. Declaring ' +
			'<code>zip TEXT</code> in a STRICT table ends the leading-zero bug ' +
			'class outright. The affinity rules still govern every non-STRICT ' +
			'table — which is to say, almost every SQLite database in ' +
			'existence — so the five rules remain load-bearing knowledge for ' +
			'anyone debugging one.</p>',
		],
		complexity: { time: 'O(len(decl)) for the substring rules; O(len(text)) per coercion', space: 'O(1)' },
	});
})();
