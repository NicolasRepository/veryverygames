import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameState } from '../types';
import { createInitialState } from '../game/initialState';
import {
  ActionResult,
  batteryQuery,
  chargeRobot,
  chopItem,
  cookItem,
  deliverItem,
  dirtyPlatesQuery,
  distanceToQuery,
  dropItem,
  fryItem,
  isHoldingQuery,
  isOpenQuery,
  moveRobot,
  oilQuery,
  orderItemQuery,
  orderStageQuery,
  pathCostQuery,
  peekItemQuery,
  platesQuery,
  popItemFromPantry,
  queueSizeQuery,
  scanCell,
  takeAtIndex,
  takeItem,
  tickState,
  triggerDoor,
  washItem,
} from '../game/gameEngine';
import { parseProgram } from '../dsl/parser';
import { createEnv, InterpreterAPI, RuntimeErrorSignal, runProgram } from '../dsl/interpreter';

export type RunStatus = 'idle' | 'running' | 'paused' | 'done' | 'error';

export interface CodeError {
  message: string;
  line: number;
}

const DEFAULT_CODE = `// Robot Kitchen — a sintaxe (loop, if, switch, def...) é em inglês;
// os nomes de lugares e itens ("norte", "geladeira", "tomate") são em português.

// --- Funções COM ARGUMENTOS: encurtam muito o código ---------------------
def andar(passos, direcao) {
  repeat(passos) { move(direcao) }
}

def ir_ao_balcao_de(passos_leste) {
  andar(passos_leste, "leste")
  andar(8, "sul")
}

// --- Listas nativas: uma fila de tarefas ---------------------------------
var tarefas = ["pegar", "preparar", "entregar"]
var pedido = orderItem()

// --- switch / case: sem encadear vários if / else ------------------------
switch (pedido) {
  case "tomate" {
    move("oeste")
    move("norte")        // esbarra na Geladeira -> fica virado para ela
    take("tomate")
    if (orderStage() == "picada") {
      andar(3, "leste")
      move("norte")      // Tábua de Corte
      chop()
      ir_ao_balcao_de(6)
    } else {
      andar(5, "leste")
      andar(5, "sul")    // Fogão
      cook()
      andar(4, "leste")
      andar(4, "sul")
    }
    deliver()
  }
  case "batata" {
    andar(7, "leste")
    move("norte")        // Despensa
    take("batata")
    andar(3, "oeste")
    move("norte")        // Processador: 1 tick só, mas -5 de bateria
    chop()
    andar(3, "leste")
    andar(5, "sul")      // Fritadeira
    fry()
    move("leste")
    andar(4, "sul")
    deliver()
  }
  default {
    andar(7, "leste")
    move("norte")        // Despensa
    take(pedido)
    if (orderStage() == "picada") {
      andar(5, "oeste")
      move("norte")      // Tábua de Corte
      chop()
      ir_ao_balcao_de(6)
    } else {
      andar(3, "oeste")
      andar(5, "sul")    // Fogão
      cook()
      andar(4, "leste")
      andar(4, "sul")
    }
    deliver()
  }
}

// --- Louça: todo prato entregue volta sujo ao balcão ---------------------
if (dirtyPlates() > 0) {
  take("prato")
  andar(5, "oeste")
  move("sul")            // Pia
  wash()
  drop()                 // guarda o prato limpo
}

// --- Dicas para os próximos programas ------------------------------------
// isOpen() / trigger()  -> portas automáticas (y = 7)
// popItem() / takeAt(i) -> fila da Dispensa Climatizada
// pathCost("fogao")     -> menor caminho real, para economizar bateria
// length(tarefas), push(tarefas, "lavar"), pop(tarefas), tarefas[0]
`;

