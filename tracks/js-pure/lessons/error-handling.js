/* Error Handling — throw unwinds the stack until a catch or the program
 * dies (the starter deliberately dies: starterError makes the red pane the
 * lesson's opening beat), try/catch/finally with finally as the every-exit
 * cleanup slot, Error objects (name/message/stack, why not strings), custom
 * errors via class + instanceof, ES2022 cause chaining, and rethrowing what
 * you can't handle. The exercise catches a ValidationError per record,
 * prints its cause chain, rethrows strangers, and proves finally runs
 * exactly once; the check pins the accepted, rejected, cause, and finally
 * lines in order.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	J.lesson({
		id: 'error-handling',
		title: 'Error Handling',
		nav: 'error handling',
		category: 'Advanced',
		starterError: true,

		prose: [
			'<h2>throw unwinds the stack</h2>' +
			'<p>Run the starter first and look at the red pane — that <em>is</em> ' +
			'the lesson. <code>throw</code> abandons the current line and unwinds ' +
			'the call stack, function by function, until it finds a ' +
			'<code>catch</code>. If none exists, the program dies where you see ' +
			'it: <code>ada</code>\'s line already printed, <code>bob</code>\'s ' +
			'never will, and everything after the loop is unreachable. An ' +
			'uncaught error is not a message — it is a stop.</p>' +
			'<p>The tool for meeting an error on your own terms is ' +
			'<code>try/catch/finally</code>:</p>',
			{ lang: 'js', code: 'try {\n  risky();                 // may throw\n  console.log("worked");   // skipped entirely if it did\n} catch (err) {\n  console.log("recovered:", err.message);\n} finally {\n  connection.close();      // runs on EVERY exit path\n}' },
			'<p><code>finally</code> is the part people underuse: it runs on ' +
			'<em>every</em> exit path — normal completion, a <code>return</code> ' +
			'inside <code>try</code>, a caught error, even an error the ' +
			'<code>catch</code> rethrows. That guarantee makes it the cleanup ' +
			'slot: close the file, release the lock, write the audit line. If ' +
			'the code must run no matter how the block ends, it belongs in ' +
			'<code>finally</code>.</p>' +
			'<p>What should you throw? Always an <code>Error</code> instance, ' +
			'never a bare string. An <code>Error</code> carries a ' +
			'<code>name</code> (its class), a <code>message</code>, and a ' +
			'<code>stack</code> trace captured at the throw site — the single ' +
			'most useful debugging artifact you will ever get for free. A thrown ' +
			'string has none of that, and it cannot be told apart with ' +
			'<code>instanceof</code>.</p>',
			'<h2>Custom errors and the cause chain</h2>' +
			'<p><code>instanceof</code> is exactly why custom error classes ' +
			'exist: subclass <code>Error</code>, set <code>this.name</code> for ' +
			'display, and a <code>catch</code> can handle <em>your</em> failures ' +
			'while letting genuine bugs keep flying:</p>',
			{ lang: 'js', code: 'class ValidationError extends Error {\n  constructor(message, options) {\n    super(message, options);       // options may carry { cause }\n    this.name = "ValidationError";\n  }\n}\n\ntry {\n  save(user);\n} catch (err) {\n  if (err instanceof ValidationError) {\n    console.log("bad input:", err.message);\n  } else {\n    throw err;   // not ours — rethrow, do not smother\n  }\n}' },
			'<p>Since ES2022, wrapping an error no longer destroys the original: ' +
			'<code>new Error("save failed", { cause: err })</code> throws a ' +
			'high-level, domain-worded error while chaining the low-level one on ' +
			'<code>.cause</code> — the caller reads "age must be a number" and ' +
			'can still drill into the <code>TypeError</code> underneath. And the ' +
			'honest default when you catch something you do not recognize is to ' +
			'<strong>rethrow it</strong>: a swallowed unknown error turns a loud ' +
			'crash into a silent lie.</p>',
			'<h3>Your job</h3>' +
			'<p>The starter validates two records; <code>bob</code>\'s ' +
			'<code>ValidationError</code> escapes uncaught and kills the report ' +
			'mid-run. Wrap the per-record work in <code>try/catch</code>: for a ' +
			'<code>ValidationError</code> print ' +
			'<code>rejected: bob — age must be a number</code> and a ' +
			'<code>caused by: TypeError</code> line from <code>err.cause</code>; ' +
			'rethrow anything else. Then wrap the whole loop in ' +
			'<code>try/finally</code> so <code>audit log closed</code> prints ' +
			'exactly once, however the report ends.</p>' +
			'<div class="tip">Two nested levels, two different jobs: the inner ' +
			'<code>try/catch</code> recovers per record; the outer ' +
			'<code>try/finally</code> guarantees cleanup. <code>err.message</code> ' +
			'already reads <code>bob — age must be a number</code>, and ' +
			'<code>err.cause.name</code> is the wrapped error\'s class name.</div>',
		],

		task: 'Catch each record\'s ValidationError (printing message and cause), rethrow strangers, and close the audit log in finally.',

		starter: [
			'// A domain error: instanceof-checkable, and it can carry a cause.',
			'class ValidationError extends Error {',
			'  constructor(message, options) {',
			'    super(message, options);      // options may carry { cause: lowLevelErr }',
			"    this.name = 'ValidationError';",
			'  }',
			'}',
			'',
			'function assertNumber(value) {',
			"  if (typeof value !== 'number') {",
			"    throw new TypeError('expected number, got ' + typeof value);",
			'  }',
			'}',
			'',
			'function validateUser(user) {',
			'  try {',
			'    assertNumber(user.age);',
			'  } catch (err) {',
			'    // Rewrap in domain language — the cause keeps the original.',
			"    throw new ValidationError(user.name + ' — age must be a number', { cause: err });",
			'  }',
			'  return user;',
			'}',
			'',
			'const records = [',
			"  { name: 'ada', age: 36 },",
			"  { name: 'bob', age: 'unknown' },",
			'];',
			'',
			"// bob's ValidationError escapes uncaught — the report dies mid-run.",
			'// TODO 1: wrap the body of this loop in try/catch.',
			'// TODO 2: if err instanceof ValidationError, print',
			"//   rejected: <err.message>     and     caused by: <err.cause.name>",
			'//   — otherwise rethrow it: pretending to handle a stranger is worse.',
			'// TODO 3: wrap the whole loop in try { ... } finally { ... } that prints',
			"//   audit log closed   exactly once, no matter how the report ends.",
			'for (const user of records) {',
			'  const ok = validateUser(user);',
			"  console.log('accepted: ' + ok.name + ' (age ' + ok.age + ')');",
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var accepted = flat.indexOf('accepted: ada (age 36)');
			var rejected = flat.indexOf('rejected: bob — age must be a number');
			var cause = flat.indexOf('caused by: TypeError');
			var closed = flat.indexOf('audit log closed');
			return accepted !== -1 && rejected !== -1 && cause !== -1 &&
				closed !== -1 &&
				accepted < rejected && rejected < closed &&
				// finally must fire exactly once — a second copy means the
				// cleanup line was hand-printed somewhere it doesn't belong.
				closed === flat.lastIndexOf('audit log closed');
		},

		solution: [
			'// A domain error: instanceof-checkable, and it can carry a cause.',
			'class ValidationError extends Error {',
			'  constructor(message, options) {',
			'    super(message, options);      // options may carry { cause: lowLevelErr }',
			"    this.name = 'ValidationError';",
			'  }',
			'}',
			'',
			'function assertNumber(value) {',
			"  if (typeof value !== 'number') {",
			"    throw new TypeError('expected number, got ' + typeof value);",
			'  }',
			'}',
			'',
			'function validateUser(user) {',
			'  try {',
			'    assertNumber(user.age);',
			'  } catch (err) {',
			'    // Rewrap in domain language — the cause keeps the original.',
			"    throw new ValidationError(user.name + ' — age must be a number', { cause: err });",
			'  }',
			'  return user;',
			'}',
			'',
			'const records = [',
			"  { name: 'ada', age: 36 },",
			"  { name: 'bob', age: 'unknown' },",
			'];',
			'',
			'// Outer try/finally: cleanup that must run however the report ends.',
			'try {',
			'  for (const user of records) {',
			'    // Inner try/catch: one bad record must not kill the whole report.',
			'    try {',
			'      const ok = validateUser(user);',
			"      console.log('accepted: ' + ok.name + ' (age ' + ok.age + ')');",
			'    } catch (err) {',
			'      if (err instanceof ValidationError) {',
			"        console.log('rejected: ' + err.message);",
			'        // The cause chain: domain message up top, root class below.',
			"        console.log('  caused by: ' + err.cause.name);",
			'      } else {',
			'        throw err;  // not ours — rethrow rather than smother a real bug',
			'      }',
			'    }',
			'  }',
			'} finally {',
			'  // Runs on success, on a caught error, even on a rethrow — the',
			'  // guarantee is the whole point of putting the line here.',
			"  console.log('audit log closed');",
			'}',
			'',
		].join('\n'),
	});
})();
