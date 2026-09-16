import { Cell, Direction, FloorType, FoodStage, GameState, Order, StationType } from '../types';

export const GRID_SIZE = 10;
export const MAX_ENERGY = 45;

// Forno
export const OVEN_READY_TICKS = 3;
export const OVEN_BURN_TICKS = 7;

// Panela (fogão) — cozimento prolongado da Sopa de Legumes
export const POT_READY_TICKS = 6;
export const POT_BURN_TICKS = 13;
export const POT_VEGGIES_NEEDED = 2;

// Fritadeira — óleo quente reutilizável
export const FRYER_MAX_OIL = 3;

// Processador de Alimentos x Tábua de Corte
export const PROCESSOR_ENERGY_COST = 5;
export const BOARD_EXTRA_TICKS = 2;

// Porta automática (sensor de presença)
export const DOOR_OPEN_TICKS = 4;

// Dispensa Climatizada
export const COLD_PANTRY_CAPACITY = 5;
export const COLD_PANTRY_REFILL_TICKS = 5;

// Louça
export const START_CLEAN_PLATES = 3;

// Modo economia: abaixo deste nível de bateria cada move() custa 2
export const ECONOMY_THRESHOLD = 12;

export const ASSEMBLY_CAPACITY = 4;

// Fixed layout of the kitchen. Coordinates are (x, y) with (0,0) top-left.
// Every station blocks movement (see moveRobot in gameEngine.ts), so each
// one needs at least one open floor tile next to it to be reachable.
const STATIONS: { x: number; y: number; station: StationType }[] = [
  { x: 0, y: 0, station: 'geladeira' },
  { x: 3, y: 0, station: 'tabua_corte' },
  { x: 5, y: 0, station: 'processador' },
  { x: 8, y: 0, station: 'despensa' },
  { x: 9, y: 0, station: 'forno' },
  { x: 0, y: 3, station: 'dispensa_clima' },
  { x: 0, y: 5, station: 'carregador' },
  { x: 2, y: 6, station: 'montagem' },
  { x: 5, y: 6, station: 'fogao' },
  { x: 8, y: 6, station: 'fritadeira' },
  { x: 0, y: 9, station: 'lixeira' },
  { x: 4, y: 9, station: 'pia' },
  { x: 9, y: 9, station: 'balcao' },
];

// Esteiras rolantes (empurram o robô numa direção fixa ao pisar nelas).
const CONVEYORS: { x: number; y: number; dir: Direction }[] = [
  { x: 7, y: 2, dir: 'sul' },
  { x: 7, y: 3, dir: 'sul' },
  { x: 7, y: 4, dir: 'sul' },
];

// Chão escorregadio: ao mover-se para cima dele, o robô desliza até bater
// numa parede ou estação.
const OIL_TILES: { x: number; y: number }[] = [{ x: 2, y: 8 }];

// Poças de água: o move() avança 2 casas em vez de 1.
const WET_TILES: { x: number; y: number }[] = [
  { x: 3, y: 4 },
  { x: 6, y: 3 },
  { x: 1, y: 7 },
];

// Portas automáticas: bloqueiam a passagem até trigger() abri-las.
const DOOR_TILES: { x: number; y: number }[] = [
  { x: 3, y: 7 },
  { x: 4, y: 7 },
  { x: 5, y: 7 },
];

/** Quais ingredientes crus podem ser pegos (take()) em cada estação. */
export const STATION_ITEMS: Partial<Record<StationType, string[]>> = {
  geladeira: ['tomate', 'carne', 'queijo'],
  despensa: ['alface', 'cebola', 'pao', 'batata'],
  pia: ['agua'],
};

/** Itens que a Dispensa Climatizada pode repor na fila. */
export const COLD_PANTRY_ITEMS = ['massa', 'molho', 'queijo', 'legume', 'batata'];

/** Reverse lookup: em qual estação encontrar cada ingrediente. */
export const ITEM_SOURCE: Record<string, StationType> = (() => {
  const acc: Record<string, StationType> = {};
  for (const [station, items] of Object.entries(STATION_ITEMS)) {
    for (const item of items ?? []) acc[item] = station as StationType;
  }
  for (const item of COLD_PANTRY_ITEMS) {
    if (!acc[item]) acc[item] = 'dispensa_clima';
  }
  return acc;
})();

