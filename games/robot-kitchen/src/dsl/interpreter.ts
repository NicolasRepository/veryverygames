import { Direction, Expr, Stmt } from '../types';
import { ActionResult } from '../game/gameEngine';

export class RuntimeErrorSignal extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(message);
    this.line = line;
  }
}

/** Bridge between the interpreter and the game engine. Every method here
 * synchronously mutates the outside world (via the caller's dispatcher)
 * and returns the outcome so the DSL can branch on it. */
export interface InterpreterAPI {
  move: (dir: Direction) => ActionResult;
  take: (item: string) => ActionResult;
  drop: () => ActionResult;
  chop: () => ActionResult;
  cook: () => ActionResult;
  deliver: () => ActionResult;
  scan: () => ActionResult;
  orderItem: () => ActionResult;
  orderStage: () => ActionResult;
}

type ExecSignal = 'normal' | 'break' | 'continue';

const DIRECTIONS: Direction[] = ['north', 'south', 'east', 'west'];

async function* evalExpr(expr: Expr, api: InterpreterAPI): AsyncGenerator<void, unknown, void> {
  switch (expr.kind) {
    case 'StringLiteral':
      return expr.value;
    case 'NumberLiteral':
      return expr.value;
    case 'BoolLiteral':
      return expr.value;
    case 'Unary': {
      const v = yield* evalExpr(expr.expr, api);
      return !v;
    }
    case 'Binary': {
      const left = yield* evalExpr(expr.left, api);
      if (expr.op === '&&') {
        if (!left) return false;
        const right = yield* evalExpr(expr.right, api);
        return !!right;
      }
      if (expr.op === '||') {
        if (left) return true;
        const right = yield* evalExpr(expr.right, api);
        return !!right;
      }
      const right = yield* evalExpr(expr.right, api);
      if (expr.op === '==') return left === right;
      return left !== right; // '!='
    }
    case 'Call':
      return yield* execCall(expr, api);
  }
}

async function* execCall(expr: Extract<Expr, { kind: 'Call' }>, api: InterpreterAPI): AsyncGenerator<void, unknown, void> {
  const args: unknown[] = [];
  for (const a of expr.args) {
    args.push(yield* evalExpr(a, api));
  }

  switch (expr.name) {
    case 'move': {
      const dir = args[0];
      if (typeof dir !== 'string' || !DIRECTIONS.includes(dir as Direction)) {
        throw new RuntimeErrorSignal(
          `move() expects one of "north", "south", "east", "west" — got ${JSON.stringify(dir)}`,
          expr.line,
        );
      }
      const result = api.move(dir as Direction);
      yield; // one game tick
      return result.success;
    }
    case 'take': {
      const item = args[0];
      if (typeof item !== 'string') {
        throw new RuntimeErrorSignal(`take() expects a string item name`, expr.line);
      }
      const result = api.take(item);
      yield;
      return result.success;
    }
    case 'drop': {
      if (args.length > 0) throw new RuntimeErrorSignal(`drop() takes no arguments`, expr.line);
      const result = api.drop();
      yield;
      return result.success;
    }
    case 'chop': {
      if (args.length > 0) throw new RuntimeErrorSignal(`chop() takes no arguments`, expr.line);
      const result = api.chop();
      yield;
      return result.success;
    }
    case 'cook': {
      if (args.length > 0) throw new RuntimeErrorSignal(`cook() takes no arguments`, expr.line);
      const result = api.cook();
      yield;
      return result.success;
    }
    case 'deliver': {
      if (args.length > 0) throw new RuntimeErrorSignal(`deliver() takes no arguments`, expr.line);
      const result = api.deliver();
      yield;
      return result.success;
    }
    case 'scan': {
      if (args.length > 0) throw new RuntimeErrorSignal(`scan() takes no arguments`, expr.line);
      const result = api.scan();
      yield;
      return result.value ?? '';
    }
    case 'orderItem': {
      if (args.length > 0) throw new RuntimeErrorSignal(`orderItem() takes no arguments`, expr.line);
      const result = api.orderItem();
      yield;
      return result.value ?? '';
    }
    case 'orderStage': {
      if (args.length > 0) throw new RuntimeErrorSignal(`orderStage() takes no arguments`, expr.line);
      const result = api.orderStage();
      yield;
      return result.value ?? '';
    }
    default:
      throw new RuntimeErrorSignal(`Unknown function "${expr.name}()"`, expr.line);
  }
}

async function* execStmt(stmt: Stmt, api: InterpreterAPI): AsyncGenerator<void, ExecSignal, void> {
  switch (stmt.kind) {
    case 'ExprStmt': {
      yield* evalExpr(stmt.expr, api);
      return 'normal';
    }
    case 'Loop': {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const signal = yield* execBlock(stmt.body, api);
        if (signal === 'break') return 'normal';
        // 'continue' and 'normal' both just move to the next iteration
      }
    }
    case 'Repeat': {
      const count = yield* evalExpr(stmt.count, api);
      if (typeof count !== 'number' || Number.isNaN(count)) {
        throw new RuntimeErrorSignal(`repeat() expects a number, got ${JSON.stringify(count)}`, stmt.line);
      }
      for (let i = 0; i < count; i++) {
        const signal = yield* execBlock(stmt.body, api);
        if (signal === 'break') break;
      }
      return 'normal';
    }
    case 'If': {
      const cond = yield* evalExpr(stmt.cond, api);
      if (cond) {
        return yield* execBlock(stmt.then, api);
      } else if (stmt.else) {
        return yield* execBlock(stmt.else, api);
      }
      return 'normal';
    }
    case 'Break':
      return 'break';
    case 'Continue':
      return 'continue';
  }
}

async function* execBlock(stmts: Stmt[], api: InterpreterAPI): AsyncGenerator<void, ExecSignal, void> {
  for (const stmt of stmts) {
    const signal = yield* execStmt(stmt, api);
    if (signal === 'break' || signal === 'continue') return signal;
  }
  return 'normal';
}

/**
 * Entry point: turns a parsed program into an async generator that yields
 * once per executed robot action (one "tick"). The caller drives it by
 * repeatedly awaiting `.next()`, which lets the UI stay responsive and lets
 * the user control execution speed, pausing, and single-stepping.
 */
export function runProgram(stmts: Stmt[], api: InterpreterAPI): AsyncGenerator<void, void, void> {
  return (async function* () {
    yield* execBlock(stmts, api);
  })();
}
