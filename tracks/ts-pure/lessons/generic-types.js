/* Generic Types — type parameters on interfaces and classes: containers.
 * The exercise generifies a number-only Stack; a string call site (plus
 * pop() returning T | undefined, a strictness detail worth meeting early)
 * makes the parameter necessary rather than decorative.
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	T.lesson({
		id: 'generic-types',
		title: 'Generic Types',
		nav: 'generic types',
		category: 'Generics',

		prose: [
			'<h2>Generic Types</h2>' +
			'<p>Type parameters attach to <code>interface</code>, <code>type</code>, ' +
			'and <code>class</code> declarations the same way they attach to ' +
			'functions — and you have been using such types all along:</p>',
			{ lang: 'ts', code: 'const xs: Array<number> = [1, 2, 3];    // number[] is sugar for this\nconst byId: Map<number, string> = new Map();\ninterface Box<T> { value: T }\nconst gift: Box<string> = { value: "surprise" };' },
			'<p>For a generic <em>class</em>, the parameter is fixed when the ' +
			'instance is created and then governs every field, method parameter, ' +
			'and return in that instance. One definition, a family of precisely ' +
			'typed containers:</p>',
			{ lang: 'ts', code: 'class Pair<A, B> {\n  constructor(readonly a: A, readonly b: B) {}\n  swap(): Pair<B, A> { return new Pair(this.b, this.a); }\n}' },
			'<p>One strictness detail arrives with containers: what should ' +
			'<code>pop()</code> return when the stack is empty? JavaScript says ' +
			'<code>undefined</code>, so the honest type is <code>T | undefined' +
			'</code> — and callers are forced to handle the empty case before using ' +
			'the value. The type signature documents the failure mode; narrowing ' +
			'(from the earlier section) is how callers deal with it.</p>' +
			'<h3>Your job</h3>' +
			'<p>This <code>Stack</code> is welded to <code>number</code>. ' +
			'Parameterize it over <code>T</code> so the word stack below compiles — ' +
			'then run the driver and watch both instantiations behave, each with ' +
			'its own element type.</p>' +
			'<div class="tip">Type parameters can have defaults — ' +
			'<code>class Stack&lt;T = string&gt;</code> — handy for library types ' +
			'where one instantiation dominates.</div>',
		],

		task: 'Generify Stack<T> so the string stack compiles alongside the number stack.',

		starter: [
			'// TODO: Stack<T> — the field, push, pop, and peek should all speak T.',
			'class Stack {',
			'  private items: number[] = [];',
			'',
			'  push(item: number): void {',
			'    this.items.push(item);',
			'  }',
			'',
			'  // T | undefined: popping an empty stack yields undefined, and the',
			'  // type makes callers face that (see the ?? below).',
			'  pop(): number | undefined {',
			'    return this.items.pop();',
			'  }',
			'',
			'  peek(): number | undefined {',
			'    return this.items[this.items.length - 1];',
			'  }',
			'}',
			'',
			'const nums = new Stack();',
			'nums.push(3);',
			'nums.push(9);',
			'console.log("popped:", nums.pop() ?? -1);',
			'',
			'// TODO: uncomment — a Stack of strings, same class, once generic.',
			'// const words = new Stack<string>();',
			'// words.push("hello");',
			'// words.push("world");',
			'// console.log("top:", words.peek() ?? "(empty)");',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('popped: 9') !== -1 &&
				flat.indexOf('top: world') !== -1;
		},

		solution: [
			'// <T> is fixed per instance: new Stack<string>() speaks string',
			'// everywhere, new Stack<number>() speaks number — same one class.',
			'class Stack<T> {',
			'  private items: T[] = [];',
			'',
			'  push(item: T): void {',
			'    this.items.push(item);',
			'  }',
			'',
			'  // T | undefined: popping an empty stack yields undefined, and the',
			'  // type makes callers face that (see the ?? below).',
			'  pop(): T | undefined {',
			'    return this.items.pop();',
			'  }',
			'',
			'  peek(): T | undefined {',
			'    return this.items[this.items.length - 1];',
			'  }',
			'}',
			'',
			'// Inference note: new Stack() with no argument would fix T as',
			'// unknown, so the explicit <number> earns its keep here.',
			'const nums = new Stack<number>();',
			'nums.push(3);',
			'nums.push(9);',
			'console.log("popped:", nums.pop() ?? -1);',
			'',
			'const words = new Stack<string>();',
			'words.push("hello");',
			'words.push("world");',
			'console.log("top:", words.peek() ?? "(empty)");',
			'',
		].join('\n'),
	});
})();
