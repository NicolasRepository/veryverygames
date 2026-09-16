import { AssemblyState, Cell, Direction, GameState, HeldItem, LogEntry, StationType } from '../types';
import {
  ASSEMBLY_CAPACITY,
  BOARD_EXTRA_TICKS,
  COLD_PANTRY_CAPACITY,
  COLD_PANTRY_ITEMS,
  COLD_PANTRY_REFILL_TICKS,
  COMPOSITE_RECIPES,
  DOOR_OPEN_TICKS,
  ECONOMY_THRESHOLD,
  FRYER_MAX_OIL,
  OVEN_BURN_TICKS,
  OVEN_READY_TICKS,
  POT_BURN_TICKS,
  POT_READY_TICKS,
  POT_RECIPE,
  POT_VEGGIES_NEEDED,
  PROCESSOR_ENERGY_COST,
  STATION_ITEMS,
  STATION_LABELS,
  compositeKey,
  makeOrder,
} from './initialState';

export interface ActionResult {
  success: boolean;
  message: string;
  value?: string | number | boolean;
}

let logIdCounter = 1;

function withLog(state: GameState, kind: LogEntry['kind'], message: string): GameState {
  const entry: LogEntry = { id: logIdCounter++, kind, message };
  const logs = [...state.logs, entry];
  return { ...state, logs: logs.length > 200 ? logs.slice(logs.length - 200) : logs };
}

function deltaFor(dir: Direction): { dx: number; dy: number } {
  switch (dir) {
    case 'norte':
      return { dx: 0, dy: -1 };
    case 'sul':
      return { dx: 0, dy: 1 };
    case 'leste':
      return { dx: 1, dy: 0 };
    case 'oeste':
      return { dx: -1, dy: 0 };
  }
}

const doorKey = (x: number, y: number) => `${x},${y}`;

export function isDoorOpen(state: GameState, x: number, y: number): boolean {
  return (state.doors[doorKey(x, y)] ?? 0) > 0;
}

/**
 * Avança todos os timers do mundo em `n` ticks: forno, panela, portas
 * automáticas e reposição da Dispensa Climatizada. Usado tanto pelo tick
 * normal (1 por ação) quanto por ações lentas, como chop() na tábua.
 */
export function advanceTimers(state: GameState, n = 1): GameState {
  let oven = state.oven;
  let pot = state.pot;
  let doors = state.doors;
  let coldPantry = state.coldPantry;

  for (let i = 0; i < n; i++) {
    if (oven) oven = { ...oven, ticksElapsed: oven.ticksElapsed + 1 };
    if (pot && pot.cooking) pot = { ...pot, ticksCooking: pot.ticksCooking + 1 };

    const nextDoors: Record<string, number> = {};
    for (const [k, v] of Object.entries(doors)) {
      if (v - 1 > 0) nextDoors[k] = v - 1;
    }
    doors = nextDoors;

    const counter = coldPantry.refillCounter + 1;
    if (counter >= COLD_PANTRY_REFILL_TICKS && coldPantry.queue.length < COLD_PANTRY_CAPACITY) {
      const item = COLD_PANTRY_ITEMS[Math.floor(Math.random() * COLD_PANTRY_ITEMS.length)];
      coldPantry = { queue: [...coldPantry.queue, item], refillCounter: 0 };
    } else {
      coldPantry = { ...coldPantry, refillCounter: counter };
    }
  }

  return { ...state, ticks: state.ticks + n, oven, pot, doors, coldPantry };
}

/**
 * The cell the robot is currently facing (based on robot.facing), or `null`
 * if that's off the edge of the grid.
 */
function facingCell(state: GameState): Cell | null {
  const { dx, dy } = deltaFor(state.robot.facing);
  const nx = state.robot.x + dx;
  const ny = state.robot.y + dy;
  if (nx < 0 || nx >= state.width || ny < 0 || ny >= state.height) return null;
  return state.cells[ny][nx];
}

function requireStation(
  state: GameState,
  station: StationType | StationType[],
): { ok: true; cell: Cell } | { ok: false } {
  const cell = facingCell(state);
  const wanted = Array.isArray(station) ? station : [station];
  if (!cell || !wanted.includes(cell.station)) return { ok: false };
  return { ok: true, cell };
}

/** Tenta dar um único passo em `dir` a partir de (x,y). */
function tryStep(
  state: GameState,
  x: number,
  y: number,
  dir: Direction,
): { x: number; y: number; blocked: boolean; blockedBy?: string } {
  const { dx, dy } = deltaFor(dir);
  const nx = x + dx;
  const ny = y + dy;
  if (nx < 0 || nx >= state.width || ny < 0 || ny >= state.height) {
    return { x, y, blocked: true, blockedBy: 'a parede da cozinha' };
  }
  const targetCell = state.cells[ny][nx];
  if (targetCell.station !== 'vazio') {
    return { x, y, blocked: true, blockedBy: STATION_LABELS[targetCell.station] };
  }
  if (targetCell.floor === 'porta' && !isDoorOpen(state, nx, ny)) {
    return { x, y, blocked: true, blockedBy: 'uma Porta Automática fechada (use trigger())' };
  }
  return { x: nx, y: ny, blocked: false };
}

