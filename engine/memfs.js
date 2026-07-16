/* memfs.js — an in-memory filesystem for the Go wasm runtime.
 *
 * Why this exists: the Database track runs bytdb — a real, disk-backed
 * storage engine — inside the browser. btypedb (bytdb's KV layer) opens a
 * log file, appends, fsyncs, and does the temp-file/rename dance on
 * compaction, all through Go's os package. On js/wasm those calls route to
 * `globalThis.fs`, and the stock wasm_exec.js stub answers everything with
 * ENOSYS. This file replaces that stub with a small RAM-backed filesystem —
 * enough POSIX for a WAL engine, nothing more. No persistence across page
 * loads is wanted or provided: every lesson opens a fresh database anyway.
 *
 * Contract (from GOROOT/src/syscall/fs_js.go): Node-style callback API.
 * Two subtleties worth pinning down, because getting them wrong corrupts
 * reads silently rather than erroring:
 *
 *   - read/write take (fd, buf, offset, length, position, cb). position is
 *     an explicit file offset ONLY after the Go side has Seek()ed; before
 *     that it is null and the SHIM owns the per-fd cursor — Node semantics.
 *   - the runtime's own panic/print path is fs.writeSync(2, buf), called
 *     synchronously from the wasm `runtime.wasmWrite` import, so writeSync
 *     must exist even though user stdout normally lands in the interpreter's
 *     capture buffers, never here.
 *
 * Errors must carry a Node `.code` string ("ENOENT", ...) — fs_js.go maps
 * codes, not messages, back to errnos.
 *
 * Loaded by engine/worker.js BEFORE wasm_exec.js (which only installs its
 * ENOSYS stub when globalThis.fs is undefined), and require()able from Node
 * so the same bytes can be smoke-tested outside a browser.
 */
