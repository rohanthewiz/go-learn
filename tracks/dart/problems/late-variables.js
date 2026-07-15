/* Late Variables — Null Safety (lesson). The escape hatch for "it WILL be
 * assigned, just not here": `late` keeps the non-nullable type but moves the
 * definite-assignment check from compile time to runtime. The learner
 * implements that runtime check — one initialized-bit per variable — and
 * throws the real error name.
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	T.lesson({
		id: 'late-variables',
		title: 'Late Variables',
		nav: 'late variables',
		category: 'Null Safety',

		prose: [
			'<h2>Late Variables</h2>' +
			'<p>Non-nullable types come with a strict rule: a <code>String</code> ' +
			'local must be <em>definitely assigned</em> before every read, and the ' +
			'analyzer proves it at compile time. But some values genuinely can\'t be ' +
			'assigned at declaration — a config loaded in <code>setUp()</code>, a ' +
			'controller created in <code>initState()</code>. Making them ' +
			'<code>String?</code> would poison every use site with <code>!</code>. ' +
			'Dart\'s answer is <code>late</code>:</p>',
			{ lang: 'dart', code: "late String config;        // non-nullable, not yet assigned\n\nprint(config);             // runtime: LateInitializationError:\n                           //   Field 'config' has not been initialized.\nconfig = 'prod.yaml';\nprint(config);             // fine — and config is String, not String?" },
			'<p>Read the trade precisely: <code>late</code> <strong>keeps</strong> the ' +
			'non-nullable type (no <code>?.</code>, no <code>!</code> downstream) and ' +
			'<strong>gives up</strong> the compile-time proof — the definite-assignment ' +
			'check becomes a hidden boolean checked at every read, and getting it wrong ' +
			'is a crash. It is Go\'s "zero value until you assign" model, except Dart ' +
			'refuses to invent a zero value and throws instead.</p>' +
			'<h3>Your job</h3>' +
			'<p>The program replays the four lines above through the runtime check ' +
			'<code>late</code> actually compiles to: <code>initialized[name]</code> is ' +
			'the hidden bit. The <code>assign</code> case sets it; make the ' +
			'<code>read</code> case consult it — uninitialized reads must report the ' +
			'<code>LateInitializationError</code>, reads after assignment print the ' +
			'value.</p>' +
			'<div class="tip"><code>late final x = expensive();</code> with an ' +
			'initializer is the lazy-init idiom: the initializer runs on first ' +
			'<em>read</em>, not at declaration — memoization without a nullable cache ' +
			'field.</div>',
		],

		task: 'Complete the read case: consult initialized[name] and report LateInitializationError for reads before assignment.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// step is one line of the Dart program being replayed:',
			'//   {"declare", name, ""}    late String name;',
			'//   {"assign", name, value}  name = value;',
			'//   {"read", name, ""}       print(name);',
			'type step struct {',
			'	op    string',
			'	name  string',
			'	value string',
			'}',
			'',
			'func main() {',
			'	// The exact program from the lesson text.',
			'	steps := []step{',
			'		{"declare", "config", ""},',
			'		{"read", "config", ""},',
			'		{"assign", "config", "prod.yaml"},',
			'		{"read", "config", ""},',
			'	}',
			'',
			'	// The hidden runtime state `late` compiles to: one "has it been',
			'	// assigned yet?" bit per variable, plus the value itself.',
			'	initialized := map[string]bool{}',
			'	values := map[string]string{}',
			'',
			'	for _, st := range steps {',
			'		switch st.op {',
			'		case "declare":',
			'			fmt.Printf("late String %s;\\n", st.name)',
			'		case "assign":',
			'			values[st.name] = st.value',
			'			initialized[st.name] = true',
			'			fmt.Printf("%s = %s\\n", st.name, st.value)',
			'		case "read":',
			'			// TODO: a read before assignment must report',
			'			//   "read <name>: LateInitializationError: Field \'<name>\' has not been initialized"',
			'			// and a read after assignment prints the value.',
			'			fmt.Printf("read %s: %s\\n", st.name, values[st.name])',
			'		}',
			'	}',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf("read config: LateInitializationError: Field 'config' has not been initialized") !== -1 &&
				flat.indexOf('read config: prod.yaml') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// step is one line of the Dart program being replayed:',
			'//   {"declare", name, ""}    late String name;',
			'//   {"assign", name, value}  name = value;',
			'//   {"read", name, ""}       print(name);',
			'type step struct {',
			'	op    string',
			'	name  string',
			'	value string',
			'}',
			'',
			'func main() {',
			'	// The exact program from the lesson text.',
			'	steps := []step{',
			'		{"declare", "config", ""},',
			'		{"read", "config", ""},',
			'		{"assign", "config", "prod.yaml"},',
			'		{"read", "config", ""},',
			'	}',
			'',
			'	// The hidden runtime state `late` compiles to: one "has it been',
			'	// assigned yet?" bit per variable, plus the value itself.',
			'	initialized := map[string]bool{}',
			'	values := map[string]string{}',
			'',
			'	for _, st := range steps {',
			'		switch st.op {',
			'		case "declare":',
			'			fmt.Printf("late String %s;\\n", st.name)',
			'		case "assign":',
			'			values[st.name] = st.value',
			'			initialized[st.name] = true',
			'			fmt.Printf("%s = %s\\n", st.name, st.value)',
			'		case "read":',
			'			// This lookup is the whole cost of `late`: the check the',
			'			// analyzer used to do for free at compile time now runs',
			'			// (and can fail) on every read at runtime.',
			'			if initialized[st.name] {',
			'				fmt.Printf("read %s: %s\\n", st.name, values[st.name])',
			'			} else {',
			'				fmt.Printf("read %s: LateInitializationError: Field \'%s\' has not been initialized\\n", st.name, st.name)',
			'			}',
			'		}',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
