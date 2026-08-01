/* jsonb: Documents in a Relational Store — SQL Surface (Medium). A JSONB
 * column holding webhook payloads, queried with the operator family probed
 * live at the pinned version: -> ->> #> #>> for extraction, @> containment,
 * ? / ?| / ?& key existence, || merge and - delete. The learner writes the
 * queries; the harness compares real row sets, including the -> vs ->>
 * type distinction (jsonb text vs plain string) that trips everyone once.
 */
(function () {
	'use strict';
	var T = GoLearnBY;

	// One stored document, the two operator families over it. Marker ids
	// namespaced dgArrowBY04*.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 234" width="560" height="234" role="img" aria-label="a jsonb document tree; extraction operators arrow and double-arrow walk to a node and return jsonb or text; predicate operators containment and key-exists filter whole rows">' +
		'<text x="20" y="22" class="lbl">doc = {"type":"push", "repo":{"name":"api","private":true}, "commits":[...]}</text>' +
		'<rect x="20" y="38" width="76" height="30" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="58" y="58" text-anchor="middle" class="lbl">doc</text>' +
		'<path d="M 96 53 L 136 53" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBY04)"/>' +
		'<text x="116" y="44" text-anchor="middle" class="lbl">-&gt; \'repo\'</text>' +
		'<rect x="140" y="38" width="128" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="204" y="58" text-anchor="middle" class="lbl">{"name":"api",...}  jsonb</text>' +
		'<path d="M 268 53 L 308 53" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBY04)"/>' +
		'<text x="288" y="44" text-anchor="middle" class="lbl">-&gt;&gt; \'name\'</text>' +
		'<rect x="312" y="38" width="90" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="357" y="58" text-anchor="middle" class="lbl">api  (text)</text>' +
		'<text x="430" y="45" class="lbl">#&gt;&gt; \'{repo,name}\'</text>' +
		'<text x="430" y="61" class="lbl">= the same walk, one hop</text>' +
		'<line x1="20" y1="86" x2="540" y2="86" stroke="var(--edge)" stroke-width="1" stroke-dasharray="4 4"/>' +
		'<text x="20" y="108" class="lbl">predicates filter whole rows (usable in WHERE):</text>' +
		'<rect x="20" y="120" width="250" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="1.8"/>' +
		'<text x="145" y="141" text-anchor="middle" class="lbl">doc @&gt; \'{"repo":{"private":true}}\'</text>' +
		'<text x="290" y="141" class="lbl">containment: does doc include this shape?</text>' +
		'<rect x="20" y="164" width="250" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="1.8"/>' +
		'<text x="145" y="185" text-anchor="middle" class="lbl">doc ? \'labels\'      doc ?&amp; ARRAY[...]</text>' +
		'<text x="290" y="185" class="lbl">key existence: is the field present at all?</text>' +
		'<text x="20" y="222" class="lbl">extraction returns values for SELECT; predicates return true/false for WHERE — different jobs, different operators</text>' +
		'<defs>' +
		'<marker id="dgArrowBY04" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'jsonb-documents',
		title: 'jsonb: Documents in a Relational Store',
		nav: 'jsonb documents',
		difficulty: 'Medium',
		category: 'SQL Surface',
		task: 'Query a jsonb column of webhook payloads: extract fields with ->/->>/#>>, filter by @> containment and ? key presence, and reach into an array — five queries against live documents.',

		prose: [
			'<h2>jsonb: documents in a relational store</h2>' +
			'<p>Your service ingests webhooks from a code-hosting platform. Every ' +
			'event is JSON, and the schemas differ per event type: pushes carry a ' +
			'<code>commits</code> array, issues carry <code>labels</code>, ' +
			'everything carries <code>repo</code> and <code>actor</code>. ' +
			'Normalizing all of that into columns on day one means a migration ' +
			'every time the vendor adds a field — so you don\'t. You store each ' +
			'payload in a <code>JSONB</code> column next to the relational parts ' +
			'you do know (id, received timestamp), and query <em>into</em> the ' +
			'documents with operators:</p>' +
			'<ul>' +
			'<li><strong>Extraction — <code>-&gt;</code> vs ' +
			'<code>-&gt;&gt;</code>.</strong> Both take a key (or an integer array ' +
			'index); the arrow count says what comes back. <code>doc -&gt; ' +
			'\'repo\'</code> returns <em>jsonb</em> — chainable, still a document. ' +
			'<code>doc -&gt;&gt; \'actor\'</code> returns <em>text</em> — a plain ' +
			'string for your Go code. Chain <code>-&gt;</code> until the last hop, ' +
			'then <code>-&gt;&gt;</code>: <code>doc -&gt; \'repo\' -&gt;&gt; ' +
			'\'name\'</code>.</li>' +
			'<li><strong>Path shortcuts — <code>#&gt;</code> / ' +
			'<code>#&gt;&gt;</code>.</strong> The same walk as a text-array path: ' +
			'<code>doc #&gt;&gt; \'{repo,name}\'</code> ≡ the chain above. Misses ' +
			'are NULL, never errors — absent key, index out of range, wrong ' +
			'container kind all just yield NULL, which is what makes these safe ' +
			'over heterogeneous events.</li>' +
			'<li><strong>Containment — <code>@&gt;</code>.</strong> ' +
			'<code>doc @&gt; \'{"type":"push"}\'</code> asks: does doc contain ' +
			'this structure? It recurses — <code>\'{"repo":{"private":true}}\'' +
			'</code> matches however deep, and extra fields in doc never hurt. ' +
			'One operator expresses “events shaped like this”.</li>' +
			'<li><strong>Key existence — <code>?</code>, <code>?|</code>, ' +
			'<code>?&amp;</code>.</strong> <code>doc ? \'labels\'</code> is true ' +
			'iff the top-level key exists — <em>presence</em>, distinct from ' +
			'value. <code>?|</code>/<code>?&amp;</code> take an ' +
			'<code>ARRAY[...]</code> of keys (any / all present).</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>The harness seeds three events — the documents your queries run ' +
			'against:</p>',
			{ lang: 'sql', code: "CREATE TABLE events (id INT PRIMARY KEY, doc JSONB NOT NULL);\nINSERT INTO events VALUES\n (1, '{\"type\":\"push\",  \"actor\":\"ada\",  \"repo\":{\"name\":\"api\",\"private\":true},\n       \"commits\":[{\"sha\":\"c41\"},{\"sha\":\"c42\"}]}'),\n (2, '{\"type\":\"issue\", \"actor\":\"bo\",   \"repo\":{\"name\":\"web\",\"private\":false},\n       \"labels\":[\"bug\",\"p1\"]}'),\n (3, '{\"type\":\"push\",  \"actor\":\"cass\", \"repo\":{\"name\":\"web\",\"private\":false},\n       \"commits\":[{\"sha\":\"c77\"}]}');" },
			'<h3>Your job</h3>' +
			'<p>Five query functions, each one SQL string. Watch the arrow counts: ' +
			'the harness compares rendered rows, and a jsonb <code>"api"</code> ' +
			'(with quotes) is not the text <code>api</code> — the ' +
			'<code>-&gt;</code>/<code>-&gt;&gt;</code> distinction is visible in ' +
			'the expected output on purpose.</p>' +
			'<div class="tip">bytdb stores jsonb as a <em>canonical</em> form — ' +
			'key-sorted, whitespace-free — so equal documents compare equal no ' +
			'matter how they were spelled on the way in. That is the “b” that ' +
			'matters: json-the-text preserves your bytes; jsonb preserves your ' +
			'<em>value</em>.</div>',
		],

		starter: [
			'package main',
			'',
			'// Each function returns ONE SQL string, run verbatim against the',
			'// events table from the prose. Row sets are compared exactly.',
			'',
			'// QueryActors: every event\'s id and actor AS TEXT, ordered by id.',
			'// (actor is a top-level key — one hop, text out.)',
			'//   want: [[1 ada] [2 bo] [3 cass]]',
			'func QueryActors() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// QueryRepoObjects: id and the repo object AS JSONB, ordered by id.',
			'// Note the want rows are canonical jsonb text, quotes and all:',
			'//   want: [[1 {"name":"api","private":true}] [2 {"name":"web","private":false}] [3 {"name":"web","private":false}]]',
			'func QueryRepoObjects() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// QueryRepoNames: id and the repo\'s name AS TEXT via a #>> path,',
			'// ordered by id.',
			'//   want: [[1 api] [2 web] [3 web]]',
			'func QueryRepoNames() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// QueryPublicPushes: ids of events that CONTAIN the shape',
			'// {type: push, repo: {private: false}} — one @> predicate, not two',
			'// extractions ANDed. Ordered by id.',
			'//   want: [[3]]',
			'func QueryPublicPushes() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// QueryFirstShas: for events that HAVE a commits key (? presence),',
			'// the id and the sha of commit 0 as text, ordered by id. Array',
			'// elements are addressed by integer index.',
			'//   want: [[1 c41] [3 c77]]',
			'func QueryFirstShas() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"os"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			T.HARNESS_RT,
			'',
			T.DB_RT,
			'',
			'func main() {',
			'	db, cleanup := openDB("by-jsonb-documents")',
			'	defer cleanup()',
			'',
			'	mustExec(db, `CREATE TABLE events (id INT PRIMARY KEY, doc JSONB NOT NULL)`)',
			'	// Three events, three shapes: pushes with commits, an issue with',
			'	// labels, private and public repos — so containment and presence',
			'	// have real distinctions to cut along.',
			'	mustExec(db, `INSERT INTO events VALUES',
			'		(1, \'{"type":"push","actor":"ada","repo":{"name":"api","private":true},"commits":[{"sha":"c41"},{"sha":"c42"}]}\'),',
			'		(2, \'{"type":"issue","actor":"bo","repo":{"name":"web","private":false},"labels":["bug","p1"]}\'),',
			'		(3, \'{"type":"push","actor":"cass","repo":{"name":"web","private":false},"commits":[{"sha":"c77"}]}\')`)',
			'',
			'	type tc struct {',
			'		name string',
			'		fn   func() string',
			'		want string',
			'	}',
			'	// want strings pinned from live runs against this exact seed —',
			'	// including the canonical (key-sorted, compact) jsonb rendering',
			'	// in the QueryRepoObjects case.',
			'	cases := []tc{',
			'		{"->> extracts text: one actor per event",',
			'			QueryActors, "[[1 ada] [2 bo] [3 cass]]"},',
			'		{"-> extracts jsonb: repo objects, canonical form",',
			'			QueryRepoObjects, "[[1 {\\"name\\":\\"api\\",\\"private\\":true}] [2 {\\"name\\":\\"web\\",\\"private\\":false}] [3 {\\"name\\":\\"web\\",\\"private\\":false}]]"},',
			'		{"#>> walks a path to text: repo names",',
			'			QueryRepoNames, "[[1 api] [2 web] [3 web]]"},',
			'		{"@> containment: public pushes in one predicate",',
			'			QueryPublicPushes, "[[3]]"},',
			'		{"? presence + array index: first sha of each push",',
			'			QueryFirstShas, "[[1 c41] [3 c77]]"},',
			'	}',
			'',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			res, err := db.Exec(c.fn())',
			'			if err != nil {',
			'				r["pass"] = false',
			'				r["got"] = "exec error: " + err.Error()',
			'				return',
			'			}',
			'			got := rowsStr(res)',
			'			r["pass"] = got == c.want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// One hop to a scalar: ->> goes straight to text. Using -> here',
			'// would render "ada" WITH quotes — the jsonb spelling of the string',
			'// — and fail the comparison; the arrow count is a type decision,',
			'// not a style choice.',
			'func QueryActors() string {',
			'	return `SELECT id, doc ->> \'actor\' FROM events ORDER BY id`',
			'}',
			'',
			'// -> keeps the result jsonb: the repo objects come back as',
			'// documents in canonical form (keys sorted, no whitespace) — the',
			'// engine\'s stored representation, not the INSERT\'s spelling.',
			'func QueryRepoObjects() string {',
			'	return `SELECT id, doc -> \'repo\' FROM events ORDER BY id`',
			'}',
			'',
			'// #>> takes the whole path as a text array and lands on text.',
			'// Equivalent to doc -> \'repo\' ->> \'name\'; the path form scales',
			'// better as paths deepen and can be built programmatically.',
			'func QueryRepoNames() string {',
			'	return `SELECT id, doc #>> \'{repo,name}\' FROM events ORDER BY id`',
			'}',
			'',
			'// Containment states the SHAPE once: type is push AND repo.private',
			'// is false, recursively matched. The extraction spelling',
			'// (doc->>\'type\' = \'push\' AND (doc#>>\'{repo,private}\') = \'false\')',
			'// works too but decomposes the question into string comparisons;',
			'// @> asks it structurally, and event 1 (private push) and event 2',
			'// (public issue) each fail a different half of the shape.',
			'func QueryPublicPushes() string {',
			'	return `SELECT id FROM events',
			'		WHERE doc @> \'{"type":"push","repo":{"private":false}}\'',
			'		ORDER BY id`',
			'}',
			'',
			'// ? gates on key PRESENCE first — the issue event has no commits',
			'// key and must not contribute a NULL row. Then -> 0 indexes the',
			'// array (integers index, strings key) and ->> \'sha\' lands on text.',
			'func QueryFirstShas() string {',
			'	return `SELECT id, doc -> \'commits\' -> 0 ->> \'sha\' FROM events',
			'		WHERE doc ? \'commits\'',
			'		ORDER BY id`',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What jsonb is inside bytdb</h3>' +
			'<p>A <code>JSONB</code> cell is stored as the document\'s ' +
			'<em>canonical text</em>: parsed once on the way in (invalid JSON is ' +
			'rejected at INSERT, not discovered at query time), then re-rendered ' +
			'with keys sorted and whitespace dropped. Canonicalization is what ' +
			'makes the operators well-behaved: two documents that mean the same ' +
			'value are the same bytes, so equality, containment, and the harness\'s ' +
			'own row comparisons never depend on how a client happened to ' +
			'serialize. Each operator evaluation parses the canonical text into Go ' +
			'shapes (maps, slices, numbers), operates, and re-renders — the same ' +
			'parse→operate→render pipeline Postgres runs over its binary tree ' +
			'format. At this scale text-vs-binary is a wash; what you should keep ' +
			'from Postgres\'s design is the <em>error model</em>, which bytdb ' +
			'mirrors exactly: extraction misses are NULL (heterogeneous documents ' +
			'stay queryable), while structurally impossible <em>writes</em> — ' +
			'deleting a key from a scalar — are errors.</p>' +
			'<h3>Extraction vs predicate is a WHERE-clause distinction</h3>' +
			'<p>The two families live in different parts of the engine. ' +
			'<code>-&gt;</code>/<code>-&gt;&gt;</code>/<code>#&gt;</code>/' +
			'<code>#&gt;&gt;</code> (plus <code>||</code> merge and <code>-</code> ' +
			'delete) are <em>value</em> operators: they run inside expression ' +
			'evaluation and produce cells for your SELECT list. <code>@&gt;</code>, ' +
			'<code>&lt;@</code>, <code>?</code>, <code>?|</code>, ' +
			'<code>?&amp;</code> are <em>predicates</em>: they ride the same ' +
			'machinery as <code>=</code> and <code>IN</code>, three-valued logic ' +
			'included, which is why they compose cleanly with AND/OR in WHERE. In ' +
			'Postgres this split has a performance face — <code>@&gt;</code> and ' +
			'<code>?</code> are exactly the operators a GIN index accelerates, ' +
			'while an extraction in WHERE needs an expression index. bytdb at this ' +
			'version evaluates jsonb predicates per-row (a scan), so the item\'s ' +
			'lesson to carry forward: phrase document filters as containment/' +
			'presence when you can — it states intent structurally today and is ' +
			'the indexable form tomorrow.</p>' +
			'<h3>The columns-vs-document line</h3>' +
			'<p>The schema in this item is the pattern to copy: relational ' +
			'columns for what you <em>join, constrain, or index</em> (ids, ' +
			'foreign keys, timestamps, status enums), a jsonb column for the ' +
			'payload whose schema you don\'t own. Promote a field out of the ' +
			'document the moment it earns a WHERE clause on a hot path or a ' +
			'UNIQUE constraint — <code>ALTER TABLE ADD COLUMN</code> + one ' +
			'backfill UPDATE using <code>-&gt;&gt;</code> is the whole migration. ' +
			'The anti-pattern is the “one jsonb column named data” table: it ' +
			'rediscovers schemaless pain (typos silently NULL, no FK integrity, ' +
			'every query a document walk) inside a relational engine that was ' +
			'ready to help.</p>',
		],
		complexity: { time: 'O(n · d) per query — a scan of n rows, each operator walking a document of size d', space: 'O(rows returned) plus one parsed document at a time' },
	});
})();