export function moveRobot(state: GameState, dir: Direction): [GameState, ActionResult] {
  if (state.robot.energy <= 0) {
    const next = withLog(
      { ...state, robot: { ...state.robot, facing: dir } },
      'error',
      `move("${dir}") falhou — bateria zerada. Vá até o Carregador e use charge().`,
    );
    return [next, { success: false, message: 'Sem bateria' }];
  }

  const step = tryStep(state, state.robot.x, state.robot.y, dir);

  if (step.blocked) {
    const next = withLog(
      { ...state, robot: { ...state.robot, facing: dir } },
      'action',
      `move("${dir}") bloqueado por ${step.blockedBy} — agora virado para ${dir}.`,
    );
    return [next, { success: false, message: `Bloqueado por ${step.blockedBy}` }];
  }

  let { x, y } = step;
  // Modo economia: com pouca bateria o robô fica pesado e cada passo custa 2.
  const economy = state.robot.energy <= ECONOMY_THRESHOLD;
  const energySpent = economy ? 2 : 1;

  let wet = false;
  // Piso molhado empurra 1 casa extra (total de 2); óleo desliza até bater;
  // esteira empurra na direção dela. Um limite evita laços infinitos.
  for (let i = 0; i < 20; i++) {
    const cell = state.cells[y][x];
    if (cell.floor === 'molhado') {
      const slip = tryStep(state, x, y, dir);
      if (slip.blocked) break;
      wet = true;
      x = slip.x;
      y = slip.y;
      continue;
    }
    if (cell.floor === 'oleo') {
      const slide = tryStep(state, x, y, dir);
      if (slide.blocked) break;
      x = slide.x;
      y = slide.y;
      continue;
    }
    if (cell.floor === 'esteira' && cell.conveyorDir) {
      const push = tryStep(state, x, y, cell.conveyorDir);
      if (push.blocked) break;
      x = push.x;
      y = push.y;
      continue;
    }
    break;
  }

  const robot = { ...state.robot, x, y, facing: dir, energy: Math.max(0, state.robot.energy - energySpent) };
  const slid = x !== step.x || y !== step.y;
  const detail = slid ? (wet ? ' (piso molhado: avançou 2 casas)' : ' (deslizou/foi empurrado)') : '';
  const next = withLog(
    { ...state, robot },
    'action',
    `move("${dir}") → robô em (${x}, ${y})${detail}. Bateria: ${robot.energy}/${state.maxEnergy}${
      economy ? ' ⚠️ modo economia: cada passo custa 2' : ''
    }`,
  );
  return [next, { success: true, message: 'Moveu' }];
}

// ---------------------------------------------------------------------------
// Sensores
// ---------------------------------------------------------------------------

export function scanCell(state: GameState): [GameState, ActionResult] {
  const cell = facingCell(state);
  let value = 'parede';
  if (cell) {
    if (cell.station !== 'vazio') value = cell.station;
    else if (cell.floor === 'porta') value = 'porta';
    else if (cell.floor !== 'normal') value = cell.floor;
    else value = 'vazio';
  }
  const next = withLog(state, 'action', `scan() → "${value}"`);
  return [next, { success: true, message: 'Escaneado', value }];
}

export function orderItemQuery(state: GameState): [GameState, ActionResult] {
  const order = state.orders[0];
  const value = order ? order.requires.name : '';
  const next = withLog(state, 'action', `orderItem() → "${value}"`);
  return [next, { success: !!order, message: order ? 'Item do pedido' : 'Nenhum pedido ativo', value }];
}

export function orderStageQuery(state: GameState): [GameState, ActionResult] {
  const order = state.orders[0];
  const value = order ? order.requires.stage : '';
  const next = withLog(state, 'action', `orderStage() → "${value}"`);
  return [next, { success: !!order, message: order ? 'Estágio do pedido' : 'Nenhum pedido ativo', value }];
}

export function isHoldingQuery(state: GameState): [GameState, ActionResult] {
  const value = state.robot.inventory !== null;
  const next = withLog(state, 'action', `isHolding() → ${value}`);
  return [next, { success: true, message: 'Consultado', value }];
}

export function distanceToQuery(state: GameState, stationName: string): [GameState, ActionResult] {
  let best = -1;
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (state.cells[y][x].station === stationName) {
        const d = Math.abs(state.robot.x - x) + Math.abs(state.robot.y - y);
        if (best === -1 || d < best) best = d;
      }
    }
  }
  const next = withLog(state, 'action', `distanceTo("${stationName}") → ${best}`);
  return [
    next,
    { success: best !== -1, message: best !== -1 ? 'Distância calculada' : 'Estação não encontrada', value: best },
  ];
}

/**
 * Custo real (em passos) do menor caminho até ficar de frente para a estação
 * pedida — uma busca em largura que respeita paredes, colisão das estações e
 * portas automáticas. É a base para escrever rotas econômicas em bateria
 * (Dijkstra/A* com custo uniforme).
 */
