/* Tables — data, not layout: full table anatomy (caption as first-child
 * title, thead/tbody/tfoot row groups, th vs td, scope telling screen
 * readers which header to announce, colspan/rowspan). The exercise upgrades
 * a degenerate all-td table into the full anatomy; the check pins the
 * caption at exact first-child depth, exactly two th scope="col" cells,
 * thead ordered before tbody, and a tfoot whose td carries colspan="2" —
 * none of which the tr/td-only starter can produce.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'tables',
		title: 'Tables',
		nav: 'tables',
		category: 'Structure & Semantics',

		prose: [
			'<h2>Data, not layout</h2>' +
			'<p>Before CSS could position anything, whole pages were built as ' +
			'giant invisible tables — nav in one cell, content in another — ' +
			'and undoing that misuse took the web years. The rule that came ' +
			'out of it is simple: <code>&lt;table&gt;</code> is for ' +
			'<em>tabular data</em> — values that mean something by their row ' +
			'and column position, like a price list or a build matrix. If ' +
			'nothing lines up in two dimensions, it is not a table.</p>',

			'<h2>The anatomy</h2>' +
			'<p>A minimal table is just rows of cells, but a <em>good</em> ' +
			'table names its parts, and every part has a job:</p>' +
			'<ul>' +
			'<li><code>&lt;caption&gt;</code> — the table\'s title, and it ' +
			'must be the <strong>first child</strong> of ' +
			'<code>&lt;table&gt;</code>. Screen readers announce it before ' +
			'entering the table, so the user can decide whether to dive in or ' +
			'skip past.</li>' +
			'<li><code>&lt;thead&gt;</code> / <code>&lt;tbody&gt;</code> / ' +
			'<code>&lt;tfoot&gt;</code> — row groups: the header row(s), the ' +
			'data, and a summary row such as a total. Browsers can repeat ' +
			'<code>&lt;thead&gt;</code> on every printed page and scroll ' +
			'<code>&lt;tbody&gt;</code> independently.</li>' +
			'<li><code>&lt;tr&gt;</code> — one row.</li>' +
			'<li><code>&lt;th&gt;</code> vs <code>&lt;td&gt;</code> — a ' +
			'<em>header</em> cell vs a <em>data</em> cell. Bold-and-centered ' +
			'is the cosmetic difference; the real one is that ' +
			'<code>&lt;th&gt;</code> <em>labels</em> other cells, and ' +
			'assistive tech uses that relationship.</li>' +
			'</ul>',
			{ lang: 'html', code: '<table>\n  <caption>Monthly Downloads</caption>   <!-- first child, always -->\n  <thead>\n    <tr><th scope="col">Month</th><th scope="col">Downloads</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>January</td><td>1,204</td></tr>\n  </tbody>\n  <tfoot>\n    <tr><td colspan="2">Total: 1,204</td></tr>\n  </tfoot>\n</table>' },
			'<svg class="dg" viewBox="0 0 520 226" width="520" height="226" role="img" aria-label="table anatomy: caption above, thead row, tbody rows, tfoot row with a spanning cell">' +
			'<text x="140" y="22" text-anchor="middle">caption</text>' +
			'<text x="240" y="22" class="lbl">— announced before the table</text>' +
			'<rect x="20" y="34" width="240" height="34" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
			'<line x1="140" y1="34" x2="140" y2="68" stroke="var(--accent)" stroke-width="1.6"/>' +
			'<text x="80" y="56" text-anchor="middle">th</text>' +
			'<text x="200" y="56" text-anchor="middle">th</text>' +
			'<text x="276" y="56" class="lbl">thead — scope="col" labels the column</text>' +
			'<rect x="20" y="68" width="240" height="68" fill="none" stroke="var(--edge)"/>' +
			'<line x1="20" y1="102" x2="260" y2="102" stroke="var(--edge)"/>' +
			'<line x1="140" y1="68" x2="140" y2="136" stroke="var(--edge)"/>' +
			'<text x="80" y="90" text-anchor="middle" class="lbl">td</text>' +
			'<text x="200" y="90" text-anchor="middle" class="lbl">td</text>' +
			'<text x="80" y="124" text-anchor="middle" class="lbl">td</text>' +
			'<text x="200" y="124" text-anchor="middle" class="lbl">td</text>' +
			'<text x="276" y="106" class="lbl">tbody — the data rows</text>' +
			'<rect x="20" y="136" width="240" height="34" fill="none" stroke="var(--edge)" stroke-dasharray="5 3"/>' +
			'<text x="140" y="158" text-anchor="middle" class="lbl">td colspan="2"</text>' +
			'<text x="276" y="158" class="lbl">tfoot — one cell spans both columns</text>' +
			'<text x="20" y="200" class="lbl">reading a data cell, a screen reader prepends its th:</text>' +
			'<text x="20" y="216" class="lbl">"Downloads: 1,204" — that link is what scope declares</text>' +
			'</svg>',

			'<h2>scope: which cells does this header label?</h2>' +
			'<p>Sighted readers resolve a cell by glancing up the column and ' +
			'across the row. A screen reader user hears one cell at a time, so ' +
			'the browser must know which <code>&lt;th&gt;</code> governs each ' +
			'cell — and <code>scope</code> declares it: ' +
			'<code>scope="col"</code> means "I label every cell below me", ' +
			'<code>scope="row"</code> means "I label every cell to my right". ' +
			'With scope set, arrowing into a cell reads ' +
			'<em>"Downloads: 1,204"</em> — header first, then value — instead ' +
			'of a bare number floating in space. One attribute per header ' +
			'cell, and the whole table becomes navigable by ear.</p>',

			'<h2>Spanning cells</h2>' +
			'<p>When one cell should cover several grid slots, ' +
			'<code>colspan="n"</code> stretches it across columns and ' +
			'<code>rowspan="n"</code> down rows. The classic use is a summary ' +
			'row: a total that spans the label columns. Note what you do ' +
			'<em>not</em> write: the swallowed cells simply are not there — a ' +
			'two-column table with <code>colspan="2"</code> has one ' +
			'<code>&lt;td&gt;</code> in that row, not two.</p>',
			{ lang: 'html', code: '<tr>\n  <td colspan="2">Total: 2,734</td>   <!-- one cell, two columns wide -->\n</tr>' },

			'<p>Elsewhere in go-learn, the <em>TypeScript + Go Web</em> track ' +
			'generates tables from Go with the element library — the data rows ' +
			'come from <code>element.ForEach</code> over a slice of structs, ' +
			'so the markup can never drift out of sync with the data:</p>',
			{ lang: 'go', code: 'type Stat struct{ Month, Downloads string }\nrows := []Stat{{"January", "1,204"}, {"February", "1,530"}}\n\nb.Table().R(\n\tb.Caption().T("Monthly Downloads"),\n\tb.Tbody().R(\n\t\telement.ForEach(rows, func(r Stat) {\n\t\t\tb.Tr().R(b.Td().T(r.Month), b.Td().T(r.Downloads))\n\t\t}),\n\t),\n)' },

			'<h3>Your job</h3>' +
			'<p>The starter is a valid but degenerate table: three rows of ' +
			'bare <code>&lt;td&gt;</code>s, so machines see no title, no ' +
			'headers, no structure — just a grid of strings. Upgrade it: add ' +
			'<code>&lt;caption&gt;Monthly Downloads&lt;/caption&gt;</code> as ' +
			'the first child; promote the first row into a ' +
			'<code>&lt;thead&gt;</code> whose two cells become ' +
			'<code>&lt;th scope="col"&gt;</code>; group the two data rows in a ' +
			'<code>&lt;tbody&gt;</code>; and finish with a ' +
			'<code>&lt;tfoot&gt;</code> row holding a single ' +
			'<code>&lt;td colspan="2"&gt;Total: 2,734&lt;/td&gt;</code>. The ' +
			'outline will show the caption indented directly under ' +
			'<code>table</code> and the row groups in order.</p>' +
			'<div class="tip">Row groups close in reverse order of opening, ' +
			'like every element here: <code>&lt;/tr&gt;&lt;/thead&gt;</code>, ' +
			'never <code>&lt;/thead&gt;&lt;/tr&gt;</code> — the strict ' +
			'validator rejects the crossed pair with a mismatched-closing-tag ' +
			'error, while a browser would have silently repaired it.</div>',
		],

		task: 'Add a caption, promote the first row to a thead of th scope="col" cells, wrap the data in tbody, and add a tfoot with a colspan="2" total.',

		starter: [
			'<!-- Renders fine, but to a machine it is an untitled grid of strings. -->',
			'<!-- TODO 1: add a caption as the FIRST child: Monthly Downloads -->',
			'<!-- TODO 2: first row -> thead; its cells become th with scope set to col. -->',
			'<!-- TODO 3: group the two data rows in a tbody element. -->',
			'<!-- TODO 4: add a tfoot row: one td spanning both columns (Total: 2,734). -->',
			'<table>',
			'  <tr>',
			'    <td>Month</td>',
			'    <td>Downloads</td>',
			'  </tr>',
			'  <tr>',
			'    <td>January</td>',
			'    <td>1,204</td>',
			'  </tr>',
			'  <tr>',
			'    <td>February</td>',
			'    <td>1,530</td>',
			'  </tr>',
			'</table>',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('table\n  caption\n    "Monthly Downloads"') &&
				flat.split('th scope="col"').length - 1 === 2 &&
				stdout.includes('thead\n') &&
				stdout.includes('tbody\n') &&
				flat.indexOf('thead') < flat.indexOf('tbody') &&
				stdout.includes('tfoot\n    tr\n      td colspan="2"');
		},

		solution: [
			'<!-- caption first, always: announced before the table is entered -->',
			'<table>',
			'  <caption>Monthly Downloads</caption>',
			'  <thead>',
			'    <tr>',
			'      <th scope="col">Month</th>',
			'      <th scope="col">Downloads</th>',
			'    </tr>',
			'  </thead>',
			'  <tbody>',
			'    <tr>',
			'      <td>January</td>',
			'      <td>1,204</td>',
			'    </tr>',
			'    <tr>',
			'      <td>February</td>',
			'      <td>1,530</td>',
			'    </tr>',
			'  </tbody>',
			'  <tfoot>',
			'    <tr>',
			'      <td colspan="2">Total: 2,734</td>',
			'    </tr>',
			'  </tfoot>',
			'</table>',
		].join('\n'),
	});
})();
