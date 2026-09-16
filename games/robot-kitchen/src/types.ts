// ---------------------------------------------------------------------------
// Grid / world types
// ---------------------------------------------------------------------------

export type Direction = 'north' | 'south' | 'east' | 'west';

export type StationType = 'fridge' | 'pantry' | 'cutting_board' | 'stove' | 'counter' | 'empty';

export interface Cell {
  x: number;
  y: number;
  station: StationType;
}

/** The stages an ingredient can go through. */
export type FoodStage = 'raw' | 'chopped' | 'cooked';

export interface HeldItem {
  name: string; // e.g. "tomato"
  stage: FoodStage;
}

export interface Robot {
  x: number;
  y: number;
  facing: Direction;
  inventory: HeldItem | null;
}

export interface Order {
  id: number;
  name: string; // e.g. "Salad"
  requires: { name: string; stage: FoodStage };
  reward: number;
}

export interface GameState {
  width: number;
  height: number;
  cells: Cell[][];
  robot: Robot;
  orders: Order[]; // queue, orders[0] is active
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
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'LOOP'
  | 'REPEAT'
  | 'IF'
  | 'ELSE'
  | 'BREAK'
  | 'CONTINUE'
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
  | { kind: 'Call'; name: string; args: Expr[]; line: number }
  | { kind: 'Binary'; op: '==' | '!=' | '&&' | '||'; left: Expr; right: Expr }
  | { kind: 'Unary'; op: '!'; expr: Expr };

export type Stmt =
  | { kind: 'ExprStmt'; expr: Expr; line: number }
  | { kind: 'Loop'; body: Stmt[]; line: number }
  | { kind: 'Repeat'; count: Expr; body: Stmt[]; line: number }
  | { kind: 'If'; cond: Expr; then: Stmt[]; else: Stmt[] | null; line: number }
  | { kind: 'Break'; line: number }
  | { kind: 'Continue'; line: number };

export interface ParseError {
  message: string;
  line: number;
}

export interface RuntimeError {
  message: string;
  line: number;
}
