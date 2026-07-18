/* components-props — components are Capitalized functions; props are the one
 * argument, destructured with defaults; composition is calling your own
 * vocabulary from JSX. Pedagogy hinges on the capitalization rule shown
 * through its failure mode (<badge> becomes an unknown HTML element, no
 * error — the outline betrays it) and on ONE Badge definition serving three
 * call sites. Starter hardcodes Badge's output and renders it once; the
 * check pins three span class="badge <tone>" lines with distinct labels in
 * source order (indexOf ordering), unreachable without real prop flow —
 * including the default tone on the third Badge.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'components-props',
		title: 'Components & Props',
		nav: 'Props',
		category: 'Foundations',

		prose: [
			'<h2>Components: your own tags</h2>' +
			'<p>A component is a function that returns JSX — that is the whole ' +
			'definition. Write <code>function Badge() {…}</code> and ' +
			'<code>&lt;Badge /&gt;</code> becomes a tag you can use anywhere, ' +
			'as many times as you like. The <strong>capital letter is load-' +
			'bearing</strong>: the compiler routes lowercase tags to HTML ' +
			'(<code>&lt;span&gt;</code> → the string <code>"span"</code>) and ' +
			'Capitalized tags to your function (<code>&lt;Badge /&gt;</code> → ' +
			'<code>React.createElement(Badge)</code> — the function itself, ' +
			'called at render). Name it <code>badge</code> and there is no ' +
			'error at all: React renders a literal unknown ' +
			'<code>&lt;badge&gt;</code> element and your function is never ' +
			'called — the outline shows <code>badge</code> where your ' +
			'<code>span</code> should be. Silent, and only visible in the ' +
			'structure.</p>',
			{ lang: 'js', code: 'function badge() { return <span>never called</span>; }\n\n// <badge /> compiles to createElement("badge") — the STRING, not the\n// function. Outline: `badge` (an unknown element), not `span`.\nfunction App() { return <badge />; }' },
			'<p><strong>Props</strong> are how a call site configures a ' +
			'component. Every attribute you write is collected into a single ' +
			'object passed as the function&#39;s one argument: ' +
			'<code>&lt;Badge label="new" tone="green" /&gt;</code> calls ' +
			'<code>Badge({ label: "new", tone: "green" })</code>. Idiomatic ' +
			'React destructures in the parameter list, and a destructuring ' +
			'<em>default</em> makes a prop optional — ' +
			'<code>function Badge({ label, tone = &#39;gray&#39; })</code> ' +
			'means callers who omit <code>tone</code> get gray without a ' +
			'single <code>if</code>. Props flow one way, parent to child, and ' +
			'a component must never mutate them: same props in, same JSX ' +
			'out.</p>' +
			'<p>The payoff is <strong>composition</strong>: <code>App</code> ' +
			'stops describing every span itself and instead speaks in the ' +
			'vocabulary you defined — three <code>&lt;Badge /&gt;</code> tags, ' +
			'one definition, three different renderings. Change how a badge ' +
			'looks in one place and every call site follows. This is the ' +
			'entire architecture of a React app; everything after this lesson ' +
			'is variations on it.</p>' +
			'<p>The Go <code>element</code> library (see the <em>TypeScript + ' +
			'Go Web</em> track) draws the same boundary with its ' +
			'<code>Component</code> interface: any type with ' +
			'<code>Render(b *element.Builder)</code> is a reusable chunk of ' +
			'markup, and its struct fields play the role of props — ' +
			'<code>SelectComponent{Selected: "blue"}</code> is ' +
			'<code>&lt;Select selected="blue" /&gt;</code> in Go clothing.</p>' +
			'<h3>Your job</h3>' +
			'<p>Make <code>Badge</code> honest: destructure ' +
			'<code>{ label, tone = &#39;gray&#39; }</code> and return a ' +
			'<code>&lt;span&gt;</code> whose <code>className</code> is ' +
			'<code>&#39;badge &#39; + tone</code> and whose text is ' +
			'<code>{label}</code>. Then have <code>App</code> render a ' +
			'<code>&lt;header&gt;</code> with three Badges: ' +
			'<code>new</code>/<code>green</code>, ' +
			'<code>beta</code>/<code>blue</code>, and ' +
			'<code>deprecated</code> with <em>no</em> tone — let the default ' +
			'supply <code>gray</code>.</p>' +
			'<div class="tip">The computed class needs braces, not quotes: ' +
			'<code>className={&#39;badge &#39; + tone}</code>. Written as ' +
			'<code>className="badge tone"</code> it is a string literal — ' +
			'every badge renders the word <code>tone</code>, and the outline ' +
			'shows all three spans identical. Read the outline: three ' +
			'<code>span class="badge …"</code> lines, three different ' +
			'endings.</div>',
		],

		task: 'Badge({ label, tone = "gray" }) renders <span class="badge tone">label</span>; App composes three in a <header>.',

		starter: [
			'// One definition, many call sites — that is the point of props.',
			"// TODO: destructure { label, tone = 'gray' } and USE them:",
			"//       className={'badge ' + tone}, text {label}.",
			'function Badge(props) {',
			'\treturn <span className="badge">shiny</span>;',
			'}',
			'',
			'function App() {',
			'\t// TODO: a <header> with THREE Badges: label="new" tone="green",',
			'\t//       label="beta" tone="blue", label="deprecated" (no tone —',
			'\t//       the destructuring default supplies gray).',
			'\treturn <Badge label="new" tone="green" />;',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// Pin each span WITH its tone class and its label nested one level
			// deeper — only real prop flow (including the gray default) can
			// produce all three — and pin source order via indexOf.
			var a = stdout.indexOf('span class="badge green"\n    "new"');
			var b = stdout.indexOf('span class="badge blue"\n    "beta"');
			var c = stdout.indexOf('span class="badge gray"\n    "deprecated"');
			return stdout.includes('header\n  span') &&
				a !== -1 && b !== -1 && c !== -1 && a < b && b < c;
		},

		solution: [
			"// Capitalized, so <Badge /> compiles to createElement(Badge) — the",
			"// function — not the string 'badge'. Props arrive as ONE object;",
			"// destructuring names the contract, and `tone = 'gray'` makes the",
			'// prop optional at every call site.',
			"function Badge({ label, tone = 'gray' }) {",
			"\treturn <span className={'badge ' + tone}>{label}</span>;",
			'}',
			'',
			'function App() {',
			'\t// Composition: App speaks in Badge, not span. Three call sites,',
			'\t// one definition — the third omits tone and the default fills it.',
			'\treturn (',
			'\t\t<header>',
			'\t\t\t<Badge label="new" tone="green" />',
			'\t\t\t<Badge label="beta" tone="blue" />',
			'\t\t\t<Badge label="deprecated" />',
			'\t\t</header>',
			'\t);',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<p>Each JSX call site becomes a function call: ' +
			'<code>&lt;Badge label="beta" tone="blue" /&gt;</code> is ' +
			'<code>React.createElement(Badge, { label: "beta", tone: "blue" })</code>, ' +
			'and React invokes <code>Badge</code> with that props object ' +
			'during render. The parameter-list destructuring unpacks it, and ' +
			'the third call site — no <code>tone</code> attribute — hits the ' +
			'<code>= &#39;gray&#39;</code> default, which is why the outline ' +
			'shows <code>badge gray</code> without gray appearing anywhere in ' +
			'<code>App</code>.</p>',
			'<p>The outline reads as <code>header</code>, then three ' +
			'<code>span class="badge …"</code> lines, each with its label ' +
			'quoted one level deeper. Note there is no <code>Badge</code> in ' +
			'the outline: components are compile-and-render-time vocabulary, ' +
			'not elements — only what they <em>return</em> reaches the ' +
			'tree.</p>',
			'<p>Two experiments worth running: rename the function to ' +
			'<code>badge</code> (lowercase) and watch the outline show an ' +
			'unknown <code>badge</code> element with your function never ' +
			'called; then change <code>className={&#39;badge &#39; + tone}</code> ' +
			'to a plain string and watch all three spans collapse to the same ' +
			'class. Both failures are silent in the preview — the structure ' +
			'outline is what catches them.</p>',
		],
	});
})();