export function useGameRunner() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [status, setStatus] = useState<RunStatus>('idle');
  const [speed, setSpeed] = useState(4); // ticks per second
  const [codeError, setCodeError] = useState<CodeError | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;

  // statusRef is the source of truth read by the (async) tick loop. It is
  // updated *synchronously* by every action below (run/pause/resume/step),
  // in addition to calling setStatus for rendering. We deliberately do NOT
  // mirror it from `status` on every render: setStatus() is asynchronous,
  // so a render-derived mirror would still hold the *previous* value at the
  // exact moment scheduleLoop's step() runs synchronously right after
  // run()/resume() call it — causing the loop to see a stale status and
  // bail out immediately (this was the "Resume does nothing" bug).
  const statusRef = useRef<RunStatus>(status);

  const speedRef = useRef(speed);
  speedRef.current = speed;

  const genRef = useRef<AsyncGenerator<void, void, void> | null>(null);
  const envRef = useRef(createEnv());
  const runTokenRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  // Updates both the ref (read synchronously by the tick loop) and the
  // React state (read by the UI for rendering) together, in that order.
  const setRunStatus = useCallback((next: RunStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const dispatch = useCallback((fn: (s: GameState) => [GameState, ActionResult]): ActionResult => {
    const [next, result] = fn(stateRef.current);
    const ticked = tickState(next);
    stateRef.current = ticked;
    setState(ticked);
    return result;
  }, []);

  const api: InterpreterAPI = useMemo(
    () => ({
      move: (dir) => dispatch((s) => moveRobot(s, dir)),
      take: (item) => dispatch((s) => takeItem(s, item)),
      drop: () => dispatch((s) => dropItem(s)),
      chop: () => dispatch((s) => chopItem(s)),
      cook: () => dispatch((s) => cookItem(s)),
      deliver: () => dispatch((s) => deliverItem(s)),
      scan: () => dispatch((s) => scanCell(s)),
      orderItem: () => dispatch((s) => orderItemQuery(s)),
      orderStage: () => dispatch((s) => orderStageQuery(s)),
      isHolding: () => dispatch((s) => isHoldingQuery(s)),
      fry: () => dispatch((s) => fryItem(s)),
      wash: () => dispatch((s) => washItem(s)),
      distanceTo: (station) => dispatch((s) => distanceToQuery(s, station)),
      pathCost: (station) => dispatch((s) => pathCostQuery(s, station)),
      battery: () => dispatch((s) => batteryQuery(s)),
      charge: () => dispatch((s) => chargeRobot(s)),
      popItem: () => dispatch((s) => popItemFromPantry(s)),
      takeAt: (index) => dispatch((s) => takeAtIndex(s, index)),
      peekItem: (index) => dispatch((s) => peekItemQuery(s, index)),
      queueSize: () => dispatch((s) => queueSizeQuery(s)),
      isOpen: () => dispatch((s) => isOpenQuery(s)),
      trigger: () => dispatch((s) => triggerDoor(s)),
      plates: () => dispatch((s) => platesQuery(s)),
      dirtyPlates: () => dispatch((s) => dirtyPlatesQuery(s)),
      oil: () => dispatch((s) => oilQuery(s)),
    }),
    [dispatch],
  );

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleLoop = useCallback(
    (token: number) => {
      const step = async () => {
        if (token !== runTokenRef.current) return;
        if (statusRef.current !== 'running') return;
        if (!genRef.current) return;

        try {
          const { done } = await genRef.current.next();
          if (token !== runTokenRef.current) return;
          if (done) {
            setRunStatus('done');
            return;
          }
        } catch (e) {
          if (token !== runTokenRef.current) return;
          if (e instanceof RuntimeErrorSignal) {
            setCodeError({ message: e.message, line: e.line });
          } else {
            setCodeError({ message: (e as Error).message, line: 0 });
          }
          setRunStatus('error');
          return;
        }

        // Re-check status right before scheduling the next tick: pause()
        // may have flipped statusRef synchronously while we were awaiting
        // genRef.current.next() above.
        if (statusRef.current !== 'running') return;
        timerRef.current = window.setTimeout(step, 1000 / speedRef.current);
      };
      step();
    },
    [setRunStatus],
  );

  const compile = useCallback((): boolean => {
    const { stmts, error } = parseProgram(code);
    if (error || !stmts) {
      setCodeError(error);
      setRunStatus('error');
      return false;
    }
    setCodeError(null);
    envRef.current = createEnv();
    genRef.current = runProgram(stmts, api, envRef.current);
    return true;
  }, [code, api, setRunStatus]);

  const run = useCallback(() => {
    clearTimer();
    runTokenRef.current += 1;
    const fresh = createInitialState();
    stateRef.current = fresh;
    setState(fresh);
    if (!compile()) return;
    // Set the ref BEFORE scheduling: scheduleLoop's step() runs synchronously
    // up to its first `await`, so it needs statusRef to already say
    // 'running' the instant it starts, not after React re-renders.
    setRunStatus('running');
    scheduleLoop(runTokenRef.current);
  }, [compile, scheduleLoop, setRunStatus]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'running') return;
    setRunStatus('paused');
  }, [setRunStatus]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    if (!genRef.current) return;
    runTokenRef.current += 1;
    setRunStatus('running');
    scheduleLoop(runTokenRef.current);
  }, [scheduleLoop, setRunStatus]);

  const step = useCallback(async () => {
    clearTimer();
    // A manual Step always halts any running auto-loop first.
    runTokenRef.current += 1;
    if (!genRef.current) {
      const fresh = createInitialState();
      stateRef.current = fresh;
      setState(fresh);
      if (!compile()) return;
    }
    try {
      const { done } = await genRef.current!.next();
      setRunStatus(done ? 'done' : 'paused');
    } catch (e) {
      if (e instanceof RuntimeErrorSignal) {
        setCodeError({ message: e.message, line: e.line });
      } else {
        setCodeError({ message: (e as Error).message, line: 0 });
      }
      setRunStatus('error');
    }
  }, [compile, setRunStatus]);

  const reset = useCallback(() => {
    clearTimer();
    runTokenRef.current += 1;
    genRef.current = null;
    envRef.current = createEnv();
    setCodeError(null);
    setRunStatus('idle');
    const fresh = createInitialState();
    stateRef.current = fresh;
    setState(fresh);
  }, [setRunStatus]);

  useEffect(() => () => clearTimer(), []);

  return {
    code,
    setCode,
    state,
    status,
    speed,
    setSpeed,
    codeError,
    run,
    pause,
    resume,
    step,
    reset,
  };
}
