import { Token, TokenType } from '../types';

const KEYWORDS: Record<string, TokenType> = {
  loop: 'LOOP',
  repeat: 'REPEAT',
  if: 'IF',
  else: 'ELSE',
  break: 'BREAK',
  continue: 'CONTINUE',
  true: 'TRUE',
  false: 'FALSE',
  and: 'AND',
  or: 'OR',
  not: 'NOT',
};

export class LexError extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(message);
    this.line = line;
  }
}

/**
 * Converts raw DSL source into a flat list of tokens.
 * The language is intentionally tiny: identifiers/keywords, string
 * literals, numbers, and a handful of punctuation/operator symbols.
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  const n = source.length;

  const peek = () => source[i];
  const peekNext = () => source[i + 1];

  while (i < n) {
    const c = source[i];

    // Whitespace
    if (c === '\n') {
      line++;
      i++;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      i++;
      continue;
    }

    // Comments (// to end of line)
    if (c === '/' && peekNext() === '/') {
      while (i < n && source[i] !== '\n') i++;
      continue;
    }

    // Strings
    if (c === '"' || c === "'") {
      const quote = c;
      const startLine = line;
      i++;
      let value = '';
      while (i < n && source[i] !== quote) {
        if (source[i] === '\n') throw new LexError('Unterminated string literal', startLine);
        value += source[i];
        i++;
      }
      if (i >= n) throw new LexError('Unterminated string literal', startLine);
      i++; // closing quote
      tokens.push({ type: 'STRING', value, line: startLine });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(c)) {
      let value = '';
      while (i < n && /[0-9.]/.test(source[i])) {
        value += source[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value, line });
      continue;
    }

    // Identifiers / keywords
    if (/[A-Za-z_]/.test(c)) {
      let value = '';
      while (i < n && /[A-Za-z0-9_]/.test(source[i])) {
        value += source[i];
        i++;
      }
      const kw = KEYWORDS[value.toLowerCase()];
      tokens.push({ type: kw ?? 'IDENT', value, line });
      continue;
    }

    // Punctuation / operators
    switch (c) {
      case '(':
        tokens.push({ type: 'LPAREN', value: c, line });
        i++;
        continue;
      case ')':
        tokens.push({ type: 'RPAREN', value: c, line });
        i++;
        continue;
      case '{':
        tokens.push({ type: 'LBRACE', value: c, line });
        i++;
        continue;
      case '}':
        tokens.push({ type: 'RBRACE', value: c, line });
        i++;
        continue;
      case ',':
        tokens.push({ type: 'COMMA', value: c, line });
        i++;
        continue;
      case ';':
        // statement separators are optional/ignored - newlines already work
        i++;
        continue;
      case '=':
        if (peekNext() === '=') {
          tokens.push({ type: 'EQEQ', value: '==', line });
          i += 2;
          continue;
        }
        throw new LexError(`Unexpected '=' (did you mean '=='?)`, line);
      case '!':
        if (peekNext() === '=') {
          tokens.push({ type: 'NEQ', value: '!=', line });
          i += 2;
          continue;
        }
        tokens.push({ type: 'NOT', value: '!', line });
        i++;
        continue;
      case '&':
        if (peekNext() === '&') {
          tokens.push({ type: 'AND', value: '&&', line });
          i += 2;
          continue;
        }
        throw new LexError(`Unexpected '&'`, line);
      case '|':
        if (peekNext() === '|') {
          tokens.push({ type: 'OR', value: '||', line });
          i += 2;
          continue;
        }
        throw new LexError(`Unexpected '|'`, line);
      default:
        throw new LexError(`Unexpected character '${c}'`, line);
    }
  }

  tokens.push({ type: 'EOF', value: '', line });
  return tokens;
}
