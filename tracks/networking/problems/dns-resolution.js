/* DNS Resolution — Application: DNS (Medium). The iterative walk a recursive
 * resolver performs (what `dig +trace` shows): follow NS referrals by
 * longest matching suffix, chase CNAMEs from the root, answer on an exact A
 * record, and give up cleanly on NXDOMAIN or a loop. The harness is a tiny
 * internet with two roots, so the longest-suffix rule and the loop guard
 * both have a case that fails without them.
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// The resolver fans out one query at a time, walking the delegation tree
	// from the root down; only the last server answers, everything above it
	// answers "ask someone closer". Marker ids namespaced (dgArrowNDN*)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 240" width="520" height="240" role="img" aria-label="a recursive resolver iterates: asks the root, gets a referral to the .com servers, asks those, gets a referral to ns1.example, asks it, and receives the A record">' +
		'<rect x="20" y="96" width="130" height="50" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="85" y="117" text-anchor="middle">recursive</text>' +
		'<text x="85" y="134" text-anchor="middle">resolver</text>' +
		'<rect x="350" y="20" width="150" height="44" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="425" y="38" text-anchor="middle">root server</text>' +
		'<text x="425" y="56" text-anchor="middle" class="lbl">NS com. → a.gtld</text>' +
		'<rect x="350" y="98" width="150" height="44" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="425" y="116" text-anchor="middle">a.gtld (.com TLD)</text>' +
		'<text x="425" y="134" text-anchor="middle" class="lbl">NS example.com. → ns1</text>' +
		'<rect x="350" y="176" width="150" height="44" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="425" y="194" text-anchor="middle">ns1.example</text>' +
		'<text x="425" y="212" text-anchor="middle" class="lbl">A www.example.com.</text>' +
		'<path d="M 155 104 L 344 44" fill="none" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowNDN)"/>' +
		'<text x="244" y="60" text-anchor="middle" class="lbl">1 · www.example.com. A?</text>' +
		'<path d="M 155 120 L 344 118" fill="none" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowNDN)"/>' +
		'<text x="244" y="110" text-anchor="middle" class="lbl">2 · same question, closer server</text>' +
		'<path d="M 155 136 L 344 194" fill="none" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowNDN)"/>' +
		'<text x="230" y="152" text-anchor="middle" class="lbl">3 · same question again</text>' +
		'<path d="M 425 68 L 425 92" fill="none" stroke="var(--warn)" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#dgArrowNDNw)"/>' +
		'<text x="435" y="84" class="lbl" style="fill:var(--warn)">referral</text>' +
		'<path d="M 425 146 L 425 170" fill="none" stroke="var(--warn)" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#dgArrowNDNw)"/>' +
		'<text x="435" y="162" class="lbl" style="fill:var(--warn)">referral</text>' +
		'<path d="M 344 210 L 120 152" fill="none" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowNDNok)"/>' +
		'<text x="222" y="192" text-anchor="middle" class="lbl" style="fill:var(--ok)">A 93.184.216.34</text>' +
		'<text x="20" y="234" class="lbl">every referral is cacheable — the next *.example.com. lookup skips straight to ns1</text>' +
		'<defs>' +
		'<marker id="dgArrowNDN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowNDNw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowNDNok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'dns-resolution',
		title: 'DNS: Iterative Resolution',
		nav: 'DNS resolution',
		difficulty: 'Medium',
		category: 'Application: DNS',
		task: 'Implement Resolve: follow NS referrals by longest suffix, chase CNAMEs from the root, detect NXDOMAIN and loops — all 6 tests.',

		prose: [
			'<h2>DNS: Iterative Resolution</h2>' +
			'<p>Before any TCP handshake in this track can even start, something has ' +
			'to turn <code>www.example.com</code> into an address — and when that ' +
			'something misbehaves (“works on my machine, times out in the pod”), you ' +
			'need to know the walk it performs. Your stub resolver asks one ' +
			'<em>recursive resolver</em> and waits; the recursive resolver does the ' +
			'real work <em>iteratively</em>, exactly what <code>dig +trace</code> ' +
			'prints:</p>',
			{ code: '$ dig +trace www.example.com.\n.                NS  a.root-servers.net.    ← root hint (compiled in)\ncom.             NS  a.gtld-servers.net.    ← referral from the root\nexample.com.     NS  ns1.example.           ← referral from .com\nwww.example.com. A   93.184.216.34          ← the answer, from ns1', lang: 'txt' },
			'<p>No server knows the whole database. Each one knows its own zone plus ' +
			'<strong>referrals</strong>: NS records saying “for names under this ' +
			'suffix, ask that server.” The resolver starts at a root server and asks ' +
			'the <em>same question</em> at each hop; every answer is either the ' +
			'record itself, an alias, or a referral one level closer to the owner.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Resolve(zones, start, name)</code>. Begin at ' +
			'<code>server := start</code> and loop at most 10 hops (more means a ' +
			'referral or CNAME cycle — return <code>errors.New("resolution loop")</code>). ' +
			'At each server, in priority order:</p>' +
			'<ul>' +
			'<li><strong>A record</strong> whose Name equals <code>name</code> → ' +
			'return its Value: resolved.</li>' +
			'<li><strong>CNAME</strong> whose Name equals <code>name</code> → the ' +
			'name is an alias: set <code>name</code> to the target and ' +
			'<strong>restart the walk from <code>start</code></strong> — the ' +
			'canonical name may live in a completely different zone.</li>' +
			'<li><strong>NS referral</strong>: among NS records whose Name is a ' +
			'suffix of <code>name</code> (<code>strings.HasSuffix</code>), follow the ' +
			'<em>longest</em> one — the most specific delegation wins.</li>' +
			'<li>None of the above → <code>errors.New("NXDOMAIN")</code>: this branch ' +
			'of the tree has no such name.</li>' +
			'</ul>' +
			'<div class="tip">All names here are fully qualified, trailing dot ' +
			'included (<code>www.example.com.</code>) — that dot is the root zone, ' +
			'and it is why suffix matching against <code>com.</code> is unambiguous.</div>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// Record is one DNS resource record, as a server would answer it:',
			'//',
			'//	{"A", "www.example.com.", "93.184.216.34"}          name -> address (an answer)',
			'//	{"NS", "com.", "a.gtld"}                            zone suffix -> server to ask next (a referral)',
			'//	{"CNAME", "blog.example.com.", "www.example.com."}  alias -> canonical name',
			'type Record struct {',
			'	Type  string // "A", "NS", or "CNAME"',
			'	Name  string // fully qualified with trailing dot; for NS this is a zone SUFFIX',
			'	Value string',
			'}',
			'',
			'// Resolve performs the iterative resolution a recursive resolver runs:',
			'// zones maps server name -> the records that server can answer with,',
			'// start is the root server, name is the fully qualified query.',
			'//',
			'// Loop at most 10 hops (guard against referral/CNAME cycles), and at',
			'// each server, in priority order:',
			'//  1. an A record exactly matching name  -> return its Value',
			'//  2. a CNAME exactly matching name      -> name = target, server = start',
			'//     (restart the walk from the root: the alias may live anywhere)',
			'//  3. the NS record whose Name is the LONGEST suffix of name -> follow it',
			'//  4. nothing applies                    -> errors.New("NXDOMAIN")',
			'// If the loop runs out of hops: errors.New("resolution loop").',
			'func Resolve(zones map[string][]Record, start, name string) (string, error) {',
			'	// TODO: walk the delegation tree',
			'	return "", errors.New("not implemented")',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// One tiny internet: server name -> what that server can answer.',
			'	zones := map[string][]Record{',
			'		"root": {',
			'			{"NS", "com.", "a.gtld"},',
			'			{"NS", "org.", "c.tld"},',
			'		},',
			'		"a.gtld": {',
			'			{"NS", "example.com.", "ns1.example"},',
			'		},',
			'		"c.tld": {',
			'			{"NS", "other.org.", "ns.other"}, // never matches the .org query below',
			'		},',
			'		"ns1.example": {',
			'			{"A", "www.example.com.", "93.184.216.34"},',
			'			{"CNAME", "blog.example.com.", "www.example.com."},',
			'			{"CNAME", "x.example.com.", "y.example.com."}, // a CNAME cycle,',
			'			{"CNAME", "y.example.com.", "x.example.com."}, // for the loop test',
			'		},',
			'		// A root that sees BOTH a com. referral and a more specific',
			'		// example.com. one — com. listed FIRST, so first-match (instead',
			'		// of longest-suffix) implementations walk into the dead end.',
			'		"root2": {',
			'			{"NS", "com.", "b.gtld"},',
			'			{"NS", "example.com.", "ns1.example"},',
			'		},',
			'		"b.gtld": {',
			'			{"NS", "net.", "d.tld"}, // knows nothing useful about example.com.',
			'		},',
			'	}',
			'	// Deep-enough copy per case: a user implementation that mutates the',
			'	// record slices must not corrupt later cases.',
			'	copyZones := func(z map[string][]Record) map[string][]Record {',
			'		out := make(map[string][]Record, len(z))',
			'		for k, v := range z {',
			'			out[k] = append([]Record(nil), v...)',
			'		}',
			'		return out',
			'	}',
			'	type tc struct {',
			'		name, start, query, want string',
			'	}',
			'	cases := []tc{',
			'		{"referral chain: root -> .com -> ns1.example -> A record",',
			'			"root", "www.example.com.", "93.184.216.34"},',
			'		{"CNAME chase: blog is an alias for www, walked again from the root",',
			'			"root", "blog.example.com.", "93.184.216.34"},',
			'		{"NXDOMAIN: no answer and no matching referral at the last hop",',
			'			"root", "www.missing.org.", "error: NXDOMAIN"},',
			'		{"longest suffix wins: example.com. NS beats the earlier com. NS",',
			'			"root2", "www.example.com.", "93.184.216.34"},',
			'		{"CNAME loop x -> y -> x is cut by the hop limit",',
			'			"root", "x.example.com.", "error: resolution loop"},',
			'		{"direct hit: the start server already holds the A record",',
			'			"ns1.example", "www.example.com.", "93.184.216.34"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  c.want,',
			'		}',
			'		runCase(r, func() {',
			'			got, err := Resolve(copyZones(zones), c.start, c.query)',
			'			if err != nil {',
			'				got = "error: " + err.Error()',
			'			}',
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
			'import (',
			'	"errors"',
			'	"strings"',
			')',
			'',
			'// Record is one DNS resource record, as a server would answer it:',
			'//',
			'//	{"A", "www.example.com.", "93.184.216.34"}          name -> address (an answer)',
			'//	{"NS", "com.", "a.gtld"}                            zone suffix -> server to ask next (a referral)',
			'//	{"CNAME", "blog.example.com.", "www.example.com."}  alias -> canonical name',
			'type Record struct {',
			'	Type  string // "A", "NS", or "CNAME"',
			'	Name  string // fully qualified with trailing dot; for NS this is a zone SUFFIX',
			'	Value string',
			'}',
			'',
			'// Resolve walks the delegation tree the way a recursive resolver does.',
			'// The loop variable pair (server, name) IS the resolver\'s entire',
			'// state: which server to ask next, and what to ask it — everything',
			'// else (the path taken so far) is deliberately forgotten, which is',
			'// exactly why a cycle needs an explicit hop guard.',
			'func Resolve(zones map[string][]Record, start, name string) (string, error) {',
			'	server := start',
			'	// 10 hops is generous: real delegations are 3-5 levels deep, and a',
			'	// legitimate CNAME chain rarely exceeds two links. Hitting the cap',
			'	// therefore means the data itself is cyclic, not that the walk was',
			'	// merely long.',
			'	for hop := 0; hop < 10; hop++ {',
			'		recs := zones[server]',
			'',
			'		// (1) An exact A record: this server owns the answer. Checked',
			'		// before CNAME so a server holding both (legal for different',
			'		// names, and possible here after a chase) answers rather than',
			'		// aliasing forever.',
			'		for _, rec := range recs {',
			'			if rec.Type == "A" && rec.Name == name {',
			'				return rec.Value, nil',
			'			}',
			'		}',
			'',
			'		// (2) CNAME: the name is an alias. The canonical name can live',
			'		// in a COMPLETELY different zone (think app.example.com ->',
			'		// something.cloudfront.net), so nothing this server told us',
			'		// applies to the new name — the only safe move is to restart',
			'		// the walk from the root with the new question.',
			'		chased := false',
			'		for _, rec := range recs {',
			'			if rec.Type == "CNAME" && rec.Name == name {',
			'				name = rec.Value',
			'				server = start',
			'				chased = true',
			'				break',
			'			}',
			'		}',
			'		if chased {',
			'			continue',
			'		}',
			'',
			'		// (3) Referral: follow the NS record with the LONGEST matching',
			'		// suffix. Longest wins because delegation nests: a server that',
			'		// knows both com. and example.com. is offering a shortcut past',
			'		// the TLD, and the more specific delegation is always at least',
			'		// as authoritative as the general one.',
			'		bestLen, next := -1, ""',
			'		for _, rec := range recs {',
			'			if rec.Type == "NS" && strings.HasSuffix(name, rec.Name) && len(rec.Name) > bestLen {',
			'				bestLen = len(rec.Name)',
			'				next = rec.Value',
			'			}',
			'		}',
			'		if next != "" {',
			'			server = next',
			'			continue',
			'		}',
			'',
			'		// (4) No answer, no alias, no referral: this server should know',
			'		// and does not — the name does not exist.',
			'		return "", errors.New("NXDOMAIN")',
			'	}',
			'	return "", errors.New("resolution loop")',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Delegation is an ownership boundary</h3>' +
			'<p>The root servers do not know <code>www.example.com</code> — by ' +
			'design. An NS record is a statement of <em>ownership transfer</em>: ' +
			'“everything under <code>example.com.</code> is that organization’s ' +
			'problem; ask their servers.” That is what lets one namespace be ' +
			'administered by millions of independent parties with no central ' +
			'database. The resolver only needs a place to start — the ' +
			'<em>root hints</em>, a small compiled-in list of root server addresses, ' +
			'the sole piece of DNS knowledge that is configuration rather than ' +
			'lookup. From there, everything is the same move repeated: ask, get ' +
			'referred one level closer, ask again.</p>' +
			'<p>The referral step is the load-bearing loop of the walk:</p>',
			{ code: 'bestLen, next := -1, ""\nfor _, rec := range recs { // most specific delegation wins\n\tif rec.Type == "NS" && strings.HasSuffix(name, rec.Name) && len(rec.Name) > bestLen {\n\t\tbestLen = len(rec.Name)\n\t\tnext = rec.Value\n\t}\n}' },
			'<h3>Caching is what makes this scale</h3>' +
			'<p>Walking three servers per lookup would melt the roots — except every ' +
			'hop’s answer is cacheable, with a TTL chosen by the zone owner. After ' +
			'one full walk, the resolver has cached “<code>com.</code> → the gTLD ' +
			'servers” (TTL: days) and “<code>example.com.</code> → ns1” (TTL: ' +
			'hours), so the <em>next</em> query for anything under ' +
			'<code>example.com.</code> goes straight to ns1. The root servers mostly ' +
			'serve cache misses for TLDs, which is why thirteen named server ' +
			'clusters can front the entire internet. Negative answers (NXDOMAIN) are ' +
			'cached too — which surprises people when a name they <em>just</em> ' +
			'created still fails on a resolver that recently learned it did not ' +
			'exist.</p>' +
			'<h3>Why a CNAME restarts the walk</h3>' +
			'<p>A CNAME does not say “nearby name” — it says <em>different name</em>, ' +
			'and the target routinely lives in another zone entirely: ' +
			'<code>app.example.com → d111.cloudfront.net</code> crosses from your ' +
			'zone into Amazon’s. The server that handed out the alias has no ' +
			'authority over the target, so the resolver must re-resolve the new name ' +
			'from the top (in practice: from cache, which usually short-circuits ' +
			'most of the walk). This is also why a CNAME loop is possible — two ' +
			'aliases pointing at each other pass every local check and only the hop ' +
			'budget catches them.</p>' +
			'<h3>When debugging</h3>' +
			'<p>The classic ticket: “it resolves with <code>8.8.8.8</code> but not ' +
			'with our resolver.” Both are running the algorithm you just wrote — the ' +
			'difference is <em>cache state</em>. Your resolver is holding a stale NS ' +
			'or a negatively-cached NXDOMAIN from before the DNS change; Google’s ' +
			'cache happened to expire sooner. <code>dig +trace</code> is the tool ' +
			'that settles it: it performs this exact iterative walk from the roots, ' +
			'bypassing every cache, so it shows what the authoritative data says ' +
			'<em>right now</em>. If <code>+trace</code> is right and your resolver is ' +
			'wrong, you are waiting on a TTL, not fixing a config.</p>',
		],
		complexity: { time: 'O(h·r) — ≤10 hops × records per server', space: 'O(1)' },
	});
})();