export function pathCostQuery(state: GameState, stationName: string): [GameState, ActionResult] {
  const start = { x: state.robot.x, y: state.robot.y };
  const dist: number[][] = Array.from({ length: state.height }, () => Array(state.width).fill(-1));
  dist[start.y][start.x] = 0;
  const queue: { x: number; y: number }[] = [start];
  const dirs: Direction[] = ['norte', 'sul', 'leste', 'oeste'];
  let best = -1;

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const d = dist[cur.y][cur.x];
    for (const dir of dirs) {
      const { dx, dy } = deltaFor(dir);
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || nx >= state.width || ny < 0 || ny >= state.height) continue;
      const cell = state.cells[ny][nx];
      if (cell.station === stationName) {
        // Chegar ao lado da estação já basta: o robô nunca pisa nela.
        if (best === -1 || d < best) best = d;
        continue;
      }
      if (cell.station !== 'vazio') continue;
      if (dist[ny][nx] !== -1) continue;
      dist[ny][nx] = d + 1;
      queue.push({ x: nx, y: ny });
    }
  }

  const next = withLog(state, 'action', `pathCost("${stationName}") → ${best}`);
  return [
    next,
    { success: best !== -1, message: best !== -1 ? 'Caminho calculado' : 'Estação inalcançável', value: best },
  ];
}

export function batteryQuery(state: GameState): [GameState, ActionResult] {
  const next = withLog(state, 'action', `battery() → ${state.robot.energy}`);
  return [next, { success: true, message: 'Bateria consultada', value: state.robot.energy }];
}

export function platesQuery(state: GameState): [GameState, ActionResult] {
  const next = withLog(
    state,
    'action',
    `plates() → ${state.dishes.clean} limpo(s) · ${state.dishes.dirtyAtCounter} sujo(s) no balcão`,
  );
  return [next, { success: true, message: 'Louça consultada', value: state.dishes.clean }];
}

export function dirtyPlatesQuery(state: GameState): [GameState, ActionResult] {
  const next = withLog(state, 'action', `dirtyPlates() → ${state.dishes.dirtyAtCounter}`);
  return [next, { success: true, message: 'Louça suja consultada', value: state.dishes.dirtyAtCounter }];
}

export function oilQuery(state: GameState): [GameState, ActionResult] {
  const next = withLog(state, 'action', `oil() → ${state.fryer.oilUses}/${FRYER_MAX_OIL} frituras restantes`);
  return [next, { success: true, message: 'Óleo consultado', value: state.fryer.oilUses }];
}

export function queueSizeQuery(state: GameState): [GameState, ActionResult] {
  const value = state.coldPantry.queue.length;
  const next = withLog(state, 'action', `queueSize() → ${value}`);
  return [next, { success: true, message: 'Fila consultada', value }];
}

export function peekItemQuery(state: GameState, index: number): [GameState, ActionResult] {
  const value = state.coldPantry.queue[index] ?? '';
  const next = withLog(state, 'action', `peekItem(${index}) → "${value}"`);
  return [next, { success: value !== '', message: value ? 'Item consultado' : 'Índice vazio', value }];
}

export function isOpenQuery(state: GameState): [GameState, ActionResult] {
  const cell = facingCell(state);
  if (!cell || cell.floor !== 'porta') {
    const next = withLog(state, 'action', `isOpen() → true (não há porta à frente)`);
    return [next, { success: true, message: 'Sem porta à frente', value: true }];
  }
  const value = isDoorOpen(state, cell.x, cell.y);
  const next = withLog(state, 'action', `isOpen() → ${value}`);
  return [next, { success: true, message: 'Porta consultada', value }];
}

export function triggerDoor(state: GameState): [GameState, ActionResult] {
  const cell = facingCell(state);
  if (!cell || cell.floor !== 'porta') {
    const next = withLog(state, 'error', `trigger() falhou — nenhuma Porta Automática em frente ao robô.`);
    return [next, { success: false, message: 'Sem porta aqui' }];
  }
  const doors = { ...state.doors, [doorKey(cell.x, cell.y)]: DOOR_OPEN_TICKS };
  const next = withLog(
    { ...state, doors },
    'success',
    `trigger() → sensor de presença ativado, a porta em (${cell.x}, ${cell.y}) fica aberta por ${DOOR_OPEN_TICKS} ticks.`,
  );
  return [next, { success: true, message: 'Porta aberta' }];
}

export function chargeRobot(state: GameState): [GameState, ActionResult] {
  const found = requireStation(state, 'carregador');
  if (!found.ok) {
    const next = withLog(state, 'error', `charge() falhou — nenhuma Estação de Carga na frente do robô.`);
    return [next, { success: false, message: 'Sem carregador aqui' }];
  }
  const next = withLog(
    { ...state, robot: { ...state.robot, energy: state.maxEnergy } },
    'success',
    `charge() → bateria recarregada para ${state.maxEnergy}/${state.maxEnergy}`,
  );
  return [next, { success: true, message: 'Recarregado' }];
}

// ---------------------------------------------------------------------------
// take / drop
// ---------------------------------------------------------------------------

