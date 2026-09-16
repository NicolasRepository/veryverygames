import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameState } from '../types';
import { createInitialState } from '../game/initialState';
import { ActionResult, chopItem, cookItem, deliverItem, dropItem, moveRobot, orderItemQuery, orderStageQuery, scanCell, takeItem, tickState } from '../game/gameEngine';
import { parseProgram } from '../dsl/parser';
import { InterpreterAPI, RuntimeErrorSignal, runProgram } from '../dsl/interpreter';

export type RunStatus = 'idle' | 'running' | 'paused' | 'done' | 'error';

export interface CodeError {
  message: string;
  line: number;
}

const DEFAULT_CODE = `// Fetches, preps, and delivers whatever the active order needs.
// orderItem() / orderStage() let you read the current order from code.
// scan() and every action now read the tile in FRONT of the robot, and
// stations block movement — bump into one (move toward it) to face it.

// 1) Go get the ingredient the order needs.
if (orderItem() == "tomato") {
  move("west")
  move("north")          // bump the Fridge -> now facing it
  take("tomato")
  repeat(3) { move("east") }
} else {
  repeat(5) { move("east") }
  move("north")          // bump the Pantry -> now facing it
  take(orderItem())
  repeat(3) { move("west") }
}

// 2) Prep it: chop or cook depending on what the order wants.
if (orderStage() == "chopped") {
  move("north")          // bump the Cutting Board -> now facing it
  chop()
  repeat(6) { move("south") }
} else {
  move("east")
  repeat(2) { move("south") }
  move("south")          // bump the Stove -> now facing it
  cook()
  move("west")
  repeat(4) { move("south") }
}

// 3) Walk it to the Delivery Counter and hand it off.
repeat(3) { move("east") }
move("east")              // bump the Counter -> now facing it
deliver()
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
    genRef.current = runProgram(stmts, api);
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
