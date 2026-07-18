/* files-dirs — moving yourself (cd: absolute, relative, .., bare-cd home)
 * and moving files (mkdir -p, touch, cp, mv-as-rename-and-move, rm). The
 * starter half-builds a workshop and leaves the tree wrong: no drafts/, a
 * scratch file never cleaned up, no copy, no rename. The check pins the
 * pwd tour block, the adjacent `ls workshop` + `ls workshop/drafts` outputs
 * (trailing-slash and ordering included), the final home listing with
 * workshop/ in sorted position, and the ABSENCE of scratch.txt — the
 * starter's own output — so only the completed sequence passes.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'files-dirs',
		title: 'Files & Directories',
		nav: 'Files & dirs',
		category: 'First Steps',

		prose: [
			'<h2>Files &amp; Directories</h2>' +
			'<p><code>cd</code> moves <em>you</em>; everything else moves files. ' +
			'A path starting with <code>/</code> is absolute — resolved from the ' +
			'root, wherever you stand. Anything else is relative to the working ' +
			'directory: <code>projects/beta</code> means "beta inside projects, ' +
			'inside here". Two spellings do most of the navigating: ' +
			'<code>..</code> is the parent directory, and a bare <code>cd</code> ' +
			'with no argument takes you home — <code>/home/learner</code>. ' +
			'<code>pwd</code> after each hop is how you keep your bearings.</p>',
			{ lang: 'sh', code: 'cd /var/log       # absolute: from the root\ncd ../..          # relative: up two parents — now at /\ncd                # bare cd: home, from anywhere\ncp -r projects backup   # -r copies a whole tree, not just one file\nrm -r backup            # -r again to remove a tree. On a real box: FOREVER.' },
			'<p>The file verbs: <code>mkdir</code> creates a directory, and ' +
			'<code>mkdir -p a/b/c</code> creates the whole chain in one command ' +
			'(plain <code>mkdir a/b/c</code> fails if <code>a</code> is missing). ' +
			'<code>touch</code> creates an empty file. <code>cp src dst</code> ' +
			'copies — add <code>-r</code> for directories. <code>mv</code> is ' +
			'one command with two readings: <code>mv old.txt new.txt</code> ' +
			'<em>renames</em>, <code>mv file.txt somedir/</code> <em>moves</em>. ' +
			'Same operation underneath — relinking a name — which is why Unix ' +
			'never grew a separate rename command.</p>' +
			'<p><code>rm</code> removes files, <code>rm -r</code> removes trees, ' +
			'and on a real system there is no undo, no trash can, no confirmation ' +
			'— gone is gone. Here, every run reseeds the disk from scratch, so ' +
			'this is the one place you can practice <code>rm</code> until the ' +
			'reflex is calibrated. Use it freely; respect it later.</p>' +
			'<h3>Your job</h3>' +
			'<p>First the tour: <code>cd</code> to ' +
			'<code>/home/learner/projects</code> (absolute), into <code>beta</code> ' +
			'(relative), back up with <code>..</code>, then home with a bare ' +
			'<code>cd</code> — <code>pwd</code> after each hop. Then build: ' +
			'<code>mkdir -p workshop/drafts</code>, copy <code>notes.txt</code> ' +
			'into <code>workshop/drafts/</code>, rename the copy to ' +
			'<code>plan.txt</code> with <code>mv</code>, remove the starter\'s ' +
			'<code>scratch.txt</code>, and prove the tree with ' +
			'<code>ls workshop</code>, <code>ls workshop/drafts</code>, and a ' +
			'final <code>ls</code>.</p>' +
			'<div class="tip">Coming from Go: <code>cd</code> only exists as a ' +
			'shell <em>builtin</em>. It cannot be a program — a child process ' +
			'changing its own directory would change nothing for the shell that ' +
			'launched it, just as <code>os.Chdir</code> in a subprocess leaves ' +
			'the parent where it was.</div>',
		],

		task: 'Tour with cd/pwd (absolute, relative, .., bare), then build workshop/drafts: cp, rename with mv, rm the scratch file, prove with three ls runs.',

		starter: [
			'# --- the tour ------------------------------------------------------',
			'# TODO: cd /home/learner/projects, then pwd. cd beta (relative),',
			'# pwd. cd .. back up, pwd. Bare cd to come home, pwd. Four hops,',
			'# four pwd lines.',
			'pwd',
			'',
			'# --- the build -----------------------------------------------------',
			'# TODO: this only makes workshop/ — make workshop/drafts in ONE',
			'# command with mkdir -p.',
			'mkdir workshop',
			'',
			'# A scratch file to practice rm on later.',
			'touch workshop/scratch.txt',
			'',
			'# TODO: cp notes.txt into workshop/drafts/',
			'# TODO: mv the copy to workshop/drafts/plan.txt (mv = rename)',
			'# TODO: rm workshop/scratch.txt — safe here: every run reseeds',
			'',
			'ls workshop',
			'# TODO: ls workshop/drafts, then a final ls of home',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// The four pwd answers, in hop order — only the full cd tour
			// (absolute, relative, .., bare) prints this exact block.
			var tour = '/home/learner/projects\n' +
				'/home/learner/projects/beta\n' +
				'/home/learner/projects\n' +
				'/home/learner\n';
			return stdout.indexOf(tour) !== -1 &&
				// `ls workshop` then `ls workshop/drafts`, back to back:
				// drafts/ keeps its trailing slash, plan.txt proves the rename.
				stdout.indexOf('drafts/\nplan.txt\n') !== -1 &&
				// Final home listing: workshop/ lands in sorted position.
				stdout.indexOf('fruit.txt\nnotes.txt\nprojects/\ntodo/\nworkshop/\n') !== -1 &&
				stdout.indexOf(tour) < stdout.indexOf('drafts/\nplan.txt\n') &&
				// The scratch file must be GONE — the starter still prints it.
				stdout.indexOf('scratch.txt') === -1;
		},

		solution: [
			'# --- the tour ------------------------------------------------------',
			'cd /home/learner/projects   # absolute: resolved from /, cwd ignored',
			'pwd',
			'cd beta                     # relative: beta inside the cwd',
			'pwd',
			'cd ..                       # .. is the parent directory',
			'pwd',
			'cd                          # bare cd: home from anywhere',
			'pwd',
			'',
			'# --- the build -----------------------------------------------------',
			'# -p creates the whole chain and is happy if part already exists.',
			'mkdir -p workshop/drafts',
			'',
			'touch workshop/scratch.txt  # empty file, removed again below',
			'',
			'# cp: the copy keeps its name when the destination is a directory.',
			'cp notes.txt workshop/drafts/',
			'',
			'# mv with two file paths is a RENAME — same directory, new name.',
			'# (mv file.txt somedir/ would be the MOVE reading of the same verb.)',
			'mv workshop/drafts/notes.txt workshop/drafts/plan.txt',
			'',
			'# rm: no undo, no trash — except here, where every run reseeds.',
			'rm workshop/scratch.txt',
			'',
			'# Prove the tree. ls marks directories with a trailing slash.',
			'ls workshop',
			'ls workshop/drafts',
			'ls',
			'',
		].join('\n'),

		explanation: [
			'<p>The tour prints four <code>pwd</code> lines that tell the whole ' +
			'story: the absolute <code>cd</code> lands on ' +
			'<code>/home/learner/projects</code> no matter where you stood; ' +
			'<code>cd beta</code> appends to the cwd; <code>cd ..</code> strips ' +
			'one component; bare <code>cd</code> jumps home. The check pins the ' +
			'four lines as one block, in hop order.</p>',
			'<p>The build: <code>mkdir -p</code> makes both levels at once, ' +
			'<code>cp</code> drops <code>notes.txt</code> into ' +
			'<code>drafts/</code> under its own name, and <code>mv</code> ' +
			'renames it to <code>plan.txt</code> in place. ' +
			'<code>rm workshop/scratch.txt</code> is why the check can demand ' +
			'that <code>scratch.txt</code> appears <em>nowhere</em> in the ' +
			'output — the starter\'s own <code>ls workshop</code> still shows ' +
			'it, so that absence pin is what fails you until the cleanup runs.</p>',
			'<p>The three <code>ls</code> runs prove the tree: ' +
			'<code>drafts/</code> (slash: directory), <code>plan.txt</code>, and ' +
			'a home listing where <code>workshop/</code> slots into sorted order ' +
			'after <code>todo/</code> — deterministic order, deterministic ' +
			'check.</p>',
		],
	});
})();
