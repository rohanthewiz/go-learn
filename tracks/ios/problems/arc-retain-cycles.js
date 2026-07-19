/* ARC & Retain Cycles — Swift: Memory & Closures (Hard). Automatic Reference
 * Counting as a runnable model: objects deallocate the instant their strong
 * refcount from LIVE objects and roots hits zero, the release cascade runs a
 * FIFO worklist (deterministic deinit trace), weak refs zero out, unowned
 * refs count like weak — and a strong cycle's members survive every release,
 * which is exactly what a leak IS. The harness pins the two canonical
 * teaching graphs (Parent<->Child, the delegate cycle) in both broken and
 * fixed forms. The unowned access-after-dealloc crash is a prose/comment
 * contract only — yaegi writes recovered panics to stderr, so no harness
 * case may panic.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// The item's two headline graphs side by side: the strong backref keeps
	// both refcounts pinned above zero forever; making it weak lets the
	// cascade run and ARC zeroes the dangling weak ref. Marker ids
	// namespaced (dgArrowIOSRC / dgArrowIOSRCw) because every track's SVGs
	// share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 240" width="560" height="240" role="img" aria-label="left: Parent and Child hold strong references to each other so neither refcount reaches zero and both leak; right: the child backref is weak, so releasing the root deallocates both and the weak reference is zeroed">' +
		'<text x="20" y="22" class="lbl">the cycle (left) vs the weak backref (right) — after the root lets go</text>' +
		// ---- left: strong cycle ----
		'<text x="140" y="46" text-anchor="middle" class="lbl">strong both ways: both LEAK</text>' +
		'<rect x="75" y="58" width="130" height="40" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="140" y="83" text-anchor="middle">Parent rc=1</text>' +
		'<rect x="75" y="150" width="130" height="40" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="140" y="175" text-anchor="middle">Child rc=1</text>' +
		'<path d="M 120 98 L 120 146" fill="none" stroke="var(--warn)" stroke-width="2" marker-end="url(#dgArrowIOSRC)"/>' +
		'<text x="106" y="126" text-anchor="end" class="lbl">child (strong)</text>' +
		'<path d="M 160 146 L 160 102" fill="none" stroke="var(--warn)" stroke-width="2" marker-end="url(#dgArrowIOSRC)"/>' +
		'<text x="172" y="126" class="lbl">parent (strong)</text>' +
		'<text x="140" y="216" text-anchor="middle" class="lbl" style="fill:var(--warn)">each keeps the other alive: no deinit, ever</text>' +
		// ---- right: weak backref ----
		'<text x="420" y="46" text-anchor="middle" class="lbl">weak backref: both dealloc</text>' +
		'<rect x="355" y="58" width="130" height="40" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="420" y="83" text-anchor="middle">Parent rc=0 ✓</text>' +
		'<rect x="355" y="150" width="130" height="40" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="420" y="175" text-anchor="middle">Child rc=0 ✓</text>' +
		'<path d="M 400 98 L 400 146" fill="none" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowIOSRC)"/>' +
		'<text x="386" y="126" text-anchor="end" class="lbl">child (strong)</text>' +
		'<path d="M 440 146 L 440 102" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowIOSRCw)"/>' +
		'<text x="452" y="126" class="lbl">weak: rc +0</text>' +
		'<text x="420" y="216" text-anchor="middle" class="lbl" style="fill:var(--ok)">deinit Parent, deinit Child — weak ref zeroed to nil</text>' +
		'<defs>' +
		'<marker id="dgArrowIOSRC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowIOSRCw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'arc-retain-cycles',
		title: 'ARC & Retain Cycles: The Release Cascade',
		nav: 'arc retain cycles',
		difficulty: 'Hard',
		category: 'Swift: Memory & Closures',
		task: 'Implement ARC over an object graph: StrongCount, the Release cascade with its deterministic deinit trace, zeroing weak reads, and Leaks — the survivors after every root lets go.',

		prose: [
			'<h2>ARC &amp; Retain Cycles: The Release Cascade</h2>' +
			'<p>Every visit to the profile screen costs 20&nbsp;MB that never comes ' +
			'back. In Xcode\'s memory graph debugger you find six copies of ' +
			'<code>ProfileVC</code> — one per visit — each pinned alive by an object ' +
			'it owns. Nothing crashed; nothing ever will. The app just eats memory ' +
			'until the OS kills it in the background. That is what a retain cycle ' +
			'looks like from the outside. From the inside, it is two lines:</p>',
			{ lang: 'swift', code: 'class Parent {\n    var child: Child?\n    deinit { print("deinit Parent") }\n}\nclass Child {\n    var parent: Parent?      // strong backref: the bug\n    deinit { print("deinit Child") }\n}\n\nvar p: Parent? = Parent()\np!.child = Child()\np!.child!.parent = p\np = nil\n// console: (nothing — neither deinit ever prints)' },
			'<p>Swift manages memory with <strong>Automatic Reference Counting</strong>: ' +
			'every class instance carries a count of the <em>strong</em> references ' +
			'to it, and the instant that count reaches zero the object runs ' +
			'<code>deinit</code> and releases its own strong references — which can ' +
			'drop <em>their</em> targets to zero, and so on: a release cascade. ' +
			'Three reference kinds, three refcount behaviors:</p>' +
			'<ul>' +
			'<li><strong><code>strong</code></strong> (the default) — counts. An ' +
			'object lives exactly as long as some live object, local, or global ' +
			'holds it strongly.</li>' +
			'<li><strong><code>weak</code></strong> — counts <em>zero</em>. Must be ' +
			'Optional, because ARC <strong>zeroes</strong> it the moment the ' +
			'referent deallocates: reading it after gives <code>nil</code>, ' +
			'safely.</li>' +
			'<li><strong><code>unowned</code></strong> — also counts zero, but ' +
			'non-optional and <em>not</em> zeroed: reading it after the referent ' +
			'dies traps with <code>Fatal error: Attempted to read an unowned ' +
			'reference but object 0x... was already deallocated</code>.</li>' +
			'</ul>' +
			'<p>ARC is not a garbage collector. There is no cycle detector, no ' +
			'mark-and-sweep pass, no pause: a group of objects holding each other ' +
			'strongly keeps every member\'s count above zero <em>forever</em>, even ' +
			'when nothing outside the group can reach them. Change the backref to ' +
			'<code>weak var parent</code> and the same program prints:</p>',
			{ lang: 'txt', code: 'deinit Parent\ndeinit Child' },
			DIAGRAM +
			'<h3>The cycle every iOS dev ships once: the delegate</h3>',
			{ lang: 'swift', code: 'final class ProfileVC: UIViewController, NetworkClientDelegate {\n    let client = NetworkClient()          // VC -> client (strong)\n    override func viewDidLoad() {\n        super.viewDidLoad()\n        client.delegate = self            // client -> VC ... cycle!\n    }\n    deinit { print("deinit ProfileVC") }  // never prints\n}\n\nfinal class NetworkClient {\n    var delegate: NetworkClientDelegate?  // the one-word bug:\n    // weak var delegate: NetworkClientDelegate?   <- the fix\n}' },
			'<p>This is why every delegate property in UIKit — ' +
			'<code>UITableView.delegate</code>, <code>UITextField.delegate</code>, ' +
			'all of them — is declared <code>weak</code>: the convention is that ' +
			'owners point down with strong references and everything pointing back ' +
			'up the ownership tree is weak or unowned.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement ARC itself over a modeled object graph. Objects are added ' +
			'in declaration order with named refs (<code>S</code>/<code>W</code>/' +
			'<code>U</code> build strong/weak/unowned refs); <code>Root(name)</code> ' +
			'records a strong reference from outside the graph (a local or global ' +
			'variable). You write:</p>' +
			'<ul>' +
			'<li><code>StrongCount(name)</code> — strong refs from <em>live</em> ' +
			'objects plus root entries. Weak and unowned contribute zero.</li>' +
			'<li><code>Release(root)</code> — remove one root entry, then run the ' +
			'cascade with a FIFO worklist: when an object\'s count hits zero it ' +
			'deallocates (append <code>"deinit &lt;name&gt;"</code> to the trace), ' +
			'its strong refs release in declaration order, and every target that ' +
			'reaches zero joins the worklist in insertion order.</li>' +
			'<li><code>ReadWeak(owner, ref)</code> — the referent\'s name, or ' +
			'<code>"nil"</code> once it deallocated (the zeroing guarantee).</li>' +
			'<li><code>Alive()</code> — survivors, in declaration order.</li>' +
			'<li><code>Leaks()</code> — release every remaining root; whatever ' +
			'still lives is unreachable-but-alive: the leaked cycle members.</li>' +
			'</ul>' +
			'<div class="tip">The model\'s FIFO worklist makes the deinit trace ' +
			'deterministic and easy to reason about. Real ARC releases recursively ' +
			'— <code>deinit</code> of A releases B, whose <code>deinit</code> runs ' +
			'to completion (releasing what <em>it</em> owns) before A\'s next ' +
			'property is released — so sibling-vs-grandchild ordering can differ ' +
			'from this model. What never differs: <em>which</em> objects ' +
			'deallocate, and that an owner\'s deinit precedes its ownees\'.</div>',
		],

		starter: [
			'package main',
			'',
			'// Ref is one named reference stored in an object: `var child: Child`',
			'// becomes Ref{Name: "child", To: "Child", Kind: "strong"}.',
			'type Ref struct {',
			'	Name string // property name ("child", "delegate", ...)',
			'	To   string // target object\'s name',
			'	Kind string // "strong" | "weak" | "unowned"',
			'}',
			'',
			'// S, W, U build the three reference kinds — reads like the Swift',
			'// declaration: S("child", "Child") is `var child: Child`.',
			'func S(name, to string) Ref { return Ref{Name: name, To: to, Kind: "strong"} }',
			'func W(name, to string) Ref { return Ref{Name: name, To: to, Kind: "weak"} }',
			'func U(name, to string) Ref { return Ref{Name: name, To: to, Kind: "unowned"} }',
			'',
			'// Obj is one class instance. dead flips when ARC deallocates it; a',
			'// dead object\'s refs no longer count toward anyone\'s refcount.',
			'type Obj struct {',
			'	Name string',
			'	Refs []Ref',
			'	dead bool',
			'}',
			'',
			'// Graph holds objects in DECLARATION ORDER (Alive and Leaks report in',
			'// this order) plus the root set: one entry per strong reference held',
			'// from outside the graph (locals, globals). The same name may appear',
			'// twice — two variables holding the same object.',
			'type Graph struct {',
			'	objs  []*Obj',
			'	roots []string',
			'}',
			'',
			'func NewGraph() *Graph {',
			'	return &Graph{}',
			'}',
			'',
			'func (g *Graph) Add(name string, refs ...Ref) {',
			'	g.objs = append(g.objs, &Obj{Name: name, Refs: refs})',
			'}',
			'',
			'func (g *Graph) Root(name string) {',
			'	g.roots = append(g.roots, name)',
			'}',
			'',
			'// find is a linear lookup by name (nil when absent). Provided: slices',
			'// everywhere, no maps — every iteration in this file is deterministic.',
			'func (g *Graph) find(name string) *Obj {',
			'	for _, o := range g.objs {',
			'		if o.Name == name {',
			'			return o',
			'		}',
			'	}',
			'	return nil',
			'}',
			'',
			'// StrongCount is the number ARC tracks for name: strong refs held by',
			'// LIVE objects (dead objects\' refs are gone) plus root entries.',
			'// Weak and unowned refs contribute ZERO — that is their entire point.',
			'func (g *Graph) StrongCount(name string) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Release removes ONE occurrence of root from the root set (a local',
			'// variable going out of scope / being set to nil), then runs the ARC',
			'// cascade and returns the deinit trace, e.g. ["deinit Parent",',
			'// "deinit Child"].',
			'//',
			'// The cascade, pinned for determinism (FIFO worklist):',
			'//   1. if the released object\'s StrongCount is now 0, seed the',
			'//      worklist with it',
			'//   2. pop the FRONT of the worklist; skip it if already dead; else',
			'//      mark it dead and append "deinit <name>" to the trace',
			'//   3. walk its refs in declaration order: for each STRONG ref whose',
			'//      live target now has StrongCount 0, append the target to the',
			'//      BACK of the worklist',
			'//   4. repeat until the worklist drains',
			'func (g *Graph) Release(root string) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// ReadWeak reads owner\'s named ref the way a zeroing weak reference',
			'// behaves: the target\'s name while it lives, "nil" after it',
			'// deallocated. (unowned is NOT zeroed in real Swift — reading it',
			'// after dealloc traps: "Fatal error: Attempted to read an unowned',
			'// reference but object 0x... was already deallocated". The model',
			'// keeps every read safe; the crash contract lives here, in prose',
			'// and comments only.)',
			'func (g *Graph) ReadWeak(owner, ref string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// Alive lists the objects still alive, in declaration order.',
			'func (g *Graph) Alive() []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Leaks releases every remaining root (front to back) and returns',
			'// Alive() — objects that survive with no path from any root are',
			'// exactly the members of strong reference cycles: the leaks.',
			'func (g *Graph) Leaks() []string {',
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
			'// fmtL renders a trace or object list the way the cases pin it.',
			'func fmtL(xs []string) string {',
			'	return "[" + strings.Join(xs, ", ") + "]"',
			'}',
			'',
			'// parentChild builds THE teaching graph: root -> Parent -> Child with',
			'// the backref\'s kind chosen by the caller (the one-word bug/fix).',
			'func parentChild(back func(string, string) Ref) *Graph {',
			'	g := NewGraph()',
			'	g.Add("Parent", S("child", "Child"))',
			'	g.Add("Child", back("parent", "Parent"))',
			'	g.Root("Parent")',
			'	return g',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"StrongCount: strong refs + roots count; a weak backref counts zero",',
			'			"strongParent=2 strongChild=1 weakParent=1",',
			'			func() string {',
			'				cyc := parentChild(S)',
			'				fixed := parentChild(W)',
			'				return fmt.Sprintf("strongParent=%d strongChild=%d weakParent=%d",',
			'					cyc.StrongCount("Parent"), cyc.StrongCount("Child"), fixed.StrongCount("Parent"))',
			'			}},',
			'		{"linear ownership: releasing the root cascades — the owner deinits, then what it owned",',
			'			"trace=[deinit Owner, deinit Owned] alive=[]",',
			'			func() string {',
			'				g := NewGraph()',
			'				g.Add("Owner", S("owned", "Owned"))',
			'				g.Add("Owned")',
			'				g.Root("Owner")',
			'				return fmt.Sprintf("trace=%s alive=%s", fmtL(g.Release("Owner")), fmtL(g.Alive()))',
			'			}},',
			'		{"THE retain cycle: Parent <-> Child both strong — the root lets go and NOTHING deinits",',
			'			"trace=[] alive=[Parent, Child]",',
			'			func() string {',
			'				g := parentChild(S)',
			'				return fmt.Sprintf("trace=%s alive=%s", fmtL(g.Release("Parent")), fmtL(g.Alive()))',
			'			}},',
			'		{"the one-word fix: weak var parent — both dealloc, owner first",',
			'			"trace=[deinit Parent, deinit Child] alive=[]",',
			'			func() string {',
			'				g := parentChild(W)',
			'				return fmt.Sprintf("trace=%s alive=%s", fmtL(g.Release("Parent")), fmtL(g.Alive()))',
			'			}},',
			'		{"zeroing weak: the survivor\'s weak backref reads the object before, nil after",',
			'			"before=Parent after=nil alive=[Child]",',
			'			func() string {',
			'				g := NewGraph()',
			'				g.Add("Parent")',
			'				g.Add("Child", W("parent", "Parent"))',
			'				g.Root("Parent")',
			'				g.Root("Child") // Child is separately owned: it survives',
			'				before := g.ReadWeak("Child", "parent")',
			'				g.Release("Parent")',
			'				return fmt.Sprintf("before=%s after=%s alive=%s", before, g.ReadWeak("Child", "parent"), fmtL(g.Alive()))',
			'			}},',
			'		{"the delegate cycle: VC -> client, client.delegate -> VC (strong) — Leaks fingers both",',
			'			"leaks=[ProfileVC, NetworkClient]",',
			'			func() string {',
			'				g := NewGraph()',
			'				g.Add("ProfileVC", S("client", "NetworkClient"))',
			'				g.Add("NetworkClient", S("delegate", "ProfileVC"))',
			'				g.Root("ProfileVC")',
			'				return fmt.Sprintf("leaks=%s", fmtL(g.Leaks()))',
			'			}},',
			'		{"weak var delegate: the same graph drains completely — deinit ProfileVC, then its client",',
			'			"trace=[deinit ProfileVC, deinit NetworkClient] leaks=[]",',
			'			func() string {',
			'				g := NewGraph()',
			'				g.Add("ProfileVC", S("client", "NetworkClient"))',
			'				g.Add("NetworkClient", W("delegate", "ProfileVC"))',
			'				g.Root("ProfileVC")',
			'				tr := g.Release("ProfileVC")',
			'				return fmt.Sprintf("trace=%s leaks=%s", fmtL(tr), fmtL(g.Leaks()))',
			'			}},',
			'		{"unowned counts like weak for refcounting: Customer and its CreditCard both dealloc",',
			'			"trace=[deinit Customer, deinit CreditCard]",',
			'			func() string {',
			'				g := NewGraph()',
			'				g.Add("Customer", S("card", "CreditCard"))',
			'				g.Add("CreditCard", U("customer", "Customer"))',
			'				g.Root("Customer")',
			'				return fmt.Sprintf("trace=%s", fmtL(g.Release("Customer")))',
			'			}},',
			'		{"two strong owners (two roots): the first release deallocs nothing — the second lets go",',
			'			"first=[] second=[deinit Shared]",',
			'			func() string {',
			'				g := NewGraph()',
			'				g.Add("Shared")',
			'				g.Root("Shared")',
			'				g.Root("Shared")',
			'				first := g.Release("Shared")',
			'				second := g.Release("Shared")',
			'				return fmt.Sprintf("first=%s second=%s", fmtL(first), fmtL(second))',
			'			}},',
			'		{"the FIFO cascade order, pinned: refs release in declaration order, worklist in insertion order",',
			'			"trace=[deinit A, deinit B, deinit C, deinit D]",',
			'			func() string {',
			'				g := NewGraph()',
			'				g.Add("A", S("b", "B"), S("c", "C"))',
			'				g.Add("B", S("d", "D"))',
			'				g.Add("C")',
			'				g.Add("D")',
			'				g.Root("A")',
			'				return fmt.Sprintf("trace=%s", fmtL(g.Release("A")))',
			'			}},',
			'		{"a cycle hiding behind an owner: the entry object deinits, the B<->C cycle leaks",',
			'			"trace=[deinit A] leaks=[B, C]",',
			'			func() string {',
			'				g := NewGraph()',
			'				g.Add("A", S("b", "B"))',
			'				g.Add("B", S("c", "C"))',
			'				g.Add("C", S("b", "B"))',
			'				g.Root("A")',
			'				tr := g.Release("A")',
			'				return fmt.Sprintf("trace=%s leaks=%s", fmtL(tr), fmtL(g.Leaks()))',
			'			}},',
			'		{"a three-object cycle A -> B -> C -> A: Leaks reports all three, in declaration order",',
			'			"leaks=[A, B, C]",',
			'			func() string {',
			'				g := NewGraph()',
			'				g.Add("A", S("b", "B"))',
			'				g.Add("B", S("c", "C"))',
			'				g.Add("C", S("a", "A"))',
			'				g.Root("A")',
			'				return fmt.Sprintf("leaks=%s", fmtL(g.Leaks()))',
			'			}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			got := c.got()',
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
			'type Ref struct {',
			'	Name string',
			'	To   string',
			'	Kind string',
			'}',
			'',
			'func S(name, to string) Ref { return Ref{Name: name, To: to, Kind: "strong"} }',
			'func W(name, to string) Ref { return Ref{Name: name, To: to, Kind: "weak"} }',
			'func U(name, to string) Ref { return Ref{Name: name, To: to, Kind: "unowned"} }',
			'',
			'type Obj struct {',
			'	Name string',
			'	Refs []Ref',
			'	dead bool',
			'}',
			'',
			'type Graph struct {',
			'	objs  []*Obj',
			'	roots []string',
			'}',
			'',
			'func NewGraph() *Graph {',
			'	return &Graph{}',
			'}',
			'',
			'func (g *Graph) Add(name string, refs ...Ref) {',
			'	g.objs = append(g.objs, &Obj{Name: name, Refs: refs})',
			'}',
			'',
			'func (g *Graph) Root(name string) {',
			'	g.roots = append(g.roots, name)',
			'}',
			'',
			'func (g *Graph) find(name string) *Obj {',
			'	for _, o := range g.objs {',
			'		if o.Name == name {',
			'			return o',
			'		}',
			'	}',
			'	return nil',
			'}',
			'',
			'// StrongCount recomputes the count from the graph instead of caching a',
			'// counter per object. Real ARC maintains the counter incrementally (a',
			'// rescan per release would be too slow), but deriving it here means',
			'// the count can never drift out of sync with the graph — one source',
			'// of truth. Only two things count: strong refs whose HOLDER is still',
			'// alive, and root entries. Weak/unowned fall through the Kind check —',
			'// their refcount-invisibility is literally one != "strong" test.',
			'func (g *Graph) StrongCount(name string) int {',
			'	n := 0',
			'	for _, o := range g.objs {',
			'		if o.dead {',
			'			continue // a dead object\'s refs were released with it',
			'		}',
			'		for _, r := range o.Refs {',
			'			if r.Kind == "strong" && r.To == name {',
			'				n++',
			'			}',
			'		}',
			'	}',
			'	for _, rt := range g.roots {',
			'		if rt == name {',
			'			n++',
			'		}',
			'	}',
			'	return n',
			'}',
			'',
			'// Release is ARC\'s cascade. Marking an object dead is what "releases"',
			'// its outgoing refs — StrongCount skips dead holders — so after each',
			'// death the loop only has to ask "did this target just hit zero?".',
			'//',
			'//	root gone -> Parent rc 0 -> dead ("deinit Parent")',
			'//	              +- releases child -> Child rc 0 -> worklist ...',
			'//',
			'// A FIFO worklist (append at back, pop at front) pins the trace:',
			'// insertion order IS deinit order. The dead-check on pop makes double',
			'// insertion harmless (an object can be enqueued twice when two refs',
			'// to it die before it is processed).',
			'func (g *Graph) Release(root string) []string {',
			'	// Drop ONE root entry — one variable letting go, not all of them.',
			'	for i, rt := range g.roots {',
			'		if rt == root {',
			'			g.roots = append(g.roots[:i], g.roots[i+1:]...)',
			'			break',
			'		}',
			'	}',
			'	trace := []string{}',
			'	work := []string{}',
			'	if o := g.find(root); o != nil && !o.dead && g.StrongCount(root) == 0 {',
			'		work = append(work, root)',
			'	}',
			'	for len(work) > 0 {',
			'		name := work[0]',
			'		work = work[1:]',
			'		o := g.find(name)',
			'		if o == nil || o.dead {',
			'			continue',
			'		}',
			'		o.dead = true // this IS the release of every ref o holds',
			'		trace = append(trace, "deinit "+name)',
			'		// Walk refs in declaration order — the determinism contract.',
			'		// Only strong refs can drop a target to zero; weak/unowned',
			'		// never held anything up in the first place.',
			'		for _, r := range o.Refs {',
			'			if r.Kind != "strong" {',
			'				continue',
			'			}',
			'			t := g.find(r.To)',
			'			if t == nil || t.dead {',
			'				continue',
			'			}',
			'			if g.StrongCount(r.To) == 0 {',
			'				work = append(work, r.To)',
			'			}',
			'		}',
			'	}',
			'	return trace',
			'}',
			'',
			'// ReadWeak: the zeroing guarantee as a read. Note that nothing ever',
			'// writes a nil anywhere — the target\'s death IS the nil, the same',
			'// way ARC\'s side table makes every weak load of a dead object answer',
			'// nil. (The closure-captures item modeled the identical guarantee',
			'// with explicitly registered-and-nilled pointers; both are faithful.)',
			'func (g *Graph) ReadWeak(owner, ref string) string {',
			'	o := g.find(owner)',
			'	if o == nil {',
			'		return "nil"',
			'	}',
			'	for _, r := range o.Refs {',
			'		if r.Name == ref {',
			'			t := g.find(r.To)',
			'			if t == nil || t.dead {',
			'				return "nil"',
			'			}',
			'			return r.To',
			'		}',
			'	}',
			'	return "nil"',
			'}',
			'',
			'func (g *Graph) Alive() []string {',
			'	out := []string{}',
			'	for _, o := range g.objs {',
			'		if !o.dead {',
			'			out = append(out, o.Name)',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// Leaks: release everything the outside world still holds; whatever',
			'// survives is held up only by OTHER survivors — a strong cycle (or',
			'// something a cycle owns). This is precisely why refcounting cannot',
			'// collect cycles: no member\'s count ever reaches the zero that would',
			'// start the cascade. A tracing GC asks the opposite question ("what',
			'// is reachable from the roots?") and would collect these immediately.',
			'func (g *Graph) Leaks() []string {',
			'	for len(g.roots) > 0 {',
			'		g.Release(g.roots[0])',
			'	}',
			'	return g.Alive()',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why Apple chose refcounting — and kept it</h3>' +
			'<p>ARC (2011) automated the retain/release calls Objective-C developers ' +
			'had written by hand for twenty years; it did not change the model. ' +
			'Apple even shipped a tracing garbage collector for Mac apps ' +
			'(2007–2012) and <em>withdrew</em> it. The refcounting trade: ' +
			'deallocation is deterministic (<code>deinit</code> runs the instant ' +
			'the last reference dies — you can close a file in it), there are no ' +
			'collector pauses on a device drawing at 120&nbsp;Hz, and memory comes ' +
			'back the moment it is garbage, not at the next collection. The price ' +
			'is the entire subject of this item: <strong>cycles are the ' +
			'programmer\'s problem</strong>. Your <code>Leaks()</code> is the proof ' +
			'of why — every member of a strong cycle holds every other member\'s ' +
			'count above zero, and the cascade that only starts at zero never ' +
			'starts.</p>' +
			'<h3>weak vs unowned, mechanically</h3>' +
			'<p>Both count zero; they differ in what a read does after death. ' +
			'<code>weak</code> refs register in a side table so dealloc can zero ' +
			'them — hence Optional, hence safe. <code>unowned</code> skips the ' +
			'zeroing but not all bookkeeping: the runtime keeps a tombstone for ' +
			'the allocation so a late read can trap <em>reliably</em> with the ' +
			'<code>Attempted to read an unowned reference</code> fatal error ' +
			'instead of touching freed memory. Rule of thumb: <code>weak</code> ' +
			'when the referent can legitimately die first (delegates, closures on ' +
			'long-lived objects); <code>unowned</code> only when lifetimes are ' +
			'provably nested (a <code>CreditCard</code> that cannot outlive its ' +
			'<code>Customer</code>) — and when in doubt, <code>weak</code>: a nil ' +
			'branch beats a crash report.</p>' +
			'<h3>What the model simplifies</h3>' +
			'<ul>' +
			'<li><strong>Cascade order:</strong> the FIFO worklist yields ' +
			'breadth-first deinit order (<code>A, B, C, D</code> in the pinned ' +
			'case). Real ARC releases recursively — A\'s deinit releases B, and ' +
			'B\'s <em>entire</em> subtree deinits before A\'s next property is ' +
			'released — so real Swift would print <code>A, B, D, C</code> there. ' +
			'Membership and the owner-before-ownee guarantee are identical; in ' +
			'either world, code that depends on sibling deinit order is a bug ' +
			'waiting for a compiler upgrade.</li>' +
			'<li><strong>Counts are recomputed, not maintained:</strong> real ARC ' +
			'bumps an inline counter on every assignment, and the Swift optimizer ' +
			'elides provably-paired retain/release pairs entirely. The observable ' +
			'semantics match; the cost model does not.</li>' +
			'<li><strong>Roots are explicit:</strong> the model\'s root set stands ' +
			'in for locals, globals and — the ones that bite — closures: a closure ' +
			'capturing <code>self</code> strongly is just one more strong edge in ' +
			'this graph, which is why the previous item\'s <code>[weak self]</code> ' +
			'is this item\'s <code>W(...)</code>.</li>' +
			'</ul>' +
			'<h3>Finding these in a real app</h3>' +
			'<p>The workflow behind the prose scenario: run the flow twice, open ' +
			'Xcode\'s <strong>memory graph debugger</strong> (the three-circles ' +
			'toolbar button), and look for multiple instances of a screen that ' +
			'should have died — the inspector shows exactly which references pin ' +
			'each one: your <code>Leaks()</code> output, with arrows. The cheap ' +
			'tripwire is the one the Swift snippets print: a ' +
			'<code>deinit { print(...) }</code> in every view controller during ' +
			'development — pop the screen, no line, you have a cycle. Instruments\' ' +
			'Leaks template catches unreachable cycles too, but the memory graph ' +
			'names the culprit edge — and the culprit is a delegate or a closure ' +
			'often enough that "who points back up the ownership tree?" is the ' +
			'first question to ask in code review.</p>',
		],
		complexity: { time: 'O(objects × edges) per Release — each death rescans counts; real ARC is O(1) per release with maintained counters', space: 'O(objects) for the worklist and trace' },
	});
})();