export function takeItem(state: GameState, itemName: string): [GameState, ActionResult] {
  const cell = facingCell(state);

  if (state.robot.inventory) {
    const next = withLog(state, 'error', `take("${itemName}") falhou — mãos ocupadas, use drop() primeiro.`);
    return [next, { success: false, message: 'Mãos ocupadas' }];
  }
  if (!cell) {
    const next = withLog(state, 'error', `take("${itemName}") falhou — nada em frente ao robô.`);
    return [next, { success: false, message: 'Nada aqui' }];
  }

  // Forno
  if (cell.station === 'forno') {
    if (!state.oven) {
      const next = withLog(state, 'error', `take("${itemName}") falhou — o forno está vazio.`);
      return [next, { success: false, message: 'Forno vazio' }];
    }
    if (state.oven.item.name !== itemName) {
      const next = withLog(
        state,
        'error',
        `take("${itemName}") falhou — o forno tem "${state.oven.item.name}", não "${itemName}".`,
      );
      return [next, { success: false, message: 'Item errado no forno' }];
    }
    if (state.oven.ticksElapsed < OVEN_READY_TICKS) {
      const next = withLog(
        state,
        'error',
        `take("${itemName}") falhou — ainda não terminou de assar (${state.oven.ticksElapsed}/${OVEN_READY_TICKS} ticks).`,
      );
      return [next, { success: false, message: 'Ainda não está pronto' }];
    }
    const burnt = state.oven.ticksElapsed > OVEN_BURN_TICKS;
    const item: HeldItem = { name: itemName, stage: burnt ? 'queimada' : 'cozida' };
    const next = withLog(
      { ...state, robot: { ...state.robot, inventory: item }, oven: null },
      burnt ? 'error' : 'action',
      burnt
        ? `take("${itemName}") → saiu queimado! Leve até a lixeira e use drop().`
        : `take("${itemName}") → retirado do forno, assado no ponto.`,
    );
    return [next, { success: true, message: burnt ? 'Item queimado' : 'Retirado do forno' }];
  }

  // Panela no fogão (Sopa de Legumes)
  if (cell.station === 'fogao') {
    if (!state.pot || !state.pot.cooking) {
      const next = withLog(
        state,
        'error',
        `take("${itemName}") falhou — não há nada cozinhando na panela. Use drop() com "agua" e depois com "legume" picado, e então cook().`,
      );
      return [next, { success: false, message: 'Panela vazia' }];
    }
    if (itemName !== POT_RECIPE.result) {
      const next = withLog(
        state,
        'error',
        `take("${itemName}") falhou — a panela produz "${POT_RECIPE.result}".`,
      );
      return [next, { success: false, message: 'Item errado na panela' }];
    }
    if (state.pot.ticksCooking < POT_READY_TICKS) {
      const next = withLog(
        state,
        'error',
        `take("${itemName}") falhou — a sopa ainda está cozinhando (${state.pot.ticksCooking}/${POT_READY_TICKS} ticks).`,
      );
      return [next, { success: false, message: 'Sopa não está pronta' }];
    }
    const burnt = state.pot.ticksCooking > POT_BURN_TICKS;
    const item: HeldItem = { name: POT_RECIPE.result, stage: burnt ? 'queimada' : 'cozida' };
    const next = withLog(
      { ...state, robot: { ...state.robot, inventory: item }, pot: null },
      burnt ? 'error' : 'success',
      burnt
        ? `take("sopa") → a sopa secou e queimou! Descarte na lixeira.`
        : `take("sopa") → sopa de legumes pronta, panela liberada.`,
    );
    return [next, { success: true, message: burnt ? 'Sopa queimada' : 'Sopa retirada' }];
  }

  // Bancada de montagem
  if (cell.station === 'montagem') {
    if (!state.assembly.ready) {
      const next = withLog(state, 'error', `take("${itemName}") falhou — nada pronto na bancada de montagem.`);
      return [next, { success: false, message: 'Nada pronto' }];
    }
    if (state.assembly.ready.name !== itemName) {
      const next = withLog(
        state,
        'error',
        `take("${itemName}") falhou — o prato pronto é "${state.assembly.ready.name}".`,
      );
      return [next, { success: false, message: 'Prato errado' }];
    }
    const item = state.assembly.ready;
    const next = withLog(
      { ...state, robot: { ...state.robot, inventory: item }, assembly: { ...state.assembly, ready: null } },
      'action',
      `take("${itemName}") → prato montado (${item.stage}) retirado da bancada.`,
    );
    return [next, { success: true, message: 'Retirado da bancada' }];
  }

  // Balcão: recolher prato sujo devolvido pelo cliente
  if (cell.station === 'balcao') {
    if (itemName !== 'prato') {
      const next = withLog(state, 'error', `take("${itemName}") falhou — no balcão só há pratos sujos: take("prato").`);
      return [next, { success: false, message: 'Item inválido no balcão' }];
    }
    if (state.dishes.dirtyAtCounter <= 0) {
      const next = withLog(state, 'error', `take("prato") falhou — nenhum prato sujo no balcão.`);
      return [next, { success: false, message: 'Sem pratos sujos' }];
    }
    const item: HeldItem = { name: 'prato', stage: 'suja' };
    const next = withLog(
      {
        ...state,
        robot: { ...state.robot, inventory: item },
        dishes: { ...state.dishes, dirtyAtCounter: state.dishes.dirtyAtCounter - 1 },
      },
      'action',
      `take("prato") → prato sujo recolhido. Leve até a Pia, use wash() e depois drop() para guardar.`,
    );
    return [next, { success: true, message: 'Prato sujo recolhido' }];
  }

  // Dispensa Climatizada: só sai por popItem()/takeAt()
  if (cell.station === 'dispensa_clima') {
    const idx = state.coldPantry.queue.indexOf(itemName);
    if (idx === -1) {
      const next = withLog(
        state,
        'error',
        `take("${itemName}") falhou — a Dispensa Climatizada guarda uma fila: ${
          state.coldPantry.queue.length ? state.coldPantry.queue.join(', ') : '(vazia)'
        }. Use popItem() ou takeAt(i).`,
      );
      return [next, { success: false, message: 'Use popItem()/takeAt()' }];
    }
    return takeAtIndex(state, idx);
  }

  const available = STATION_ITEMS[cell.station];
  if (!available) {
    const next = withLog(
      state,
      'error',
      `take("${itemName}") falhou — não há estação de suprimentos em frente ao robô.`,
    );
    return [next, { success: false, message: 'Nenhuma estação de suprimentos aqui' }];
  }
  if (!available.includes(itemName)) {
    const next = withLog(
      state,
      'error',
      `take("${itemName}") falhou — ${STATION_LABELS[cell.station]} só tem ${available.map((i) => `"${i}"`).join(', ')}.`,
    );
    return [next, { success: false, message: 'Item desconhecido aqui' }];
  }

  const item: HeldItem = { name: itemName, stage: 'crua' };
  const next = withLog(
    { ...state, robot: { ...state.robot, inventory: item } },
    'action',
    `take("${itemName}") → pegou ${itemName} cru(a)`,
  );
  return [next, { success: true, message: 'Item pego' }];
}

