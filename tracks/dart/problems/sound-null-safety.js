/* Sound Null Safety — Null Safety (lesson). Dart's flagship guarantee: a
 * plain type can NEVER hold null, and only `T?` can. The lesson replays the
 * analyzer's assignment check through a two-entry table, because the whole
 * feature really is that small: one bit of "may this hold null?" per
 * declaration, consulted at every assignment.
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	// Two boxes: String is a closed box (null bounces off at compile time),
	// String? is the same box plus the null slot. Marker id namespaced
	// (dgArrowDNS) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 180" width="520" height="180" role="img" aria-label="String holds only strings; String? holds strings or null. Assigning null to String is a compile error.">' +
		'<text x="20" y="24" class="lbl">the type system, after null safety: nullability is part of the type</text>' +
		'<rect x="40" y="44" width="180" height="60" rx="8" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="130" y="70" text-anchor="middle">String</text>' +
		'<text x="130" y="90" text-anchor="middle" class="lbl">"hi", "go", "" …</text>' +
		'<rect x="300" y="44" width="180" height="60" rx="8" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="390" y="70" text-anchor="middle">String?</text>' +
		'<text x="390" y="90" text-anchor="middle" class="lbl">"hi", "go", "" … or null</text>' +
		'<path d="M 130 150 L 130 108" stroke="var(--err-edge)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<text x="130" y="166" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">null — compile error</text>' +
		'<path d="M 390 150 L 390 108" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowDNS)"/>' +
		'<text x="390" y="166" text-anchor="middle" class="lbl" style="fill:var(--ok)">null — fine</text>' +
		'<defs><marker id="dgArrowDNS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	T.lesson({
		id: 'sound-null-safety',
		title: 'Sound Null Safety',
		nav: 'sound null safety',
		category: 'Null Safety',

		prose: [
			'<h2>Sound Null Safety</h2>' +
			'<p>In Go, <code>nil</code> is a runtime fact you discover the hard way: a ' +
			'<code>*string</code>, a map, an interface — any of them can be nil, the type ' +
			'system says nothing, and the price is a panic in production. Dart used to ' +
			'work the same way. Since Dart 2.12 it does not: <strong>nullability is part ' +
			'of the type</strong>, and the analyzer enforces it at compile time.</p>',
			{ lang: 'dart', code: "String name = 'go';\nname = null;        // error: A value of type 'Null' can't be assigned\n                    //        to a variable of type 'String'.\n\nString? nick;       // the ? admits null — and starts as null\nnick = null;        // fine" },
			DIAGRAM +
			'<p>The guarantee is called <em>sound</em> because it has no holes: if an ' +
			'expression has type <code>String</code>, it is a string, period — the ' +
			'compiler can (and does) remove every null check on it. Go\'s ' +
			'<code>*string</code> is closest to <code>String?</code>; Go simply has no ' +
			'way to say <code>String</code>-never-nil about a pointer, and that missing ' +
			'half is the feature.</p>' +
			'<h3>Your job</h3>' +
			'<p>The program on the right replays the four Dart lines above through a ' +
			'tiny nullability checker: <code>nullable[name]</code> records the one bit ' +
			'the analyzer keeps per declaration. The <code>declare</code> case is done; ' +
			'the <code>assignNull</code> case currently waves everything through — make ' +
			'it consult the table so the output matches what the analyzer reports: ' +
			'assigning null to <code>name</code> is an error, to <code>nick</code> is ' +
			'ok.</p>' +
			'<div class="tip">Reading an <em>unassigned</em> <code>String?</code> is fine ' +
			'(it is null); reading an unassigned <code>String</code> is itself a compile ' +
			'error — non-nullable locals must be definitely assigned before use. That ' +
			'flow analysis is the next lesson.</div>',
		],

		task: 'Complete the assignNull case: consult nullable[name] so "name = null" errors and "nick = null" is ok.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// step is one line of the Dart program being replayed:',
			'//   {"declare", name, typ}   String name;  /  String? name;',
			'//   {"assignNull", name, ""} name = null;',
			'type step struct {',
			'	op   string',
			'	name string',
			'	typ  string',
			'}',
			'',
			'func main() {',
			'	// The exact program from the lesson text.',
			'	steps := []step{',
			'		{"declare", "name", "String"},',
			'		{"declare", "nick", "String?"},',
			'		{"assignNull", "name", ""},',
			'		{"assignNull", "nick", ""},',
			'	}',
			'',
			'	// nullable[name] is the ONE bit the analyzer keeps per declaration:',
			'	// may this variable hold null? A trailing ? in the type sets it.',
			'	nullable := map[string]bool{}',
			'',
			'	for _, st := range steps {',
			'		switch st.op {',
			'		case "declare":',
			'			nullable[st.name] = len(st.typ) > 0 && st.typ[len(st.typ)-1] == \'?\'',
			'			fmt.Printf("declare %s %s\\n", st.name, st.typ)',
			'		case "assignNull":',
			'			// TODO: only a nullable declaration admits null. Print',
			'			//   "<name> = null: error - String isn\'t nullable"',
			'			// when the table says non-nullable, and the ok line otherwise.',
			'			fmt.Printf("%s = null: ok\\n", st.name)',
			'		}',
			'	}',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf("name = null: error - String isn't nullable") !== -1 &&
				flat.indexOf('nick = null: ok') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// step is one line of the Dart program being replayed:',
			'//   {"declare", name, typ}   String name;  /  String? name;',
			'//   {"assignNull", name, ""} name = null;',
			'type step struct {',
			'	op   string',
			'	name string',
			'	typ  string',
			'}',
			'',
			'func main() {',
			'	// The exact program from the lesson text.',
			'	steps := []step{',
			'		{"declare", "name", "String"},',
			'		{"declare", "nick", "String?"},',
			'		{"assignNull", "name", ""},',
			'		{"assignNull", "nick", ""},',
			'	}',
			'',
			'	// nullable[name] is the ONE bit the analyzer keeps per declaration:',
			'	// may this variable hold null? A trailing ? in the type sets it.',
			'	nullable := map[string]bool{}',
			'',
			'	for _, st := range steps {',
			'		switch st.op {',
			'		case "declare":',
			'			nullable[st.name] = len(st.typ) > 0 && st.typ[len(st.typ)-1] == \'?\'',
			'			fmt.Printf("declare %s %s\\n", st.name, st.typ)',
			'		case "assignNull":',
			'			// The entire feature is this one lookup: the declared type',
			'			// carries the nullability bit, and every assignment of null',
			'			// is judged against it — at compile time, so the error is',
			'			// free and the success needs no runtime check.',
			'			if nullable[st.name] {',
			'				fmt.Printf("%s = null: ok\\n", st.name)',
			'			} else {',
			'				fmt.Printf("%s = null: error - String isn\'t nullable\\n", st.name)',
			'			}',
			'		}',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
