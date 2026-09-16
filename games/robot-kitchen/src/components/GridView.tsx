import React from 'react';
import { GameState, StationType } from '../types';
import { STATION_LABELS } from '../game/initialState';

const STATION_STYLES: Record<StationType, string> = {
  geladeira: 'bg-cyan-950 border-cyan-500 text-cyan-300',
  despensa: 'bg-violet-950 border-violet-500 text-violet-300',
  dispensa_clima: 'bg-teal-950 border-teal-500 text-teal-300',
  tabua_corte: 'bg-amber-950 border-amber-500 text-amber-300',
  processador: 'bg-yellow-950 border-yellow-500 text-yellow-300',
  fritadeira: 'bg-red-950 border-red-500 text-red-300',
  pia: 'bg-blue-950 border-blue-500 text-blue-300',
  fogao: 'bg-rose-950 border-rose-500 text-rose-300',
  forno: 'bg-orange-950 border-orange-500 text-orange-300',
  balcao: 'bg-emerald-950 border-emerald-500 text-emerald-300',
  lixeira: 'bg-slate-800 border-slate-500 text-slate-300',
  montagem: 'bg-fuchsia-950 border-fuchsia-500 text-fuchsia-300',
  carregador: 'bg-lime-950 border-lime-500 text-lime-300',
  vazio: 'bg-slate-900 border-slate-800 text-slate-700',
};

const STATION_ICONS: Record<StationType, string> = {
  geladeira: '🧊',
  despensa: '🧺',
  dispensa_clima: '❄️',
  tabua_corte: '🔪',
  processador: '🌀',
  fritadeira: '🍟',
  pia: '🚰',
  fogao: '🔥',
  forno: '⏱️',
  balcao: '🛎️',
  lixeira: '🗑️',
  montagem: '🍽️',
  carregador: '🔌',
  vazio: '',
};

const FACING_ROTATION: Record<string, string> = {
  norte: '-rotate-90',
  sul: 'rotate-90',
  leste: 'rotate-0',
  oeste: 'rotate-180',
};

const STAGE_COLOR: Record<string, string> = {
  crua: 'bg-red-500',
  picada: 'bg-orange-400',
  cozida: 'bg-yellow-300',
  frita: 'bg-amber-500',
  queimada: 'bg-black border border-red-600',
  suja: 'bg-stone-600',
  limpa: 'bg-sky-200',
};

interface Props {
  state: GameState;
}

export default function GridView({ state }: Props) {
  const { robot } = state;
  const doorOpen = (x: number, y: number) => (state.doors[`${x},${y}`] ?? 0) > 0;

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
            const isEmptyFloor = cell.station === 'vazio';
            const open = cell.floor === 'porta' && doorOpen(x, y);
            const floorStyle =
              cell.floor === 'esteira'
                ? 'bg-sky-950/70 border-sky-800'
                : cell.floor === 'oleo'
                ? 'bg-yellow-950/60 border-yellow-800'
                : cell.floor === 'molhado'
                ? 'bg-blue-950/70 border-blue-800'
                : cell.floor === 'porta'
                ? open
                  ? 'bg-emerald-950/70 border-emerald-700'
                  : 'bg-zinc-800 border-zinc-600'
                : '';
            return (
              <div
                key={`${x}-${y}`}
                className={`relative border ${cell.station !== 'vazio' ? 'border-2' : ''} ${
                  isEmptyFloor && floorStyle ? floorStyle : STATION_STYLES[cell.station]
                } flex items-center justify-center text-[10px] sm:text-xs font-medium`}
              >
                {cell.station !== 'vazio' && (
                  <div className="flex flex-col items-center gap-0.5 select-none opacity-90">
                    <span className="text-base sm:text-lg leading-none">{STATION_ICONS[cell.station]}</span>
                    <span className="hidden sm:block leading-tight text-center">{STATION_LABELS[cell.station]}</span>
                  </div>
                )}
                {isEmptyFloor && cell.floor === 'esteira' && (
                  <span className="text-sm sm:text-base opacity-70 select-none">
                    {cell.conveyorDir === 'norte' ? '↑' : cell.conveyorDir === 'sul' ? '↓' : cell.conveyorDir === 'leste' ? '→' : '←'}
                  </span>
                )}
                {isEmptyFloor && cell.floor === 'oleo' && <span className="text-sm sm:text-base opacity-70 select-none">🛢️</span>}
                {isEmptyFloor && cell.floor === 'molhado' && (
                  <span className="text-sm sm:text-base opacity-70 select-none" title="Piso molhado: move() avança 2 casas">
                    💧
                  </span>
                )}
                {isEmptyFloor && cell.floor === 'porta' && (
                  <span
                    className="text-sm sm:text-base opacity-80 select-none"
                    title={open ? 'Porta automática aberta' : 'Porta automática fechada — use trigger()'}
                  >
                    {open ? '🚪' : '🔒'}
                  </span>
                )}

                {isRobotHere && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className={`w-3/4 h-3/4 rounded-full bg-indigo-500/90 border-2 border-indigo-200 flex items-center justify-center shadow-lg shadow-indigo-900/60 transition-transform duration-150 ${FACING_ROTATION[robot.facing]}`}
                      title={`Robô virado para ${robot.facing}`}
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
        <Legend swatch="bg-cyan-950 border-cyan-500" label="Geladeira (tomate, carne, queijo)" />
        <Legend swatch="bg-violet-950 border-violet-500" label="Despensa (alface, cebola, pão, batata)" />
        <Legend swatch="bg-teal-950 border-teal-500" label="Dispensa Climatizada (fila)" />
        <Legend swatch="bg-amber-950 border-amber-500" label="Tábua de Corte" />
        <Legend swatch="bg-yellow-950 border-yellow-500" label="Processador (rápido, gasta bateria)" />
        <Legend swatch="bg-rose-950 border-rose-500" label="Fogão" />
        <Legend swatch="bg-orange-950 border-orange-500" label="Forno (com timer)" />
        <Legend swatch="bg-red-950 border-red-500" label="Fritadeira" />
        <Legend swatch="bg-blue-950 border-blue-500" label="Pia / Lava-Louças" />
        <Legend swatch="bg-fuchsia-950 border-fuchsia-500" label="Bancada de Montagem" />
        <Legend swatch="bg-slate-800 border-slate-500" label="Lixeira" />
        <Legend swatch="bg-lime-950 border-lime-500" label="Carregador" />
        <Legend swatch="bg-emerald-950 border-emerald-500" label="Balcão" />
        <Legend swatch="bg-sky-950/70 border-sky-800" label="Esteira Rolante" />
        <Legend swatch="bg-yellow-950/60 border-yellow-800" label="Óleo (escorregadio)" />
        <Legend swatch="bg-blue-950/70 border-blue-800" label="Piso Molhado (anda 2)" />
        <Legend swatch="bg-zinc-800 border-zinc-600" label="Porta Automática (trigger())" />
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
