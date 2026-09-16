import { Direction, Expr, Stmt } from '../types';
import { ActionResult } from '../game/gameEngine';

export class RuntimeErrorSignal extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(message);
    this.line = line;
  }
}

/** Sinal interno usado por `return` dentro de uma função do usuário. */
class ReturnValue extends Error {
  value: unknown;
  constructor(value: unknown) {
    super('return');
    this.value = value;
  }
}

/** Bridge between the interpreter and the game engine. */
export interface InterpreterAPI {
  move: (dir: Direction) => ActionResult;
  take: (item: string) => ActionResult;
  drop: () => ActionResult;
  chop: () => ActionResult;
  cook: () => ActionResult;
  fry: () => ActionResult;
  wash: () => ActionResult;
  deliver: () => ActionResult;
  scan: () => ActionResult;
  orderItem: () => ActionResult;
  orderStage: () => ActionResult;
  isHolding: () => ActionResult;
  distanceTo: (station: string) => ActionResult;
  pathCost: (station: string) => ActionResult;
  battery: () => ActionResult;
  charge: () => ActionResult;
  popItem: () => ActionResult;
  takeAt: (index: number) => ActionResult;
  peekItem: (index: number) => ActionResult;
  queueSize: () => ActionResult;
  isOpen: () => ActionResult;
  trigger: () => ActionResult;
  plates: () => ActionResult;
  dirtyPlates: () => ActionResult;
  oil: () => ActionResult;
}

type ExecSignal = 'normal' | 'break' | 'continue';

const DIRECTIONS: Direction[] = ['norte', 'sul', 'leste', 'oeste'];

export interface UserFunc {
  params: string[];
  body: Stmt[];
}

/** Runtime environment: variáveis + funções, com escopo aninhado para que
 * os parâmetros de uma função não vazem para o programa principal. */
export interface Env {
  vars: Map<string, unknown>;
  funcs: Map<string, UserFunc>;
  parent?: Env;
}

export function createEnv(parent?: Env): Env {
  return { vars: new Map(), funcs: parent ? parent.funcs : new Map(), parent };
}

function lookupEnv(env: Env, name: string): Env | null {
  let cur: Env | undefined = env;
  while (cur) {
    if (cur.vars.has(name)) return cur;
    cur = cur.parent;
  }
  return null;
}

/** Coleta as declarações `def` antes da execução (hoisting). */
function hoistFunctions(stmts: Stmt[], env: Env): void {
  for (const s of stmts) {
    if (s.kind === 'FuncDecl') {
      env.funcs.set(s.name, { params: s.params, body: s.body });
    }
  }
}

