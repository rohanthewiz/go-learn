/* Service DNS — Configuration (lesson). Why `db` resolves from one namespace
 * and not another: cluster DNS names have a fixed shape
 * (<svc>.<ns>.svc.cluster.local) and pods resolve short names through the
 * resolv.conf SEARCH LIST the kubelet writes. The learner implements the
 * candidate expansion — the exact reason cross-namespace access is "just add
 * the namespace", and the source of the ndots:5 performance folklore.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// The search list in action for the cross-namespace case: the first
	// suffix misses, the second hits, the rest is never tried. Marker ids
	// namespaced (dgArrowKDN) — every track's SVGs share the page's id
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="resolving db.payments from namespace shop: the first search suffix misses, the second hits">' +
		'<rect x="15" y="70" width="140" height="60" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="85" y="95" text-anchor="middle">pod in ns shop</text>' +
		'<text x="85" y="115" text-anchor="middle" class="lbl">lookup("db.payments")</text>' +
		'<rect x="230" y="20" width="275" height="40" rx="6" fill="none" stroke="var(--err-edge)"/>' +
		'<text x="367" y="38" text-anchor="middle" class="lbl">1. db.payments.shop.svc.cluster.local.</text>' +
		'<text x="367" y="53" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">NXDOMAIN — no such service in shop</text>' +
		'<rect x="230" y="80" width="275" height="40" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="367" y="98" text-anchor="middle" class="lbl">2. db.payments.svc.cluster.local.</text>' +
		'<text x="367" y="113" text-anchor="middle" class="lbl" style="fill:var(--ok)">HIT — svc db, ns payments</text>' +
		'<rect x="230" y="140" width="275" height="40" rx="6" fill="none" stroke="var(--edge)" stroke-dasharray="5 4"/>' +
		'<text x="367" y="158" text-anchor="middle" class="lbl">3. db.payments.</text>' +
		'<text x="367" y="173" text-anchor="middle" class="lbl">never tried — the resolver stopped at 2</text>' +
		'<path d="M 158 85 C 190 70 200 55 227 44" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowKDNerr)"/>' +
		'<path d="M 158 100 L 227 100" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowKDN)"/>' +
		'<defs>' +
		'<marker id="dgArrowKDN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowKDNerr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'service-dns',
		title: 'Service DNS and the Search List',
		nav: 'service DNS',
		category: 'Configuration',

		prose: [
			'<h2>Service DNS and the Search List</h2>' +
			'<p>Your Go service dials <code>db:5432</code> and it works — in the ' +
			'<code>shop</code> namespace. Deploy the same image to <code>batch</code> ' +
			'and the dial fails with <code>no such host</code>. Same cluster, same ' +
			'service, same code. The difference is not the network; it is a file the ' +
			'kubelet wrote into your pod: <code>/etc/resolv.conf</code>.</p>',
			{ lang: 'txt', code: '# /etc/resolv.conf inside a pod in namespace "shop"\nnameserver 10.96.0.10          # cluster DNS (CoreDNS)\nsearch shop.svc.cluster.local svc.cluster.local cluster.local\noptions ndots:5' },
			'<p>Every Service gets a DNS name with a fixed shape: ' +
			'<code>&lt;svc&gt;.&lt;ns&gt;.svc.cluster.local</code>. Short names work ' +
			'because of the <strong>search list</strong>: a name with fewer than ' +
			'<code>ndots:5</code> dots is not tried as-is first — the resolver appends ' +
			'each search suffix in order and asks CoreDNS about each candidate until ' +
			'one answers. So <code>db</code> from <code>shop</code> becomes ' +
			'<code>db.shop.svc.cluster.local</code> — the search list quietly scopes ' +
			'every short name to <em>your own namespace</em>. That is the whole bug: ' +
			'in <code>batch</code>, the first suffix is ' +
			'<code>batch.svc.cluster.local</code>, and there is no <code>db</code> ' +
			'there. Cross-namespace access is just adding the namespace: ' +
			'<code>db.shop</code> resolves from anywhere, via the second suffix.</p>' +
			DIAGRAM +
			'<p>The same mechanism is the source of a famous performance surprise: ' +
			'<code>api.stripe.com</code> has only 2 dots — fewer than 5 — so every ' +
			'lookup first tries <code>api.stripe.com.shop.svc.cluster.local</code>, ' +
			'<code>api.stripe.com.svc.cluster.local</code>, ' +
			'<code>api.stripe.com.cluster.local</code>… 3–4 wasted round-trips per ' +
			'external call, all visible as NXDOMAIN noise in the CoreDNS logs. A ' +
			'trailing dot (<code>api.stripe.com.</code>) marks the name absolute and ' +
			'skips the search list entirely.</p>' +
			'<div class="tip">A <em>headless</em> Service (<code>clusterIP: None</code>) ' +
			'answers the same name differently: instead of one virtual IP, DNS returns ' +
			'one A record per ready pod — and StatefulSet pods each get their own ' +
			'stable name, <code>pod-0.&lt;svc&gt;.&lt;ns&gt;.svc.cluster.local</code>. ' +
			'That per-pod identity is what databases build clustering on.</div>' +
			'<h3>Your job</h3>' +
			'<p>The program on the right resolves three names the way a pod in ' +
			'<code>shop</code> would. <code>qualify</code> currently returns the name ' +
			'untouched — implement the (simplified) search-list expansion so each query ' +
			'prints its candidate FQDNs in order and the right candidate hits: absolute ' +
			'names (trailing dot) pass through; full ' +
			'<code>.svc.cluster.local</code> names just gain the dot; everything else ' +
			'tries own-namespace first, then — only for dotted <code>svc.ns</code> ' +
			'names — the <code>svc.cluster.local</code> suffix, then the bare name.</p>',
		],

		task: 'Implement qualify: own-namespace suffix first, svc.cluster.local for dotted names, bare name last — so db finds shop\'s db and db.payments crosses namespaces.',

		starter: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			'// qualify returns the FQDN candidates the resolver will try, IN ORDER,',
			'// for a name looked up from a pod in namespace podNS. Simplified from',
			'// the real resolv.conf rules (search list + ndots:5):',
			'//   - trailing dot          → absolute: just that name, no search list',
			'//   - ends ".svc.cluster.local" → already full: name + "."',
			'//   - otherwise, in order:',
			'//       name.<podNS>.svc.cluster.local.   (own namespace first)',
			'//       name.svc.cluster.local.           (only if name contains a dot',
			'//                                          — i.e. it is svc.ns form)',
			'//       name.                              (bare, last resort)',
			'func qualify(name, podNS string) []string {',
			'	// TODO: expand the search list. Right now every name is tried',
			'	// bare and nothing in the cluster resolves.',
			'	return []string{name}',
			'}',
			'',
			'func main() {',
			'	// The services that exist in this cluster, as CoreDNS knows them.',
			'	services := map[string]bool{',
			'		"db.shop.svc.cluster.local":     true,',
			'		"db.payments.svc.cluster.local": true,',
			'		"api.prod.svc.cluster.local":    true,',
			'	}',
			'',
			'	// Three lookups, all from a pod in namespace "shop".',
			'	queries := []struct{ name, ns string }{',
			'		{"db", "shop"},                        // short name, own namespace',
			'		{"db.payments", "shop"},               // svc.ns — cross namespace',
			'		{"api.prod.svc.cluster.local", "shop"}, // already fully qualified',
			'	}',
			'',
			'	for _, q := range queries {',
			'		// Show every candidate (the real resolver stops at the first',
			'		// answer, but the tries are what teach the search list), then',
			'		// report the first candidate CoreDNS actually answers.',
			'		hit := ""',
			'		for _, cand := range qualify(q.name, q.ns) {',
			'			fmt.Printf("resolve %s from %s: try %s\\n", q.name, q.ns, cand)',
			'			fqdn := strings.TrimSuffix(cand, ".")',
			'			if hit == "" && services[fqdn] {',
			'				hit = fqdn',
			'			}',
			'		}',
			'		if hit == "" {',
			'			fmt.Printf("%s from %s -> NXDOMAIN\\n", q.name, q.ns)',
			'			continue',
			'		}',
			'		// Classify which search-list rung answered, for the printout.',
			'		label := "cross namespace"',
			'		if strings.HasPrefix(hit, q.name+"."+q.ns+".") {',
			'			label = "same namespace"',
			'		}',
			'		if hit == q.name {',
			'			label = "fully qualified"',
			'		}',
			'		fmt.Printf("%s from %s -> %s (%s)\\n", q.name, q.ns, hit, label)',
			'	}',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('try db.shop.svc.cluster.local.') !== -1 &&
				flat.indexOf('db from shop -> db.shop.svc.cluster.local (same namespace)') !== -1 &&
				flat.indexOf('db.payments from shop -> db.payments.svc.cluster.local (cross namespace)') !== -1;
		},

		solution: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			'// qualify returns the FQDN candidates the resolver will try, IN ORDER,',
			'// for a name looked up from a pod in namespace podNS.',
			'func qualify(name, podNS string) []string {',
			'	// A trailing dot means "absolute": the resolver skips the search',
			'	// list entirely. This is the ndots escape hatch — the reason',
			'	// "api.stripe.com." avoids 3-4 wasted cluster-suffix lookups.',
			'	if strings.HasSuffix(name, ".") {',
			'		return []string{name}',
			'	}',
			'	// Already a full cluster name: nothing to expand, just anchor it.',
			'	if strings.HasSuffix(name, ".svc.cluster.local") {',
			'		return []string{name + "."}',
			'	}',
			'	// The search list proper. Own namespace comes FIRST — that order',
			'	// is why a bare "db" always means "the db next to me", and why the',
			'	// same binary resolves differently in different namespaces.',
			'	cands := []string{name + "." + podNS + ".svc.cluster.local."}',
			'	// The svc.cluster.local rung only makes sense for svc.ns names:',
			'	// a dotless name plus that suffix could never match any service',
			'	// (real resolvers still try it — this is the simplification).',
			'	if strings.Contains(name, ".") {',
			'		cands = append(cands, name+".svc.cluster.local.")',
			'	}',
			'	// Last resort: the name as-is, for real external hosts.',
			'	return append(cands, name+".")',
			'}',
			'',
			'func main() {',
			'	// The services that exist in this cluster, as CoreDNS knows them.',
			'	services := map[string]bool{',
			'		"db.shop.svc.cluster.local":     true,',
			'		"db.payments.svc.cluster.local": true,',
			'		"api.prod.svc.cluster.local":    true,',
			'	}',
			'',
			'	// Three lookups, all from a pod in namespace "shop".',
			'	queries := []struct{ name, ns string }{',
			'		{"db", "shop"},                        // short name, own namespace',
			'		{"db.payments", "shop"},               // svc.ns — cross namespace',
			'		{"api.prod.svc.cluster.local", "shop"}, // already fully qualified',
			'	}',
			'',
			'	for _, q := range queries {',
			'		// Show every candidate (the real resolver stops at the first',
			'		// answer, but the tries are what teach the search list), then',
			'		// report the first candidate CoreDNS actually answers.',
			'		hit := ""',
			'		for _, cand := range qualify(q.name, q.ns) {',
			'			fmt.Printf("resolve %s from %s: try %s\\n", q.name, q.ns, cand)',
			'			fqdn := strings.TrimSuffix(cand, ".")',
			'			if hit == "" && services[fqdn] {',
			'				hit = fqdn',
			'			}',
			'		}',
			'		if hit == "" {',
			'			fmt.Printf("%s from %s -> NXDOMAIN\\n", q.name, q.ns)',
			'			continue',
			'		}',
			'		// Classify which search-list rung answered, for the printout.',
			'		label := "cross namespace"',
			'		if strings.HasPrefix(hit, q.name+"."+q.ns+".") {',
			'			label = "same namespace"',
			'		}',
			'		if hit == q.name {',
			'			label = "fully qualified"',
			'		}',
			'		fmt.Printf("%s from %s -> %s (%s)\\n", q.name, q.ns, hit, label)',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
