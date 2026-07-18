/* react — Pure React, fundamentals through patterns, on the real thing.
 *
 * The editor holds JavaScript-plus-JSX. The 'react' runner (see
 * engine/runner-react.js) compiles it with the vendored TypeScript compiler
 * (syntax only — this track teaches React, not the type system), executes
 * it with the vendored React in scope, and renders the required `App`
 * component TWICE from one compilation:
 *
 *   - ReactDOMServer.renderToStaticMarkup in the worker — the DETERMINISTIC
 *     initial render, serialized through the html-pure outline so checks pin
 *     structure ("ul / li / span") instead of brittle markup strings;
 *   - live in the 'app' kind's sandboxed iframe — real DOM, real state,
 *     clicks work. A counter incrementing in the preview while the outline
 *     stays at the initial frame is not a limitation, it is the useState
 *     lesson: render output is a function of state at one instant.
 *
 * React's dev-build warnings are part of stdout's console section
 * ("warn: …") — the missing-key warning is curriculum here, not noise, and
 * several checks pin its absence.
 *
 * Items are kind:'app' with lang:'js' (the js editor overlay handles JSX
 * fine). starterError items fail to COMPILE (adjacent JSX roots and the
 * like) — the diagnostic is the lesson.
 *
 * Curriculum (18 items): JSX → expressions → components & props →
 * conditional rendering → lists & keys → events → useState → immutable
 * updates → controlled forms → lifting state → useEffect → useMemo →
 * useReducer → useContext → custom hooks → children & composition →
 * styling → capstone task board.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'react',
		title: 'React',
		runner: 'react',
		order: [
			// Foundations
			'hello-jsx', 'jsx-expressions', 'components-props', 'conditional-render', 'lists-keys',
			// State & Events
			'events-handlers', 'usestate', 'state-immutability', 'forms-controlled', 'lifting-state',
			// Hooks in Depth
			'useeffect', 'usememo', 'usereducer', 'usecontext', 'custom-hooks',
			// Patterns
			'composition-children', 'styling', 'capstone-taskboard',
		],
	});

	// globalThis (not window) so the Node verification harness can load
	// lesson files unchanged.
	globalThis.GoLearnReact = {
		lesson: function (def) {
			def.kind = 'app';
			def.lang = 'js'; // editor overlay + snippet default for this item
			GoLearn.registerItem('react', def);
		},
	};
})();
