/* Env Config — Configuration (Medium). The kubelet's env-assembly pass as a
 * pure function: envFrom sources expanded in order, explicit env entries
 * layered on top, valueFrom refs resolved against ConfigMaps, with the
 * optional flag deciding between "skip silently" and "the pod never starts".
 * The harness probes each precedence rule one at a time, including the two
 * error paths that show up as CreateContainerConfigError in real clusters.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// The assembly pipeline left to right: each stage may overwrite what the
	// previous one produced, and the explicit env list always has the last
	// word. Marker ids namespaced (dgArrowKEV) — every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-label="env assembly: envFrom sources apply in order, then explicit env entries overwrite them; the result is frozen at container start">' +
		'<text x="20" y="24" class="lbl">the kubelet assembles the environment once, at container START</text>' +
		'<rect x="15" y="44" width="120" height="60" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="75" y="68" text-anchor="middle">envFrom #1</text>' +
		'<text x="75" y="88" text-anchor="middle" class="lbl">every key of the CM</text>' +
		'<rect x="175" y="44" width="120" height="60" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="235" y="68" text-anchor="middle">envFrom #2</text>' +
		'<text x="235" y="88" text-anchor="middle" class="lbl">overwrites duplicates</text>' +
		'<rect x="335" y="44" width="120" height="60" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="395" y="68" text-anchor="middle">env (explicit)</text>' +
		'<text x="395" y="88" text-anchor="middle" class="lbl">always wins</text>' +
		'<path d="M 137 74 L 173 74" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowKEV)"/>' +
		'<path d="M 297 74 L 333 74" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowKEV)"/>' +
		'<path d="M 395 106 L 395 136" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowKEVok)"/>' +
		'<rect x="315" y="140" width="160" height="34" rx="6" fill="none" stroke="var(--ok)"/>' +
		'<text x="395" y="162" text-anchor="middle" class="lbl">container environment</text>' +
		'<text x="20" y="162" class="lbl" style="fill:var(--warn)">editing the ConfigMap later changes NONE of this —</text>' +
		'<text x="20" y="178" class="lbl" style="fill:var(--warn)">env vars need a rollout restart to pick it up</text>' +
		'<defs>' +
		'<marker id="dgArrowKEV" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowKEVok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'env-config',
		title: 'Environment Assembly: envFrom, env, and Who Wins',
		nav: 'env & config',
		difficulty: 'Medium',
		category: 'Configuration',
		task: 'Implement BuildEnv — envFrom in order, explicit env on top, optional refs skipped, required ones erroring. All 7 tests.',

		prose: [
			'<h2>Environment Assembly: envFrom, env, and Who Wins</h2>' +
			'<p>Your Go service works locally, but in the cluster it connects to the ' +
			'wrong database. <code>kubectl exec &lt;pod&gt; -- env | grep DATABASE_URL</code> ' +
			'shows a value you never put in your ConfigMap — or rather, a value from a ' +
			'<em>different</em> ConfigMap than the one you edited. Nothing is broken: ' +
			'the container\'s environment is assembled from several sources, and the ' +
			'sources have <strong>precedence rules</strong>.</p>' +
			'<p>When the kubelet starts a container, it builds the env in two passes:</p>' +
			'<ul>' +
			'<li><strong><code>envFrom</code> first, in list order.</strong> Each entry ' +
			'names a ConfigMap and dumps <em>every</em> key of its <code>Data</code> into ' +
			'the environment. When two sources define the same key, the ' +
			'<em>later</em> source in the list overwrites the earlier one.</li>' +
			'<li><strong>Explicit <code>env</code> entries second, in list order.</strong> ' +
			'These always beat anything from <code>envFrom</code>, and among duplicates ' +
			'in the list itself, the last one wins. An entry either carries a literal ' +
			'<code>Value</code>, or a <code>valueFrom</code> reference ' +
			'(<code>FromConfigMap</code> + <code>Key</code>) that pulls one key out of ' +
			'one ConfigMap.</li>' +
			'</ul>' +
			'<p>Missing data is where pods die: a reference to a ConfigMap or key that ' +
			'does not exist is an error — the container never starts — <em>unless</em> ' +
			'the entry is marked <code>Optional</code>, in which case it is skipped ' +
			'silently (the variable simply is not set).</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>BuildEnv(envFrom, env, cms)</code>: return the final ' +
			'environment as a map. Errors use the exact messages ' +
			'<code>configmap &lt;name&gt; not found</code> and ' +
			'<code>key &lt;key&gt; not found in &lt;name&gt;</code>.</p>',
			{ code: 'envFrom: [common-config, prod-config]      // prod-config overwrites common-config\nenv:     [{DATABASE_URL, "db.override"}]  // and this beats both\n\ncommon-config: {DATABASE_URL: db.dev, LOG_LEVEL: info}\nprod-config:   {DATABASE_URL: db.prod}\n\nBuildEnv(...) → {DATABASE_URL: "db.override", LOG_LEVEL: "info"}', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// ConfigMap is the API object: a named bag of string key/value pairs.',
			'type ConfigMap struct {',
			'	Name string',
			'	Data map[string]string',
			'}',
			'',
			'// EnvVar is one explicit env entry on the container. Exactly one of the',
			'// two forms is used per entry:',
			'//   - literal:  Value is set, FromConfigMap is ""',
			'//   - valueFrom: FromConfigMap + Key name a single ConfigMap key',
			'// Optional applies to the valueFrom form: a missing ConfigMap or key is',
			'// skipped instead of erroring.',
			'type EnvVar struct {',
			'	Name          string',
			'	Value         string',
			'	FromConfigMap string',
			'	Key           string',
			'	Optional      bool',
			'}',
			'',
			'// EnvFrom names a whole ConfigMap whose every key becomes an env var.',
			'// Optional: a missing ConfigMap is skipped instead of erroring.',
			'type EnvFrom struct {',
			'	ConfigMap string',
			'	Optional  bool',
			'}',
			'',
			'// BuildEnv assembles the container environment:',
			'//   1. envFrom sources in order — every key of each named ConfigMap,',
			'//      later sources overwriting earlier duplicates',
			'//   2. explicit env entries in order — always overwriting envFrom,',
			'//      last duplicate in the list winning',
			'// Missing ConfigMap → error "configmap <name> not found"; missing key →',
			'// "key <key> not found in <name>" — unless the entry is Optional, in',
			'// which case it is skipped silently.',
			'func BuildEnv(envFrom []EnvFrom, env []EnvVar, cms []ConfigMap) (map[string]string, error) {',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"sort"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'// renderEnv flattens a result map into deterministic "k=v k=v" form —',
			'// map iteration order is random, so sort before comparing.',
			'func renderEnv(env map[string]string, err error) string {',
			'	if err != nil {',
			'		return "error: " + err.Error()',
			'	}',
			'	keys := make([]string, 0, len(env))',
			'	for k := range env {',
			'		keys = append(keys, k)',
			'	}',
			'	sort.Strings(keys)',
			'	parts := make([]string, 0, len(keys))',
			'	for _, k := range keys {',
			'		parts = append(parts, k+"="+env[k])',
			'	}',
			'	return strings.Join(parts, " ")',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name    string',
			'		envFrom []EnvFrom',
			'		env     []EnvVar',
			'		cms     []ConfigMap',
			'		want    string',
			'	}',
			'	cases := []tc{',
			'		{"envFrom dumps every key of the named ConfigMap",',
			'			[]EnvFrom{{ConfigMap: "common-config"}},',
			'			nil,',
			'			[]ConfigMap{{Name: "common-config", Data: map[string]string{"DATABASE_URL": "db.dev", "LOG_LEVEL": "info"}}},',
			'			"DATABASE_URL=db.dev LOG_LEVEL=info"},',
			'		{"two envFrom sources overlap: the LATER source wins",',
			'			[]EnvFrom{{ConfigMap: "common-config"}, {ConfigMap: "prod-config"}},',
			'			nil,',
			'			[]ConfigMap{',
			'				{Name: "common-config", Data: map[string]string{"DATABASE_URL": "db.dev", "LOG_LEVEL": "info"}},',
			'				{Name: "prod-config", Data: map[string]string{"DATABASE_URL": "db.prod"}},',
			'			},',
			'			"DATABASE_URL=db.prod LOG_LEVEL=info"},',
			'		{"explicit env always beats envFrom for the same name",',
			'			[]EnvFrom{{ConfigMap: "common-config"}},',
			'			[]EnvVar{{Name: "DATABASE_URL", Value: "db.override"}},',
			'			[]ConfigMap{{Name: "common-config", Data: map[string]string{"DATABASE_URL": "db.dev", "LOG_LEVEL": "info"}}},',
			'			"DATABASE_URL=db.override LOG_LEVEL=info"},',
			'		{"valueFrom resolves one key out of one ConfigMap",',
			'			nil,',
			'			[]EnvVar{{Name: "DB_HOST", FromConfigMap: "db-config", Key: "host"}},',
			'			[]ConfigMap{{Name: "db-config", Data: map[string]string{"host": "pg.internal", "port": "5432"}}},',
			'			"DB_HOST=pg.internal"},',
			'		{"optional missing key: entry skipped, variable simply absent",',
			'			nil,',
			'			[]EnvVar{',
			'				{Name: "FEATURE_FLAG", FromConfigMap: "db-config", Key: "no-such-key", Optional: true},',
			'				{Name: "DB_HOST", FromConfigMap: "db-config", Key: "host"},',
			'			},',
			'			[]ConfigMap{{Name: "db-config", Data: map[string]string{"host": "pg.internal"}}},',
			'			"DB_HOST=pg.internal"},',
			'		{"required missing ConfigMap: the container never starts",',
			'			[]EnvFrom{{ConfigMap: "ghost-config"}},',
			'			nil,',
			'			[]ConfigMap{{Name: "common-config", Data: map[string]string{"LOG_LEVEL": "info"}}},',
			'			"error: configmap ghost-config not found"},',
			'		{"duplicate explicit names: the LAST entry in the list wins",',
			'			nil,',
			'			[]EnvVar{{Name: "LOG_LEVEL", Value: "debug"}, {Name: "LOG_LEVEL", Value: "warn"}},',
			'			nil,',
			'			"LOG_LEVEL=warn"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  c.want,',
			'		}',
			'		runCase(r, func() {',
			'			// Copy the slices: a user implementation must not be able',
			'			// to corrupt the case table for later comparisons. (The',
			'			// ConfigMap Data maps are shared — treat them as read-only.)',
			'			got, err := BuildEnv(',
			'				append([]EnvFrom(nil), c.envFrom...),',
			'				append([]EnvVar(nil), c.env...),',
			'				append([]ConfigMap(nil), c.cms...))',
			'			rendered := renderEnv(got, err)',
			'			r["pass"] = rendered == c.want',
			'			r["got"] = rendered',
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
			'import "fmt"',
			'',
			'// ConfigMap is the API object: a named bag of string key/value pairs.',
			'type ConfigMap struct {',
			'	Name string',
			'	Data map[string]string',
			'}',
			'',
			'// EnvVar is one explicit env entry on the container. Exactly one of the',
			'// two forms is used per entry:',
			'//   - literal:  Value is set, FromConfigMap is ""',
			'//   - valueFrom: FromConfigMap + Key name a single ConfigMap key',
			'type EnvVar struct {',
			'	Name          string',
			'	Value         string',
			'	FromConfigMap string',
			'	Key           string',
			'	Optional      bool',
			'}',
			'',
			'// EnvFrom names a whole ConfigMap whose every key becomes an env var.',
			'type EnvFrom struct {',
			'	ConfigMap string',
			'	Optional  bool',
			'}',
			'',
			'// BuildEnv assembles the container environment the way the kubelet does:',
			'// two ordered passes over ONE map. Precedence needs no special casing —',
			'// it falls out of write order, because a map write overwrites: envFrom',
			'// runs first (later sources clobber earlier ones), explicit env runs',
			'// second (clobbering envFrom, and its own earlier duplicates).',
			'func BuildEnv(envFrom []EnvFrom, env []EnvVar, cms []ConfigMap) (map[string]string, error) {',
			'	// Index the ConfigMaps once. In a real kubelet this is the API',
			'	// lookup; here a name → object map plays the API server.',
			'	byName := make(map[string]ConfigMap, len(cms))',
			'	for _, cm := range cms {',
			'		byName[cm.Name] = cm',
			'	}',
			'',
			'	out := map[string]string{}',
			'',
			'	// Pass 1: envFrom, in list order. The k8s API deliberately keeps',
			'	// these as a LIST, not a set: order is the only tiebreak between',
			'	// sources that define the same key.',
			'	for _, src := range envFrom {',
			'		cm, ok := byName[src.ConfigMap]',
			'		if !ok {',
			'			if src.Optional {',
			'				continue // optional: pretend the source was never listed',
			'			}',
			'			// Required and missing: in a real cluster the pod sits in',
			'			// CreateContainerConfigError until the ConfigMap appears.',
			'			return nil, fmt.Errorf("configmap %s not found", src.ConfigMap)',
			'		}',
			'		for k, v := range cm.Data {',
			'			out[k] = v',
			'		}',
			'	}',
			'',
			'	// Pass 2: explicit env, in list order — running after envFrom is',
			'	// what makes explicit entries always win.',
			'	for _, e := range env {',
			'		if e.FromConfigMap == "" {',
			'			out[e.Name] = e.Value',
			'			continue',
			'		}',
			'		// valueFrom: two distinct failure modes (no such ConfigMap vs.',
			'		// no such key) get distinct messages, because that is exactly',
			'		// what you need to know when debugging the event log.',
			'		cm, ok := byName[e.FromConfigMap]',
			'		if !ok {',
			'			if e.Optional {',
			'				continue',
			'			}',
			'			return nil, fmt.Errorf("configmap %s not found", e.FromConfigMap)',
			'		}',
			'		v, ok := cm.Data[e.Key]',
			'		if !ok {',
			'			if e.Optional {',
			'				continue // skipped: the variable is simply never set',
			'			}',
			'			return nil, fmt.Errorf("key %s not found in %s", e.Key, e.FromConfigMap)',
			'		}',
			'		out[e.Name] = v',
			'	}',
			'',
			'	return out, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Precedence is just write order</h3>' +
			'<p>The whole rule set collapses into one idea: build a single map, write ' +
			'the sources into it <em>in the order the API defines</em>, and let map ' +
			'overwrites express precedence. <code>envFrom</code> first (later sources ' +
			'beat earlier ones), explicit <code>env</code> second (beating everything, ' +
			'including its own earlier duplicates). No priority numbers, no merge ' +
			'logic — order in the pod spec <em>is</em> the priority.</p>',
			{ code: 'out := map[string]string{}\nfor _, src := range envFrom { /* dump cm.Data */ }  // pass 1\nfor _, e := range env       { out[e.Name] = ... }   // pass 2 wins by running last' },
			'<h3>Why the pod sees a stale value</h3>' +
			'<p>The trap in the opening scenario: env vars are resolved ' +
			'<strong>once, when the container starts</strong>. Edit the ConfigMap all ' +
			'you like — <code>kubectl get cm app-config -o yaml</code> shows the new ' +
			'value, but every running pod keeps the environment it was born with. ' +
			'Only ConfigMaps mounted as <em>volumes</em> update in place (the kubelet ' +
			're-syncs the files within about a minute); <code>env</code> and ' +
			'<code>envFrom</code> never do. The fix is a fresh set of containers:</p>' +
			'<div class="tip"><code>kubectl rollout restart deploy/&lt;name&gt;</code> ' +
			'— it bumps an annotation in the pod template, which triggers an ordinary ' +
			'rolling update; every new pod re-reads the ConfigMap at start.</div>' +
			'<h3>On the cluster / when debugging</h3>' +
			'<p>First move: see what the container <em>actually</em> got, not what the ' +
			'YAML says it should get — <code>kubectl exec &lt;pod&gt; -- env | sort</code>. ' +
			'If the value is wrong, walk the precedence chain in the pod spec ' +
			'(<code>kubectl get pod &lt;pod&gt; -o yaml</code>): is a later ' +
			'<code>envFrom</code> source or an explicit <code>env</code> entry ' +
			'shadowing the key you edited? If the pod will not start at all, ' +
			'<code>kubectl describe pod</code> shows ' +
			'<code>CreateContainerConfigError</code> with the missing ConfigMap or key ' +
			'named in the events — that is the non-<code>Optional</code> error path ' +
			'you implemented. And if the value is simply stale, remember the rule: ' +
			'env is start-time only; <code>kubectl rollout restart</code>, then ' +
			'verify with <code>exec ... -- env</code> again.</p>',
		],
		complexity: { time: 'O(f·k + e) — f envFrom sources × k keys each, plus e env entries', space: 'O(total keys)' },
	});
})();
