/* note-names — Pitch & the Keyboard (Easy). Note names ↔ MIDI numbers:
 * parse scientific pitch notation (letter + accidentals + octave) into the
 * semitone line, and spell a MIDI number back sharp-preferring. The harness
 * pins middle C = 60, A4 = 69, the B3/C4 octave boundary, the enharmonic
 * collapse Cb4 = B3 = 59, stacked/double accidentals (Bb3, C#4, Fx4), the
 * bottom of the piano (A0 = 21), and the sharp-only inverse spelling.
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// The two number lines of the whole track, drawn once: 7 letters spaced
	// UNEVENLY over 12 semitones. x(m) = 40 + (m-59)*36. Marker id namespaced
	// (dgArrowMusNN) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="seven letter names spaced unevenly along the twelve-semitone MIDI line; B3 to C4 is one semitone and also the octave-number boundary">' +
		'<text x="20" y="22" class="lbl">two number lines: 7 letters per octave, 12 semitones per octave — the gaps are uneven</text>' +
		// letter labels, positioned at their true semitone x
		'<text x="40" y="72" text-anchor="middle" style="fill:var(--warn)">B3</text>' +
		'<text x="76" y="72" text-anchor="middle" style="fill:var(--warn)">C4</text>' +
		'<text x="148" y="72" text-anchor="middle">D4</text>' +
		'<text x="220" y="72" text-anchor="middle">E4</text>' +
		'<text x="256" y="72" text-anchor="middle">F4</text>' +
		'<text x="328" y="72" text-anchor="middle">G4</text>' +
		'<text x="400" y="72" text-anchor="middle">A4</text>' +
		'<text x="472" y="72" text-anchor="middle">B4</text>' +
		// connectors letter -> tick (B3 and C4 in warn: the boundary pair)
		'<line x1="40" y1="80" x2="40" y2="112" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<line x1="76" y1="80" x2="76" y2="112" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<line x1="148" y1="80" x2="148" y2="112" stroke="var(--accent)" stroke-width="1.2"/>' +
		'<line x1="220" y1="80" x2="220" y2="112" stroke="var(--accent)" stroke-width="1.2"/>' +
		'<line x1="256" y1="80" x2="256" y2="112" stroke="var(--accent)" stroke-width="1.2"/>' +
		'<line x1="328" y1="80" x2="328" y2="112" stroke="var(--accent)" stroke-width="1.2"/>' +
		'<line x1="400" y1="80" x2="400" y2="112" stroke="var(--accent)" stroke-width="1.2"/>' +
		'<line x1="472" y1="80" x2="472" y2="112" stroke="var(--accent)" stroke-width="1.2"/>' +
		// the semitone ruler with a tick per MIDI number 59..71
		'<line x1="28" y1="120" x2="484" y2="120" stroke="var(--accent)" stroke-width="2"/>' +
		'<line x1="40" y1="114" x2="40" y2="126" stroke="var(--accent)"/><line x1="76" y1="114" x2="76" y2="126" stroke="var(--accent)"/>' +
		'<line x1="112" y1="114" x2="112" y2="126" stroke="var(--accent)"/><line x1="148" y1="114" x2="148" y2="126" stroke="var(--accent)"/>' +
		'<line x1="184" y1="114" x2="184" y2="126" stroke="var(--accent)"/><line x1="220" y1="114" x2="220" y2="126" stroke="var(--accent)"/>' +
		'<line x1="256" y1="114" x2="256" y2="126" stroke="var(--accent)"/><line x1="292" y1="114" x2="292" y2="126" stroke="var(--accent)"/>' +
		'<line x1="328" y1="114" x2="328" y2="126" stroke="var(--accent)"/><line x1="364" y1="114" x2="364" y2="126" stroke="var(--accent)"/>' +
		'<line x1="400" y1="114" x2="400" y2="126" stroke="var(--accent)"/><line x1="436" y1="114" x2="436" y2="126" stroke="var(--accent)"/>' +
		'<line x1="472" y1="114" x2="472" y2="126" stroke="var(--accent)"/>' +
		'<text x="40" y="142" text-anchor="middle" class="lbl">59</text><text x="76" y="142" text-anchor="middle" class="lbl">60</text>' +
		'<text x="112" y="142" text-anchor="middle" class="lbl">61</text><text x="148" y="142" text-anchor="middle" class="lbl">62</text>' +
		'<text x="184" y="142" text-anchor="middle" class="lbl">63</text><text x="220" y="142" text-anchor="middle" class="lbl">64</text>' +
		'<text x="256" y="142" text-anchor="middle" class="lbl">65</text><text x="292" y="142" text-anchor="middle" class="lbl">66</text>' +
		'<text x="328" y="142" text-anchor="middle" class="lbl">67</text><text x="364" y="142" text-anchor="middle" class="lbl">68</text>' +
		'<text x="400" y="142" text-anchor="middle" class="lbl">69</text><text x="436" y="142" text-anchor="middle" class="lbl">70</text>' +
		'<text x="472" y="142" text-anchor="middle" class="lbl">71</text>' +
		// the boundary annotation
		'<path d="M 120 172 C 90 172 76 158 76 130" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowMusNN)"/>' +
		'<text x="128" y="176" class="lbl" style="fill:var(--warn)">the octave digit ticks up HERE, at C — so B3 and Cb4 are both key 59</text>' +
		'<text x="20" y="200" class="lbl">only two letter gaps are 1 semitone: E–F and B–C. Every other neighbor is 2 apart (a black key between).</text>' +
		'<defs><marker id="dgArrowMusNN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'note-names',
		title: 'Note Names & MIDI Numbers',
		nav: 'note names',
		difficulty: 'Easy',
		category: 'Pitch & the Keyboard',
		task: 'Implement NoteToMIDI (letter + accidentals + octave -> semitone number) and MIDIToNote (sharp-preferring spelling back).',

		prose: [
			'<h2>Note Names &amp; MIDI Numbers</h2>' +
			'<p>Sit at a piano and press the key nearest the keyhole: a musician ' +
			'calls it <strong>middle C</strong>, sheet music writes it as ' +
			'<code>C4</code>, and every synthesizer, DAW, and MIDI cable on earth ' +
			'calls it <strong>60</strong>. This problem is the translation layer, ' +
			'and it forces the one idea the whole track runs on: music lives on ' +
			'<em>two different number lines at once</em>.</p>' +
			'<ul>' +
			'<li><strong>The semitone line</strong> — what a piano key <em>is</em>. ' +
			'One integer per key, adjacent keys one apart. This is the MIDI ' +
			'number: A0 (the piano\'s lowest key) is 21, middle C is 60, the ' +
			'orchestra\'s tuning note A4 is 69, C8 at the top is 108.</li>' +
			'<li><strong>The letter line</strong> — what a note is <em>called</em>. ' +
			'Seven letters cycle forever: C&nbsp;D&nbsp;E&nbsp;F&nbsp;G&nbsp;A&nbsp;B, ' +
			'then C again with the octave digit bumped. Staff notation, key ' +
			'signatures, and chord spelling all live here.</li>' +
			'</ul>' +
			'<p>Seven letters, twelve keys per octave — so the letters <em>cannot</em> ' +
			'be evenly spaced. Five of the letter gaps are 2 semitones (a black key ' +
			'sits between); two gaps — <strong>E–F</strong> and <strong>B–C</strong> — ' +
			'are only 1 semitone, with no key between at all. Accidentals then shift ' +
			'a letter along the semitone line without renaming it: <code>#</code> ' +
			'raises one semitone, <code>b</code> lowers one, <code>x</code> (double ' +
			'sharp) raises two, and accidentals stack (<code>bb</code> = down two).</p>' +
			DIAGRAM +
			'<h3>The conversion</h3>' +
			'<p>Fix the pitch classes C=0 D=2 E=4 F=5 G=7 A=9 B=11 (note the uneven ' +
			'jumps — that\'s the E–F and B–C half steps showing up as data). MIDI ' +
			'octave numbering starts so that octave −1 begins at 0, hence:</p>',
			{ lang: 'txt', code: 'midi = (octave + 1) * 12 + pitchClass(letter) + accidentalOffset\n\nC4  -> (4+1)*12 + 0     = 60\nA4  -> (4+1)*12 + 9     = 69\nBb3 -> (3+1)*12 + 11 - 1 = 58\nCb4 -> (4+1)*12 + 0  - 1 = 59   <- the same key as B3!' },
			'<p>The <code>Cb4</code> line is the classic gotcha: <strong>the octave ' +
			'digit belongs to the letter, not to the key</strong>. Cb4 starts from ' +
			'C4\'s slot (60) and steps down across the octave boundary to 59. B3 and ' +
			'Cb4 are one physical key with two names — an <em>enharmonic</em> pair. ' +
			'Going the other way there is no such ambiguity, because ' +
			'<code>MIDIToNote</code> must pick <em>one</em> spelling per key: use the ' +
			'sharp-preferring convention (C&nbsp;C#&nbsp;D&nbsp;D#&nbsp;E&nbsp;F&nbsp;' +
			'F#&nbsp;G&nbsp;G#&nbsp;A&nbsp;A#&nbsp;B), and ' +
			'<code>octave = m/12 − 1</code>.</p>' +
			'<div class="tip">Parsing note: the letter is always the first byte and ' +
			'is uppercase, so a lowercase <code>b</code> after it is never ambiguous ' +
			'— <code>Bb3</code> is letter <code>B</code>, flat, octave 3. Everything ' +
			'between the letter and the first digit is accidentals.</div>',
		],

		starter: [
			'package main',
			'',
			'import (',
			'	"strconv"',
			')',
			'',
			'// NoteToMIDI converts scientific pitch notation to a MIDI number.',
			'// name is an uppercase letter A..G, then zero or more accidentals,',
			'// then the octave number:',
			'//',
			'//   - \'#\' raises a semitone, \'b\' lowers one, \'x\' raises two;',
			'//     accidentals stack ("bb" = two flats)',
			'//   - pitch classes: C=0 D=2 E=4 F=5 G=7 A=9 B=11',
			'//   - midi = (octave+1)*12 + pitchClass(letter) + accidentalOffset',
			'//',
			'// The octave digit belongs to the LETTER, so "Cb4" computes from',
			'// C4\'s slot and lands on 59 — the same key as "B3".',
			'func NoteToMIDI(name string) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// MIDIToNote spells a MIDI number back as text, sharp-preferring:',
			'// exactly one name per key, from C C# D D# E F F# G G# A A# B,',
			'// with octave = m/12 - 1. So 60 -> "C4", 61 -> "C#4" (never "Db4").',
			'func MIDIToNote(m int) string {',
			'	// your code here',
			'	return ""',
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
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	d := func(v int) string { return fmt.Sprintf("%d", v) }',
			'	cases := []tc{',
			'		{"middle C — the anchor of the whole system: C4 is MIDI 60",',
			'			"60",',
			'			func() string { return d(NoteToMIDI("C4")) }},',
			'		{"concert A — A4 = 69, the note the oboe sounds to tune the orchestra",',
			'			"69",',
			'			func() string { return d(NoteToMIDI("A4")) }},',
			'		{"the B/C boundary — the octave digit ticks up at C, so B3 and C4 are 1 apart",',
			'			"59 60",',
			'			func() string { return fmt.Sprintf("%d %d", NoteToMIDI("B3"), NoteToMIDI("C4")) }},',
			'		{"enharmonic collapse — Cb4 and B3 are two names for ONE key (octave belongs to the letter)",',
			'			"59 59",',
			'			func() string { return fmt.Sprintf("%d %d", NoteToMIDI("Cb4"), NoteToMIDI("B3")) }},',
			'		{"accidentals shift without renaming: Bb3=58, C#4=61, and double-sharp Fx4 lands on G4\'s key",',
			'			"58 61 67",',
			'			func() string {',
			'				return fmt.Sprintf("%d %d %d", NoteToMIDI("Bb3"), NoteToMIDI("C#4"), NoteToMIDI("Fx4"))',
			'			}},',
			'		{"bottom of the piano — A0 = 21: octave 0 is a real octave, not a parse error",',
			'			"21",',
			'			func() string { return d(NoteToMIDI("A0")) }},',
			'		{"MIDIToNote prefers sharps: 61 -> C#4, never Db4",',
			'			"C#4",',
			'			func() string { return MIDIToNote(61) }},',
			'		{"MIDIToNote round-trips the anchors: 60, 69, and 108 (the top of the piano)",',
			'			"C4 A4 C8",',
			'			func() string { return fmt.Sprintf("%s %s %s", MIDIToNote(60), MIDIToNote(69), MIDIToNote(108)) }},',
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
			'import (',
			'	"strconv"',
			')',
			'',
			'// NoteToMIDI: letter -> pitch class, fold in accidentals, anchor by',
			'// octave. Three independent pieces, so parse them left to right.',
			'func NoteToMIDI(name string) int {',
			'	// Pitch classes as a 7-entry table indexed by letter. The jumps',
			'	// are uneven on purpose — E->F and B->C are the two 1-semitone',
			'	// letter gaps — so this is data, not a formula like letter*2.',
			'	//                A   B  C  D  E  F  G',
			'	pcs := [7]int{9, 11, 0, 2, 4, 5, 7}',
			'	pc := pcs[name[0]-\'A\']',
			'',
			'	// Accidentals: the run of \'#\'/\'b\'/\'x\' after the letter. No',
			'	// ambiguity with the letter B — the letter is always byte 0, so a',
			'	// lowercase \'b\' here can only mean flat. Summing as we scan makes',
			'	// stacked accidentals ("bb", "##") fall out for free.',
			'	i, acc := 1, 0',
			'	for i < len(name) {',
			'		c := name[i]',
			'		if c == \'#\' {',
			'			acc++',
			'		} else if c == \'b\' {',
			'			acc--',
			'		} else if c == \'x\' { // double sharp: one glyph, two semitones',
			'			acc += 2',
			'		} else {',
			'			break // first non-accidental byte starts the octave number',
			'		}',
			'		i++',
			'	}',
			'',
			'	// Whatever remains is the octave, Atoi so multi-digit (and even',
			'	// negative) octaves parse without special cases.',
			'	oct, _ := strconv.Atoi(name[i:])',
			'',
			'	// (oct+1)*12 anchors the letter\'s OCTAVE: MIDI octave -1 starts at',
			'	// 0, so C4 = (4+1)*12 = 60. The accidental is added AFTER the',
			'	// anchor — that ordering is what makes Cb4 compute from C4\'s slot',
			'	// and step down across the boundary to 59 (= B3), the correct and',
			'	// famously surprising answer.',
			'	return (oct+1)*12 + pc + acc',
			'}',
			'',
			'// MIDIToNote picks the ONE canonical spelling per key. Sharp-preferring',
			'// is the MIDI/DAW convention: each black key borrows the letter below',
			'// it plus \'#\'. (Flat spellings exist — they are just a different,',
			'// context-dependent choice that key signatures make later.)',
			'func MIDIToNote(m int) string {',
			'	names := [12]string{"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"}',
			'	// m/12-1 inverts the (oct+1)*12 anchor; m%12 is the pitch class.',
			'	// Piano range is all positive MIDI, so truncating division is safe.',
			'	return names[m%12] + strconv.Itoa(m/12-1)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why two number lines at all</h3>' +
			'<p>The letters came first, by centuries: medieval notation named the ' +
			'seven notes of the diatonic scale, and the staff still has one line or ' +
			'space per <em>letter</em>, not per semitone. The five chromatic notes ' +
			'were wedged in later as alterations — which is why they have no letters ' +
			'of their own and must borrow (<code>C#</code>, <code>Db</code>). MIDI, ' +
			'designed in 1983 for machines that only care which key went down, threw ' +
			'the letters away and numbered the keys. Every conversion bug in music ' +
			'software is one of these lines masquerading as the other.</p>' +
			'<h3>The misconceptions this problem inoculates against</h3>' +
			'<ul>' +
			'<li><strong>“The octave changes at A, since the alphabet starts ' +
			'there.”</strong> No — it changes at C. B3 is directly below C4. This is ' +
			'the single most common off-by-an-octave bug.</li>' +
			'<li><strong>“Enharmonics are equal, so the spelling doesn\'t ' +
			'matter.”</strong> On the semitone line they collapse (Cb4 = B3 = 59); ' +
			'on the letter line they never do — a scale or chord spelled with the ' +
			'wrong letter is simply wrong, as later problems enforce. Direction of ' +
			'the collapse matters: names → number is many-to-one, so number → name ' +
			'needs a convention (ours: sharps).</li>' +
			'<li><strong>“C4 is universal.”</strong> Scientific pitch notation says ' +
			'middle C = C4, and this track pins that. But Yamaha gear and several ' +
			'DAWs label MIDI 60 as “C3” — same key, shifted display convention. When ' +
			'two systems disagree by exactly 12, this is why.</li>' +
			'</ul>' +
			'<h3>At the piano</h3>' +
			'<p>The uneven pitch-class table (0&nbsp;2&nbsp;4&nbsp;5&nbsp;7&nbsp;9&nbsp;11) ' +
			'is not trivia — it is the white keys of C major, and the two 1-semitone ' +
			'gaps E–F and B–C are exactly where the keyboard has no black key. Play ' +
			'C4 up to C5 on white keys only and you walk the table\'s differences: ' +
			'2&nbsp;2&nbsp;1&nbsp;2&nbsp;2&nbsp;2&nbsp;1 — the major scale, three ' +
			'problems early.</p>',
		],
		complexity: { time: 'O(len(name)) — one left-to-right scan; MIDIToNote is O(1)', space: 'O(1)' },
	});
})();
