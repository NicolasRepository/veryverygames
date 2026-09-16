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
  isHolding: () => ActionResult;
  distanceTo: (station: string) => ActionResult;
  battery: () => ActionResult;
  charge: () => ActionResult;
}

type ExecSignal = 'normal' | 'break' | 'continue';

const DIRECTIONS: Direction[] = ['norte', 'sul', 'leste', 'oeste'];

/** Runtime environment: global variables + user-defined functions. */
export interface Env {
  vars: Map<string, unknown>;
  funcs: Map<string, Stmt[]>;
}

export function createEnv(): Env {
  return { vars: new Map(), funcs: new Map() };
}

/** Collects top-level `def` declarations before execution so functions can
 * be called even if defined further down in the program (hoisting). */
function hoistFunctions(stmts: Stmt[], env: Env): void {
  for (const s of stmts) {
    if (s.kind === 'FuncDecl') {
      env.funcs.set(s.name, s.body);
    }
  }
}

async function* evalExpr(expr: Expr, api: InterpreterAPI, env: Env): AsyncGenerator<void, unknown, void> {
  switch (expr.kind) {
    case 'StringLiteral':
      return expr.value;
    case 'NumberLiteral':
      return expr.value;
    case 'BoolLiteral':
      return expr.value;
    case 'Ident': {
      if (!env.vars.has(expr.name)) {
        throw new RuntimeErrorSignal(`Variável "${expr.name}" não foi declarada (use "var ${expr.name} = ...")`, expr.line);
      }
      return env.vars.get(expr.name);
    }
    case 'Unary': {
      const v = yield* evalExpr(expr.expr, api, env);
      return !v;
    }
    case 'Binary': {
      const left = yield* evalExpr(expr.left, api, env);
      if (expr.op === '&&') {
        if (!left) return false;
        const right = yield* evalExpr(expr.right, api, env);
        return !!right;
      }
      if (expr.op === '||') {
        if (left) return true;
        const right = yield* evalExpr(expr.right, api, env);
        return !!right;
      }
      const right = yield* evalExpr(expr.right, api, env);
      if (expr.op === '==') return left === right;
      return left !== right; // '!='
    }
    case 'Call':
      return yield* execCall(expr, api, env);
  }
}

