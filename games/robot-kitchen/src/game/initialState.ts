import { Cell, Direction, FloorType, FoodStage, GameState, Order, StationType } from '../types';

export const GRID_SIZE = 8;
export const MAX_ENERGY = 40;
export const OVEN_READY_TICKS = 3;
export const OVEN_BURN_TICKS = 7;
export const ASSEMBLY_CAPACITY = 4;

// Fixed layout of the kitchen. Coordinates are (x, y) with (0,0) top-left.
// Every station blocks movement (see moveRobot in gameEngine.ts), so each
// one needs at least one open floor tile next to it to be reachable.
const STATIONS: { x: number; y: number; station: StationType }[] = [
  { x: 0, y: 0, station: 'geladeira' },
  { x: 3, y: 0, station: 'tabua_corte' },
  { x: 6, y: 0, station: 'despensa' },
  { x: 7, y: 0, station: 'forno' },
  { x: 4, y: 4, station: 'fogao' },
  { x: 2, y: 4, station: 'montagem' },
  { x: 0, y: 4, station: 'carregador' },
  { x: 0, y: 7, station: 'lixeira' },
  { x: 7, y: 7, station: 'balcao' },
];

// Esteiras rolantes (empurram o robô numa direção fixa ao pisar nelas).
const CONVEYORS: { x: number; y: number; dir: Direction }[] = [
  { x: 5, y: 1, dir: 'sul' },
  { x: 5, y: 2, dir: 'sul' },
  { x: 5, y: 3, dir: 'sul' },
];

// Chão escorregadio: ao mover-se para cima dele, o robô desliza até bater
// numa parede ou estação.
const OIL_TILES: { x: number; y: number }[] = [{ x: 2, y: 6 }];

/** Quais ingredientes crus podem ser pegos (take()) em cada estação. */
export const STATION_ITEMS: Partial<Record<StationType, string[]>> = {
  geladeira: ['tomate', 'carne'],
  despensa: ['alface', 'cebola', 'pao'],
};

/** Reverse lookup: em qual estação encontrar cada ingrediente. Usado pela
 * página de Receitas para mostrar onde pegar cada item. */
export const ITEM_SOURCE: Record<string, StationType> = Object.entries(STATION_ITEMS).reduce(
  (acc, [station, items]) => {
    for (const item of items ?? []) acc[item] = station as StationType;
    return acc;
  },
  {} as Record<string, StationType>,
);

/** Emoji mostrado ao lado de cada ingrediente/prato em toda a interface. */
export const ITEM_ICONS: Record<string, string> = {
  tomate: '🍅',
  alface: '🥬',
  cebola: '🧅',
  pao: '🍞',
  carne: '🥩',
  hamburguer: '🍔',
};

function buildGrid(): Cell[][] {
  const cells: Cell[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push({ x, y, station: 'vazio', floor: 'normal' });
    }
    cells.push(row);
  }
  for (const s of STATIONS) {
    cells[s.y][s.x].station = s.station;
  }
  for (const c of CONVEYORS) {
    cells[c.y][c.x].floor = 'esteira';
    cells[c.y][c.x].conveyorDir = c.dir;
  }
  for (const o of OIL_TILES) {
    cells[o.y][o.x].floor = 'oleo';
  }
  return cells;
}

let orderIdCounter = 1;

export interface Recipe {
  name: string;
  requires: { name: string; stage: FoodStage };
  reward: number;
}

/** Receita composta: precisa de várias partes levadas até a Bancada de
 * Montagem (station "montagem") antes de poder ser retirada com take(). */
export interface CompositeRecipe {
  name: string;
  parts: { name: string; stage: FoodStage }[];
  reward: number;
}

// Receitas simples: um único ingrediente preparado num único estágio.
export const RECIPES: Recipe[] = [
  { name: 'Salada', requires: { name: 'tomate', stage: 'picada' }, reward: 10 },
  { name: 'Salada de Alface', requires: { name: 'alface', stage: 'picada' }, reward: 10 },
  { name: 'Cebola Grelhada', requires: { name: 'cebola', stage: 'cozida' }, reward: 15 },
  { name: 'Anéis de Cebola', requires: { name: 'cebola', stage: 'picada' }, reward: 12 },
  { name: 'Tomate Assado', requires: { name: 'tomate', stage: 'cozida' }, reward: 15 },
];

// Receitas compostas: exigem levar várias partes até a bancada de montagem.
export const COMPOSITE_RECIPES: CompositeRecipe[] = [
  {
    name: 'Hamburguer',
    parts: [
      { name: 'pao', stage: 'crua' },
      { name: 'carne', stage: 'cozida' },
    ],
    reward: 30,
  },
];

export function makeOrder(): Order {
  const useComposite = COMPOSITE_RECIPES.length > 0 && Math.random() < 0.25;
  if (useComposite) {
    const recipe = COMPOSITE_RECIPES[Math.floor(Math.random() * COMPOSITE_RECIPES.length)];
    return {
      id: orderIdCounter++,
      name: recipe.name,
      requires: { name: recipe.name.toLowerCase(), stage: 'cozida' },
      reward: recipe.reward,
    };
  }
  const recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
  return {
    id: orderIdCounter++,
    name: recipe.name,
    requires: recipe.requires,
    reward: recipe.reward,
  };
}

export function createInitialState(): GameState {
  return {
    width: GRID_SIZE,
    height: GRID_SIZE,
    cells: buildGrid(),
    // (0,0) é a Geladeira, o robô não pode ficar em cima dela, então ele
    // nasce logo ao lado, virado para o sul.
    robot: { x: 1, y: 1, facing: 'sul', inventory: null, energy: MAX_ENERGY },
    maxEnergy: MAX_ENERGY,
    oven: null,
    assembly: { slots: [], ready: null },
    orders: [makeOrder(), makeOrder(), makeOrder()],
    score: 0,
    ordersCompleted: 0,
    ticks: 0,
    logs: [],
    finished: false,
  };
}

export const STATION_LABELS: Record<StationType, string> = {
  geladeira: 'Geladeira',
  despensa: 'Despensa',
  tabua_corte: 'Tábua de Corte',
  fogao: 'Fogão',
  forno: 'Forno',
  balcao: 'Balcão de Entrega',
  lixeira: 'Lixeira',
  montagem: 'Bancada de Montagem',
  carregador: 'Estação de Carga',
  vazio: '',
};

export const FLOOR_LABELS: Record<FloorType, string> = {
  normal: '',
  esteira: 'Esteira Rolante',
  oleo: 'Óleo (escorregadio)',
};
