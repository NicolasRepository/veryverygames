import { Token, TokenType, Stmt, Expr } from '../types';
import { tokenize, LexError } from './lexer';

export class ParseSyntaxError extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(message);
    this.line = line;
  }
}

/**
 * Small recursive-descent parser.
 *
 * Grammar (informal):
 *   program    := statement*
 *   statement  := loopStmt | repeatStmt | ifStmt | breakStmt | continueStmt | exprStmt
 *   loopStmt   := 'loop' block
 *   repeatStmt := 'repeat' '(' expr ')' block
 *   ifStmt     := 'if' '(' expr ')' block ('else' block)?
 *   exprStmt   := call
 *   block      := '{' statement* '}'
 *   expr       := or
 *   or         := and ('or' and)*
 *   and        := equality ('and' equality)*
 *   equality   := unary (('==' | '!=') unary)*
 *   unary      := 'not' unary | primary
 *   primary    := STRING | NUMBER | 'true' | 'false' | call
 *   call       := IDENT '(' (expr (',' expr)*)? ')'
 */
export class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  static parseProgram(source: string): Stmt[] {
    const tokens = tokenize(source);
    const parser = new Parser(tokens);
    return parser.parseProgram();
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private expect(type: TokenType, msg: string): Token {
    if (!this.check(type)) {
      throw new ParseSyntaxError(msg, this.peek().line);
    }
    return this.advance();
  }

  parseProgram(): Stmt[] {
    const stmts: Stmt[] = [];
    while (!this.check('EOF')) {
      stmts.push(this.parseStatement());
    }
    return stmts;
  }

  private parseBlock(): Stmt[] {
    this.expect('LBRACE', "Expected '{' to start a block");
    const stmts: Stmt[] = [];
    while (!this.check('RBRACE') && !this.check('EOF')) {
      stmts.push(this.parseStatement());
    }
    this.expect('RBRACE', "Expected '}' to close block");
    return stmts;
  }

  private parseStatement(): Stmt {
    const tok = this.peek();
    switch (tok.type) {
      case 'LOOP': {
        this.advance();
        const body = this.parseBlock();
        return { kind: 'Loop', body, line: tok.line };
      }
      case 'REPEAT': {
        this.advance();
        this.expect('LPAREN', "Expected '(' after 'repeat'");
        const count = this.parseExpr();
        this.expect('RPAREN', "Expected ')' after repeat count");
        const body = this.parseBlock();
        return { kind: 'Repeat', count, body, line: tok.line };
      }
      case 'IF': {
        this.advance();
        this.expect('LPAREN', "Expected '(' after 'if'");
        const cond = this.parseExpr();
        this.expect('RPAREN', "Expected ')' after if condition");
        const thenBlock = this.parseBlock();
        let elseBlock: Stmt[] | null = null;
        if (this.check('ELSE')) {
          this.advance();
          if (this.check('IF')) {
            // allow 'else if'
            elseBlock = [this.parseStatement()];
          } else {
            elseBlock = this.parseBlock();
          }
        }
        return { kind: 'If', cond, then: thenBlock, else: elseBlock, line: tok.line };
      }
      case 'BREAK':
        this.advance();
        return { kind: 'Break', line: tok.line };
      case 'CONTINUE':
        this.advance();
        return { kind: 'Continue', line: tok.line };
      default: {
        const expr = this.parseExpr();
        return { kind: 'ExprStmt', expr, line: tok.line };
      }
    }
  }

  private parseExpr(): Expr {
    return this.parseOr();
  }

  private parseOr(): Expr {
    let left = this.parseAnd();
    while (this.check('OR')) {
      this.advance();
      const right = this.parseAnd();
      left = { kind: 'Binary', op: '||', left, right };
    }
    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseEquality();
    while (this.check('AND')) {
      this.advance();
      const right = this.parseEquality();
      left = { kind: 'Binary', op: '&&', left, right };
    }
    return left;
  }

  private parseEquality(): Expr {
    let left = this.parseUnary();
    while (this.check('EQEQ') || this.check('NEQ')) {
      const opTok = this.advance();
      const right = this.parseUnary();
      left = { kind: 'Binary', op: opTok.type === 'EQEQ' ? '==' : '!=', left, right };
    }
    return left;
  }

  private parseUnary(): Expr {
    if (this.check('NOT')) {
      this.advance();
      const expr = this.parseUnary();
      return { kind: 'Unary', op: '!', expr };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expr {
    const tok = this.peek();
    switch (tok.type) {
      case 'STRING':
        this.advance();
        return { kind: 'StringLiteral', value: tok.value };
      case 'NUMBER':
        this.advance();
        return { kind: 'NumberLiteral', value: parseFloat(tok.value) };
      case 'TRUE':
        this.advance();
        return { kind: 'BoolLiteral', value: true };
      case 'FALSE':
        this.advance();
        return { kind: 'BoolLiteral', value: false };
      case 'LPAREN': {
        this.advance();
        const expr = this.parseExpr();
        this.expect('RPAREN', "Expected ')' to close expression");
        return expr;
      }
      case 'IDENT': {
        const name = tok.value;
        this.advance();
        this.expect('LPAREN', `Expected '(' after function name '${name}'`);
        const args: Expr[] = [];
        if (!this.check('RPAREN')) {
          args.push(this.parseExpr());
          while (this.check('COMMA')) {
            this.advance();
            args.push(this.parseExpr());
          }
        }
        this.expect('RPAREN', `Expected ')' after arguments to '${name}'`);
        return { kind: 'Call', name, args, line: tok.line };
      }
      default:
        throw new ParseSyntaxError(`Unexpected token '${tok.value || tok.type}'`, tok.line);
    }
  }
}

export function parseProgram(source: string): { stmts: Stmt[] | null; error: { message: string; line: number } | null } {
  try {
    const stmts = Parser.parseProgram(source);
    return { stmts, error: null };
  } catch (e) {
    if (e instanceof ParseSyntaxError || e instanceof LexError) {
      return { stmts: null, error: { message: e.message, line: e.line } };
    }
    return { stmts: null, error: { message: (e as Error).message, line: 0 } };
  }
}
