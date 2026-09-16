import { AssemblyState, Cell, Direction, GameState, HeldItem, LogEntry } from '../types';
import {
  ASSEMBLY_CAPACITY,
  COMPOSITE_RECIPES,
  MAX_ENERGY,
  OVEN_BURN_TICKS,
  OVEN_READY_TICKS,
  STATION_ITEMS,
  STATION_LABELS,
  makeOrder,
} from './initialState';

export interface ActionResult {
  success: boolean;
  message: string;
  value?: string | number | boolean; // used by scan(), orderItem(), isHolding(), distanceTo(), battery()...
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

/**
 * The cell the robot is currently facing (based on robot.facing), or `null`
 * if that's off the edge of the grid. Every interactive command (take,
 * chop, cook, deliver, scan) works on this cell instead of the tile the
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

/** Tenta dar um único passo em `dir` a partir de (x,y). Retorna a posição
 * resultante e se o passo foi bloqueado (parede ou estação). Não gera logs
 * nem gasta bateria — é usado tanto pelo move() normal quanto pela esteira
 * e pelo óleo para simular passos "automáticos". */
function tryStep(state: GameState, x: number, y: number, dir: Direction): { x: number; y: number; blocked: boolean; blockedBy?: string } {
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
  let energySpent = 1;

  // Chão escorregadio: continua deslizando na mesma direção até bater em
  // algo. O óleo pode encadear com esteiras, então checamos os dois em cada
  // iteração; um limite evita laços infinitos em layouts estranhos.
  for (let i = 0; i < 20; i++) {
    const cell = state.cells[y][x];
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
  const next = withLog(
    { ...state, robot },
    'action',
    `move("${dir}") → robô em (${x}, ${y})${slid ? ' (deslizou/foi empurrado pela esteira)' : ''}. Bateria: ${robot.energy}/${state.maxEnergy}`,
  );
  return [next, { success: true, message: 'Moveu' }];
}

export function scanCell(state: GameState): [GameState, ActionResult] {
  // scan() reports what's in the cell the robot is currently FACING (one
  // tile ahead, in the direction it last moved/turned) — not the tile it's
  // standing on.
  const cell = facingCell(state);
  const value = cell ? (cell.station !== 'vazio' ? cell.station : 'vazio') : 'parede';

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
  return [next, { success: best !== -1, message: best !== -1 ? 'Distância calculada' : 'Estação não encontrada', value: best }];
}

export function batteryQuery(state: GameState): [GameState, ActionResult] {
  const next = withLog(state, 'action', `battery() → ${state.robot.energy}`);
  return [next, { success: true, message: 'Bateria consultada', value: state.robot.energy }];
}

export function chargeRobot(state: GameState): [GameState, ActionResult] {
  const cell = facingCell(state);
  if (!cell || cell.station !== 'carregador') {
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

  // Forno: retirar o item que está cozinhando (crua -> cozida, ou queimada
  // se o robô demorou demais para voltar).
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
        : `take("${itemName}") → retirado do forno, cozido no ponto.`,
    );
    return [next, { success: true, message: burnt ? 'Item queimado' : 'Retirado do forno' }];
  }

  // Bancada de montagem: retirar o prato pronto (composto).
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
      `take("${itemName}") → prato montado retirado da bancada.`,
    );
    return [next, { success: true, message: 'Retirado da bancada' }];
  }

  const available = STATION_ITEMS[cell.station];
  if (!available) {
    const next = withLog(state, 'error', `take("${itemName}") falhou — não há estação de suprimentos em frente ao robô.`);
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
  const next = withLog({ ...state, robot: { ...state.robot, inventory: item } }, 'action', `take("${itemName}") → pegou ${itemName} cru(a)`);
  return [next, { success: true, message: 'Item pego' }];
}

/** Verifica se os itens da bancada satisfazem alguma receita composta; se
 * sim, consome as partes usadas e deixa o prato pronto para take(). */
function tryAssemble(assembly: AssemblyState): AssemblyState {
  for (const recipe of COMPOSITE_RECIPES) {
    const remaining = [...assembly.slots];
    const used: number[] = [];
    let matchesAll = true;
    for (const part of recipe.parts) {
      const idx = remaining.findIndex((it, i) => !used.includes(i) && it.name === part.name && it.stage === part.stage);
      if (idx === -1) {
        matchesAll = false;
        break;
      }
      used.push(idx);
    }
    if (matchesAll) {
      const slots = remaining.filter((_, i) => !used.includes(i));
      return { slots, ready: { name: recipe.name.toLowerCase(), stage: 'cozida' } };
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
        ? `drop() → ${held.name} completou a receita! "${assembly.ready!.name}" está pronto na bancada.`
        : `drop() → deixou ${held.name} na bancada de montagem (${assembly.slots.length}/${ASSEMBLY_CAPACITY}).`,
    );
    return [next, { success: true, message: 'Deixado na bancada' }];
  }

  if (cell?.station === 'lixeira') {
    const next = withLog({ ...state, robot: { ...state.robot, inventory: null } }, 'action', `drop() → ${held.stage} ${held.name} descartado corretamente na lixeira.`);
    return [next, { success: true, message: 'Descartado na lixeira' }];
  }

  const next = withLog({ ...state, robot: { ...state.robot, inventory: null } }, 'action', `drop() → ${held.stage} ${held.name} jogado no chão (perdido).`);
  return [next, { success: true, message: 'Solto' }];
}

export function chopItem(state: GameState): [GameState, ActionResult] {
  const cell = facingCell(state);
  const held = state.robot.inventory;

  if (!cell || cell.station !== 'tabua_corte') {
    const next = withLog(state, 'error', `chop() falhou — nenhuma tábua de corte em frente ao robô.`);
    return [next, { success: false, message: 'Sem tábua de corte aqui' }];
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
  const next = withLog({ ...state, robot: { ...state.robot, inventory: item } }, 'action', `chop() → ${item.name} agora está picada`);
  return [next, { success: true, message: 'Picado' }];
}

export function cookItem(state: GameState): [GameState, ActionResult] {
  const cell = facingCell(state);
  const held = state.robot.inventory;

  if (!cell || cell.station !== 'fogao') {
    const next = withLog(state, 'error', `cook() falhou — nenhum fogão em frente ao robô.`);
    return [next, { success: false, message: 'Sem fogão aqui' }];
  }
  if (!held) {
    const next = withLog(state, 'error', `cook() falhou — nada para cozinhar.`);
    return [next, { success: false, message: 'Nada em mãos' }];
  }
  if (held.stage === 'cozida' || held.stage === 'queimada') {
    const next = withLog(state, 'error', `cook() falhou — ${held.name} já está ${held.stage}.`);
    return [next, { success: false, message: 'Já cozido' }];
  }

  const item: HeldItem = { ...held, stage: 'cozida' };
  const next = withLog({ ...state, robot: { ...state.robot, inventory: item } }, 'action', `cook() → ${item.name} agora está cozida`);
  return [next, { success: true, message: 'Cozido' }];
}

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
      score: state.score + order.reward,
      ordersCompleted: state.ordersCompleted + 1,
    },
    'success',
    `deliver() → pedido "${order.name}" concluído! +${order.reward} pontos`,
  );
  return [next, { success: true, message: 'Entregue' }];
}

export function tickState(state: GameState): GameState {
  const oven = state.oven ? { ...state.oven, ticksElapsed: state.oven.ticksElapsed + 1 } : null;
  return { ...state, ticks: state.ticks + 1, oven };
}
