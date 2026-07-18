/* The context System — Scope & Context (Hard). Odin's implicit `context` —
 * allocator, temp_allocator, logger, user_ptr/user_index — flows into every
 * call without appearing in any signature; override a field and everything
 * below sees it, leave the scope and the previous context is restored.
 * Dynamic scoping with a safety fence, vs Go's explicit, immutable
 * context.Context threading. The learner implements the restore mechanism
 * itself: a stack of maps with copy-on-push, where pop doesn't undo anything
 * — it reveals the untouched snapshot underneath.
 */
(function () {
	'use strict';
	var T = GoLearnOdin;

	T.problem({
		id: 'context-system',
		title: 'The context System',
		nav: 'context system',
		difficulty: 'Hard',
		category: 'Scope & Context',
		task: 'Implement Eval — a scoped context store where mutations flow down the call tree and scope exit restores, all 8 tests.',

		prose: [
			'<h2>The context System</h2>' +
			'<p>Every Odin procedure receives a parameter you never declare and never ' +
			'pass: <code>context</code>, a struct carrying the current ' +
			'<code>allocator</code>, <code>temp_allocator</code>, <code>logger</code>, ' +
			'and a user slot (<code>user_ptr</code>/<code>user_index</code>). Assign ' +
			'to a field and everything <em>below</em> you in the call tree sees the ' +
			'new value — then the scope ends and the previous context is back:</p>',
			{ lang: 'odin', code: 'worker :: proc() {\n\t// no context parameter anywhere in sight — yet it’s here\n\tfmt.println(context.user_index)\n}\n\nmain :: proc() {\n\tcontext.user_index = 7    // mutate the current context\n\tworker()                  // prints 7\n\t{\n\t\tcontext.user_index = 42   // scoped override\n\t\tworker()                  // prints 42 — flowed down implicitly\n\t}                             // scope ends: previous context restored\n\tworker()                  // prints 7 again\n}' },
			'<p>This is <strong>dynamic scoping</strong> — a value that reaches ' +
			'callees through the call stack rather than through parameters — with the ' +
			'two guardrails that make it safe: changes flow strictly <em>down</em> ' +
			'(never up or sideways), and every override dies with its scope. It is ' +
			'how Odin threads cross-cutting machinery invisibly: set ' +
			'<code>context.allocator</code> to an arena at the top of a frame and ' +
			'every allocation underneath lands in the arena, no signature touched.</p>' +
			'<p>Go solves the same problem with the opposite instincts — ' +
			'<code>context.Context</code> is <em>explicit</em> and <em>immutable</em>. ' +
			'You thread it by hand through every signature, and you never mutate one; ' +
			'you derive a new value and hand it only to the calls you choose:</p>',
			{ code: 'func worker(ctx context.Context) { // the parameter Odin hides\n\tfmt.Println(ctx.Value(userKey)) // sees only what was handed to it\n}\n\nctx := context.WithValue(context.Background(), userKey, 42) // derive, never mutate\nworker(ctx) // the new value travels only where you pass it' },
			'<p>Same reach — “ambient stuff for everything below this point” — but ' +
			'Odin restores by <em>scope exit</em> where Go restores by ' +
			'<em>never having mutated anything</em>.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement the restore mechanism. <code>Eval</code> replays a script ' +
			'over a context modeled as a stack of maps: <code>"push"</code> enters a ' +
			'scope by snapshotting (copying) the current map, <code>"set"</code> ' +
			'mutates the current map, <code>"read"</code> appends ' +
			'<code>"key=value"</code> of the current value to the output, and ' +
			'<code>"pop"</code> leaves the scope — discarding the copy, which ' +
			'<em>is</em> the restore. Sets before any push mutate the root and ' +
			'persist; an unset key reads as the empty string.</p>',
			{ lang: 'txt', code: 'set("user","7")  push  set("user","42")  read("user")  pop  read("user")\n                                         → "user=42"        → "user=7"\n\nread("missing")                          → "missing="       unset: zero value' },
		],

		starter: [
			'package main',
			'',
			'// Cmd is one step of a context script.',
			'// Op is one of:',
			'//   "push"  enter a scope: snapshot the current context',
			'//   "pop"   leave the scope: the pre-push context is restored',
			'//   "set"   Key = Val in the CURRENT context',
			'//   "read"  append "Key=value" of the current value (unset reads "")',
			'// Scripts are well formed: pops never outnumber pushes.',
			'type Cmd struct {',
			'	Op, Key, Val string',
			'}',
			'',
			'// Eval replays the script and returns everything "read" observed, in',
			'// order. Model the context as a stack of maps: the bottom map is the',
			'// root context, "push" copies the top, "set" mutates the top, and "pop"',
			'// discards the top — Odin’s scoped restore.',
			'func Eval(script []Cmd) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	set := func(k, v string) Cmd { return Cmd{Op: "set", Key: k, Val: v} }',
			'	read := func(k string) Cmd { return Cmd{Op: "read", Key: k} }',
			'	push := Cmd{Op: "push"}',
			'	pop := Cmd{Op: "pop"}',
			'',
			'	type tc struct {',
			'		name   string',
			'		script []Cmd',
			'		want   string',
			'	}',
			'	cases := []tc{',
			'		{"a root set is visible",',
			'			[]Cmd{set("logger", "console"), read("logger")}, "logger=console"},',
			'		{"a scope overrides what it inherited",',
			'			[]Cmd{set("user", "7"), push, set("user", "42"), read("user")}, "user=42"},',
			'		{"pop restores the pre-push value",',
			'			[]Cmd{set("user", "7"), push, set("user", "42"), pop, read("user")}, "user=7"},',
			'		{"nested shadowing unwinds level by level",',
			'			[]Cmd{set("d", "1"), push, set("d", "2"), push, set("d", "3"), read("d"), pop, read("d"), pop, read("d")}, "d=3 d=2 d=1"},',
			'		{"root mutations persist across a scope",',
			'			[]Cmd{set("a", "1"), push, pop, read("a")}, "a=1"},',
			'		{"an unset key reads the zero value",',
			'			[]Cmd{read("missing")}, "missing="},',
			'		{"sibling scopes do not leak into each other",',
			'			[]Cmd{push, set("x", "1"), pop, push, read("x"), pop}, "x="},',
			'		{"unmodified keys are inherited down; scoped ones vanish after pop",',
			'			[]Cmd{set("alloc", "heap"), push, set("user", "42"), read("alloc"), read("user"), pop, read("user")}, "alloc=heap user=42 user="},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%q", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := strings.Join(Eval(append([]Cmd(nil), c.script...)), " ")',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%q", got)',
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
			'// Cmd is one step of a context script.',
			'// Op: "push" | "pop" | "set" | "read" — see the statement.',
			'type Cmd struct {',
			'	Op, Key, Val string',
			'}',
			'',
			'// Eval replays the script over a stack of maps.',
			'//',
			'// The design point is COPY-ON-PUSH: entering a scope duplicates the',
			'// current map, and all sets hit the duplicate. That makes restore free',
			'// — "pop" undoes nothing, it merely discards the copy and reveals the',
			'// untouched snapshot underneath. No undo log, no diffing: the snapshot',
			'// WAS never touched. This is exactly how Odin gets away with mutation:',
			'// a scope that modifies context works on its own copy of the (small)',
			'// context struct, so the parent’s copy needs no repair on exit.',
			'//',
			'//	stack after: set(user,7) push set(user,42)',
			'//',
			'//	  top    → { user: 42 }   ← sets land here; dies at pop',
			'//	  bottom → { user: 7 }    ← the restore target, by inaction',
			'//',
			'func Eval(script []Cmd) []string {',
			'	out := []string{}',
			'	// The bottom map is the root context: what main starts with.',
			'	// Sets before any push land here, which is why they persist —',
			'	// nothing below them ever gets popped.',
			'	stack := []map[string]string{{}}',
			'	for _, c := range script {',
			'		top := stack[len(stack)-1]',
			'		switch c.Op {',
			'		case "push":',
			'			snap := map[string]string{}',
			'			for k, v := range top {',
			'				snap[k] = v // deep enough: values are plain strings',
			'			}',
			'			stack = append(stack, snap)',
			'		case "pop":',
			'			if len(stack) > 1 { // the root has no previous state to restore',
			'				stack = stack[:len(stack)-1]',
			'			}',
			'		case "set":',
			'			top[c.Key] = c.Val // current scope only — the snapshot is safe',
			'		case "read":',
			'			// Missing keys yield "" — Go’s map zero value doubling as',
			'			// ZII: an Odin context field you never set reads as zero.',
			'			out = append(out, c.Key+"="+top[c.Key])',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Pop restores by doing nothing</h3>' +
			'<p>The trick worth taking away is that there is no “restore” code at ' +
			'all:</p>',
			{ code: 'case "push":\n\tsnap := map[string]string{}\n\tfor k, v := range top {\n\t\tsnap[k] = v // pay the copy on entry…\n\t}\n\tstack = append(stack, snap)\ncase "pop":\n\tstack = stack[:len(stack)-1] // …so exit is just forgetting' },
			'<p>All the work happens on entry. Because sets only ever touch the top ' +
			'copy, the map underneath is <em>still</em> the pre-push state — pop ' +
			'reveals it rather than rebuilding it. Real Odin is the same mechanism ' +
			'with the copy made by the compiler: <code>context</code> is a small ' +
			'struct passed by value down the call chain, a scope that assigns to it ' +
			'works on its own copy, and “restoration” is the caller’s copy having ' +
			'never changed. Pass-by-value <em>is</em> the restore.</p>' +
			'<h3>Dynamic scoping, fenced in</h3>' +
			'<p>Textbook dynamic scoping earned its bad reputation because any callee ' +
			'could mutate ambient state and the damage <em>outlived the call</em>. ' +
			'Odin keeps the good half — cross-cutting values reach deep code without ' +
			'threading a parameter through twenty signatures — and fences the bad ' +
			'half: overrides flow only downward and are unwound at scope exit, so no ' +
			'callee can alter its caller’s world. The flagship use is allocators: set ' +
			'<code>context.allocator</code> to an arena, call ordinary code that has ' +
			'never heard of arenas, and everything it allocates lands there; the ' +
			'previous allocator is back the moment the scope ends.</p>' +
			'<h3>The Go comparison</h3>' +
			'<p>Go’s <code>context.Context</code> reaches the same values by opposite ' +
			'means: the parameter is explicit (the <code>ctx</code> threaded through ' +
			'every signature — visible cost, visible flow), and derivation replaces ' +
			'mutation (<code>WithValue</code>/<code>WithCancel</code> build a new ' +
			'immutable node chaining to the old, so “restore” is simply that nobody ' +
			'else ever saw your derived value). Note what each culture uses it for: ' +
			'Go contexts chiefly carry <em>cancellation and deadlines</em>, with ' +
			'values as a sparingly-used extra; Odin’s context carries <em>capabilities' +
			'</em> — allocator, logger — and has no cancellation story at all. Same ' +
			'word, same “ambient for the subtree” shape, different cargo.</p>',
		],
		complexity: { time: 'O(n·k) — each push copies the k live keys; set/read/pop are O(1)', space: 'O(d·k) — one k-key snapshot per open scope' },
	});
})();
