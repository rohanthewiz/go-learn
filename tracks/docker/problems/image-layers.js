/* Image Layers — Images & Builds (Medium). An image is not a filesystem;
 * it is an ordered stack of layer diffs that overlayfs unions at container
 * start. The learner implements Merge over the stack: upper layers win,
 * `.wh.` whiteouts hide lower files and whole subtrees, `.wh..wh..opq`
 * blanks a directory's lower content, and marker entries never surface.
 * The harness pins the classic traps: the prefix boundary (var/log vs
 * var/logs/), re-adding above a whiteout, and root-level whiteouts.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// Three diffs on the left, the single merged root on the right. The
	// whiteout is drawn in the UPPER layer — deletion is additive data,
	// which is the whole "rm never shrinks an image" story. Marker id
	// namespaced (dgArrowDKIL) because every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 232" width="520" height="232" role="img" aria-label="an image as a stack of layer diffs: the upper layer\'s whiteout hides a lower file, the upper copy of a duplicated path wins, and overlayfs unions the stack into the one merged root the container sees">' +
		'<text x="20" y="22" class="lbl">three layer diffs on disk — one merged root at runtime</text>' +
		// layer 2 (upper): carries the winning copy AND the whiteout marker
		'<rect x="28" y="40" width="252" height="46" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="40" y="57" class="lbl">layer 2 (upper) — RUN rm + rebuild</text>' +
		'<text x="40" y="76">app/web=v2  <tspan style="fill:var(--warn)">etc/.wh.debug.conf</tspan></text>' +
		// layer 1: the shadowed copy and the file the whiteout hides
		'<rect x="28" y="96" width="252" height="46" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="40" y="113" class="lbl">layer 1 — app install</text>' +
		'<text x="40" y="132">app/web=v1  etc/debug.conf</text>' +
		// layer 0: the base image, untouched and shared
		'<rect x="28" y="152" width="252" height="46" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="40" y="169" class="lbl">layer 0 — base image (shared, read-only)</text>' +
		'<text x="40" y="188">bin/sh  etc/hosts</text>' +
		// the union arrow
		'<path d="M 284 119 L 336 119" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKIL)"/>' +
		'<text x="310" y="108" text-anchor="middle" class="lbl">union</text>' +
		// the merged view: what the container actually sees
		'<rect x="344" y="52" width="156" height="146" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="358" y="72" class="lbl" style="fill:var(--ok)">merged view</text>' +
		'<text x="358" y="94">bin/sh</text>' +
		'<text x="358" y="114">etc/hosts</text>' +
		'<text x="358" y="134">app/web=v2</text>' +
		'<text x="358" y="154" class="lbl">upper wins; no</text>' +
		'<text x="358" y="170" class="lbl">debug.conf, no</text>' +
		'<text x="358" y="186" class="lbl">markers</text>' +
		'<text x="20" y="224" class="lbl" style="fill:var(--warn)">the whiteout ADDS bytes — debug.conf still lives in layer 1, so the rm made the image bigger</text>' +
		'<defs><marker id="dgArrowDKIL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'image-layers',
		title: 'Image Layers: the overlay union filesystem',
		nav: 'image layers',
		difficulty: 'Medium',
		category: 'Images & Builds',
		task: 'Implement Merge: union an ordered stack of layer diffs — upper wins, .wh. whiteouts hide lower files and subtrees, .wh..wh..opq blanks a directory\'s lower content, markers never surface.',

		prose: [
			'<h2>Image Layers: the overlay union filesystem</h2>' +
			'<p>You inherit a 900&nbsp;MB image and add the obvious fix — a new ' +
			'<code>RUN rm -rf /var/lib/apt/lists /root/.cache</code> step at the end ' +
			'of the Dockerfile — and the pushed image gets <em>bigger</em>. ' +
			'<code>docker history</code> shows your cleanup step at a suspicious ' +
			'<code>0B</code>, and <code>docker save image | tar -t</code> reveals ' +
			'files literally named <code>.wh.lists</code> inside the newest layer ' +
			'tarball. Nothing was deleted. Nothing <em>can</em> be deleted: an image ' +
			'is an ordered stack of immutable diffs, and “remove” is just more data ' +
			'in a higher layer.</p>' +
			'<ul>' +
			'<li><strong>An image is a stack of diffs.</strong> Each Dockerfile step ' +
			'emits one layer holding only what that step changed. Here a layer is a ' +
			'<code>map[string]string</code> (path → content) and the stack is ordered ' +
			'lowest → highest. At container start, overlayfs unions the stack into ' +
			'the single root the process sees.</li>' +
			'<li><strong>Upper wins.</strong> A path present in several layers ' +
			'resolves to the highest layer\'s copy — that is the entire conflict ' +
			'rule.</li>' +
			'<li><strong>Whiteouts encode deletion.</strong> Lower layers are ' +
			'read-only and shared with other images, so deleting ' +
			'<code>dir/name</code> writes a marker entry <code>dir/.wh.name</code> ' +
			'into the deleting layer. The marker hides <code>dir/name</code> — and, ' +
			'if it was a directory, everything under <code>dir/name/</code> — from ' +
			'all <em>lower</em> layers only.</li>' +
			'<li><strong>Opaque directories.</strong> The marker ' +
			'<code>dir/.wh..wh..opq</code> hides <em>all</em> lower content of ' +
			'<code>dir/</code> while keeping the marker layer\'s own ' +
			'<code>dir/</code> entries — how <code>rm -rf dir && mkdir dir</code> in ' +
			'one step avoids emitting a whiteout per old file.</li>' +
			'<li><strong>Whiteouts are not tombstones forever.</strong> A layer ' +
			'<em>above</em> the whiteout can re-add the path; only layers below the ' +
			'marker are hidden.</li>' +
			'<li><strong>Markers never surface.</strong> <code>.wh.*</code> entries ' +
			'are bookkeeping for the union; the merged view must not contain ' +
			'them.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Merge(layers)</code> — the union a container started ' +
			'from this image would see. Apply each layer in order: first its ' +
			'deletions (whiteouts and opaque markers) against the view built from ' +
			'the layers below it, then its own regular entries on top. Watch the ' +
			'path boundary: a whiteout of <code>var/log</code> hides ' +
			'<code>var/log</code> and <code>var/log/*</code> — never ' +
			'<code>var/logs</code>.</p>',
			{ lang: 'txt', code: 'layer 0: bin/sh          etc/hosts\nlayer 1: app/web=v1      etc/debug.conf\nlayer 2: app/web=v2      etc/.wh.debug.conf   <- RUN rm /etc/debug.conf\n\nmerged : bin/sh  etc/hosts  app/web=v2         (no debug.conf, no markers)' },
			'<div class="tip">On a real host the markers are stranger than a naming ' +
			'convention: overlayfs represents a whiteout as a character device with ' +
			'number <code>0:0</code> and an opaque directory as the xattr ' +
			'<code>trusted.overlay.opaque="y"</code>; the <code>.wh.</code> names are ' +
			'the portable form used inside image tarballs (the AUFS legacy). ' +
			'<code>docker save image | tar -tv</code> shows them verbatim — the ' +
			'fastest way to prove a “deleted” secret is still shipping in a lower ' +
			'layer.</div>',
		],

		starter: [
			'package main',
			'',
			'// An image is an ordered stack of layer DIFFS, not a filesystem. Each',
			'// layer maps path -> content and records only what its build step',
			'// changed. Lower layers are immutable and shared, so deletion is',
			'// encoded as marker entries written into the deleting layer:',
			'//',
			'//	dir/.wh.name       whiteout: hides dir/name — and, for a',
			'//	                   directory, everything under dir/name/ —',
			'//	                   from all LOWER layers',
			'//	dir/.wh..wh..opq   opaque marker: hides ALL lower content of',
			'//	                   dir/, keeping the marker layer\'s own entries',
			'//',
			'// Markers are union bookkeeping — they never appear in the merged view.',
			'const (',
			'	whiteoutPrefix = ".wh."',
			'	opaqueMarker   = ".wh..wh..opq"',
			')',
			'',
			'// Merge unions the stack (ordered lowest -> highest) into the single',
			'// root a container started from this image would see.',
			'//   - a path present in several layers resolves to the highest copy',
			'//   - a whiteout in layer N hides its target (file or subtree) from',
			'//     layers below N; a layer above N may re-add the path',
			'//   - an opaque marker in dir/ hides everything lower under dir/ while',
			'//     keeping the marker layer\'s own dir/ entries',
			'//   - no marker entry ever appears in the result',
			'func Merge(layers []map[string]string) map[string]string {',
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
			'	"sort"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// Render a merged view deterministically: sorted "path=content"',
			'	// pairs. Map iteration order is random, so every comparison goes',
			'	// through this.',
			'	fsView := func(m map[string]string) string {',
			'		if len(m) == 0 {',
			'			return "(empty)"',
			'		}',
			'		keys := make([]string, 0, len(m))',
			'		for k := range m {',
			'			keys = append(keys, k)',
			'		}',
			'		sort.Strings(keys)',
			'		parts := make([]string, 0, len(keys))',
			'		for _, k := range keys {',
			'			parts = append(parts, k+"="+m[k])',
			'		}',
			'		return strings.Join(parts, " ")',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"single layer, no markers: the merged view IS the layer",',
			'			"bin/sh=busybox etc/hosts=127.0.0.1",',
			'			func() string {',
			'				return fsView(Merge([]map[string]string{',
			'					{"bin/sh": "busybox", "etc/hosts": "127.0.0.1"},',
			'				}))',
			'			}},',
			'		{"upper wins: the same path in two layers resolves to the higher diff",',
			'			"etc/nginx.conf=v2-tuned usr/bin/nginx=1.25",',
			'			func() string {',
			'				return fsView(Merge([]map[string]string{',
			'					{"etc/nginx.conf": "v1-default", "usr/bin/nginx": "1.25"},',
			'					{"etc/nginx.conf": "v2-tuned"},',
			'				}))',
			'			}},',
			'		{"whiteout of a file: etc/.wh.secret hides lower etc/secret, the sibling survives",',
			'			"etc/app.conf=prod",',
			'			func() string {',
			'				return fsView(Merge([]map[string]string{',
			'					{"etc/secret": "hunter2", "etc/app.conf": "prod"},',
			'					{"etc/.wh.secret": ""},',
			'				}))',
			'			}},',
			'		{"whiteout of a directory: var/.wh.cache hides the whole var/cache/ subtree",',
			'			"var/lib/db=records",',
			'			func() string {',
			'				return fsView(Merge([]map[string]string{',
			'					{"var/cache/apt/pkgs": "120MB", "var/cache/tmp": "x", "var/lib/db": "records"},',
			'					{"var/.wh.cache": ""},',
			'				}))',
			'			}},',
			'		{"opaque dir: .wh..wh..opq hides ALL lower etc/conf.d/, keeps the upper layer\'s own entries",',
			'			"etc/conf.d/only=fresh etc/hosts=localhost",',
			'			func() string {',
			'				return fsView(Merge([]map[string]string{',
			'					{"etc/conf.d/old-a": "a", "etc/conf.d/old-b": "b", "etc/hosts": "localhost"},',
			'					{"etc/conf.d/.wh..wh..opq": "", "etc/conf.d/only": "fresh"},',
			'				}))',
			'			}},',
			'		{"re-add above a whiteout: deleted in layer 2, recreated by layer 3",',
			'			"app/server=v2",',
			'			func() string {',
			'				return fsView(Merge([]map[string]string{',
			'					{"app/server": "v1"},',
			'					{"app/.wh.server": ""},',
			'					{"app/server": "v2"},',
			'				}))',
			'			}},',
			'		{"prefix boundary: whiteout of var/log must NOT touch var/logs/",',
			'			"var/logs/app=lines",',
			'			func() string {',
			'				return fsView(Merge([]map[string]string{',
			'					{"var/log": "old-file", "var/logs/app": "lines"},',
			'					{"var/.wh.log": ""},',
			'				}))',
			'			}},',
			'		{"root-level whiteout, and markers never surface in the view",',
			'			"srv/data=d",',
			'			func() string {',
			'				return fsView(Merge([]map[string]string{',
			'					{"tmp/scratch": "junk", "tmp/deep/more": "junk", "srv/data": "d"},',
			'					{".wh.tmp": ""},',
			'				}))',
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
			'import "strings"',
			'',
			'// The marker vocabulary, exactly as it appears inside image tarballs.',
			'// opaqueMarker itself begins with whiteoutPrefix, so classification',
			'// must test the more specific form first.',
			'const (',
			'	whiteoutPrefix = ".wh."',
			'	opaqueMarker   = ".wh..wh..opq"',
			')',
			'',
			'// splitPath separates "etc/conf.d/app" into ("etc/conf.d", "app").',
			'// A bare top-level name has an empty directory — root-level markers',
			'// (".wh.tmp") depend on that case being handled, not special-cased',
			'// away.',
			'func splitPath(path string) (string, string) {',
			'	i := strings.LastIndex(path, "/")',
			'	if i < 0 {',
			'		return "", path',
			'	}',
			'	return path[:i], path[i+1:]',
			'}',
			'',
			'// deletePrefix removes every entry of m whose path starts with prefix.',
			'// Keys are collected before deleting: mutating a map mid-range is',
			'// legal Go but subtle, and the two-pass form states the intent.',
			'func deletePrefix(m map[string]string, prefix string) {',
			'	doomed := []string{}',
			'	for k := range m {',
			'		if strings.HasPrefix(k, prefix) {',
			'			doomed = append(doomed, k)',
			'		}',
			'	}',
			'	for _, k := range doomed {',
			'		delete(m, k)',
			'	}',
			'}',
			'',
			'// Merge folds the stack lowest -> highest into one view — the same',
			'// order overlayfs resolves a lookup, just materialized eagerly.',
			'//',
			'// Each layer is applied in two passes, and the order between them is',
			'// the load-bearing design choice:',
			'//',
			'//	pass 1  this layer\'s MARKERS delete from the view built so far',
			'//	        (i.e. from strictly lower layers)',
			'//	pass 2  this layer\'s regular entries land on top (upper wins)',
			'//',
			'// Deletions-before-additions is what makes an opaque directory keep',
			'// its own layer\'s entries, and what lets an even higher layer re-add',
			'// a whited-out path: a marker only ever sees the layers below it.',
			'func Merge(layers []map[string]string) map[string]string {',
			'	merged := map[string]string{}',
			'	for _, layer := range layers {',
			'		// Pass 1: apply deletions against the lower layers\' view.',
			'		for path := range layer {',
			'			dir, base := splitPath(path)',
			'			if base == opaqueMarker {',
			'				// Opaque: blank EVERYTHING lower under dir/. With an',
			'				// empty dir (a root-level marker) the prefix is "",',
			'				// which correctly matches the entire view.',
			'				prefix := ""',
			'				if dir != "" {',
			'					prefix = dir + "/"',
			'				}',
			'				deletePrefix(merged, prefix)',
			'			} else if strings.HasPrefix(base, whiteoutPrefix) {',
			'				// Whiteout: hide the exact target, plus — if it was a',
			'				// directory — its whole subtree. The "/" appended to',
			'				// the subtree prefix is the boundary that keeps a',
			'				// whiteout of var/log away from var/logs.',
			'				target := base[len(whiteoutPrefix):]',
			'				if dir != "" {',
			'					target = dir + "/" + target',
			'				}',
			'				delete(merged, target)',
			'				deletePrefix(merged, target+"/")',
			'			}',
			'		}',
			'		// Pass 2: this layer\'s own files win over anything below.',
			'		// Markers are bookkeeping, not content — skip them so they',
			'		// never leak into the merged view.',
			'		for path, content := range layer {',
			'			_, base := splitPath(path)',
			'			if strings.HasPrefix(base, whiteoutPrefix) {',
			'				continue',
			'			}',
			'			merged[path] = content',
			'		}',
			'	}',
			'	return merged',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why a stack of diffs at all</h3>' +
			'<p>Layers exist for <em>sharing</em>. Every layer is a content-addressed ' +
			'tarball of one build step\'s changes: twenty services built ' +
			'<code>FROM debian:bookworm</code> store the 120&nbsp;MB base exactly ' +
			'once on disk and in the registry, a <code>docker pull</code> downloads ' +
			'only the layers it doesn\'t already have, and the build cache reuses ' +
			'every layer up to the first changed step. The price of that sharing is ' +
			'immutability — a layer referenced by other images can never be edited — ' +
			'and immutability is what forces deletion to become <em>data</em>: a ' +
			'whiteout entry in the new layer rather than a change to an old ' +
			'one.</p>' +
			'<h3>Why rm never shrinks an image</h3>' +
			'<p>Run the merge in your head on ' +
			'<code>RUN rm -rf /var/lib/apt/lists</code> as its own Dockerfile step: ' +
			'the new layer contains one tiny whiteout, and the megabytes it hides ' +
			'are still sitting, byte for byte, in the lower layer — the image ' +
			'<em>grew</em> by the size of the marker. A “layer size” function ' +
			'summing content bytes per layer would show it plainly: the deletion ' +
			'layer is nearly empty, the fat layer unchanged. The same mechanism is ' +
			'a security incident when the deleted file is a credential: ' +
			'<code>COPY id_rsa .</code> + <code>RUN rm id_rsa</code> ships the key ' +
			'to everyone who can pull the image — <code>docker save</code>, untar ' +
			'the lower layer, and it is right there. The real fixes change ' +
			'<em>which layers exist</em>: do the download and the cleanup in the ' +
			'same <code>RUN</code> so the files never enter any diff, or use a ' +
			'multi-stage build and <code>COPY --from</code> only the artifacts into ' +
			'a fresh, short stack.</p>' +
			'<h3>The on-disk reality</h3>' +
			'<p>Your <code>Merge</code> materializes eagerly what overlayfs does ' +
			'lazily: the daemon mounts ' +
			'<code>lowerdir=l0:l1:…,upperdir=containerRW,workdir=…</code> and each ' +
			'path lookup walks upper → lower until something answers — a regular ' +
			'file (upper wins), a whiteout (report ENOENT, stop), or an opaque ' +
			'directory (stop descending into lower dirs). Inside a mounted layer a ' +
			'whiteout is a character device numbered <code>0:0</code> and ' +
			'opaqueness is the xattr <code>trusted.overlay.opaque="y"</code>; the ' +
			'<code>.wh.</code> file names your code parses are the portable ' +
			'tarball encoding (inherited from AUFS) that survives registries and ' +
			'<code>docker save</code>. Note the container\'s own writable state is ' +
			'just one more layer — the <code>upperdir</code> — which is why ' +
			'<code>docker diff</code> can list changes instantly and why deleting ' +
			'a file inside a running container also frees nothing from the ' +
			'image.</p>' +
			'<h3>When debugging</h3>' +
			'<p><code>docker history image</code> shows the per-step sizes — a ' +
			'<code>0B</code> row for your <code>rm</code> step is this lesson in ' +
			'one line. <code>docker save image | tar -tv</code> lists every ' +
			'layer\'s tarball so you can see the <code>.wh.</code> entries and ' +
			'find which layer still carries the bytes (the <code>dive</code> tool ' +
			'automates exactly this walk). And when <code>du -sh /</code> inside a ' +
			'container disagrees with <code>docker images</code>, remember they ' +
			'measure different things: <code>du</code> sees the merged view, the ' +
			'image size sums every layer — including everything the whiteouts ' +
			'hide.</p>',
		],
		complexity: { time: 'O(E + M·V) — E total entries; each of the M markers scans the accumulated view of size ≤ V', space: 'O(V) for the merged view' },
	});
})();