/** Retira o item da posição `index` da fila da Dispensa Climatizada. */
export function takeAtIndex(state: GameState, index: number): [GameState, ActionResult] {
  const found = requireStation(state, 'dispensa_clima');
  if (!found.ok) {
    const next = withLog(state, 'error', `takeAt(${index}) falhou — nenhuma Dispensa Climatizada em frente ao robô.`);
    return [next, { success: false, message: 'Sem dispensa climatizada aqui' }];
  }
  if (state.robot.inventory) {
    const next = withLog(state, 'error', `takeAt(${index}) falhou — mãos ocupadas, use drop() primeiro.`);
    return [next, { success: false, message: 'Mãos ocupadas' }];
  }
  const queue = state.coldPantry.queue;
  if (index < 0 || index >= queue.length || !Number.isInteger(index)) {
    const next = withLog(
      state,
      'error',
      `takeAt(${index}) falhou — índice fora da fila (tamanho ${queue.length}). Use queueSize() antes.`,
    );
    return [next, { success: false, message: 'Índice inválido' }];
  }
  const name = queue[index];
  const nextQueue = queue.filter((_, i) => i !== index);
  const item: HeldItem = { name, stage: 'crua' };
  const next = withLog(
    {
      ...state,
      robot: { ...state.robot, inventory: item },
      coldPantry: { ...state.coldPantry, queue: nextQueue },
    },
    'action',
    `takeAt(${index}) → pegou "${name}". Fila agora: ${nextQueue.length ? nextQueue.join(', ') : '(vazia)'}`,
  );
  return [next, { success: true, message: 'Item retirado da fila', value: name }];
}

/** Retira o primeiro item da fila da Dispensa Climatizada. */
export function popItemFromPantry(state: GameState): [GameState, ActionResult] {
  const found = requireStation(state, 'dispensa_clima');
  if (!found.ok) {
    const next = withLog(state, 'error', `popItem() falhou — nenhuma Dispensa Climatizada em frente ao robô.`);
    return [next, { success: false, message: 'Sem dispensa climatizada aqui' }];
  }
  if (state.coldPantry.queue.length === 0) {
    const next = withLog(state, 'error', `popItem() falhou — a fila da dispensa está vazia (aguarde a reposição).`);
    return [next, { success: false, message: 'Fila vazia' }];
  }
  return takeAtIndex(state, 0);
}

/** Verifica se os itens da bancada satisfazem alguma receita composta. */
function tryAssemble(assembly: AssemblyState): AssemblyState {
  for (const recipe of COMPOSITE_RECIPES) {
    const remaining = [...assembly.slots];
    const used: number[] = [];
    let matchesAll = true;
    for (const part of recipe.parts) {
      const idx = remaining.findIndex(
        (it, i) => !used.includes(i) && it.name === part.name && it.stage === part.stage,
      );
      if (idx === -1) {
        matchesAll = false;
        break;
      }
      used.push(idx);
    }
    if (matchesAll) {
      const slots = remaining.filter((_, i) => !used.includes(i));
      return { slots, ready: { name: compositeKey(recipe.name), stage: recipe.resultStage } };
    }
  }
  return assembly;
}

