import React, { useState } from 'react';
import CodeEditor from './components/CodeEditor';
import GridView from './components/GridView';
import StatusPanel from './components/StatusPanel';
import RecipeBook from './components/RecipeBook';
import { useGameRunner } from './hooks/useGameRunner';

type Tab = 'kitchen' | 'recipes';

export default function App() {
  const { code, setCode, state, status, speed, setSpeed, codeError, run, pause, resume, step, reset } = useGameRunner();
  const [tab, setTab] = useState<Tab>('kitchen');

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 sm:px-6 py-3 border-b border-slate-800">
        <div className="min-w-0">
          <a
            href="../../"
            className="inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300 mb-1"
          >
            ← Hub de Jogos
          </a>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">🤖 Robot Kitchen</h1>
          <p className="text-xs sm:text-sm text-slate-400 truncate">Program a kitchen robot with a tiny English DSL.</p>
        </div>

        <nav className="flex gap-1 shrink-0 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <TabButton active={tab === 'kitchen'} onClick={() => setTab('kitchen')}>
            🍳 Kitchen
          </TabButton>
          <TabButton active={tab === 'recipes'} onClick={() => setTab('recipes')}>
            📖 Recipes
          </TabButton>
        </nav>
      </header>

      <main className="flex-1 min-h-0">
        {tab === 'kitchen' ? (
          <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.85fr)] gap-3 p-3 sm:p-4 overflow-y-auto lg:overflow-hidden">
            <section className="min-w-0 min-h-0 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl p-4 overflow-hidden">
              <h2 className="shrink-0 text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">Code</h2>
              <div className="flex-1 min-h-0">
                <CodeEditor
                  code={code}
                  setCode={setCode}
                  status={status}
                  speed={speed}
                  setSpeed={setSpeed}
                  codeError={codeError}
                  onRun={run}
                  onPause={pause}
                  onResume={resume}
                  onStep={step}
                  onReset={reset}
                />
              </div>
            </section>

            <section className="min-w-0 min-h-0 flex flex-col items-center bg-slate-900/60 border border-slate-800 rounded-xl p-4 overflow-hidden">
              <h2 className="shrink-0 self-start text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">Kitchen</h2>
              <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
                <GridView state={state} />
              </div>
            </section>

            <section className="min-w-0 min-h-0 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl p-4 overflow-hidden">
              <h2 className="shrink-0 text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wide">Status</h2>
              <div className="flex-1 min-h-0">
                <StatusPanel state={state} status={status} />
              </div>
            </section>
          </div>
        ) : (
          <RecipeBook />
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${
        active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}
