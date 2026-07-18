/* html-pure — Pure HTML, beginner through advanced.
 *
 * The third non-Go-editor track, and the first DOCUMENT-language track:
 * the editor holds plain HTML and "running" it means two things at once,
 * which is the whole pedagogy. The page kind (engine/kind-page.js) renders
 * the markup in a sandboxed iframe — the browser's view, complete with the
 * silent error recovery HTML5 specifies — while the strict validator
 * (engine/html-run.js) either refuses it in red or prints the canonical
 * STRUCTURE OUTLINE of the document tree. Checks pin substrings of that
 * outline, the way code tracks pin stdout.
 *
 * What the type checker is to ts-pure and virtual-timer determinism is to
 * js-pure, the validator is to this track: browsers repair mismatched
 * tags, bare ampersands, and <div/> without a word, so the red pane is
 * the only honest teacher of well-formedness. Two lessons ship starters
 * that MUST fail validation (starterError) — the diagnostic is the
 * lesson's opening beat.
 *
 * A recurring aside: several lessons show the same structure being
 * generated from Go by the element library (b.Ul().R(...) et al.) and
 * point at the "TypeScript + Go Web" track — write the markup by hand
 * here, recognize what those builders emit there.
 *
 * Curriculum (20 items): first elements → document skeleton → text →
 * lists → links → images → semantic layout → tables → entities & comments
 * → well-formedness → forms (basics, controls, validation) → global
 * attributes → head metadata → media & embeds → details/dialog → inline
 * styles → accessibility → a capstone page.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'html-pure',
		title: 'Pure HTML',
		runner: 'html',
		order: [
			// Foundations
			'hello-html', 'document-structure', 'text-essentials',
			'lists', 'links', 'images',
			// Structure & Semantics
			'semantic-layout', 'tables', 'entities-comments', 'well-formed',
			// Forms
			'forms-basics', 'form-controls', 'form-validation',
			// Attributes & Metadata
			'global-attributes', 'head-metadata',
			// Rich Content
			'media-embeds', 'details-dialog',
			// Advanced
			'inline-styles', 'accessibility', 'capstone-page',
		],
	});

	// globalThis (not window) so the Node verification harness can load
	// lesson files unchanged.
	globalThis.GoLearnHTMLP = {
		lesson: function (def) {
			def.kind = 'page';   // preview + structure outline (kind-page.js)
			def.lang = 'html';   // editor overlay + snippet default for this item
			GoLearn.registerItem('html-pure', def);
		},
	};
})();
