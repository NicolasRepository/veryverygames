import React from 'react';
import { GameState, StationType } from '../types';
import { STATION_LABELS } from '../game/initialState';

const STATION_STYLES: Record<StationType, string> = {
  fridge: 'bg-cyan-950 border-cyan-500 text-cyan-300',
  pantry: 'bg-violet-950 border-violet-500 text-violet-300',
  cutting_board: 'bg-amber-950 border-amber-500 text-amber-300',
  stove: 'bg-rose-950 border-rose-500 text-rose-300',
  counter: 'bg-emerald-950 border-emerald-500 text-emerald-300',
  empty: 'bg-slate-900 border-slate-800 text-slate-700',
};

const STATION_ICONS: Record<StationType, string> = {
  fridge: '🧊',
  pantry: '🧺',
  cutting_board: '🔪',
  stove: '🔥',
  counter: '🛎️',
  empty: '',
};

const FACING_ROTATION: Record<string, string> = {
  north: '-rotate-90',
  south: 'rotate-90',
  east: 'rotate-0',
  west: 'rotate-180',
};

const STAGE_COLOR: Record<string, string> = {
  raw: 'bg-red-500',
  chopped: 'bg-orange-400',
  cooked: 'bg-yellow-300',
};

interface Props {
  state: GameState;
}

export default function GridView({ state }: Props) {
  const { robot } = state;

  return (
    <div className="flex flex-col items-center justify-center gap-3 h-full w-full min-h-0 min-w-0">
      <div
        className="grid border border-slate-800 rounded-lg overflow-hidden shadow-inner shadow-black/40 shrink-0"
        style={{
          gridTemplateColumns: `repeat(${state.width}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${state.height}, minmax(0, 1fr))`,
          width: 'min(100%, 72vh, 640px)',
          height: 'min(100%, 72vh, 640px)',
        }}
      >
        {state.cells.flatMap((row, y) =>
          row.map((cell, x) => {
            const isRobotHere = robot.x === x && robot.y === y;
            return (
              <div
                key={`${x}-${y}`}
                className={`relative border ${cell.station !== 'empty' ? 'border-2' : ''} ${STATION_STYLES[cell.station]} flex items-center justify-center text-[10px] sm:text-xs font-medium`}
              >
                {cell.station !== 'empty' && (
                  <div className="flex flex-col items-center gap-0.5 select-none opacity-90">
                    <span className="text-base sm:text-lg leading-none">{STATION_ICONS[cell.station]}</span>
                    <span className="hidden sm:block leading-tight text-center">{STATION_LABELS[cell.station]}</span>
                  </div>
                )}

                {isRobotHere && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className={`w-3/4 h-3/4 rounded-full bg-indigo-500/90 border-2 border-indigo-200 flex items-center justify-center shadow-lg shadow-indigo-900/60 transition-transform duration-150 ${FACING_ROTATION[robot.facing]}`}
                      title={`Robot facing ${robot.facing}`}
                    >
                      <span className="text-white text-sm sm:text-base -rotate-0">🤖</span>
                    </div>
                    {robot.inventory && (
                      <div
                        className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border border-black/40 ${STAGE_COLOR[robot.inventory.stage]}`}
                        title={`${robot.inventory.stage} ${robot.inventory.name}`}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          }),
        )}
      </div>

      <div className="shrink-0 flex flex-wrap gap-3 text-xs text-slate-400 justify-center">
        <Legend swatch="bg-cyan-950 border-cyan-500" label="Fridge (tomato)" />
        <Legend swatch="bg-violet-950 border-violet-500" label="Pantry (lettuce, onion)" />
        <Legend swatch="bg-amber-950 border-amber-500" label="Cutting Board" />
        <Legend swatch="bg-rose-950 border-rose-500" label="Stove" />
        <Legend swatch="bg-emerald-950 border-emerald-500" label="Counter" />
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded border ${swatch}`} />
      <span>{label}</span>
    </div>
  );
}
