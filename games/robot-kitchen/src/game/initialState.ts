import { Cell, FoodStage, GameState, Order, StationType } from '../types';

export const GRID_SIZE = 8;

// Fixed layout of the kitchen. Coordinates are (x, y) with (0,0) top-left.
// Every station now blocks movement (see moveRobot in gameEngine.ts), so
// each one needs at least one open floor tile next to it to be reachable.
const STATIONS: { x: number; y: number; station: StationType }[] = [
  { x: 0, y: 0, station: 'fridge' },
  { x: 3, y: 0, station: 'cutting_board' },
  { x: 6, y: 0, station: 'pantry' },
  { x: 4, y: 4, station: 'stove' },
  { x: 7, y: 7, station: 'counter' },
];

/** Which raw ingredients can be take()n from each supply station. */
export const STATION_ITEMS: Partial<Record<StationType, string[]>> = {
  fridge: ['tomato'],
  pantry: ['lettuce', 'onion'],
};

/** Reverse lookup: which station stocks a given ingredient. Used by the
 * Recipes page to show players where to find each item. */
export const ITEM_SOURCE: Record<string, StationType> = Object.entries(STATION_ITEMS).reduce(
  (acc, [station, items]) => {
    for (const item of items ?? []) acc[item] = station as StationType;
    return acc;
  },
  {} as Record<string, StationType>,
);

/** Emoji shown next to each ingredient throughout the UI. */
export const ITEM_ICONS: Record<string, string> = {
  tomato: '🍅',
  lettuce: '🥬',
  onion: '🧅',
};

function buildGrid(): Cell[][] {
  const cells: Cell[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push({ x, y, station: 'empty' });
    }
    cells.push(row);
  }
  for (const s of STATIONS) {
    cells[s.y][s.x].station = s.station;
  }
  return cells;
}

let orderIdCounter = 1;

export interface Recipe {
  name: string;
  requires: { name: string; stage: FoodStage };
  reward: number;
}

// More recipes = more variety. Each one needs a single ingredient prepped
// to a single stage, matching the current one-item inventory / one-stage
// HeldItem model. Exported so the Recipes page can list them all.
export const RECIPES: Recipe[] = [
  { name: 'Salad', requires: { name: 'tomato', stage: 'chopped' }, reward: 10 },
  { name: 'Coleslaw', requires: { name: 'lettuce', stage: 'chopped' }, reward: 10 },
  { name: 'Grilled Onion', requires: { name: 'onion', stage: 'cooked' }, reward: 15 },
  { name: 'Onion Rings', requires: { name: 'onion', stage: 'chopped' }, reward: 12 },
  { name: 'Roasted Tomato', requires: { name: 'tomato', stage: 'cooked' }, reward: 15 },
];

export function makeOrder(): Order {
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
    // (0,0) is now the Fridge, which the robot can no longer stand on, so it
    // spawns just south-east of it, facing south.
    robot: { x: 1, y: 1, facing: 'south', inventory: null },
    orders: [makeOrder(), makeOrder(), makeOrder()],
    score: 0,
    ordersCompleted: 0,
    ticks: 0,
    logs: [],
    finished: false,
  };
}

export const STATION_LABELS: Record<StationType, string> = {
  fridge: 'Fridge',
  pantry: 'Pantry',
  cutting_board: 'Cutting Board',
  stove: 'Stove',
  counter: 'Delivery Counter',
  empty: '',
};