export function dropItem(state: GameState): [GameState, ActionResult] {
  if (!state.robot.inventory) {
    const next = withLog(state, 'error', `drop() falhou — nada para soltar.`);
    return [next, { success: false, message: 'Nada em mãos' }];
  }
  const held = state.robot.inventory;
  const cell = facingCell(state);

  if (cell?.station === 'forno') {
    if (state.oven) {
      const next = withLog(state, 'error', `drop() falhou — o forno já está ocupado assando "${state.oven.item.name}".`);
      return [next, { success: false, message: 'Forno ocupado' }];
    }
    const next = withLog(
      { ...state, robot: { ...state.robot, inventory: null }, oven: { item: held, ticksElapsed: 0 } },
      'action',
      `drop() → colocou ${held.name} no forno para assar.`,
    );
    return [next, { success: true, message: 'Colocado no forno' }];
  }

  // Fogão: montar a panela (recipiente intermediário) da Sopa de Legumes.
  if (cell?.station === 'fogao') {
    if (held.name === 'agua') {
      if (state.pot) {
        const next = withLog(state, 'error', `drop() falhou — a panela já tem água.`);
        return [next, { success: false, message: 'Panela ocupada' }];
      }
      const next = withLog(
        {
          ...state,
          robot: { ...state.robot, inventory: null },
          pot: { hasWater: true, veggies: 0, cooking: false, ticksCooking: 0 },
        },
        'action',
        `drop() → água na panela. Agora traga ${POT_VEGGIES_NEEDED} legume(s) picado(s).`,
      );
      return [next, { success: true, message: 'Água na panela' }];
    }
    if (held.name === 'legume') {
      if (!state.pot) {
        const next = withLog(state, 'error', `drop() falhou — a panela está sem água. Traga "agua" da Pia primeiro.`);
        return [next, { success: false, message: 'Panela sem água' }];
      }
      if (state.pot.cooking) {
        const next = withLog(state, 'error', `drop() falhou — a sopa já está cozinhando, não dá para adicionar mais.`);
        return [next, { success: false, message: 'Já cozinhando' }];
      }
      if (held.stage !== 'picada') {
        const next = withLog(state, 'error', `drop() falhou — o legume precisa estar picado (use chop()).`);
        return [next, { success: false, message: 'Legume não picado' }];
      }
      if (state.pot.veggies >= POT_VEGGIES_NEEDED) {
        const next = withLog(state, 'error', `drop() falhou — a panela já tem legumes suficientes. Use cook().`);
        return [next, { success: false, message: 'Panela cheia' }];
      }
      const pot = { ...state.pot, veggies: state.pot.veggies + 1 };
      const ready = pot.veggies >= POT_VEGGIES_NEEDED;
      const next = withLog(
        { ...state, robot: { ...state.robot, inventory: null }, pot },
        ready ? 'success' : 'action',
        ready
          ? `drop() → panela completa (${pot.veggies}/${POT_VEGGIES_NEEDED} legumes). Use cook() de mãos vazias para começar a cozinhar.`
          : `drop() → legume na panela (${pot.veggies}/${POT_VEGGIES_NEEDED}).`,
      );
      return [next, { success: true, message: 'Legume na panela' }];
    }
    const next = withLog(state, 'error', `drop() falhou — a panela só aceita "agua" e "legume" picado.`);
    return [next, { success: false, message: 'Ingrediente inválido na panela' }];
  }

  // Pia: guardar prato limpo no armário
  if (cell?.station === 'pia') {
    if (held.name !== 'prato') {
      const next = withLog(state, 'error', `drop() falhou — na Pia só se guarda prato, use a lixeira para o resto.`);
      return [next, { success: false, message: 'Item inválido na pia' }];
    }
    if (held.stage !== 'limpa') {
      const next = withLog(state, 'error', `drop() falhou — o prato ainda está sujo. Use wash() antes de guardar.`);
      return [next, { success: false, message: 'Prato sujo' }];
    }
    const next = withLog(
      {
        ...state,
        robot: { ...state.robot, inventory: null },
        dishes: { ...state.dishes, clean: state.dishes.clean + 1 },
      },
      'success',
      `drop() → prato limpo guardado (${state.dishes.clean + 1} disponível(is) para servir).`,
    );
    return [next, { success: true, message: 'Prato guardado' }];
  }

  if (cell?.station === 'montagem') {
    if (state.assembly.slots.length >= ASSEMBLY_CAPACITY) {
      const next = withLog(state, 'error', `drop() falhou — a bancada de montagem está cheia.`);
      return [next, { success: false, message: 'Bancada cheia' }];
    }
    const assembly = tryAssemble({ ...state.assembly, slots: [...state.assembly.slots, held] });
    const combined = assembly.ready && assembly.ready !== state.assembly.ready;
    const next = withLog(
      { ...state, robot: { ...state.robot, inventory: null }, assembly },
      combined ? 'success' : 'action',
      combined
        ? `drop() → ${held.name} completou a receita! "${assembly.ready!.name}" (${assembly.ready!.stage}) está pronto na bancada.`
        : `drop() → deixou ${held.name} na bancada de montagem (${assembly.slots.length}/${ASSEMBLY_CAPACITY}).`,
    );
    return [next, { success: true, message: 'Deixado na bancada' }];
  }

  if (cell?.station === 'lixeira') {
    const next = withLog(
      { ...state, robot: { ...state.robot, inventory: null } },
      'action',
      `drop() → ${held.stage} ${held.name} descartado corretamente na lixeira.`,
    );
    return [next, { success: true, message: 'Descartado na lixeira' }];
  }

  const next = withLog(
    { ...state, robot: { ...state.robot, inventory: null } },
    'action',
    `drop() → ${held.stage} ${held.name} jogado no chão (perdido).`,
  );
  return [next, { success: true, message: 'Solto' }];
}

// ---------------------------------------------------------------------------
// Preparo
// ---------------------------------------------------------------------------