async function* execCall(expr: Extract<Expr, { kind: 'Call' }>, api: InterpreterAPI, env: Env): AsyncGenerator<void, unknown, void> {
  // User-defined function? (no parameters — just a reusable block of code)
  if (env.funcs.has(expr.name)) {
    if (expr.args.length > 0) {
      throw new RuntimeErrorSignal(`Função "${expr.name}()" não aceita argumentos`, expr.line);
    }
    const body = env.funcs.get(expr.name)!;
    yield* execBlock(body, api, env);
    return undefined;
  }

  const args: unknown[] = [];
  for (const a of expr.args) {
    args.push(yield* evalExpr(a, api, env));
  }

  switch (expr.name) {
    case 'move': {
      const dir = args[0];
      if (typeof dir !== 'string' || !DIRECTIONS.includes(dir as Direction)) {
        throw new RuntimeErrorSignal(
          `move() espera um destes valores: "norte", "sul", "leste", "oeste" — recebeu ${JSON.stringify(dir)}`,
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
        throw new RuntimeErrorSignal(`take() espera o nome de um item (string)`, expr.line);
      }
      const result = api.take(item);
      yield;
      return result.success;
    }
    case 'drop': {
      if (args.length > 0) throw new RuntimeErrorSignal(`drop() não recebe argumentos`, expr.line);
      const result = api.drop();
      yield;
      return result.success;
    }
    case 'chop': {
      if (args.length > 0) throw new RuntimeErrorSignal(`chop() não recebe argumentos`, expr.line);
      const result = api.chop();
      yield;
      return result.success;
    }
    case 'cook': {
      if (args.length > 0) throw new RuntimeErrorSignal(`cook() não recebe argumentos`, expr.line);
      const result = api.cook();
      yield;
      return result.success;
    }
    case 'deliver': {
      if (args.length > 0) throw new RuntimeErrorSignal(`deliver() não recebe argumentos`, expr.line);
      const result = api.deliver();
      yield;
      return result.success;
    }
    case 'scan': {
      if (args.length > 0) throw new RuntimeErrorSignal(`scan() não recebe argumentos`, expr.line);
      const result = api.scan();
      yield;
      return result.value ?? '';
    }
    case 'orderItem': {
      if (args.length > 0) throw new RuntimeErrorSignal(`orderItem() não recebe argumentos`, expr.line);
      const result = api.orderItem();
      yield;
      return result.value ?? '';
    }
    case 'orderStage': {
      if (args.length > 0) throw new RuntimeErrorSignal(`orderStage() não recebe argumentos`, expr.line);
      const result = api.orderStage();
      yield;
      return result.value ?? '';
    }
    case 'isHolding': {
      if (args.length > 0) throw new RuntimeErrorSignal(`isHolding() não recebe argumentos`, expr.line);
      const result = api.isHolding();
      yield;
      return !!result.value;
    }
    case 'distanceTo': {
      const station = args[0];
      if (typeof station !== 'string') {
        throw new RuntimeErrorSignal(`distanceTo() espera o nome de uma estação (string)`, expr.line);
      }
      const result = api.distanceTo(station);
      yield;
      return typeof result.value === 'number' ? result.value : -1;
    }
    case 'battery': {
      if (args.length > 0) throw new RuntimeErrorSignal(`battery() não recebe argumentos`, expr.line);
      const result = api.battery();
      yield;
      return typeof result.value === 'number' ? result.value : 0;
    }
    case 'charge': {
      if (args.length > 0) throw new RuntimeErrorSignal(`charge() não recebe argumentos`, expr.line);
      const result = api.charge();
      yield;
      return result.success;
    }
    default:
      throw new RuntimeErrorSignal(`Função desconhecida "${expr.name}()"`, expr.line);
  }
}

async function* execStmt(stmt: Stmt, api: InterpreterAPI, env: Env): AsyncGenerator<void, ExecSignal, void> {
  switch (stmt.kind) {
    case 'ExprStmt': {
      yield* evalExpr(stmt.expr, api, env);
      return 'normal';
    }
    case 'VarDecl': {
      const value = yield* evalExpr(stmt.expr, api, env);
      env.vars.set(stmt.name, value);
      return 'normal';
    }
    case 'Assign': {
      if (!env.vars.has(stmt.name)) {
        throw new RuntimeErrorSignal(
          `Não é possível atribuir a "${stmt.name}" — declare primeiro com "var ${stmt.name} = ..."`,
          stmt.line,
        );
      }
      const value = yield* evalExpr(stmt.expr, api, env);
      env.vars.set(stmt.name, value);
      return 'normal';
    }
    case 'FuncDecl': {
      // Already hoisted before the program starts; nothing to do at runtime.
      env.funcs.set(stmt.name, stmt.body);
      return 'normal';
    }
    case 'Loop': {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const signal = yield* execBlock(stmt.body, api, env);
        if (signal === 'break') return 'normal';
        // 'continue' and 'normal' both just move to the next iteration
      }
    }
    case 'Repeat': {
      const count = yield* evalExpr(stmt.count, api, env);
      if (typeof count !== 'number' || Number.isNaN(count)) {
        throw new RuntimeErrorSignal(`repeat() espera um número, recebeu ${JSON.stringify(count)}`, stmt.line);
      }
      for (let i = 0; i < count; i++) {
        const signal = yield* execBlock(stmt.body, api, env);
        if (signal === 'break') break;
      }
      return 'normal';
    }
    case 'If': {
      const cond = yield* evalExpr(stmt.cond, api, env);
      if (cond) {
        return yield* execBlock(stmt.then, api, env);
      } else if (stmt.else) {
        return yield* execBlock(stmt.else, api, env);
      }
      return 'normal';
    }
    case 'Break':
      return 'break';
    case 'Continue':
      return 'continue';
  }
}

async function* execBlock(stmts: Stmt[], api: InterpreterAPI, env: Env): AsyncGenerator<void, ExecSignal, void> {
  for (const stmt of stmts) {
    const signal = yield* execStmt(stmt, api, env);
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
export function runProgram(stmts: Stmt[], api: InterpreterAPI, env: Env = createEnv()): AsyncGenerator<void, void, void> {
  hoistFunctions(stmts, env);
  return (async function* () {
    yield* execBlock(stmts, api, env);
  })();
}
