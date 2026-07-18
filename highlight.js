// highlight.js — tiny, dependency-free syntax highlighters for the element
// playground: Go, TypeScript, and JavaScript source, plus generated HTML
// (with CSS inside <style> blocks).
//
//   goHi.go(src)            -> HTML string (token <span>s)
//   goHi.ts(src)            -> HTML string (token <span>s)
//   goHi.js(src)            -> HTML string (token <span>s)
//   goHi.html(out, swatch)  -> HTML string (optional color swatches in CSS)
//   goHi.escape(s)          -> HTML-escaped string
//   goHi.editor(ta, code, enabled, lang)
//                           -> wires a <textarea> to its overlay <code>;
//                               returns a repaint function. `lang` (optional)
//                               returns 'go' | 'ts' | 'js' | 'html' per paint,
//                               default 'go'
//
// Invariant shared by every tokenizer: the text content of the returned HTML
// is character-identical to the input, so the overlay editor's textarea and
// highlight layer stay column-aligned. Color swatches (an extra inline <i>)
// are therefore only used in the output pane, never in an editor.
(() => {
'use strict';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const esc = s => s.replace(/[&<>]/g, c => ESC[c]);
const span = (cls, s) => s ? '<span class="' + cls + '">' + esc(s) + '</span>' : '';

// --- Go / TypeScript ----------------------------------------------------------
// One scanner, two word-class profiles: the languages share every lexical
// shape the overlay needs (// and /* */ comments, ' " strings, and Go's
// backquoted raw strings scan identically to TS template literals — both run
// to the closing backtick, newlines included).

const GO_PROF = {
  kw: /^(?:break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var)$/,
  lit: /^(?:true|false|nil|iota)$/,
  type: /^(?:any|bool|byte|comparable|complex64|complex128|error|float32|float64|int|int8|int16|int32|int64|rune|string|uint|uint8|uint16|uint32|uint64|uintptr)$/,
  builtin: /^(?:append|cap|clear|close|complex|copy|delete|imag|len|make|max|min|new|panic|print|println|real|recover)$/,
  decl: /^(?:func|type)$/,
};

const TS_PROF = {
  kw: /^(?:abstract|as|async|await|break|case|catch|class|const|continue|debugger|declare|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|infer|instanceof|interface|is|keyof|let|namespace|new|of|out|override|private|protected|public|readonly|return|satisfies|set|static|super|switch|throw|try|type|typeof|var|while|yield)$/,
  lit: /^(?:true|false|null|undefined|this|NaN|Infinity)$/,
  type: /^(?:any|bigint|boolean|never|number|object|string|symbol|unknown|void)$/,
  builtin: /^(?:0)$/, // TS has no builtin-call class; regex that matches no identifier
  decl: /^(?:function|class|interface|type|enum|namespace)$/,
};

// JavaScript is TS minus the type-system words: highlighting `type` or
// `interface` as keywords in plain JS would paint ordinary identifiers.
// `undefined`/`NaN`/`Infinity` stay in lit — technically globals, but every
// reader groups them with the literals.
const JS_PROF = {
  kw: /^(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|from|function|get|if|import|in|instanceof|let|new|of|return|set|static|super|switch|throw|try|typeof|var|void|while|yield)$/,
  lit: /^(?:true|false|null|undefined|this|NaN|Infinity)$/,
  type: /^(?:0)$/, // no type-name class in JS; regex that matches no identifier
  builtin: /^(?:0)$/,
  decl: /^(?:function|class)$/,
};

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*/;

// Scans one chunk. `st.block` carries an open /* */ across lines;
// `st.raw` an open backquote (Go raw string / TS template literal).
function chunk(text, st, prof) {
  let out = '', i = 0;
  let prevWord = '';
  const n = text.length;
  while (i < n) {
    const rest = text.slice(i);
    let m;
    if (st.block) {
      const end = rest.indexOf('*/');
      if (end < 0) { out += span('t-com', rest); break; }
      out += span('t-com', rest.slice(0, end + 2));
      st.block = false; i += end + 2; continue;
    }
    if (st.raw) {
      const end = rest.indexOf('`');
      if (end < 0) { out += span('t-str', rest); break; }
      out += span('t-str', rest.slice(0, end + 1));
      st.raw = false; i += end + 1; continue;
    }
    if (rest.startsWith('/*')) { st.block = true; continue; }
    if (rest.startsWith('//')) { out += span('t-com', rest); break; }
    if (rest[0] === '`') { st.raw = true; out += span('t-str', '`'); i++; continue; }
    if ((m = /^"(?:\\.|[^"\\])*"?/.exec(rest))) { out += span('t-str', m[0]); i += m[0].length; prevWord = ''; continue; }
    if ((m = /^'(?:\\.|[^'\\])*'?/.exec(rest))) { out += span('t-str', m[0]); i += m[0].length; prevWord = ''; continue; }
    if ((m = /^(?:0[xXbBoO][0-9a-fA-F_]+|(?:\d[\d_]*)(?:\.[\d_]*)?(?:[eE][+-]?\d+)?i?n?)/.exec(rest))) {
      out += span('t-num', m[0]); i += m[0].length; prevWord = ''; continue;
    }
    if ((m = IDENT.exec(rest))) {
      const w = m[0];
      const afterDot = text[i - 1] === '.';
      let cls;
      if (!afterDot && prof.kw.test(w)) cls = 't-kw';
      else if (!afterDot && prof.lit.test(w)) cls = 't-num';
      else if (!afterDot && prof.type.test(w)) cls = 't-cls';
      else if (rest[w.length] === '(')
        cls = !afterDot && prof.builtin.test(w) ? 't-kw' : 't-fn';
      else if (prof.decl.test(prevWord)) cls = 't-fn';
      else if (!afterDot && text[i + w.length] === '.') cls = 't-var'; // package/object qualifier
      else cls = 't-id';
      out += span(cls, w);
      prevWord = w; i += w.length; continue;
    }
    if ((m = /^\s+/.exec(rest))) { out += m[0]; i += m[0].length; continue; }
    out += span('t-op', rest[0]); i++; prevWord = '';
  }
  return out;
}

function go(src) {
  const st = { block: false, raw: false };
  return src.split('\n').map(line => chunk(line, st, GO_PROF)).join('\n');
}

function ts(src) {
  const st = { block: false, raw: false };
  return src.split('\n').map(line => chunk(line, st, TS_PROF)).join('\n');
}

function js(src) {
  const st = { block: false, raw: false };
  return src.split('\n').map(line => chunk(line, st, JS_PROF)).join('\n');
}

// --- Python -------------------------------------------------------------------
// Python's lexical shapes (# comments, triple-quoted strings, string
// prefixes, decorators) don't fit the C-family `chunk` scanner, so it gets
// its own — same identity invariant: output text === input text.

const PY_PROF = {
  kw: /^(?:and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|raise|return|try|while|with|yield)$/,
  lit: /^(?:True|False|None|self|cls)$/,
  builtin: /^(?:abs|all|any|bool|bytes|callable|dict|dir|divmod|enumerate|filter|float|format|frozenset|getattr|hasattr|hash|id|int|isinstance|issubclass|iter|len|list|map|max|min|next|object|open|ord|chr|print|property|range|repr|reversed|round|set|setattr|sorted|staticmethod|classmethod|str|sum|super|tuple|type|vars|zip)$/,
  decl: /^(?:def|class)$/,
};

// st.tq carries an open ''' / """ across lines (the one multi-line lexical
// state Python has; # comments end at the newline).
function pyChunk(text, st) {
  let out = '', i = 0;
  let prevWord = '';
  const n = text.length;
  while (i < n) {
    const rest = text.slice(i);
    let m;
    if (st.tq) {
      const end = rest.indexOf(st.tq);
      if (end < 0) { out += span('t-str', rest); return out; }
      out += span('t-str', rest.slice(0, end + 3));
      st.tq = null; i += end + 3; continue;
    }
    if (rest[0] === '#') { out += span('t-com', rest); break; }
    // strings, with optional prefix letters (f, r, b, u and pairs like rb)
    if ((m = /^([rRbBuUfF]{0,2})('''|""")/.exec(rest))) {
      const open = m[0];
      const q = m[2];
      const end = rest.indexOf(q, open.length);
      if (end < 0) { st.tq = q; out += span('t-str', rest); return out; }
      out += span('t-str', rest.slice(0, end + 3)); i += end + 3; prevWord = ''; continue;
    }
    if ((m = /^[rRbBuUfF]{0,2}"(?:\\.|[^"\\])*"?/.exec(rest)) && /["']/.test(m[0])) {
      out += span('t-str', m[0]); i += m[0].length; prevWord = ''; continue;
    }
    if ((m = /^[rRbBuUfF]{0,2}'(?:\\.|[^'\\])*'?/.exec(rest)) && /["']/.test(m[0])) {
      out += span('t-str', m[0]); i += m[0].length; prevWord = ''; continue;
    }
    if ((m = /^@[A-Za-z_][\w.]*/.exec(rest))) { out += span('t-at', m[0]); i += m[0].length; prevWord = ''; continue; }
    if ((m = /^(?:0[xXbBoO][0-9a-fA-F_]+|(?:\d[\d_]*)(?:\.[\d_]*)?(?:[eE][+-]?\d+)?[jJ]?)/.exec(rest))) {
      out += span('t-num', m[0]); i += m[0].length; prevWord = ''; continue;
    }
    if ((m = IDENT.exec(rest))) {
      const w = m[0];
      const afterDot = text[i - 1] === '.';
      let cls;
      if (!afterDot && PY_PROF.kw.test(w)) cls = 't-kw';
      else if (!afterDot && PY_PROF.lit.test(w)) cls = 't-num';
      else if (PY_PROF.decl.test(prevWord)) cls = 't-fn';
      else if (rest[w.length] === '(')
        cls = !afterDot && PY_PROF.builtin.test(w) ? 't-kw' : 't-fn';
      else if (!afterDot && text[i + w.length] === '.') cls = 't-var'; // module/object qualifier
      else cls = 't-id';
      out += span(cls, w);
      prevWord = w; i += w.length; continue;
    }
    if ((m = /^\s+/.exec(rest))) { out += m[0]; i += m[0].length; continue; }
    out += span('t-op', rest[0]); i++; prevWord = '';
  }
  return out;
}

function py(src) {
  const st = { tq: null };
  return src.split('\n').map(line => pyChunk(line, st)).join('\n');
}

// --- Shell --------------------------------------------------------------------
// Line-oriented like Python's scanner: # comments, '' literal strings, ""
// strings with $ expansions painted inside, $VAR/${..}/$(..)/$((..)),
// keywords and common command names. Same identity invariant.

const SH_KW = /^(?:if|then|elif|else|fi|for|while|do|done|case|esac|in|function|local|return|exit|export|shift|break|continue)$/;
const SH_CMD = /^(?:echo|printf|cd|pwd|ls|cat|mkdir|touch|rm|cp|mv|grep|cut|sort|uniq|wc|head|tail|tr|seq|basename|dirname|find|sed|xargs|test|true|false|read|unset)$/;

function shDollar(text, i) {
  // paints one $-expansion starting at i; returns [html, nextIndex]
  let m;
  if ((m = /^\$\(\(/.exec(text.slice(i)))) {
    let d = 0, j = i + 1;
    while (j < text.length) {
      if (text[j] === '(') d++;
      else if (text[j] === ')') { d--; if (d === 0) break; }
      j++;
    }
    return [span('t-num', text.slice(i, j + 1)), j + 1];
  }
  if (text[i + 1] === '(') {
    let d = 0, j = i + 1;
    while (j < text.length) {
      if (text[j] === '(') d++;
      else if (text[j] === ')') { d--; if (d === 0) break; }
      j++;
    }
    // command substitution: paint the wrapper, recurse on the inside
    return [span('t-op', '$(') + shLine(text.slice(i + 2, j)) + span('t-op', ')'), j + 1];
  }
  if ((m = /^\$\{[^}]*\}?/.exec(text.slice(i)))) return [span('t-var', m[0]), i + m[0].length];
  if ((m = /^\$(?:[?#@*0-9]|[A-Za-z_][A-Za-z0-9_]*)/.exec(text.slice(i)))) return [span('t-var', m[0]), i + m[0].length];
  return [span('t-op', '$'), i + 1];
}

function shLine(text) {
  let out = '', i = 0;
  let atCmd = true; // next word is a command-name position
  const n = text.length;
  while (i < n) {
    const rest = text.slice(i);
    let m;
    if (rest[0] === '#') { out += span('t-com', rest); break; }
    if (rest[0] === "'") {
      const j = text.indexOf("'", i + 1);
      const s = j < 0 ? rest : text.slice(i, j + 1);
      out += span('t-str', s); i += s.length; continue;
    }
    if (rest[0] === '"') {
      let j = i + 1, buf = span('t-str', '"');
      while (j < n && text[j] !== '"') {
        if (text[j] === '\\') { buf += span('t-str', text.slice(j, j + 2)); j += 2; continue; }
        if (text[j] === '$') { const r = shDollar(text, j); buf += r[0]; j = r[1]; continue; }
        buf += span('t-str', text[j]); j++;
      }
      if (j < n) { buf += span('t-str', '"'); j++; }
      out += buf; i = j; continue;
    }
    if (rest[0] === '$') { const r = shDollar(text, i); out += r[0]; i = r[1]; atCmd = false; continue; }
    if ((m = /^(?:&&|\|\||\||;;|;|2>&1|2>>|2>|>>|>|<<|<|\(|\)|\{|\}|\[|\]|=|\\)/.exec(rest))) {
      out += span('t-op', m[0]); i += m[0].length;
      if (m[0] !== '=' && m[0] !== '[' && m[0] !== ']') atCmd = true;
      continue;
    }
    if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) {
      const w = m[0];
      let cls;
      if (SH_KW.test(w)) { cls = 't-kw'; atCmd = w !== 'in'; }
      else if (atCmd && text[i + w.length] === '=') { cls = 't-var'; }
      else if (atCmd && SH_CMD.test(w)) { cls = 't-fn'; atCmd = false; }
      else if (atCmd) { cls = 't-fn'; atCmd = false; }
      else cls = 't-id';
      out += span(cls, w); i += w.length; continue;
    }
    if ((m = /^-[A-Za-z0-9-]+/.exec(rest))) { out += span('t-prop', m[0]); i += m[0].length; continue; }
    if ((m = /^\d+/.exec(rest))) { out += span('t-num', m[0]); i += m[0].length; continue; }
    if ((m = /^\s+/.exec(rest))) { out += m[0]; i += m[0].length; continue; }
    out += span('t-op', rest[0]); i++;
  }
  return out;
}

function sh(src) {
  return src.split('\n').map(line => shLine(line)).join('\n');
}

// --- CSS value scanner (for <style> bodies; ported from go-styl) -------------

const CSS_KW = /^(?:and|or|not|only|from|to|important)$/;

function cssValue(text, st, swatch) {
  let out = '', i = 0;
  const n = text.length;
  while (i < n) {
    const rest = text.slice(i);
    let m;
    if (st.comment) {
      const end = rest.indexOf('*/');
      if (end < 0) { out += span('t-com', rest); break; }
      out += span('t-com', rest.slice(0, end + 2));
      st.comment = false; i += end + 2; continue;
    }
    if (rest.startsWith('/*')) { st.comment = true; continue; }
    if ((m = /^(['"])(?:\\.|(?!\1).)*\1?/.exec(rest))) { out += span('t-str', m[0]); i += m[0].length; continue; }
    if ((m = /^#[0-9a-fA-F]{3,8}\b/.exec(rest))) {
      out += swatch
        ? '<span class="t-col"><i style="background:' + m[0] + '"></i>' + m[0] + '</span>'
        : '<span class="t-col" style="text-decoration-color:' + m[0] + '">' + m[0] + '</span>';
      i += m[0].length; continue;
    }
    if ((m = /^(\d*\.)?\d+[a-zA-Z%]*/.exec(rest))) { out += span('t-num', m[0]); i += m[0].length; continue; }
    if ((m = /^![a-zA-Z]+/.exec(rest))) { out += span('t-kw', m[0]); i += m[0].length; continue; }
    if ((m = /^-{0,2}[A-Za-z_$][-\w$]*/.exec(rest))) {
      const w = m[0];
      out += span(rest[w.length] === '(' ? 't-fn' : CSS_KW.test(w) ? 't-kw' : 't-id', w);
      i += w.length; continue;
    }
    if ((m = /^\s+/.exec(rest))) { out += m[0]; i += m[0].length; continue; }
    out += span('t-op', rest[0]); i++;
  }
  return out;
}

function cssSelector(text, st) {
  let out = '', i = 0;
  const n = text.length;
  while (i < n) {
    const rest = text.slice(i);
    let m;
    if (st.comment || rest.startsWith('/*')) return out + cssValue(rest, st);
    if ((m = /^(['"])(?:\\.|(?!\1).)*\1?/.exec(rest))) { out += span('t-str', m[0]); i += m[0].length; continue; }
    if ((m = /^[.#][-\w]+/.exec(rest))) { out += span('t-cls', m[0]); i += m[0].length; continue; }
    if ((m = /^::?[-\w]+/.exec(rest))) { out += span('t-pse', m[0]); i += m[0].length; continue; }
    if ((m = /^(\d*\.)?\d+%?/.exec(rest))) { out += span('t-num', m[0]); i += m[0].length; continue; }
    if ((m = /^[-\w]+/.exec(rest))) { out += span('t-sel', m[0]); i += m[0].length; continue; }
    if ((m = /^\s+/.exec(rest))) { out += m[0]; i += m[0].length; continue; }
    out += span('t-op', rest[0]); i++;
  }
  return out;
}

// css tokenizes a stylesheet (a <style> body). Context stack: 'sel' expects
// selectors / at-rules; 'body' expects `prop: value;` declarations.
function css(text, swatch) {
  let out = '', i = 0;
  const stack = ['sel'];
  const st = { comment: false };
  while (i < text.length) {
    const rest = text.slice(i);
    let m;
    if ((m = /^\s+/.exec(rest))) { out += m[0]; i += m[0].length; continue; }
    if ((m = /^\/\*[^]*?(?:\*\/|$)/.exec(rest))) { out += span('t-com', m[0]); i += m[0].length; continue; }
    if (rest[0] === '}') {
      if (stack.length > 1) stack.pop();
      out += span('t-op', '}'); i++; continue;
    }
    if (stack[stack.length - 1] === 'sel') {
      if (rest[0] === '@') {
        m = /^@[-\w]+/.exec(rest);
        out += span('t-at', m[0]); i += m[0].length;
        const p = /^[^{;]*/.exec(text.slice(i))[0];
        out += cssValue(p, st, swatch); i += p.length;
        if (text[i] === '{') {
          stack.push(/^@(media|supports|keyframes|-[-\w]+-keyframes|document|layer|container)$/.test(m[0]) ? 'sel' : 'body');
          out += span('t-op', '{'); i++;
        } else if (text[i] === ';') { out += span('t-op', ';'); i++; }
        continue;
      }
      m = /^[^{}@]+/.exec(rest);
      if (m) {
        out += cssSelector(m[0], st); i += m[0].length;
        if (text[i] === '{') { stack.push('body'); out += span('t-op', '{'); i++; }
        continue;
      }
      if (rest[0] === '{') { stack.push('body'); out += span('t-op', '{'); i++; continue; }
      out += span('t-op', rest[0]); i++; continue;
    }
    if ((m = /^(--[\w-]+|\*?[-\w$]+)(\s*)(:)/.exec(rest))) {
      out += span('t-prop', m[1]) + m[2] + span('t-op', ':');
      i += m[0].length;
      const v = /^[^;}]*/.exec(text.slice(i))[0];
      out += cssValue(v, st, swatch); i += v.length;
      if (text[i] === ';') { out += span('t-op', ';'); i++; }
      continue;
    }
    out += span('t-op', rest[0]); i++;
  }
  return out;
}

// --- HTML ----------------------------------------------------------------------
// Tokenizes serialized HTML (the playground's output pane). <style> bodies are
// handed to the css tokenizer; <script> bodies stay plain.
function html(text, swatch) {
  let out = '', i = 0;
  const n = text.length;
  while (i < n) {
    const rest = text.slice(i);
    let m;
    if ((m = /^<!--[^]*?(?:-->|$)/.exec(rest))) { out += span('t-com', m[0]); i += m[0].length; continue; }
    if ((m = /^<!(?:DOCTYPE|doctype)[^>]*>?/.exec(rest))) { out += span('t-at', m[0]); i += m[0].length; continue; }
    if ((m = /^(<\/?)([A-Za-z][-\w]*)/.exec(rest))) {
      const closing = m[1] === '</';
      const tag = m[2].toLowerCase();
      out += span('t-op', m[1]) + span('t-sel', m[2]);
      i += m[0].length;
      // attributes until '>'
      while (i < n && text[i] !== '>') {
        const arest = text.slice(i);
        let am;
        if ((am = /^\s+/.exec(arest))) { out += am[0]; i += am[0].length; continue; }
        if (arest[0] === '/') { out += span('t-op', '/'); i++; continue; }
        if ((am = /^(['"])(?:(?!\1).)*\1?/.exec(arest))) { out += span('t-str', am[0]); i += am[0].length; continue; }
        if ((am = /^[^\s=>'"\/]+/.exec(arest))) { out += span('t-prop', am[0]); i += am[0].length; continue; }
        if (arest[0] === '=') { out += span('t-op', '='); i++; continue; }
        out += span('t-op', arest[0]); i++;
      }
      if (text[i] === '>') { out += span('t-op', '>'); i++; }
      if (!closing && (tag === 'style' || tag === 'script')) {
        const close = '</' + tag;
        let end = text.toLowerCase().indexOf(close, i);
        if (end < 0) end = n;
        const body = text.slice(i, end);
        out += tag === 'style' ? css(body, swatch) : span('t-id', body);
        i = end;
      }
      continue;
    }
    if ((m = /^&[#\w]+;/.exec(rest))) { out += span('t-num', m[0]); i += m[0].length; continue; }
    if ((m = /^[^<&]+/.exec(rest))) { out += esc(m[0]); i += m[0].length; continue; }
    out += span('t-op', rest[0]); i++;
  }
  return out;
}

// --- overlay editor wiring ---------------------------------------------------
// The <textarea> sits on top with transparent text (its wrapper's CSS handles
// that); the highlighted copy lives in `code` inside an overflow-hidden <pre>
// behind it. `enabled()` lets the host toggle highlighting off cheaply.
function editor(ta, code, enabled, lang) {
  const pre = code.parentElement;
  const paint = () => {
    const l = lang && lang();
    // html is editor-safe here because swatches (the one non-identity
    // decoration) are only added when the swatch arg is passed — it isn't.
    const hi = l === 'ts' ? ts : l === 'js' ? js : l === 'py' ? py : l === 'sh' ? sh : l === 'html' ? html : go;
    code.innerHTML = (enabled ? enabled() : true) ? hi(ta.value) + '\n' : esc(ta.value) + '\n';
  };
  const sync = () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; };
  ta.addEventListener('input', paint);
  ta.addEventListener('scroll', sync);
  paint();
  return () => { paint(); sync(); };
}

const api = { go, ts, js, py, sh, html, css, escape: esc, editor };
if (typeof window !== 'undefined') window.goHi = api;
if (typeof module !== 'undefined') module.exports = api;
})();
