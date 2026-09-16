import { Cell, Direction, GameState, HeldItem, LogEntry } from '../types';
import { makeOrder, STATION_ITEMS, STATION_LABELS } from './initialState';

export interface ActionResult {
  success: boolean;
  message: string;
  value?: string; // used by scan(), orderItem(), orderStage()
}

let logIdCounter = 1;

function withLog(state: GameState, kind: LogEntry['kind'], message: string): GameState {
  const entry: LogEntry = { id: logIdCounter++, kind, message };
  const logs = [...state.logs, entry];
  // keep the log from growing unbounded
  return { ...state, logs: logs.length > 200 ? logs.slice(logs.length - 200) : logs };
}

function deltaFor(dir: Direction): { dx: number; dy: number } {
  switch (dir) {
    case 'north':
      return { dx: 0, dy: -1 };
    case 'south':
      return { dx: 0, dy: 1 };
    case 'east':
      return { dx: 1, dy: 0 };
    case 'west':
      return { dx: -1, dy: 0 };
  }
}

/**
 * The cell the robot is currently facing (based on robot.facing), or `null`
 * if that's off the edge of the grid. Every interactive command (take,
 * chop, cook, deliver, scan) now works on this cell instead of the tile the
 * robot stands on, since stations have collision and the robot can never
 * stand on top of one.
 */
function facingCell(state: GameState): Cell | null {
  const { dx, dy } = deltaFor(state.robot.facing);
  const nx = state.robot.x + dx;
  const ny = state.robot.y + dy;
  if (nx < 0 || nx >= state.width || ny < 0 || ny >= state.height) return null;
  return state.cells[ny][nx];
}

export function moveRobot(state: GameState, dir: Direction): [GameState, ActionResult] {
  const { dx, dy } = deltaFor(dir);
  const nx = state.robot.x + dx;
  const ny = state.robot.y + dy;

  // Out of bounds: turn to face that way, but don't move.
  if (nx < 0 || nx >= state.width || ny < 0 || ny >= state.height) {
    const next = withLog({ ...state, robot: { ...state.robot, facing: dir } }, 'error', `move("${dir}") blocked — the kitchen wall is in the way.`);
    return [next, { success: false, message: 'Blocked by wall' }];
  }

  const targetCell = state.cells[ny][nx];

  // Stations have collision now: bump into them (turn to face, don't step
  // onto them) instead of walking through/onto them.
  if (targetCell.station !== 'empty') {
    const next = withLog(
      { ...state, robot: { ...state.robot, facing: dir } },
      'action',
      `move("${dir}") blocked by ${STATION_LABELS[targetCell.station]} — now facing ${dir}.`,
    );
    return [next, { success: false, message: `Blocked by ${STATION_LABELS[targetCell.station]}` }];
  }

  const robot = { ...state.robot, x: nx, y: ny, facing: dir };
  const next = withLog({ ...state, robot }, 'action', `move("${dir}") → robot at (${nx}, ${ny})`);
  return [next, { success: true, message: 'Moved' }];
}

export function scanCell(state: GameState): [GameState, ActionResult] {
  // scan() reports what's in the cell the robot is currently FACING (one
  // tile ahead, in the direction it last moved/turned) — not the tile it's
  // standing on.
  const cell = facingCell(state);
  const value = cell ? (cell.station !== 'empty' ? cell.station : 'empty') : 'wall';

  const next = withLog(state, 'action', `scan() → "${value}"`);
  return [next, { success: true, message: 'Scanned', value }];
}

export function orderItemQuery(state: GameState): [GameState, ActionResult] {
  const order = state.orders[0];
  const value = order ? order.requires.name : '';
  const next = withLog(state, 'action', `orderItem() → "${value}"`);
  return [next, { success: !!order, message: order ? 'Order item' : 'No active order', value }];
}

export function orderStageQuery(state: GameState): [GameState, ActionResult] {
  const order = state.orders[0];
  const value = order ? order.requires.stage : '';
  const next = withLog(state, 'action', `orderStage() → "${value}"`);
  return [next, { success: !!order, message: order ? 'Order stage' : 'No active order', value }];
}