(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	root.fs = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
	'use strict';

	// ---- store ------------------------------------------------------------
	// A file is {buf: Uint8Array (capacity), len: int (logical size)}.
	// Directories are just path strings in a Set — there is no metadata a
	// WAL engine ever asks a directory for beyond existence.
	var files = new Map();
	var dirs = new Set(['/', '/tmp']);
	var fds = new Map();
	var nextFd = 1000; // clear of 0/1/2, which stay console streams

	function err(code, msg) {
		var e = new Error(msg || code);
		e.code = code;
		return e;
	}
	function enosys(op) { return err('ENOSYS', op + ': not implemented in memfs'); }

	// Paths arrive absolute and clean from Go (filepath.Clean runs on the Go
	// side); normalize just enough to make "/tmp/" and "/tmp" the same key.
	function norm(p) {
		p = String(p);
		if (p.length > 1 && p.charAt(p.length - 1) === '/') p = p.slice(0, -1);
		return p || '/';
	}
	function parentOf(p) {
		var i = p.lastIndexOf('/');
		return i <= 0 ? '/' : p.slice(0, i);
	}
	// Auto-create ancestors on file creation. Deliberately forgiving: the
	// value of this fs is running a storage engine, not teaching learners
	// mkdir -p ordering through ENOENT.
	function ensureDirs(p) {
		var missing = [];
		for (; p !== '/'; p = parentOf(p)) {
			if (dirs.has(p)) break;
			if (files.has(p)) return false; // a file is in the way
			missing.push(p);
		}
		missing.forEach(function (d) { dirs.add(d); });
		return true;
	}

	// ---- console streams ----------------------------------------------------
	// Line-buffered UTF-8 decode of fds 1/2, exactly like stock wasm_exec.js:
	// the Go runtime writes panic traces here, and losing those would turn
	// every harness bug into a silent hang.
	var decoder = new TextDecoder('utf-8');
	var outBuf = { 1: '', 2: '' };
	function consoleWrite(fd, bytes) {
		outBuf[fd] += decoder.decode(bytes);
		var nl = outBuf[fd].lastIndexOf('\n');
		if (nl !== -1) {
			console.log(outBuf[fd].slice(0, nl));
			outBuf[fd] = outBuf[fd].slice(nl + 1);
		}
		return bytes.length;
	}

	// ---- stat shapes ----------------------------------------------------------
	var S_IFREG = 0x8000, S_IFDIR = 0x4000;
	function statOf(isDir, size) {
		// Every numeric field fs_js.go's setStat reads must be present — it
		// calls .Int() unguarded, and an undefined field panics the runtime.
		// isDirectory is a METHOD (Node Stats API): fs_js.go's Open calls it
		// on the fstat result to flag directory fds.
		return {
			dev: 0, ino: 0, mode: isDir ? (S_IFDIR | 0o755) : (S_IFREG | 0o644),
			nlink: 1, uid: 0, gid: 0, rdev: 0, size: size, blksize: 4096,
			blocks: Math.ceil(size / 512), atimeMs: 0, mtimeMs: 0, ctimeMs: 0,
			isDirectory: function () { return isDir; },
			isFile: function () { return !isDir; },
		};
	}
	function statPath(p) {
		if (dirs.has(p)) return statOf(true, 0);
		var f = files.get(p);
		if (f) return statOf(false, f.len);
		return null;
	}

	function grow(f, need) {
		if (f.buf.length >= need) return;
		var cap = Math.max(f.buf.length * 2, need, 4096);
		var nb = new Uint8Array(cap);
		nb.set(f.buf.subarray(0, f.len));
		f.buf = nb;
	}

	// Node open(2) flag values — arbitrary as long as constants and the flag
	// tests below agree with each other (Go reads the values from here).
	var constants = {
		O_WRONLY: 1, O_RDWR: 2, O_CREAT: 64, O_EXCL: 128,
		O_TRUNC: 512, O_APPEND: 1024, O_DIRECTORY: 65536,
	};

	return {
		constants: constants,

		writeSync: function (fd, buf) {
			if (fd === 1 || fd === 2) return consoleWrite(fd, buf);
			throw enosys('writeSync(fd ' + fd + ')');
		},

		open: function (path, flags, mode, cb) {
			var p = norm(path);
			if (dirs.has(p)) {
				// Directory opens exist solely for btypedb's SyncDir (open,
				// fsync, close) — no readdir-through-fd support needed.
				fds.set(nextFd, { isDir: true, path: p });
				cb(null, nextFd++);
				return;
			}
			var f = files.get(p);
			if (!f) {
				if (!(flags & constants.O_CREAT)) { cb(err('ENOENT', p)); return; }
				if (!ensureDirs(parentOf(p))) { cb(err('ENOTDIR', p)); return; }
				f = { buf: new Uint8Array(0), len: 0 };
				files.set(p, f);
			} else if ((flags & constants.O_CREAT) && (flags & constants.O_EXCL)) {
				cb(err('EEXIST', p));
				return;
			}
			if (flags & constants.O_TRUNC) f.len = 0;
			fds.set(nextFd, { file: f, path: p, pos: 0, append: !!(flags & constants.O_APPEND) });
			cb(null, nextFd++);
		},

		close: function (fd, cb) {
			cb(fds.delete(fd) ? null : err('EBADF', 'close ' + fd));
		},

		read: function (fd, buffer, offset, length, position, cb) {
			var r = fds.get(fd);
			if (!r) { cb(err('EBADF', 'read ' + fd)); return; }
			if (r.isDir) { cb(err('EISDIR', r.path)); return; }
			var sequential = position === null || position === undefined;
			var pos = sequential ? r.pos : Number(position);
			var n = Math.max(0, Math.min(length, r.file.len - pos));
			if (n > 0) buffer.set(r.file.buf.subarray(pos, pos + n), offset);
			if (sequential) r.pos = pos + n;
			cb(null, n);
		},

		write: function (fd, buf, offset, length, position, cb) {
			if (fd === 1 || fd === 2) {
				cb(null, consoleWrite(fd, buf.subarray(offset, offset + length)));
				return;
			}
			var r = fds.get(fd);
			if (!r) { cb(err('EBADF', 'write ' + fd)); return; }
			if (r.isDir) { cb(err('EISDIR', r.path)); return; }
			var sequential = position === null || position === undefined;
			var pos = sequential ? (r.append ? r.file.len : r.pos) : Number(position);
			grow(r.file, pos + length);
			r.file.buf.set(buf.subarray(offset, offset + length), pos);
			r.file.len = Math.max(r.file.len, pos + length);
			if (sequential) r.pos = pos + length;
			cb(null, length);
		},

		fsync: function (fd, cb) { cb(fds.has(fd) ? null : err('EBADF', 'fsync ' + fd)); },

		fstat: function (fd, cb) {
			var r = fds.get(fd);
			if (!r) { cb(err('EBADF', 'fstat ' + fd)); return; }
			cb(null, r.isDir ? statOf(true, 0) : statOf(false, r.file.len));
		},

		stat: function (path, cb) {
			var st = statPath(norm(path));
			st ? cb(null, st) : cb(err('ENOENT', path));
		},

		lstat: function (path, cb) { // no symlinks in memfs → identical to stat
			var st = statPath(norm(path));
			st ? cb(null, st) : cb(err('ENOENT', path));
		},

		rename: function (from, to, cb) {
			var f = norm(from), t = norm(to);
			var rec = files.get(f);
			if (!rec) { cb(err('ENOENT', from)); return; }
			files.delete(f);
			files.set(t, rec); // silently replaces any target, as POSIX rename does
			cb(null);
		},

		unlink: function (path, cb) {
			cb(files.delete(norm(path)) ? null : err('ENOENT', path));
		},

		mkdir: function (path, perm, cb) {
			var p = norm(path);
			if (dirs.has(p) || files.has(p)) { cb(err('EEXIST', path)); return; }
			ensureDirs(p) ? cb(null) : cb(err('ENOTDIR', path));
		},

		rmdir: function (path, cb) {
			var p = norm(path);
			if (!dirs.has(p)) { cb(err('ENOENT', path)); return; }
			if (p === '/') { cb(err('EBUSY', path)); return; }
			var occupied = false;
			files.forEach(function (_, fp) { if (parentOf(fp) === p) occupied = true; });
			dirs.forEach(function (dp) { if (dp !== p && parentOf(dp) === p) occupied = true; });
			if (occupied) { cb(err('ENOTEMPTY', path)); return; }
			dirs.delete(p);
			cb(null);
		},

		readdir: function (path, cb) {
			var p = norm(path);
			if (!dirs.has(p)) { cb(err(files.has(p) ? 'ENOTDIR' : 'ENOENT', path)); return; }
			var names = [];
			var scan = function (_, full) {
				if (typeof full !== 'string') full = _; // Set forEach passes (v, v)
				if (full !== p && parentOf(full) === p) names.push(full.slice(p === '/' ? 1 : p.length + 1));
			};
			files.forEach(scan);
			dirs.forEach(scan);
			cb(null, names);
		},

		truncate: function (path, len, cb) {
			var f = files.get(norm(path));
			if (!f) { cb(err('ENOENT', path)); return; }
			grow(f, len);
			f.len = len;
			cb(null);
		},

		ftruncate: function (fd, len, cb) {
			var r = fds.get(fd);
			if (!r || r.isDir) { cb(err('EBADF', 'ftruncate ' + fd)); return; }
			grow(r.file, len);
			r.file.len = len;
			cb(null);
		},

		// Never exercised by the packages we ship; explicit ENOSYS keeps any
		// future surprise loud instead of silently succeeding.
		chmod: function (p, m, cb) { cb(enosys('chmod')); },
		chown: function (p, u, g, cb) { cb(enosys('chown')); },
		fchmod: function (fd, m, cb) { cb(enosys('fchmod')); },
		fchown: function (fd, u, g, cb) { cb(enosys('fchown')); },
		lchown: function (p, u, g, cb) { cb(enosys('lchown')); },
		link: function (p, l, cb) { cb(enosys('link')); },
		symlink: function (p, l, cb) { cb(enosys('symlink')); },
		readlink: function (p, cb) { cb(enosys('readlink')); },
		utimes: function (p, a, m, cb) { cb(enosys('utimes')); },
	};
});
