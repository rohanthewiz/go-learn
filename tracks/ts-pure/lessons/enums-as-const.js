/* Enums & Const Assertions — numeric vs string enums, then the modern
 * alternative: a plain object frozen with `as const` + a keyof typeof
 * union. The exercise converts a numeric enum to a string enum because the
 * difference is directly observable in the output — 2 vs "WARN".
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	T.lesson({
		id: 'enums-as-const',
		title: 'Enums & Const Assertions',
		nav: 'enums & as const',
		category: 'Objects & Classes',

		prose: [
			'<h2>Enums &amp; Const Assertions</h2>' +
			'<p>An <code>enum</code> names a closed set of values. By default the ' +
			'members auto-number from 0 — which is compact, but leaks bare integers ' +
			'into logs, JSON, and databases:</p>',
			{ lang: 'ts', code: 'enum Level { Debug, Info, Warn, Error }\nconsole.log(Level.Warn);   // 2 — meaningful to nobody at 3am' },
			'<p>Give the members explicit string values and the runtime ' +
			'representation becomes self-describing. String enums are the only ' +
			'variant most style guides allow for exactly this reason:</p>',
			{ lang: 'ts', code: 'enum Level { Debug = "DEBUG", Info = "INFO", Warn = "WARN", Error = "ERROR" }\nconsole.log(Level.Warn);   // "WARN"' },
			'<p>Worth knowing: <code>enum</code> is one of the very few TypeScript ' +
			'features that <em>generates</em> JavaScript (a lookup object) rather ' +
			'than erasing. Modern codebases often skip it entirely in favor of a ' +
			'plain object plus two operators you already half-know:</p>',
			{ lang: 'ts', code: 'const LEVELS = { debug: 10, info: 20, warn: 30 } as const;\n// as const: values become literal types (10, not number) and readonly\n\ntype LevelName = keyof typeof LEVELS;   // "debug" | "info" | "warn"' },
			'<p><code>typeof LEVELS</code> is the type of the value, ' +
			'<code>keyof</code> takes its keys, and <code>as const</code> is what ' +
			'keeps everything literal instead of widening to ' +
			'<code>string</code>/<code>number</code>. This trio — object, ' +
			'<code>as const</code>, <code>keyof typeof</code> — is the standard ' +
			'zero-runtime substitute for enums, and <code>keyof</code> gets a whole ' +
			'lesson in the Generics section.</p>' +
			'<h3>Your job</h3>' +
			'<p>The log lines below print <code>2: disk almost full</code>. Convert ' +
			'<code>Level</code> to a string enum (<code>"DEBUG"</code>, ' +
			'<code>"INFO"</code>, <code>"WARN"</code>, <code>"ERROR"</code>) so ' +
			'they read like log lines should.</p>',
		],

		task: 'Give Level explicit string values so the output reads "WARN: disk almost full".',

		starter: [
			'// Auto-numbered: Debug is 0, Info is 1, Warn is 2, Error is 3.',
			'// TODO: assign each member its uppercase string name.',
			'enum Level {',
			'  Debug,',
			'  Info,',
			'  Warn,',
			'  Error,',
			'}',
			'',
			'function log(level: Level, msg: string): void {',
			'  console.log(level + ": " + msg);',
			'}',
			'',
			'log(Level.Warn, "disk almost full");',
			'log(Level.Info, "backup finished");',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('WARN: disk almost full') !== -1 &&
				flat.indexOf('INFO: backup finished') !== -1;
		},

		solution: [
			'// String enum: what you see in code is what lands in the log.',
			'// (Unlike numeric enums, string enums also refuse to accept',
			'// arbitrary numbers where a Level is expected — a safety bonus.)',
			'enum Level {',
			'  Debug = "DEBUG",',
			'  Info = "INFO",',
			'  Warn = "WARN",',
			'  Error = "ERROR",',
			'}',
			'',
			'function log(level: Level, msg: string): void {',
			'  console.log(level + ": " + msg);',
			'}',
			'',
			'log(Level.Warn, "disk almost full");',
			'log(Level.Info, "backup finished");',
			'',
		].join('\n'),
	});
})();