export function takeItem(state: GameState, itemName: string): [GameState, ActionResult] {
  const cell = facingCell(state);

  if (state.robot.inventory) {
    const next = withLog(state, 'error', `take("${itemName}") failed — hands are full, drop() first.`);
    return [next, { success: false, message: 'Hands full' }];
  }

  const available = cell ? STATION_ITEMS[cell.station] : undefined;
  if (!cell || !available) {
    const next = withLog(state, 'error', `take("${itemName}") failed — no supply station in front of the robot.`);
    return [next, { success: false, message: 'No supply station here' }];
  }

  if (!available.includes(itemName)) {
    const next = withLog(
      state,
      'error',
      `take("${itemName}") failed — ${STATION_LABELS[cell.station]} only stocks ${available.map((i) => `"${i}"`).join(', ')}.`,
    );
    return [next, { success: false, message: 'Unknown item here' }];
  }

  const item: HeldItem = { name: itemName, stage: 'raw' };
  const next = withLog({ ...state, robot: { ...state.robot, inventory: item } }, 'action', `take("${itemName}") → picked up raw ${itemName}`);
  return [next, { success: true, message: 'Took item' }];
}

export function dropItem(state: GameState): [GameState, ActionResult] {
  if (!state.robot.inventory) {
    const next = withLog(state, 'error', `drop() failed — nothing to drop.`);
    return [next, { success: false, message: 'Nothing held' }];
  }
  const held = state.robot.inventory;
  const next = withLog({ ...state, robot: { ...state.robot, inventory: null } }, 'action', `drop() → discarded ${held.stage} ${held.name}`);
  return [next, { success: true, message: 'Dropped' }];
}

export function chopItem(state: GameState): [GameState, ActionResult] {
  const cell = facingCell(state);
  const held = state.robot.inventory;

  if (!cell || cell.station !== 'cutting_board') {
    const next = withLog(state, 'error', `chop() failed — no cutting board in front of the robot.`);
    return [next, { success: false, message: 'No cutting board here' }];
  }
  if (!held) {
    const next = withLog(state, 'error', `chop() failed — nothing to chop.`);
    return [next, { success: false, message: 'Nothing held' }];
  }
  if (held.stage !== 'raw') {
    const next = withLog(state, 'error', `chop() failed — ${held.name} is already ${held.stage}.`);
    return [next, { success: false, message: 'Already chopped' }];
  }

  const item: HeldItem = { ...held, stage: 'chopped' };
  const next = withLog({ ...state, robot: { ...state.robot, inventory: item } }, 'action', `chop() → ${item.name} is now chopped`);
  return [next, { success: true, message: 'Chopped' }];
}

export function cookItem(state: GameState): [GameState, ActionResult] {
  const cell = facingCell(state);
  const held = state.robot.inventory;

  if (!cell || cell.station !== 'stove') {
    const next = withLog(state, 'error', `cook() failed — no stove in front of the robot.`);
    return [next, { success: false, message: 'No stove here' }];
  }
  if (!held) {
    const next = withLog(state, 'error', `cook() failed — nothing to cook.`);
    return [next, { success: false, message: 'Nothing held' }];
  }
  if (held.stage === 'cooked') {
    const next = withLog(state, 'error', `cook() failed — ${held.name} is already cooked.`);
    return [next, { success: false, message: 'Already cooked' }];
  }

  const item: HeldItem = { ...held, stage: 'cooked' };
  const next = withLog({ ...state, robot: { ...state.robot, inventory: item } }, 'action', `cook() → ${item.name} is now cooked`);
  return [next, { success: true, message: 'Cooked' }];
}

export function deliverItem(state: GameState): [GameState, ActionResult] {
  const cell = facingCell(state);
  const held = state.robot.inventory;
  const order = state.orders[0];

  if (!cell || cell.station !== 'counter') {
    const next = withLog(state, 'error', `deliver() failed — no delivery counter in front of the robot.`);
    return [next, { success: false, message: 'No counter here' }];
  }
  if (!held) {
    const next = withLog(state, 'error', `deliver() failed — nothing to deliver.`);
    return [next, { success: false, message: 'Nothing held' }];
  }
  if (!order) {
    const next = withLog(state, 'error', `deliver() failed — no active order.`);
    return [next, { success: false, message: 'No active order' }];
  }

  const matches = held.name === order.requires.name && held.stage === order.requires.stage;
  if (!matches) {
    const next = withLog(
      state,
      'error',
      `deliver() failed — order "${order.name}" needs ${order.requires.stage} ${order.requires.name}, you have ${held.stage} ${held.name}.`,
    );
    return [next, { success: false, message: 'Wrong item' }];
  }

  const remainingOrders = [...state.orders.slice(1), makeOrder()];
  const next = withLog(
    {
      ...state,
      robot: { ...state.robot, inventory: null },
      orders: remainingOrders,
      score: state.score + order.reward,
      ordersCompleted: state.ordersCompleted + 1,
    },
    'success',
    `deliver() → order "${order.name}" complete! +${order.reward} points`,
  );
  return [next, { success: true, message: 'Delivered' }];
}

export function tickState(state: GameState): GameState {
  return { ...state, ticks: state.ticks + 1 };
}
