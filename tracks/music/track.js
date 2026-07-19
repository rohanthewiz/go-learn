/* music — Piano & Music Theory, as runnable Go.
 *
 * The premise mirrors the networking and aws-saa tracks: theory sticks when
 * you *compute* it instead of memorizing the chart. Every item here takes a
 * decision procedure a pianist actually runs at the keys — which MIDI key is
 * that note, how far apart are these two pitches, what accidentals does
 * A-flat major carry, what notes make this chord and which inversion is it,
 * which finger takes the F-sharp, how does this melody move to another key —
 * and has the learner implement it against a test harness. The circle of
 * fifths, interval arithmetic, and chord spelling all reduce to small exact
 * algorithms over letters and semitones; writing those algorithms once is
 * worth a hundred flashcards. Same kind:'problem' machinery as the other Go
 * tracks, so the engine needs no changes.
 *
 * Two number lines run through the whole track and every problem states
 * which one it is on: the SEMITONE line (MIDI numbers, what a piano key or a
 * frequency is) and the LETTER line (note spelling, what staff notation and
 * key signatures are). Almost every classic theory confusion — why C-sharp
 * and D-flat are "the same key" but never the same note — is a collision of
 * the two, and the problems make the collision explicit by computing both.
 *
 * Items live in problems/<slug>.js and register through GoLearnMusic.
 * HARNESS_RT is duplicated from the other tracks on purpose: tracks are
 * independent plugins, and sharing runtime snippets across tracks would
 * couple their load order.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'music',
		title: 'Piano & Music Theory',
		runner: 'go-wasm',
		order: [
			// Pitch & the Keyboard
			'note-names', 'keyboard-geometry', 'pitch-frequency',
			// Intervals
			'intervals', 'interval-quality',
			// Scales & Keys
			'major-scale', 'minor-scales', 'key-signatures', 'circle-of-fifths',
			// Chords
			'triads', 'seventh-chords', 'chord-identification',
			// Harmony
			'diatonic-chords', 'cadences', 'voice-leading',
			// At the Piano
			'scale-fingering', 'transposition', 'rhythm-durations',
		],
	});

	// Every harness splices this in, so every harness import block includes
	// fmt and encoding/json. runCase isolates one test: a panicking user
	// implementation records a failure for that case but the harness still
	// reports every result (the sentinel must always print).
	var HARNESS_RT = [
		'// runCase executes one test body, converting a panic into a failed case.',
		'func runCase(r map[string]any, body func()) {',
		'	defer func() {',
		'		if p := recover(); p != nil {',
		'			r["pass"] = false',
		'			r["got"] = fmt.Sprintf("panic: %v", p)',
		'		}',
		'	}()',
		'	body()',
		'}',
		'',
		'// emitResults prints the sentinel-delimited JSON block the UI parses.',
		'// Printed last, so user output can never spoof it (the parser splits',
		'// on the LAST marker).',
		'func emitResults(results []map[string]any) {',
		'	buf, _ := json.Marshal(results)',
		'	fmt.Println("\\n__GOLEARN_RESULTS__")',
		'	fmt.Println(string(buf))',
		'	fmt.Println("__GOLEARN_END__")',
		'}',
	].join('\n');

	// globalThis (not window) so the Node verification harness can load
	// track files unchanged.
	globalThis.GoLearnMusic = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('music', def);
		},
	};
})();
