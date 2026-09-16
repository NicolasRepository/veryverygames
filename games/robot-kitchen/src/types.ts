// ---------------------------------------------------------------------------
// Grid / world types
// ---------------------------------------------------------------------------

export type Direction = 'norte' | 'sul' | 'leste' | 'oeste';

export type StationType =
  | 'geladeira'
  | 'despensa'
  | 'tabua_corte'
  | 'fogao'
  | 'forno'
  | 'balcao'
  | 'lixeira'
  | 'montagem'
  | 'carregador'
  | 'vazio';

/** Overlay no piso da célula (independente da estação). */
export type FloorType = 'normal' | 'esteira' | 'oleo';

export interface Cell {
  x: number;
  y: number;
  station: StationType;
  floor: FloorType;
  /** Direção da esteira rolante, se floor === 'esteira'. */
  conveyorDir?: Direction;
}

/** Os estágios pelos quais um ingrediente pode passar. */
export type FoodStage = 'crua' | 'picada' | 'cozida' | 'queimada';

export interface HeldItem {
  name: string; // ex.: "tomate"
  stage: FoodStage;
}

export interface Robot {
  x: number;
  y: number;
  facing: Direction;
  inventory: HeldItem | null;
  energy: number;
}

export interface Order {
  id: number;
  name: string; // ex.: "Salada"
  requires: { name: string; stage: FoodStage };
  reward: number;
}

/** Estado do forno: um item cozinhando com um timer (em ticks). */
export interface OvenJob {
  item: HeldItem;
  ticksElapsed: number;
}

/** Estado da bancada de montagem: itens depositados + prato pronto. */
export interface AssemblyState {
  slots: HeldItem[];
  ready: HeldItem | null;
}

export interface GameState {
  width: number;
  height: number;
  cells: Cell[][];
  robot: Robot;
  maxEnergy: number;
  oven: OvenJob | null;
  assembly: AssemblyState;
  orders: Order[]; // fila; orders[0] é a ativa
  score: number;
  ordersCompleted: number;
  ticks: number;
  logs: LogEntry[];
  finished: boolean;
}

export interface LogEntry {
  id: number;
  kind: 'info' | 'success' | 'error' | 'action';
  message: string;
}

// ---------------------------------------------------------------------------
// DSL / AST types
// ---------------------------------------------------------------------------

export type TokenType =
  | 'IDENT'
  | 'STRING'
  | 'NUMBER'
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACE'
  | 'RBRACE'
  | 'COMMA'
  | 'EQEQ'
  | 'NEQ'
  | 'ASSIGN'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'LOOP'
  | 'REPEAT'
  | 'IF'
  | 'ELSE'
  | 'BREAK'
  | 'CONTINUE'
  | 'VAR'
  | 'DEF'
  | 'TRUE'
  | 'FALSE'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
}

// AST node kinds
export type Expr =
  | { kind: 'StringLiteral'; value: string }
  | { kind: 'NumberLiteral'; value: number }
  | { kind: 'BoolLiteral'; value: boolean }
  | { kind: 'Ident'; name: string; line: number }
  | { kind: 'Call'; name: string; args: Expr[]; line: number }
  | { kind: 'Binary'; op: '==' | '!=' | '&&' | '||'; left: Expr; right: Expr }
  | { kind: 'Unary'; op: '!'; expr: Expr };

export type Stmt =
  | { kind: 'ExprStmt'; expr: Expr; line: number }
  | { kind: 'Loop'; body: Stmt[]; line: number }
  | { kind: 'Repeat'; count: Expr; body: Stmt[]; line: number }
  | { kind: 'If'; cond: Expr; then: Stmt[]; else: Stmt[] | null; line: number }
  | { kind: 'Break'; line: number }
  | { kind: 'Continue'; line: number }
  | { kind: 'VarDecl'; name: string; expr: Expr; line: number }
  | { kind: 'Assign'; name: string; expr: Expr; line: number }
  | { kind: 'FuncDecl'; name: string; body: Stmt[]; line: number };

export interface ParseError {
  message: string;
  line: number;
}

export interface RuntimeError {
  message: string;
  line: number;
}
