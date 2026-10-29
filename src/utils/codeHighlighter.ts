/**
 * Arduino C++ Syntax Highlighter for CodeEditor
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function highlightArduinoCode(code: string): string {
  if (!code) return '';

  // Unified Regex for tokens
  const tokenRegex = new RegExp(
    [
      // 1. Comments: multi-line or single-line
      '(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/.*$)',
      // 2. Strings
      '("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\')',
      // 3. Preprocessor directives (#include, #define)
      '(^\\s*#[a-zA-Z_]+(?:\\s+[^\\n]*)?)',
      // 4. Numbers (hex, binary, float, int)
      '\\b(0x[0-9a-fA-F]+|0b[01]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b',
      // 5. Constants
      '\\b(HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|LED_BUILTIN|true|false|NULL|A[0-5])\\b',
      // 6. Keywords & Types
      '\\b(void|int|long|unsigned|float|double|bool|boolean|char|byte|word|String|if|else|while|for|do|break|continue|return|switch|case|default|const|static|struct|class|enum)\\b',
      // 7. Arduino Built-in APIs
      '\\b(setup|loop|pinMode|digitalWrite|digitalRead|analogRead|analogWrite|delay|delayMicroseconds|pulseIn|millis|micros|map|constrain|min|max|abs|sq|sqrt|random|randomSeed|Serial|begin|print|println|available|read|write|flush)\\b',
      // 8. Custom function calls: name followed by (
      '\\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\\s*\\()',
      // 9. Plain text fallback
      '([^"\'\\/\\#0-9a-zA-Z_]+|[a-zA-Z_][a-zA-Z0-9_]*|\\S)'
    ].join('|'),
    'gm'
  );

  let html = '';
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    const [
      ,
      comment,
      str,
      preproc,
      num,
      constant,
      keyword,
      builtin,
      funcCall,
      plain
    ] = match;

    if (comment) {
      html += `<span class="token-comment">${escapeHtml(comment)}</span>`;
    } else if (str) {
      html += `<span class="token-string">${escapeHtml(str)}</span>`;
    } else if (preproc) {
      html += `<span class="token-preprocessor">${escapeHtml(preproc)}</span>`;
    } else if (num) {
      html += `<span class="token-number">${escapeHtml(num)}</span>`;
    } else if (constant) {
      html += `<span class="token-constant">${escapeHtml(constant)}</span>`;
    } else if (keyword) {
      html += `<span class="token-keyword">${escapeHtml(keyword)}</span>`;
    } else if (builtin) {
      html += `<span class="token-builtin">${escapeHtml(builtin)}</span>`;
    } else if (funcCall) {
      html += `<span class="token-func">${escapeHtml(funcCall)}</span>`;
    } else if (plain) {
      html += escapeHtml(plain);
    }
  }

  // Ensure trailing newline matches textarea height calculation
  if (code.endsWith('\n')) {
    html += ' ';
  }

  return html;
}

