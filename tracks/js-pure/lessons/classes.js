/* Classes — class syntax as prototype sugar, plus the parts that are NOT
 * sugar: getter/setter accessors, static members, and #private fields with
 * real language-enforced privacy. The exercise hardens a bank account whose
 * "privacy" is a naming convention: the check pins a blocked tamper write
 * (getter-only accessor throws in strict mode), a refused overdraft, a
 * static instance counter, and — the privacy proof — a JSON.stringify
 * snapshot that no longer contains the balance while a getter still
 * reports it.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	J.lesson({
		id: 'classes',
		title: 'Classes',
		nav: 'classes',
		category: 'Prototypes & Classes',

		prose: [
			'<h2>Classes</h2>' +
			'<p><code>class</code> is (mostly) a friendlier spelling of the ' +
			'prototype pattern from last lesson: methods you write in the body ' +
			'land on <code>ClassName.prototype</code> — <em>one copy</em>, shared ' +
			'by every instance through the same <code>[[Prototype]]</code> walk — ' +
			'and <code>constructor</code> is the function that fills in each ' +
			'instance&#39;s own data. You can verify the sugar yourself:</p>',
			{ lang: 'js', code: "class Point {\n  x = 0;                 // field declaration: own data, per instance\n  constructor(x) { this.x = x; }\n  norm() { return Math.abs(this.x); }   // lands on Point.prototype\n}\n\nconst p = new Point(-3);\nObject.getPrototypeOf(p) === Point.prototype;  // true — same old chain\nObject.hasOwn(p, 'x');      // true  — data is own\nObject.hasOwn(p, 'norm');   // false — behavior is inherited, one copy" },
			'<p>Three features go beyond sugar. <strong>Getters/setters</strong> ' +
			'are computed properties that <em>look</em> like data: ' +
			'<code>acct.balance</code> with no parentheses runs a function, so ' +
			'callers cannot tell (and need not care) whether a value is stored or ' +
			'derived. A getter with no setter is a <em>read-only view</em> — in ' +
			'strict mode, assigning to it throws a <code>TypeError</code>. ' +
			'<strong><code>static</code></strong> members live on the class ' +
			'itself, not on instances — the natural home for factories, shared ' +
			'counters, and constants.</p>',
			{ lang: 'js', code: "class Temp {\n  static fromF(f) { return new Temp((f - 32) * 5 / 9); }  // factory\n  static count = 0;                    // one slot on the class itself\n  #c;                                  // private field — declared, then real\n  constructor(c) { this.#c = c; Temp.count += 1; }\n  get celsius() { return this.#c; }    // read-only computed property\n}\n\nTemp.fromF(212).celsius;   // 100 — no parentheses on the getter\nTemp.count;                // 1" },
			'<p>And <strong><code>#private</code> fields</strong> are real, ' +
			'language-enforced privacy. The old convention — name it ' +
			'<code>_balance</code> and hope — is a plea, not a rule: any code can ' +
			'still read or overwrite it. A <code>#</code> name is different in ' +
			'kind: outside the class body, <code>acct.#balance</code> is a ' +
			'<em>syntax error</em>, the field never shows up in ' +
			'<code>Object.keys</code>, and it is invisible even to ' +
			'<code>JSON.stringify</code>. Privacy you can prove, not just ' +
			'request — which is what lets a class actually defend an invariant ' +
			'like &quot;the balance never goes negative&quot;.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter&#39;s account keeps <code>balance</code> public, and ' +
			'outside code promptly overwrites it to a billion. Make the invariant ' +
			'real: a <code>#balance</code> private field; <code>deposit</code> / ' +
			'<code>withdraw</code> methods that refuse nonpositive amounts and ' +
			'overdrafts (<code>withdraw</code> returns <code>true</code>/' +
			'<code>false</code>); a <code>get balance()</code> read-only view so ' +
			'<code>describeAccount</code> keeps working unchanged; and a ' +
			'<code>static opened</code> counter bumped in the constructor. Then ' +
			'follow the TODOs at the call site: the tamper write must be caught ' +
			'(it throws now!) and the billion-dollar withdrawal refused.</p>' +
			'<div class="tip">After your refactor, look at the ' +
			'<code>snapshot:</code> line — the balance has vanished from ' +
			'<code>JSON.stringify</code> output while <code>describeAccount</code> ' +
			'still reports it through the getter. That pair of lines <em>is</em> ' +
			'the privacy proof.</div>',
		],

		task: 'Give BankAccount a #balance field, guarded deposit/withdraw, a get balance() view, and a static opened counter.',

		starter: [
			'// Convention-only "privacy": balance is public data. Renaming it',
			'// _balance would just be a plea — outside code can still write it.',
			'class BankAccount {',
			'  constructor(owner, opening) {',
			'    this.owner = owner;',
			'    this.balance = opening;  // TODO: store in a #balance private field',
			'    // TODO: bump the static counter here: BankAccount.opened += 1;',
			'  }',
			'  // TODO: static opened = 0;',
			'  // TODO: deposit(amount)  — ignore amount <= 0, else add it',
			'  // TODO: withdraw(amount) — false on amount <= 0 or overdraft,',
			'  //                          else subtract and return true',
			'  // TODO: get balance() { return this.#balance; }  // read-only view',
			'}',
			'',
			'// Plain function, not a method: the getter makes balance look like',
			'// data, so this line survives the refactor byte-for-byte.',
			'function describeAccount(acct) {',
			"  return acct.owner + ' balance: ' + acct.balance;",
			'}',
			'',
			"const ada = new BankAccount('Ada', 100);",
			"const bob = new BankAccount('Bob', 50);",
			'',
			'ada.balance += 50;  // TODO: ada.deposit(50);',
			'ada.balance -= 20;  // TODO: ada.withdraw(20);',
			'',
			'// Nothing stops this line today — the invariant is fiction.',
			'// TODO: once balance is a getter-only view this write THROWS in',
			'// strict mode. Wrap it in try/catch and in the catch log:',
			"//   console.log('tamper blocked:', e instanceof TypeError);",
			'ada.balance = 1e9;',
			"// TODO: also prove the guard: console.log('refused overdraft:', ada.withdraw(1e9));",
			'',
			'console.log(describeAccount(ada));  // absurd — and nothing stopped it',
			'console.log(describeAccount(bob));',
			"console.log('opened:', BankAccount.opened);",
			"console.log('snapshot:', JSON.stringify(ada));",
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('tamper blocked: true') !== -1 &&
				flat.indexOf('refused overdraft: false') !== -1 &&
				flat.indexOf('Ada balance: 130') !== -1 &&
				flat.indexOf('Bob balance: 50') !== -1 &&
				flat.indexOf('opened: 2') !== -1 &&
				flat.indexOf('snapshot: {"owner":"Ada"}') !== -1;
		},

		solution: [
			'class BankAccount {',
			'  // Language-enforced privacy: unreadable and unwritable outside the',
			'  // class body, absent from Object.keys AND from JSON.stringify.',
			'  #balance;',
			'  // Lives on the class itself, not instances: one shared counter.',
			'  static opened = 0;',
			'',
			'  constructor(owner, opening) {',
			'    this.owner = owner;',
			'    this.#balance = opening;',
			'    BankAccount.opened += 1;',
			'  }',
			'  // Every mutation funnels through methods that defend the invariant.',
			'  deposit(amount) {',
			'    if (amount > 0) this.#balance += amount;',
			'  }',
			'  withdraw(amount) {',
			'    if (amount <= 0 || amount > this.#balance) return false;',
			'    this.#balance -= amount;',
			'    return true;',
			'  }',
			'  // Read-only view: reads look like plain data; writes throw (strict',
			'  // mode) because there is deliberately no setter.',
			'  get balance() { return this.#balance; }',
			'}',
			'',
			'// Plain function, not a method: the getter makes balance look like',
			'// data, so this line survives the refactor byte-for-byte.',
			'function describeAccount(acct) {',
			"  return acct.owner + ' balance: ' + acct.balance;",
			'}',
			'',
			"const ada = new BankAccount('Ada', 100);",
			"const bob = new BankAccount('Bob', 50);",
			'',
			'ada.deposit(50);',
			'ada.withdraw(20);',
			'',
			'// The tamper attempt now fails LOUDLY instead of corrupting state:',
			'// assigning through a getter-only accessor is a strict-mode TypeError.',
			'try {',
			'  ada.balance = 1e9;',
			'} catch (e) {',
			"  console.log('tamper blocked:', e instanceof TypeError);",
			'}',
			"console.log('refused overdraft:', ada.withdraw(1e9));",
			'',
			'console.log(describeAccount(ada));  // 100 + 50 - 20 = 130, intact',
			'console.log(describeAccount(bob));',
			"console.log('opened:', BankAccount.opened);",
			"console.log('snapshot:', JSON.stringify(ada));  // no balance in sight",
			'',
		].join('\n'),
	});
})();
