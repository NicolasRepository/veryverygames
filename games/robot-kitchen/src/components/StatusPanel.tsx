import React, { useEffect, useRef } from 'react';
import { GameState, LogEntry } from '../types';
import { RunStatus } from '../hooks/useGameRunner';
import { ITEM_ICONS } from '../game/initialState';

interface Props {
  state: GameState;
  status: RunStatus;
}

const STATUS_STYLES: Record<RunStatus, string> = {
  idle: 'bg-slate-700 text-slate-200',
  running: 'bg-emerald-700 text-emerald-100',
  paused: 'bg-amber-700 text-amber-100',
  done: 'bg-indigo-700 text-indigo-100',
  error: 'bg-red-700 text-red-100',
};

const LOG_STYLES: Record<LogEntry['kind'], string> = {
  info: 'text-slate-400',
  action: 'text-slate-300',
  success: 'text-emerald-400',
  error: 'text-red-400',
};

export default function StatusPanel({ state, status }: Props) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'end' });
  }, [state.logs.length]);

  const activeOrder = state.orders[0];

  return (
    <div className="flex flex-col h-full min-h-0 gap-3 overflow-y-auto lg:overflow-visible">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
        <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${STATUS_STYLES[status]}`}>
          {status}
        </span>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
          <span className="whitespace-nowrap">
            Score: <span className="text-slate-200 font-semibold">{state.score}</span>
          </span>
          <span className="whitespace-nowrap">
            Orders: <span className="text-slate-200 font-semibold">{state.ordersCompleted}</span>
          </span>
          <span className="whitespace-nowrap">
            Ticks: <span className="text-slate-200 font-semibold">{state.ticks}</span>
          </span>
        </div>
      </div>

      <div className="shrink-0 rounded-md bg-slate-900 border border-slate-800 p-3 min-w-0">
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Active Order</p>
        {activeOrder ? (
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-slate-100 font-semibold truncate">
              {ITEM_ICONS[activeOrder.requires.name] ?? '🍽️'} {activeOrder.name}
            </span>
            <span className="text-xs text-slate-400 text-right whitespace-nowrap shrink-0">
              needs {activeOrder.requires.stage} {activeOrder.requires.name}
            </span>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No orders queued.</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {state.orders.slice(1).map((o) => (
            <span key={o.id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 whitespace-nowrap">
              {ITEM_ICONS[o.requires.name] ?? ''} {o.name}
            </span>
          ))}
        </div>
      </div>

      <div className="shrink-0 rounded-md bg-slate-900 border border-slate-800 p-3 min-w-0">
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Robot</p>
        <p className="text-sm text-slate-300 break-words">
          Position ({state.robot.x}, {state.robot.y}) · facing {state.robot.facing}
        </p>
        <p className="text-sm text-slate-300 break-words">
          Holding:{' '}
          {state.robot.inventory
            ? `${ITEM_ICONS[state.robot.inventory.name] ?? ''} ${state.robot.inventory.stage} ${state.robot.inventory.name}`
            : 'nothing'}
        </p>
      </div>

      <div className="flex-1 min-h-[160px] rounded-md bg-black/40 border border-slate-800 p-2 overflow-y-auto font-mono text-xs">
        {state.logs.length === 0 && <p className="text-slate-600">Console output will appear here…</p>}
        {state.logs.map((log) => (
          <p key={log.id} className={`${LOG_STYLES[log.kind]} break-words`}>
            {log.message}
          </p>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
