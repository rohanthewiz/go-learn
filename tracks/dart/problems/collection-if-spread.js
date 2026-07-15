/* Collection if & Spread — Collections & Patterns (lesson). Dart list
 * literals admit control flow: `if` includes an element conditionally,
 * `...` splices a whole collection in place. The learner implements the
 * desugaring — which is exactly the append-dance Go makes you write by hand.
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	T.lesson({
		id: 'collection-if-spread',
		title: 'Collection if & Spread',
		nav: 'collection if / ...',
		category: 'Collections & Patterns',

		prose: [
			'<h2>Collection <code>if</code> &amp; Spread <code>...</code></h2>' +
			'<p>Building a slice that depends on conditions is one of Go\'s little ' +
			'paper cuts: declare, <code>append</code>, <code>if</code>, ' +
			'<code>append</code> again — the shape of the data disappears into ' +
			'statements. Dart keeps the whole thing a literal, because its collection ' +
			'literals allow <code>if</code>, <code>for</code>, and spread ' +
			'<code>...</code> <em>inside</em>:</p>',
			{ lang: 'dart', code: "final nav = [\n  'home',\n  if (loggedIn) 'profile',\n  ...(admin ? ['users', 'audit'] : []),\n  'about',\n];\n// guest  → [home, about]\n// member → [home, profile, about]\n// admin  → [home, profile, users, audit, about]" },
			'<p>The literal reads top-to-bottom as the final list will, whatever the ' +
			'flags say — the conditions live where their elements live. ' +
			'<code>...</code> splices element-by-element (and <code>...?</code> ' +
			'skips a null collection instead of crashing). Flutter build methods lean ' +
			'on this constantly: a children list with optional widgets in the middle ' +
			'is one literal, not a builder function.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>buildNav</code> — the desugaring of the literal above. ' +
			'Same elements, same order: <code>home</code>, then <code>profile</code> ' +
			'when logged in, then the spread of the admin items when admin, then ' +
			'<code>about</code>. The three prints must match the three comments in the ' +
			'Dart code.</p>',
		],

		task: 'Implement buildNav: home, profile when logged in, the admin pair when admin, about — in literal order.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// buildNav desugars the collection-if/spread literal from the lesson.',
			'func buildNav(loggedIn, admin bool) []string {',
			'	// TODO: start from "home"; append "profile" under loggedIn;',
			'	// spread []string{"users", "audit"} under admin; end with "about".',
			'	return []string{"home", "about"}',
			'}',
			'',
			'func main() {',
			'	fmt.Println("guest:", buildNav(false, false))',
			'	fmt.Println("member:", buildNav(true, false))',
			'	fmt.Println("admin:", buildNav(true, true))',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('guest: [home about]') !== -1 &&
				flat.indexOf('member: [home profile about]') !== -1 &&
				flat.indexOf('admin: [home profile users audit about]') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// buildNav desugars the collection-if/spread literal from the lesson.',
			'// Each clause of the literal becomes one append — the compiler emits',
			'// exactly this shape, in literal order, which is why the elements land',
			'// where they visually sit in the Dart source.',
			'func buildNav(loggedIn, admin bool) []string {',
			'	nav := []string{"home"}',
			'	if loggedIn { // if (loggedIn) \'profile\',',
			'		nav = append(nav, "profile")',
			'	}',
			'	if admin { // ...(admin ? [\'users\', \'audit\'] : []),',
			'		// Spread splices ELEMENTS, not the list as one item — Go\'s',
			'		// append(s, items...) is literally the same operator.',
			'		nav = append(nav, []string{"users", "audit"}...)',
			'	}',
			'	return append(nav, "about")',
			'}',
			'',
			'func main() {',
			'	fmt.Println("guest:", buildNav(false, false))',
			'	fmt.Println("member:", buildNav(true, false))',
			'	fmt.Println("admin:", buildNav(true, true))',
			'}',
			'',
		].join('\n'),
	});
})();