/** Emoji mostrado ao lado de cada ingrediente/prato em toda a interface. */
export const ITEM_ICONS: Record<string, string> = {
  tomate: '🍅',
  alface: '🥬',
  cebola: '🧅',
  pao: '🍞',
  carne: '🥩',
  queijo: '🧀',
  batata: '🥔',
  legume: '🥕',
  massa: '🫓',
  molho: '🥫',
  agua: '💧',
  prato: '🍽️',
  hamburguer: '🍔',
  pizza: '🍕',
  sopa: '🍲',
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
  for (const s of STATIONS) cells[s.y][s.x].station = s.station;
  for (const c of CONVEYORS) {
    cells[c.y][c.x].floor = 'esteira';
    cells[c.y][c.x].conveyorDir = c.dir;
  }
  for (const o of OIL_TILES) cells[o.y][o.x].floor = 'oleo';
  for (const w of WET_TILES) cells[w.y][w.x].floor = 'molhado';
  for (const d of DOOR_TILES) cells[d.y][d.x].floor = 'porta';
  return cells;
}

let orderIdCounter = 1;

export interface Recipe {
  name: string;
  requires: { name: string; stage: FoodStage };
  reward: number;
}

/** Receita composta: precisa de várias partes levadas até a Bancada de
 * Montagem (station "montagem") antes de poder ser retirada com take().
 * `resultStage` é o estágio em que o prato sai da bancada — se for "crua",
 * ainda é preciso assar no Forno antes de entregar. */
export interface CompositeRecipe {
  name: string;
  parts: { name: string; stage: FoodStage }[];
  resultStage: FoodStage;
  deliverStage: FoodStage;
  reward: number;
  hint?: string;
}

// Receitas simples: um único ingrediente preparado num único estágio.
export const RECIPES: Recipe[] = [
  { name: 'Salada', requires: { name: 'tomate', stage: 'picada' }, reward: 10 },
  { name: 'Salada de Alface', requires: { name: 'alface', stage: 'picada' }, reward: 10 },
  { name: 'Cebola Grelhada', requires: { name: 'cebola', stage: 'cozida' }, reward: 15 },
  { name: 'Anéis de Cebola', requires: { name: 'cebola', stage: 'picada' }, reward: 12 },
  { name: 'Tomate Assado', requires: { name: 'tomate', stage: 'cozida' }, reward: 15 },
  { name: 'Batata Frita', requires: { name: 'batata', stage: 'frita' }, reward: 22 },
];

// Receitas compostas: exigem levar várias partes até a bancada de montagem.
export const COMPOSITE_RECIPES: CompositeRecipe[] = [
  {
    name: 'Hamburguer',
    parts: [
      { name: 'pao', stage: 'crua' },
      { name: 'carne', stage: 'cozida' },
    ],
    resultStage: 'cozida',
    deliverStage: 'cozida',
    reward: 30,
  },
  {
    name: 'Pizza de Queijo',
    parts: [
      { name: 'massa', stage: 'crua' },
      { name: 'molho', stage: 'crua' },
      { name: 'queijo', stage: 'crua' },
    ],
    resultStage: 'crua',
    deliverStage: 'cozida',
    reward: 45,
    hint: 'Sai crua da bancada: leve ao Forno com drop() e retire com take("pizza") antes de queimar.',
  },
];

/** Receita de panela (recipiente intermediário no Fogão). */
export const POT_RECIPE = {
  name: 'Sopa de Legumes',
  result: 'sopa',
  reward: 35,
};

/** Nome interno do prato de cada receita composta (usado em take()). */
export function compositeKey(name: string): string {
  return name.split(' ')[0].toLowerCase();
}

export function makeOrder(): Order {
  const roll = Math.random();
  if (roll < 0.15) {
    return {
      id: orderIdCounter++,
      name: POT_RECIPE.name,
      requires: { name: POT_RECIPE.result, stage: 'cozida' },
      reward: POT_RECIPE.reward,
    };
  }
  if (roll < 0.4) {
    const recipe = COMPOSITE_RECIPES[Math.floor(Math.random() * COMPOSITE_RECIPES.length)];
    return {
      id: orderIdCounter++,
      name: recipe.name,
      requires: { name: compositeKey(recipe.name), stage: recipe.deliverStage },
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

function initialColdPantry(): string[] {
  const queue: string[] = [];
  for (let i = 0; i < COLD_PANTRY_CAPACITY; i++) {
    queue.push(COLD_PANTRY_ITEMS[i % COLD_PANTRY_ITEMS.length]);
  }
  return queue;
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
    pot: null,
    fryer: { oilUses: FRYER_MAX_OIL },
    coldPantry: { queue: initialColdPantry(), refillCounter: 0 },
    dishes: { clean: START_CLEAN_PLATES, dirtyAtCounter: 0 },
    assembly: { slots: [], ready: null },
    doors: {},
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
  dispensa_clima: 'Dispensa Climatizada',
  tabua_corte: 'Tábua de Corte',
  processador: 'Processador de Alimentos',
  fogao: 'Fogão',
  forno: 'Forno',
  fritadeira: 'Fritadeira',
  pia: 'Pia / Lava-Louças',
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
  molhado: 'Piso Molhado (anda 2 casas)',
  porta: 'Porta Automática',
};
