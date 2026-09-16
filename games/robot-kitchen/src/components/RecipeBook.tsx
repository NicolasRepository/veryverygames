import React from 'react';
import { RECIPES, ITEM_SOURCE, ITEM_ICONS, STATION_LABELS } from '../game/initialState';
import { StationType } from '../types';

const STAGE_LABELS: Record<string, string> = {
  raw: 'Raw',
  chopped: 'Chopped',
  cooked: 'Cooked',
};

const STAGE_BADGE: Record<string, string> = {
  raw: 'bg-red-500/20 text-red-300 border-red-700',
  chopped: 'bg-orange-500/20 text-orange-300 border-orange-700',
  cooked: 'bg-yellow-500/20 text-yellow-200 border-yellow-700',
};

const STATION_BADGE: Record<StationType, string> = {
  fridge: 'bg-cyan-500/20 text-cyan-300 border-cyan-700',
  pantry: 'bg-violet-500/20 text-violet-300 border-violet-700',
  cutting_board: 'bg-amber-500/20 text-amber-300 border-amber-700',
  stove: 'bg-rose-500/20 text-rose-300 border-rose-700',
  counter: 'bg-emerald-500/20 text-emerald-300 border-emerald-700',
  empty: 'bg-slate-700/30 text-slate-400 border-slate-700',
};

const STATION_ICONS: Record<StationType, string> = {
  fridge: '🧊',
  pantry: '🧺',
  cutting_board: '🔪',
  stove: '🔥',
  counter: '🛎️',
  empty: '',
};

const PREP_STATION: Record<string, StationType> = {
  chopped: 'cutting_board',
  cooked: 'stove',
  raw: 'empty',
};

export default function RecipeBook() {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-8">
        <header>
          <h2 className="text-lg font-bold text-slate-100">📖 Recipe Book</h2>
          <p className="text-sm text-slate-400 mt-1">
            Every order the kitchen can generate. Query <code className="text-indigo-300">orderItem()</code> and{' '}
            <code className="text-indigo-300">orderStage()</code> in your code to figure out which one is active and
            branch accordingly.
          </p>
        </header>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Recipes</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {RECIPES.map((recipe) => {
              const source = ITEM_SOURCE[recipe.requires.name];
              const prep = PREP_STATION[recipe.requires.stage];
              return (
                <div key={recipe.name} className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 flex flex-col gap-3 min-w-0">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <h4 className="font-semibold text-slate-100 truncate">{recipe.name}</h4>
                    <span className="shrink-0 text-xs font-semibold text-emerald-400">+{recipe.reward} pts</span>
                  </div>

                  <div className="flex items-center gap-2 text-2xl">
                    <span title={recipe.requires.name}>{ITEM_ICONS[recipe.requires.name] ?? '🍽️'}</span>
                    <span className="text-slate-600">→</span>
                    <span
                      className={`text-xs px-2 py-1 rounded border ${STAGE_BADGE[recipe.requires.stage]} whitespace-nowrap`}
                    >
                      {STAGE_LABELS[recipe.requires.stage]} {recipe.requires.name}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className={`px-1.5 py-0.5 rounded border whitespace-nowrap ${STATION_BADGE[source]}`}>
                      {STATION_ICONS[source]} take at {STATION_LABELS[source]}
                    </span>
                    {prep !== 'empty' && (
                      <span className={`px-1.5 py-0.5 rounded border whitespace-nowrap ${STATION_BADGE[prep]}`}>
                        {STATION_ICONS[prep]} prep at {STATION_LABELS[prep]}
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded border whitespace-nowrap ${STATION_BADGE.counter}`}>
                      {STATION_ICONS.counter} deliver at {STATION_LABELS.counter}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Ingredients &amp; stations</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-cyan-300 mb-2">🧊 Fridge</p>
              <p className="text-xs text-slate-400 break-words">Stocks: {ITEM_ICONS.tomato} tomato</p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-violet-300 mb-2">🧺 Pantry</p>
              <p className="text-xs text-slate-400 break-words">
                Stocks: {ITEM_ICONS.lettuce} lettuce, {ITEM_ICONS.onion} onion
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-amber-300 mb-2">🔪 Cutting Board</p>
              <p className="text-xs text-slate-400 break-words">Turns a raw ingredient into its chopped form via chop().</p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-rose-300 mb-2">🔥 Stove</p>
              <p className="text-xs text-slate-400 break-words">Turns a raw ingredient into its cooked form via cook().</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">DSL cheat sheet</h3>
          <div className="rounded-lg bg-black/40 border border-slate-800 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
            <p className="text-slate-500">// actions — each one reads/affects the tile the robot is FACING</p>
            <p>move("north" | "south" | "east" | "west")</p>
            <p>take("item_name")</p>
            <p>drop()</p>
            <p>chop()</p>
            <p>cook()</p>
            <p>deliver()</p>
            <p>scan()          <span className="text-slate-500">// station name | "empty" | "wall"</span></p>
            <p>orderItem()     <span className="text-slate-500">// e.g. "tomato"</span></p>
            <p>orderStage()    <span className="text-slate-500">// "raw" | "chopped" | "cooked"</span></p>
            <p className="mt-3 text-slate-500">// control flow</p>
            <p>{'loop { ... }'}</p>
            <p>{'repeat(n) { ... }'}</p>
            <p>{'if (cond) { ... } else { ... }'}</p>
            <p>break · continue</p>
            <p className="mt-3 text-slate-500">// conditions</p>
            <p>== · != · and · or · not · true · false</p>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Tips</h3>
          <ul className="list-disc list-inside text-sm text-slate-400 space-y-1.5">
            <li>Stations have collision — move() toward one just turns the robot to face it, it never walks on top.</li>
            <li>take(), chop(), cook(), deliver() and scan() all act on the tile the robot is currently facing.</li>
            <li>The robot can only hold one item at a time — drop() discards it if you grabbed the wrong thing.</li>
            <li>Write a generic solver once with orderItem()/orderStage() and loop {'{ ... }'} it to clear orders forever.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
