import React from 'react';
import { RunStatus, CodeError } from '../hooks/useGameRunner';

interface Props {
  code: string;
  setCode: (code: string) => void;
  status: RunStatus;
  speed: number;
  setSpeed: (speed: number) => void;
  codeError: CodeError | null;
  onRun: () => void;
  onPause: () => void;
  onResume: () => void;
  onStep: () => void;
  onReset: () => void;
}

const SPEED_OPTIONS = [1, 2, 4, 8, 16];

export default function CodeEditor({
  code,
  setCode,
  status,
  speed,
  setSpeed,
  codeError,
  onRun,
  onPause,
  onResume,
  onStep,
  onReset,
}: Props) {
  const isRunning = status === 'running';
  const isPaused = status === 'paused';

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div className="shrink-0 flex flex-wrap items-center gap-2">
        <button
          onClick={isRunning ? onPause : isPaused ? onResume : onRun}
          className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors whitespace-nowrap"
        >
          {isRunning ? '⏸ Pause' : isPaused ? '▶ Resume' : '▶ Run'}
        </button>
        <button
          onClick={onStep}
          disabled={isRunning}
          className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors whitespace-nowrap"
        >
          ⏭ Step
        </button>
        <button
          onClick={onReset}
          className="px-3 py-1.5 rounded-md bg-rose-700 hover:bg-rose-600 text-white text-sm font-semibold transition-colors whitespace-nowrap"
        >
          ⟲ Reset
        </button>

        <div className="flex items-center gap-1.5 ml-auto text-xs text-slate-400 shrink-0">
          <label htmlFor="speed">Speed</label>
          <select
            id="speed"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-slate-200 text-xs"
          >
            {SPEED_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s} tick/s
              </option>
            ))}
          </select>
        </div>
      </div>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        className="flex-1 min-h-0 w-full resize-none rounded-md bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none text-slate-100 font-mono text-sm p-3 leading-relaxed overflow-auto"
        placeholder={'loop {\n  move("east")\n}'}
      />

      {codeError && (
        <div className="shrink-0 rounded-md bg-red-950/60 border border-red-800 text-red-300 text-xs p-2 font-mono break-words max-h-24 overflow-y-auto">
          {codeError.line > 0 ? `Line ${codeError.line}: ` : ''}
          {codeError.message}
        </div>
      )}

      <div className="shrink-0 text-[11px] text-slate-500 leading-relaxed border-t border-slate-800 pt-2 break-words">
        <p className="break-words">
          move() · take() · drop() · chop() · cook() · deliver() · scan() · orderItem() · orderStage()
        </p>
        <p className="break-words">
          loop {'{ }'} · repeat(n) {'{ }'} · if/else · break · continue — see the{' '}
          <span className="text-slate-400">Recipes</span> tab for the full DSL cheat sheet.
        </p>
      </div>
    </div>
  );
}