export function chopItem(state: GameState): [GameState, ActionResult] {
  const cell = facingCell(state);
  const held = state.robot.inventory;

  const onBoard = cell?.station === 'tabua_corte';
  const onProcessor = cell?.station === 'processador';

  if (!onBoard && !onProcessor) {
    const next = withLog(
      state,
      'error',
      `chop() falhou — nenhuma Tábua de Corte nem Processador de Alimentos em frente ao robô.`,
    );
    return [next, { success: false, message: 'Sem estação de corte aqui' }];
  }
  if (!held) {
    const next = withLog(state, 'error', `chop() falhou — nada para picar.`);
    return [next, { success: false, message: 'Nada em mãos' }];
  }
  if (held.stage !== 'crua') {
    const next = withLog(state, 'error', `chop() falhou — ${held.name} já está ${held.stage}.`);
    return [next, { success: false, message: 'Já preparado' }];
  }

  const item: HeldItem = { ...held, stage: 'picada' };

  if (onProcessor) {
    if (state.robot.energy < PROCESSOR_ENERGY_COST) {
      const next = withLog(
        state,
        'error',
        `chop() falhou — o Processador precisa de ${PROCESSOR_ENERGY_COST} de bateria e o robô tem ${state.robot.energy}.`,
      );
      return [next, { success: false, message: 'Bateria insuficiente' }];
    }
    const energy = Math.max(0, state.robot.energy - PROCESSOR_ENERGY_COST);
    const next = withLog(
      { ...state, robot: { ...state.robot, inventory: item, energy } },
      'action',
      `chop() no Processador → ${item.name} picada num tick só (custou ${PROCESSOR_ENERGY_COST} de bateria · ${energy}/${state.maxEnergy}).`,
    );
    return [next, { success: true, message: 'Picado (processador)' }];
  }

  // Tábua de corte: barata em bateria, mas lenta (o mundo avança mais ticks).
  const slowed = advanceTimers({ ...state, robot: { ...state.robot, inventory: item } }, BOARD_EXTRA_TICKS);
  const next = withLog(
    slowed,
    'action',
    `chop() na Tábua → ${item.name} picada (+${BOARD_EXTRA_TICKS} ticks — cuidado com o forno e a panela).`,
  );
  return [next, { success: true, message: 'Picado' }];
}

export function cookItem(state: GameState): [GameState, ActionResult] {
  const cell = facingCell(state);
  const held = state.robot.inventory;

  if (!cell || cell.station !== 'fogao') {
    const next = withLog(state, 'error', `cook() falhou — nenhum fogão em frente ao robô.`);
    return [next, { success: false, message: 'Sem fogão aqui' }];
  }

  // Mãos vazias: liga o fogo embaixo da panela (Sopa de Legumes).
  if (!held) {
    if (!state.pot) {
      const next = withLog(state, 'error', `cook() falhou — nada para cozinhar e nenhuma panela montada.`);
      return [next, { success: false, message: 'Nada em mãos' }];
    }
    if (state.pot.cooking) {
      const next = withLog(
        state,
        'error',
        `cook() falhou — a sopa já está no fogo (${state.pot.ticksCooking}/${POT_READY_TICKS} ticks).`,
      );
      return [next, { success: false, message: 'Já cozinhando' }];
    }
    if (state.pot.veggies < POT_VEGGIES_NEEDED) {
      const next = withLog(
        state,
        'error',
        `cook() falhou — a panela tem ${state.pot.veggies}/${POT_VEGGIES_NEEDED} legumes picados.`,
      );
      return [next, { success: false, message: 'Panela incompleta' }];
    }
    const next = withLog(
      { ...state, pot: { ...state.pot, cooking: true, ticksCooking: 0 } },
      'success',
      `cook() → sopa no fogo. Fica pronta em ${POT_READY_TICKS} ticks e queima depois de ${POT_BURN_TICKS} — aproveite para adiantar outro pedido.`,
    );
    return [next, { success: true, message: 'Sopa cozinhando' }];
  }

  if (held.stage === 'cozida' || held.stage === 'queimada' || held.stage === 'frita') {
    const next = withLog(state, 'error', `cook() falhou — ${held.name} já está ${held.stage}.`);
    return [next, { success: false, message: 'Já cozido' }];
  }

  const item: HeldItem = { ...held, stage: 'cozida' };
  const next = withLog(
    { ...state, robot: { ...state.robot, inventory: item } },
    'action',
    `cook() → ${item.name} agora está cozida`,
  );
  return [next, { success: true, message: 'Cozido' }];
}

