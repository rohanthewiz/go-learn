/* Named & Optional Parameters — Values & Functions (lesson). Go call sites
 * are positional, period; Dart lets a signature declare named parameters
 * with defaults and `required`. The learner implements the call binder —
 * the three checks the analyzer runs at every call site.
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	T.lesson({
		id: 'named-params',
		title: 'Named & Optional Parameters',
		nav: 'named params',
		category: 'Values & Functions',

		prose: [
			'<h2>Named &amp; Optional Parameters</h2>' +
			'<p>Go has exactly one way to call a function: every argument, in order. ' +
			'When a Go function grows a fifth boolean you reach for an options struct. ' +
			'Dart builds that pattern into the language — a signature can declare ' +
			'<em>named</em> parameters in braces, each with a default or marked ' +
			'<code>required</code>:</p>',
			{ lang: 'dart', code: "void invite(String name, {String greeting = 'Hello', required String title}) {\n  print('$greeting, $title $name');\n}\n\ninvite('Ada', title: 'Dr');                 // ok — greeting defaults\ninvite('Ada');                              // error: The named parameter\n                                            //   'title' is required.\ninvite('Ada', title: 'Dr', mood: 'happy');  // error: The named parameter\n                                            //   'mood' isn't defined." },
			'<p>Named arguments read like the options struct without the struct, and ' +
			'<code>required</code> keeps the safety Go\'s positional style gives for ' +
			'free: you cannot silently forget one. All three checks happen at compile ' +
			'time.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>bindCall</code> — the analyzer\'s call-site check for ' +
			'<code>invite</code>\'s signature. Walk the supplied named arguments and ' +
			'apply the three rules, in this order:</p>' +
			'<ul>' +
			'<li>an argument whose name is not in the signature → ' +
			'<code>error: The named parameter \'X\' isn\'t defined.</code></li>' +
			'<li>a <code>required</code> parameter not supplied → ' +
			'<code>error: The named parameter \'X\' is required.</code></li>' +
			'<li>otherwise bind: defaults first, supplied values over them.</li>' +
			'</ul>',
		],

		task: 'Implement bindCall: reject unknown named args, reject missing required ones, fill defaults otherwise.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// param is one named parameter of the signature, in declaration order.',
			'type param struct {',
			'	name     string',
			'	dflt     string',
			'	required bool',
			'}',
			'',
			'// invite\'s named parameters: {String greeting = \'Hello\', required String title}',
			'var namedParams = []param{',
			'	{"greeting", "Hello", false},',
			'	{"title", "", true},',
			'}',
			'',
			'// arg is one `name: value` argument at the call site, in call order.',
			'type arg struct{ name, value string }',
			'',
			'// bindCall validates one call of invite(pos, {named...}) and returns',
			'// either the bound call or the analyzer\'s error line.',
			'func bindCall(pos string, args []arg) string {',
			'	// Defaults first; supplied arguments overwrite them below.',
			'	bound := map[string]string{}',
			'	for _, p := range namedParams {',
			'		bound[p.name] = p.dflt',
			'	}',
			'	for _, a := range args {',
			'		// TODO: an argument not declared in namedParams is a compile',
			'		// error: return "error: The named parameter \'<name>\' isn\'t defined."',
			'		bound[a.name] = a.value',
			'	}',
			'	// TODO: a required parameter that was never supplied is a compile',
			'	// error: return "error: The named parameter \'<name>\' is required."',
			'',
			'	out := "ok: invite(" + pos',
			'	for _, p := range namedParams {',
			'		out += ", " + p.name + ": " + bound[p.name]',
			'	}',
			'	return out + ")"',
			'}',
			'',
			'func main() {',
			'	fmt.Println(bindCall("Ada", []arg{{"title", "Dr"}}))',
			'	fmt.Println(bindCall("Ada", nil))',
			'	fmt.Println(bindCall("Ada", []arg{{"title", "Dr"}, {"mood", "happy"}}))',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('ok: invite(Ada, greeting: Hello, title: Dr)') !== -1 &&
				flat.indexOf("The named parameter 'title' is required.") !== -1 &&
				flat.indexOf("The named parameter 'mood' isn't defined.") !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// param is one named parameter of the signature, in declaration order.',
			'type param struct {',
			'	name     string',
			'	dflt     string',
			'	required bool',
			'}',
			'',
			'// invite\'s named parameters: {String greeting = \'Hello\', required String title}',
			'var namedParams = []param{',
			'	{"greeting", "Hello", false},',
			'	{"title", "", true},',
			'}',
			'',
			'// arg is one `name: value` argument at the call site, in call order.',
			'type arg struct{ name, value string }',
			'',
			'// bindCall validates one call of invite(pos, {named...}) and returns',
			'// either the bound call or the analyzer\'s error line.',
			'func bindCall(pos string, args []arg) string {',
			'	// Defaults first; supplied arguments overwrite them below.',
			'	bound := map[string]string{}',
			'	for _, p := range namedParams {',
			'		bound[p.name] = p.dflt',
			'	}',
			'	// provided tracks which names the CALLER spelled out — bound can\'t',
			'	// answer that, because defaults live there too.',
			'	provided := map[string]bool{}',
			'	for _, a := range args {',
			'		known := false',
			'		for _, p := range namedParams {',
			'			if p.name == a.name {',
			'				known = true',
			'			}',
			'		}',
			'		if !known {',
			'			return "error: The named parameter \'" + a.name + "\' isn\'t defined."',
			'		}',
			'		bound[a.name] = a.value',
			'		provided[a.name] = true',
			'	}',
			'	// required means "the caller must spell it out" — a default would',
			'	// make required meaningless, which is why Dart forbids combining them.',
			'	for _, p := range namedParams {',
			'		if p.required && !provided[p.name] {',
			'			return "error: The named parameter \'" + p.name + "\' is required."',
			'		}',
			'	}',
			'',
			'	out := "ok: invite(" + pos',
			'	for _, p := range namedParams {',
			'		out += ", " + p.name + ": " + bound[p.name]',
			'	}',
			'	return out + ")"',
			'}',
			'',
			'func main() {',
			'	fmt.Println(bindCall("Ada", []arg{{"title", "Dr"}}))',
			'	fmt.Println(bindCall("Ada", nil))',
			'	fmt.Println(bindCall("Ada", []arg{{"title", "Dr"}, {"mood", "happy"}}))',
			'}',
			'',
		].join('\n'),
	});
})();