function describe(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(describe).join(', ')}]`;
  return JSON.stringify(value) ?? String(value);
}

function asNumber(value: unknown, what: string, line: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new RuntimeErrorSignal(`${what} espera um número, recebeu ${describe(value)}`, line);
  }
  return value;
}

function asList(value: unknown, what: string, line: number): unknown[] {
  if (!Array.isArray(value)) {
    throw new RuntimeErrorSignal(`${what} espera uma lista, recebeu ${describe(value)}`, line);
  }
  return value;
}

async function* evalExpr(expr: Expr, api: InterpreterAPI, env: Env): AsyncGenerator<void, unknown, void> {
  switch (expr.kind) {
    case 'StringLiteral':
      return expr.value;
    case 'NumberLiteral':
      return expr.value;
    case 'BoolLiteral':
      return expr.value;
    case 'ArrayLiteral': {
      const items: unknown[] = [];
      for (const item of expr.items) {
        items.push(yield* evalExpr(item, api, env));
      }
      return items;
    }
    case 'Index': {
      const target = yield* evalExpr(expr.target, api, env);
      const index = yield* evalExpr(expr.index, api, env);
      const list = asList(target, 'Indexação com []', expr.line);
      const i = asNumber(index, 'O índice de []', expr.line);
      if (i < 0 || i >= list.length || !Number.isInteger(i)) {
        throw new RuntimeErrorSignal(
          `Índice ${i} fora da lista (tamanho ${list.length}). Use length(lista) antes.`,
          expr.line,
        );
      }
      return list[i];
    }
    case 'Ident': {
      const owner = lookupEnv(env, expr.name);
      if (!owner) {
        throw new RuntimeErrorSignal(
          `Variável "${expr.name}" não foi declarada (use "var ${expr.name} = ...")`,
          expr.line,
        );
      }
      return owner.vars.get(expr.name);
    }
    case 'Unary': {
      const v = yield* evalExpr(expr.expr, api, env);
      if (expr.op === '-') return -(v as number);
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
      switch (expr.op) {
        case '==':
          return left === right;
        case '!=':
          return left !== right;
        case '+':
          if (typeof left === 'string' || typeof right === 'string') return `${left}${right}`;
          return asNumber(left, "'+'", expr.line) + asNumber(right, "'+'", expr.line);
        case '-':
          return asNumber(left, "'-'", expr.line) - asNumber(right, "'-'", expr.line);
        case '<':
          return asNumber(left, "'<'", expr.line) < asNumber(right, "'<'", expr.line);
        case '<=':
          return asNumber(left, "'<='", expr.line) <= asNumber(right, "'<='", expr.line);
        case '>':
          return asNumber(left, "'>'", expr.line) > asNumber(right, "'>'", expr.line);
        case '>=':
          return asNumber(left, "'>='", expr.line) >= asNumber(right, "'>='", expr.line);
      }
      return false;
    }
    case 'Call':
      return yield* execCall(expr, api, env);
  }
}

async function* execCall(
  expr: Extract<Expr, { kind: 'Call' }>,
  api: InterpreterAPI,
  env: Env,
): AsyncGenerator<void, unknown, void> {
  // Função definida pelo usuário: aceita argumentos e pode devolver valores.
  const userFunc = env.funcs.get(expr.name);
  if (userFunc) {
    if (expr.args.length !== userFunc.params.length) {
      throw new RuntimeErrorSignal(
        `Função "${expr.name}()" espera ${userFunc.params.length} argumento(s) e recebeu ${expr.args.length}`,
        expr.line,
      );
    }
    const callArgs: unknown[] = [];
    for (const a of expr.args) {
      callArgs.push(yield* evalExpr(a, api, env));
    }
    const local = createEnv(env);
    userFunc.params.forEach((p, i) => local.vars.set(p, callArgs[i]));
    try {
      yield* execBlock(userFunc.body, api, local);
    } catch (e) {
      if (e instanceof ReturnValue) return e.value;
      throw e;
    }
    return undefined;
  }

  const args: unknown[] = [];
  for (const a of expr.args) {
    args.push(yield* evalExpr(a, api, env));
  }

  const noArgs = (name: string) => {
    if (args.length > 0) throw new RuntimeErrorSignal(`${name}() não recebe argumentos`, expr.line);
  };

  switch (expr.name) {
    // --- listas (puras, não gastam tick) ---------------------------------
    case 'length': {
      const list = asList(args[0], 'length()', expr.line);
      return list.length;
    }
    case 'push': {
      const list = asList(args[0], 'push()', expr.line);
      list.push(args[1]);
      return list.length;
    }
    case 'pop': {
      const list = asList(args[0], 'pop()', expr.line);
      if (list.length === 0) throw new RuntimeErrorSignal(`pop() falhou — a lista está vazia`, expr.line);
      return list.pop();
    }
    case 'shift': {
      const list = asList(args[0], 'shift()', expr.line);
      if (list.length === 0) throw new RuntimeErrorSignal(`shift() falhou — a lista está vazia`, expr.line);
      return list.shift();
    }
    case 'contains': {
      const list = asList(args[0], 'contains()', expr.line);
      return list.includes(args[1]);
    }

    // --- ações do robô (1 tick cada) -------------------------------------
    case 'move': {
      const dir = args[0];
      if (typeof dir !== 'string' || !DIRECTIONS.includes(dir as Direction)) {
        throw new RuntimeErrorSignal(
          `move() espera um destes valores: "norte", "sul", "leste", "oeste" — recebeu ${describe(dir)}`,
          expr.line,
        );
      }
      const result = api.move(dir as Direction);
      yield;
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
      noArgs('drop');
      const result = api.drop();
      yield;
      return result.success;
    }
    case 'chop': {
      noArgs('chop');
      const result = api.chop();
      yield;
      return result.success;
    }
    case 'cook': {
      noArgs('cook');
      const result = api.cook();
      yield;
      return result.success;
    }
    case 'fry': {
      noArgs('fry');
      const result = api.fry();
      yield;
      return result.success;
    }
    case 'wash': {
      noArgs('wash');
      const result = api.wash();
      yield;
      return result.success;
    }
    case 'deliver': {
      noArgs('deliver');
      const result = api.deliver();
      yield;
      return result.success;
    }
    case 'charge': {
      noArgs('charge');
      const result = api.charge();
      yield;
      return result.success;
    }
    case 'trigger': {
      noArgs('trigger');
      const result = api.trigger();
      yield;
      return result.success;
    }
    case 'popItem': {
      noArgs('popItem');
      const result = api.popItem();
      yield;
      return result.success;
    }
    case 'takeAt': {
      const index = asNumber(args[0], 'takeAt()', expr.line);
      const result = api.takeAt(index);
      yield;
      return result.success;
    }

    // --- sensores (1 tick cada) ------------------------------------------
    case 'scan': {
      noArgs('scan');
      const result = api.scan();
      yield;
      return result.value ?? '';
    }
    case 'orderItem': {
      noArgs('orderItem');
      const result = api.orderItem();
      yield;
      return result.value ?? '';
    }
    case 'orderStage': {
      noArgs('orderStage');
      const result = api.orderStage();
      yield;
      return result.value ?? '';
    }
    case 'isHolding': {
      noArgs('isHolding');
      const result = api.isHolding();
      yield;
      return !!result.value;
    }
    case 'isOpen': {
      noArgs('isOpen');
      const result = api.isOpen();
      yield;
      return !!result.value;
    }
    case 'peekItem': {
      const index = asNumber(args[0], 'peekItem()', expr.line);
      const result = api.peekItem(index);
      yield;
      return result.value ?? '';
    }
    case 'queueSize': {
      noArgs('queueSize');
      const result = api.queueSize();
      yield;
      return typeof result.value === 'number' ? result.value : 0;
    }
    case 'plates': {
      noArgs('plates');
      const result = api.plates();
      yield;
      return typeof result.value === 'number' ? result.value : 0;
    }
    case 'dirtyPlates': {
      noArgs('dirtyPlates');
      const result = api.dirtyPlates();
      yield;
      return typeof result.value === 'number' ? result.value : 0;
    }
    case 'oil': {
      noArgs('oil');
      const result = api.oil();
      yield;
      return typeof result.value === 'number' ? result.value : 0;
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
    case 'pathCost': {
      const station = args[0];
      if (typeof station !== 'string') {
        throw new RuntimeErrorSignal(`pathCost() espera o nome de uma estação (string)`, expr.line);
      }
      const result = api.pathCost(station);
      yield;
      return typeof result.value === 'number' ? result.value : -1;
    }
    case 'battery': {
      noArgs('battery');
      const result = api.battery();
      yield;
      return typeof result.value === 'number' ? result.value : 0;
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
      const owner = lookupEnv(env, stmt.name);
      if (!owner) {
        throw new RuntimeErrorSignal(
          `Não é possível atribuir a "${stmt.name}" — declare primeiro com "var ${stmt.name} = ..."`,
          stmt.line,
        );
      }
      const value = yield* evalExpr(stmt.expr, api, env);
      owner.vars.set(stmt.name, value);
      return 'normal';
    }
    case 'IndexAssign': {
      const target = yield* evalExpr(stmt.target, api, env);
      const list = asList(target, 'Atribuição com []', stmt.line);
      const index = asNumber(yield* evalExpr(stmt.index, api, env), 'O índice de []', stmt.line);
      if (index < 0 || index >= list.length || !Number.isInteger(index)) {
        throw new RuntimeErrorSignal(`Índice ${index} fora da lista (tamanho ${list.length})`, stmt.line);
      }
      list[index] = yield* evalExpr(stmt.expr, api, env);
      return 'normal';
    }
    case 'FuncDecl': {
      env.funcs.set(stmt.name, { params: stmt.params, body: stmt.body });
      return 'normal';
    }
    case 'Return': {
      const value = stmt.expr ? yield* evalExpr(stmt.expr, api, env) : undefined;
      throw new ReturnValue(value);
    }
    case 'Loop': {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const signal = yield* execBlock(stmt.body, api, env);
        if (signal === 'break') return 'normal';
      }
    }
    case 'Repeat': {
      const count = yield* evalExpr(stmt.count, api, env);
      if (typeof count !== 'number' || Number.isNaN(count)) {
        throw new RuntimeErrorSignal(`repeat() espera um número, recebeu ${describe(count)}`, stmt.line);
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
    case 'Switch': {
      const subject = yield* evalExpr(stmt.subject, api, env);
      for (const c of stmt.cases) {
        const test = yield* evalExpr(c.test, api, env);
        if (test === subject) {
          const signal = yield* execBlock(c.body, api, env);
          // Sem fall-through: cada case é independente. 'break' dentro de um
          // case serve para sair de um loop externo, como em outras linguagens.
          return signal;
        }
      }
      if (stmt.default) {
        return yield* execBlock(stmt.default, api, env);
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
 * once per executed robot action (one "tick").
 */
export function runProgram(stmts: Stmt[], api: InterpreterAPI, env: Env = createEnv()): AsyncGenerator<void, void, void> {
  hoistFunctions(stmts, env);
  return (async function* () {
    try {
      yield* execBlock(stmts, api, env);
    } catch (e) {
      if (e instanceof ReturnValue) return; // 'return' no topo apenas encerra
      throw e;
    }
  })();
}