/** Fritadeira: óleo quente reutilizável, com número limitado de frituras. */
export function fryItem(state: GameState): [GameState, ActionResult] {
  const found = requireStation(state, 'fritadeira');
  if (!found.ok) {
    const next = withLog(state, 'error', `fry() falhou — nenhuma Fritadeira em frente ao robô.`);
    return [next, { success: false, message: 'Sem fritadeira aqui' }];
  }
  const held = state.robot.inventory;
  if (!held) {
    const next = withLog(state, 'error', `fry() falhou — nada para fritar.`);
    return [next, { success: false, message: 'Nada em mãos' }];
  }
  if (held.stage !== 'picada') {
    const next = withLog(
      state,
      'error',
      `fry() falhou — só entra na fritadeira o que está picado; ${held.name} está ${held.stage}.`,
    );
    return [next, { success: false, message: 'Precisa estar picado' }];
  }
  if (state.fryer.oilUses <= 0) {
    const next = withLog(
      state,
      'error',
      `fry() falhou — o óleo está saturado. Use wash() de frente para a Fritadeira para trocá-lo.`,
    );
    return [next, { success: false, message: 'Óleo saturado' }];
  }

  const oilUses = state.fryer.oilUses - 1;
  const item: HeldItem = { ...held, stage: 'frita' };
  const next = withLog(
    { ...state, robot: { ...state.robot, inventory: item }, fryer: { oilUses } },
    'action',
    `fry() → ${item.name} frita e crocante. Óleo: ${oilUses}/${FRYER_MAX_OIL} frituras restantes.`,
  );
  return [next, { success: true, message: 'Frito' }];
}

/** wash(): lava o prato sujo na Pia, ou troca o óleo da Fritadeira. */
export function washItem(state: GameState): [GameState, ActionResult] {
  const cell = facingCell(state);

  if (cell?.station === 'fritadeira') {
    if (state.fryer.oilUses >= FRYER_MAX_OIL) {
      const next = withLog(state, 'error', `wash() falhou — o óleo da fritadeira ainda está bom.`);
      return [next, { success: false, message: 'Óleo ainda bom' }];
    }
    const next = withLog(
      { ...state, fryer: { oilUses: FRYER_MAX_OIL } },
      'success',
      `wash() → óleo trocado. Fritadeira com ${FRYER_MAX_OIL} frituras disponíveis de novo.`,
    );
    return [next, { success: true, message: 'Óleo trocado' }];
  }

  if (cell?.station !== 'pia') {
    const next = withLog(state, 'error', `wash() falhou — nenhuma Pia (nem Fritadeira) em frente ao robô.`);
    return [next, { success: false, message: 'Sem pia aqui' }];
  }

  const held = state.robot.inventory;
  if (!held) {
    const next = withLog(state, 'error', `wash() falhou — nada para lavar. Pegue um prato sujo no Balcão.`);
    return [next, { success: false, message: 'Nada em mãos' }];
  }
  if (held.name !== 'prato') {
    const next = withLog(state, 'error', `wash() falhou — só se lava prato na Pia, não ${held.name}.`);
    return [next, { success: false, message: 'Item não lavável' }];
  }
  if (held.stage === 'limpa') {
    const next = withLog(state, 'error', `wash() falhou — esse prato já está limpo, use drop() para guardá-lo.`);
    return [next, { success: false, message: 'Prato já limpo' }];
  }

  const item: HeldItem = { name: 'prato', stage: 'limpa' };
  const next = withLog(
    { ...state, robot: { ...state.robot, inventory: item } },
    'action',
    `wash() → prato lavado. Use drop() de frente para a Pia para guardá-lo.`,
  );
  return [next, { success: true, message: 'Prato lavado' }];
}

// ---------------------------------------------------------------------------
// Entrega
// ---------------------------------------------------------------------------

export function deliverItem(state: GameState): [GameState, ActionResult] {
  const cell = facingCell(state);
  const held = state.robot.inventory;
  const order = state.orders[0];

  if (!cell || cell.station !== 'balcao') {
    const next = withLog(state, 'error', `deliver() falhou — nenhum balcão de entrega em frente ao robô.`);
    return [next, { success: false, message: 'Sem balcão aqui' }];
  }
  if (!held) {
    const next = withLog(state, 'error', `deliver() falhou — nada para entregar.`);
    return [next, { success: false, message: 'Nada em mãos' }];
  }
  if (!order) {
    const next = withLog(state, 'error', `deliver() falhou — nenhum pedido ativo.`);
    return [next, { success: false, message: 'Nenhum pedido ativo' }];
  }
  if (state.dishes.clean <= 0) {
    const next = withLog(
      state,
      'error',
      `deliver() falhou — não há prato limpo! Recolha os pratos sujos no balcão com take("prato"), lave na Pia com wash() e guarde com drop().`,
    );
    return [next, { success: false, message: 'Sem prato limpo' }];
  }

  const matches = held.name === order.requires.name && held.stage === order.requires.stage;
  if (!matches) {
    const next = withLog(
      state,
      'error',
      `deliver() falhou — o pedido "${order.name}" precisa de ${order.requires.stage} ${order.requires.name}, você tem ${held.stage} ${held.name}.`,
    );
    return [next, { success: false, message: 'Item errado' }];
  }

  const remainingOrders = [...state.orders.slice(1), makeOrder()];
  const next = withLog(
    {
      ...state,
      robot: { ...state.robot, inventory: null },
      orders: remainingOrders,
      dishes: { clean: state.dishes.clean - 1, dirtyAtCounter: state.dishes.dirtyAtCounter + 1 },
      score: state.score + order.reward,
      ordersCompleted: state.ordersCompleted + 1,
    },
    'success',
    `deliver() → pedido "${order.name}" concluído! +${order.reward} pontos · 1 prato sujo voltou para o balcão (${state.dishes.clean - 1} limpo(s) restante(s)).`,
  );
  return [next, { success: true, message: 'Entregue' }];
}

export function tickState(state: GameState): GameState {
  return advanceTimers(state, 1);
}
