/* Informers & Watch — Advanced (lesson). The engine under every controller:
 * not polling, but LIST once + WATCH forever, maintaining a local cache the
 * controller reads instead of the API server. The lesson has the learner
 * harden a naive event applier into a real informer store: guard against
 * stale replays by resourceVersion, and rebuild the whole cache on the
 * relist that follows a "410 Gone" compaction error.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// The informer pipeline: one LIST seeds the cache, then the watch stream
	// keeps it current; the controller only ever reads the cache. The dashed
	// red edge is the failure path — a compacted resourceVersion forces a
	// fresh LIST. Marker ids namespaced (dgArrowKIW*) because every track's
	// SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="informer pipeline: LIST seeds a local cache, WATCH events keep it current, the controller reads only the cache; a 410 Gone error forces a fresh LIST">' +
		'<rect x="20" y="70" width="130" height="60" rx="6" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="85" y="95" text-anchor="middle">API server</text>' +
		'<text x="85" y="113" text-anchor="middle" class="lbl">(etcd behind it)</text>' +
		'<rect x="250" y="70" width="140" height="60" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="320" y="95" text-anchor="middle">local cache</text>' +
		'<text x="320" y="113" text-anchor="middle" class="lbl">name → resourceVersion</text>' +
		'<rect x="440" y="70" width="100" height="60" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="490" y="95" text-anchor="middle">controller</text>' +
		'<text x="490" y="113" text-anchor="middle" class="lbl">reconcile()</text>' +
		// LIST seeds, WATCH streams
		'<path d="M 155 85 L 244 85" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowKIW)"/>' +
		'<text x="200" y="78" text-anchor="middle" class="lbl">1. LIST (rv=5)</text>' +
		'<path d="M 155 112 L 244 112" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowKIWacc)"/>' +
		'<text x="200" y="132" text-anchor="middle" class="lbl">2. WATCH: ADDED,</text>' +
		'<text x="200" y="146" text-anchor="middle" class="lbl">MODIFIED, DELETED…</text>' +
		// controller reads only the cache
		'<path d="M 434 100 L 396 100" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowKIWok)"/>' +
		'<text x="470" y="145" text-anchor="middle" class="lbl" style="fill:var(--ok)">reads the cache,</text>' +
		'<text x="470" y="159" text-anchor="middle" class="lbl" style="fill:var(--ok)">never the server</text>' +
		// the failure path: 410 Gone → relist
		'<path d="M 260 64 C 220 30 150 30 100 64" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKIWerr)"/>' +
		'<text x="180" y="26" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">410 Gone (rv compacted) → LIST again, replace cache</text>' +
		'<text x="20" y="205" class="lbl">the watch is a changefeed — events can replay after a reconnect, so appliers must tolerate duplicates</text>' +
		'<defs>' +
		'<marker id="dgArrowKIW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowKIWacc" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowKIWok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowKIWerr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'informers-watch',
		title: 'Informers: List, Watch, and the Local Cache',
		nav: 'Informers & watch',
		category: 'Advanced',

		prose: [
			'<h2>Informers: List, Watch, and the Local Cache</h2>' +
			'<p>Your cluster runs dozens of controllers — Deployment, endpoints, ' +
			'cert-manager, that operator you installed last week — and every one of ' +
			'them needs to know the current state of the objects it manages. If each ' +
			'polled the API server with <code>GET /pods</code> every second, etcd would ' +
			'melt. They don\'t poll. They <strong>watch</strong>: one initial ' +
			'<code>LIST</code> establishes the full state, then the server holds the ' +
			'HTTP connection open and streams change events — ' +
			'<code>ADDED</code>, <code>MODIFIED</code>, <code>DELETED</code> — each ' +
			'stamped with a <code>resourceVersion</code>. A watch is etcd\'s changefeed, ' +
			'surfaced over plain HTTP.</p>' +
			'<p>The events feed a <strong>local cache</strong> (client-go calls the ' +
			'whole assembly an <em>informer</em>), and that cache is what the ' +
			'controller\'s reconcile loop reads. This is why controllers are ' +
			'level-triggered rather than edge-triggered: reconcile acts on the cached ' +
			'<em>state</em>, not on the individual event that woke it — so a missed or ' +
			'duplicated event is harmless, because the next reconcile against the ' +
			'cache heals it anyway.</p>' +
			DIAGRAM +
			'<p>Two failure modes make the applier interesting. First, a watch that ' +
			'reconnects can <strong>replay events you already applied</strong> — the ' +
			'stale ones carry an old <code>resourceVersion</code> and must be ignored, ' +
			'or the cache would travel backwards in time. Second, etcd periodically ' +
			'<strong>compacts</strong> its history; resume a watch from a compacted ' +
			'version and the server answers <code>410 Gone</code> ' +
			'(<code>too old resource version</code> in controller logs). There is no ' +
			'way to catch up event-by-event — the history is gone — so the informer ' +
			'<strong>re-lists</strong>: fetch a fresh full snapshot and replace the ' +
			'cache wholesale.</p>' +
			'<div class="tip"><code>resourceVersion</code> is etcd\'s modification ' +
			'counter underneath, but the API contract says it is <em>opaque</em>: real ' +
			'clients must never compare or order them. This lesson compares them as ' +
			'integers as an honest simplification — the informer machinery inside ' +
			'client-go is the one place that (carefully) gets to know what they ' +
			'mean.</div>' +
			'<h3>Your job</h3>' +
			'<p>The program on the right seeds a cache from an initial list, then ' +
			'replays a scripted event stream — including a stale replayed ' +
			'<code>MODIFIED</code> and a <code>RELIST</code> after a 410. ' +
			'<code>apply()</code> currently trusts every event blindly and ignores the ' +
			'relist. Make it behave like an informer store:</p>' +
			'<ul>' +
			'<li><code>ADDED</code>/<code>MODIFIED</code>: if the name is already ' +
			'cached with <code>RV &gt;= e.RV</code>, return ' +
			'<code>"ignored stale &lt;name&gt; rv=&lt;rv&gt;"</code> and leave the cache ' +
			'alone; otherwise store it and return ' +
			'<code>"applied &lt;name&gt; rv=&lt;rv&gt;"</code>.</li>' +
			'<li><code>DELETED</code>: remove the entry, return ' +
			'<code>"applied delete &lt;name&gt;"</code>.</li>' +
			'<li><code>RELIST</code>: replace the <em>entire</em> cache with ' +
			'<code>e.Snapshot</code>, return ' +
			'<code>"relisted: &lt;n&gt; objects"</code>.</li>' +
			'</ul>' +
			'<div class="tip">When you see <code>watch of *v1.Pod ended with: too old ' +
			'resource version</code> scrolling through controller logs at INFO level, ' +
			'this is what\'s happening — and it is routine, not an outage. The informer ' +
			'relists and moves on; only relists tight in a loop mean trouble.</div>',
		],

		task: 'Implement apply(): drop stale ADDED/MODIFIED events by resourceVersion, and rebuild the cache from the RELIST snapshot.',

		starter: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"sort"',
			'	"strings"',
			')',
			'',
			'// Event is one item off the watch stream. Type is "ADDED", "MODIFIED",',
			'// "DELETED", or "RELIST". RV is the object\'s resourceVersion (an int',
			'// here as an honest simplification — the real field is opaque).',
			'// RELIST models recovery from a "410 Gone" compaction error: it carries',
			'// no single object, but a fresh full snapshot in Snapshot.',
			'type Event struct {',
			'	Type     string',
			'	Name     string',
			'	RV       int',
			'	Snapshot map[string]int // only set on RELIST: name -> rv',
			'}',
			'',
			'// apply folds one watch event into the cache and reports what it did.',
			'//',
			'// TODO: this version trusts the stream completely — it applies every',
			'// ADDED/MODIFIED even when the event is a stale replay from a watch',
			'// reconnect, and it ignores RELIST entirely. Add the stale guard',
			'// (e.RV <= cached rv for a known name -> "ignored stale <name> rv=<rv>",',
			'// cache untouched) and make RELIST replace the whole cache',
			'// (-> "relisted: <n> objects"). Successful applies should report',
			'// "applied <name> rv=<rv>" and DELETED "applied delete <name>".',
			'func apply(cache map[string]int, e Event) string {',
			'	switch e.Type {',
			'	case "ADDED", "MODIFIED":',
			'		cache[e.Name] = e.RV // blind trust: replays drag the cache backwards',
			'	case "DELETED":',
			'		delete(cache, e.Name)',
			'	}',
			'	// RELIST falls through, silently dropped — the cache never recovers.',
			'	return "applied"',
			'}',
			'',
			'func main() {',
			'	// The initial LIST: the informer\'s first act is one full read that',
			'	// seeds the cache. Everything after arrives as watch events.',
			'	cache := map[string]int{"web": 5, "db": 3}',
			'	fmt.Println("list: web=5 db=3")',
			'',
			'	events := []Event{',
			'		{Type: "MODIFIED", Name: "web", RV: 6}, // a normal update',
			'		{Type: "MODIFIED", Name: "web", RV: 4}, // stale replay after a watch reconnect',
			'		{Type: "ADDED", Name: "cron", RV: 7},',
			'		{Type: "DELETED", Name: "db", RV: 8},',
			'		// The watch hit "410 Gone" — history compacted — so the informer',
			'		// re-listed and got a fresh snapshot to replace the cache with.',
			'		{Type: "RELIST", Snapshot: map[string]int{"web": 9, "api": 12}},',
			'		{Type: "MODIFIED", Name: "api", RV: 13},',
			'	}',
			'	for _, e := range events {',
			'		fmt.Printf("%-8s %s\\n", e.Type, apply(cache, e))',
			'	}',
			'',
			'	// Dump the cache sorted by name: map iteration order is random,',
			'	// and this line is what the lesson checks.',
			'	names := make([]string, 0, len(cache))',
			'	for n := range cache {',
			'		names = append(names, n)',
			'	}',
			'	sort.Strings(names)',
			'	parts := make([]string, 0, len(names))',
			'	for _, n := range names {',
			'		parts = append(parts, fmt.Sprintf("%s=%d", n, cache[n]))',
			'	}',
			'	fmt.Println("cache: " + strings.Join(parts, " "))',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('ignored stale web rv=4') !== -1 &&
				flat.indexOf('relisted: 2 objects') !== -1 &&
				flat.indexOf('cache: api=13 web=9') !== -1;
		},

		solution: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"sort"',
			'	"strings"',
			')',
			'',
			'// Event is one item off the watch stream. Type is "ADDED", "MODIFIED",',
			'// "DELETED", or "RELIST". RV is the object\'s resourceVersion (an int',
			'// here as an honest simplification — the real field is opaque).',
			'// RELIST models recovery from a "410 Gone" compaction error: it carries',
			'// no single object, but a fresh full snapshot in Snapshot.',
			'type Event struct {',
			'	Type     string',
			'	Name     string',
			'	RV       int',
			'	Snapshot map[string]int // only set on RELIST: name -> rv',
			'}',
			'',
			'// apply folds one watch event into the cache and reports what it did.',
			'//',
			'// The invariant the guards protect: the cache only ever moves FORWARD',
			'// in resourceVersion. A watch reconnect can replay events the informer',
			'// already applied; applying them again would rewind the cache and the',
			'// controller would reconcile against the past.',
			'func apply(cache map[string]int, e Event) string {',
			'	switch e.Type {',
			'	case "ADDED", "MODIFIED":',
			'		// The stale guard. <= rather than <: an event at exactly the',
			'		// cached version is one we have already seen — a duplicate,',
			'		// not new information. Unknown names always pass (there is',
			'		// no cached version to be stale against).',
			'		if old, ok := cache[e.Name]; ok && e.RV <= old {',
			'			return fmt.Sprintf("ignored stale %s rv=%d", e.Name, e.RV)',
			'		}',
			'		cache[e.Name] = e.RV',
			'		return fmt.Sprintf("applied %s rv=%d", e.Name, e.RV)',
			'	case "DELETED":',
			'		// No staleness check on deletes: the object is gone, and a',
			'		// delete for an unknown name is a harmless no-op.',
			'		delete(cache, e.Name)',
			'		return "applied delete " + e.Name',
			'	case "RELIST":',
			'		// After a 410 the event history is unrecoverable, so patching',
			'		// is impossible — the only correct move is wholesale',
			'		// replacement (client-go calls this Store.Replace). Clear',
			'		// then copy, because a map argument shares storage with the',
			'		// caller but reassigning it here would not.',
			'		for k := range cache {',
			'			delete(cache, k)',
			'		}',
			'		for k, v := range e.Snapshot {',
			'			cache[k] = v',
			'		}',
			'		return fmt.Sprintf("relisted: %d objects", len(e.Snapshot))',
			'	}',
			'	return "applied"',
			'}',
			'',
			'func main() {',
			'	// The initial LIST: the informer\'s first act is one full read that',
			'	// seeds the cache. Everything after arrives as watch events.',
			'	cache := map[string]int{"web": 5, "db": 3}',
			'	fmt.Println("list: web=5 db=3")',
			'',
			'	events := []Event{',
			'		{Type: "MODIFIED", Name: "web", RV: 6}, // a normal update',
			'		{Type: "MODIFIED", Name: "web", RV: 4}, // stale replay after a watch reconnect',
			'		{Type: "ADDED", Name: "cron", RV: 7},',
			'		{Type: "DELETED", Name: "db", RV: 8},',
			'		// The watch hit "410 Gone" — history compacted — so the informer',
			'		// re-listed and got a fresh snapshot to replace the cache with.',
			'		{Type: "RELIST", Snapshot: map[string]int{"web": 9, "api": 12}},',
			'		{Type: "MODIFIED", Name: "api", RV: 13},',
			'	}',
			'	for _, e := range events {',
			'		fmt.Printf("%-8s %s\\n", e.Type, apply(cache, e))',
			'	}',
			'',
			'	// Dump the cache sorted by name: map iteration order is random,',
			'	// and this line is what the lesson checks.',
			'	names := make([]string, 0, len(cache))',
			'	for n := range cache {',
			'		names = append(names, n)',
			'	}',
			'	sort.Strings(names)',
			'	parts := make([]string, 0, len(names))',
			'	for _, n := range names {',
			'		parts = append(parts, fmt.Sprintf("%s=%d", n, cache[n]))',
			'	}',
			'	fmt.Println("cache: " + strings.Join(parts, " "))',
			'}',
			'',
		].join('\n'),
	});
})();
