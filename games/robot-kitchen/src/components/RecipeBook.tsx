import React from 'react';
import { COMPOSITE_RECIPES, ITEM_ICONS, ITEM_SOURCE, OVEN_BURN_TICKS, OVEN_READY_TICKS, RECIPES, STATION_LABELS } from '../game/initialState';
import { StationType } from '../types';

const STAGE_LABELS: Record<string, string> = {
  crua: 'Crua',
  picada: 'Picada',
  cozida: 'Cozida',
  queimada: 'Queimada',
};

const STAGE_BADGE: Record<string, string> = {
  crua: 'bg-red-500/20 text-red-300 border-red-700',
  picada: 'bg-orange-500/20 text-orange-300 border-orange-700',
  cozida: 'bg-yellow-500/20 text-yellow-200 border-yellow-700',
  queimada: 'bg-black/40 text-red-400 border-red-800',
};

const STATION_BADGE: Record<StationType, string> = {
  geladeira: 'bg-cyan-500/20 text-cyan-300 border-cyan-700',
  despensa: 'bg-violet-500/20 text-violet-300 border-violet-700',
  tabua_corte: 'bg-amber-500/20 text-amber-300 border-amber-700',
  fogao: 'bg-rose-500/20 text-rose-300 border-rose-700',
  forno: 'bg-orange-500/20 text-orange-300 border-orange-700',
  balcao: 'bg-emerald-500/20 text-emerald-300 border-emerald-700',
  lixeira: 'bg-slate-500/20 text-slate-300 border-slate-700',
  montagem: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-700',
  carregador: 'bg-lime-500/20 text-lime-300 border-lime-700',
  vazio: 'bg-slate-700/30 text-slate-400 border-slate-700',
};

const STATION_ICONS: Record<StationType, string> = {
  geladeira: '🧊',
  despensa: '🧺',
  tabua_corte: '🔪',
  fogao: '🔥',
  forno: '⏱️',
  balcao: '🛎️',
  lixeira: '🗑️',
  montagem: '🍽️',
  carregador: '🔌',
  vazio: '',
};

const PREP_STATION: Record<string, StationType> = {
  picada: 'tabua_corte',
  cozida: 'fogao',
  crua: 'vazio',
  queimada: 'vazio',
};

export default function RecipeBook() {
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-8">
        <header>
          <h2 className="text-lg font-bold text-slate-100">📖 Livro de Receitas</h2>
          <p className="text-sm text-slate-400 mt-1">
            Todos os pedidos que a cozinha pode gerar. Consulte <code className="text-indigo-300">orderItem()</code> e{' '}
            <code className="text-indigo-300">orderStage()</code> no seu código para descobrir qual está ativo e decidir o
            que fazer.
          </p>
        </header>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Receitas simples</h3>
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
                    <span className={`text-xs px-2 py-1 rounded border ${STAGE_BADGE[recipe.requires.stage]} whitespace-nowrap`}>
                      {STAGE_LABELS[recipe.requires.stage]} {recipe.requires.name}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className={`px-1.5 py-0.5 rounded border whitespace-nowrap ${STATION_BADGE[source]}`}>
                      {STATION_ICONS[source]} pegar em {STATION_LABELS[source]}
                    </span>
                    {prep !== 'vazio' && (
                      <span className={`px-1.5 py-0.5 rounded border whitespace-nowrap ${STATION_BADGE[prep]}`}>
                        {STATION_ICONS[prep]} preparar em {STATION_LABELS[prep]}
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded border whitespace-nowrap ${STATION_BADGE.balcao}`}>
                      {STATION_ICONS.balcao} entregar em {STATION_LABELS.balcao}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Receitas compostas (Bancada de Montagem)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {COMPOSITE_RECIPES.map((recipe) => (
              <div key={recipe.name} className="rounded-lg bg-slate-900/60 border border-fuchsia-900 p-4 flex flex-col gap-3 min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <h4 className="font-semibold text-slate-100 truncate">{recipe.name}</h4>
                  <span className="shrink-0 text-xs font-semibold text-emerald-400">+{recipe.reward} pts</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {recipe.parts.map((part, i) => (
                    <React.Fragment key={part.name}>
                      {i > 0 && <span className="text-slate-600">+</span>}
                      <span
                        className={`px-2 py-1 rounded border ${STAGE_BADGE[part.stage]} whitespace-nowrap flex items-center gap-1`}
                      >
                        {ITEM_ICONS[part.name] ?? '🍽️'} {STAGE_LABELS[part.stage]} {part.name}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Leve cada parte até a <span className="text-fuchsia-300">Bancada de Montagem</span> com{' '}
                  <code className="text-indigo-300">drop()</code>. Quando todas as partes estiverem lá, use{' '}
                  <code className="text-indigo-300">take("{recipe.name.toLowerCase()}")</code> para pegar o prato pronto.
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Ingredientes &amp; estações</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-cyan-300 mb-2">🧊 Geladeira</p>
              <p className="text-xs text-slate-400 break-words">
                Estoca: {ITEM_ICONS.tomate} tomate, {ITEM_ICONS.carne} carne
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-violet-300 mb-2">🧺 Despensa</p>
              <p className="text-xs text-slate-400 break-words">
                Estoca: {ITEM_ICONS.alface} alface, {ITEM_ICONS.cebola} cebola, {ITEM_ICONS.pao} pão
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-amber-300 mb-2">🔪 Tábua de Corte</p>
              <p className="text-xs text-slate-400 break-words">Transforma um ingrediente cru em picado com chop().</p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-rose-300 mb-2">🔥 Fogão</p>
              <p className="text-xs text-slate-400 break-words">Cozinha instantaneamente com cook().</p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-orange-300 mb-2">⏱️ Forno</p>
              <p className="text-xs text-slate-400 break-words">
                Use drop() para colocar um item para assar. Ele fica pronto depois de {OVEN_READY_TICKS} ticks e{' '}
                <span className="text-red-400">queima</span> se você não usar take() antes de {OVEN_BURN_TICKS} ticks — daí só resta
                jogar fora na lixeira.
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-fuchsia-300 mb-2">🍽️ Bancada de Montagem</p>
              <p className="text-xs text-slate-400 break-words">
                Use drop() para depositar cada parte de uma receita composta; take() retira o prato pronto.
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-slate-300 mb-2">🗑️ Lixeira</p>
              <p className="text-xs text-slate-400 break-words">
                Como o robô só segura um item por vez, use drop() aqui para descartar o item errado ou queimado sem perder tempo
                voltando para as outras estações.
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-lime-300 mb-2">🔌 Estação de Carga</p>
              <p className="text-xs text-slate-400 break-words">
                O robô gasta 1 de bateria por move(). Fique de frente para o carregador e use charge() para recarregar.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Obstáculos da cozinha caótica</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-900/60 border border-sky-900 p-4 min-w-0">
              <p className="text-sm font-semibold text-sky-300 mb-2">➡️ Esteira Rolante</p>
              <p className="text-xs text-slate-400 break-words">
                Pisou, foi: o robô é empurrado automaticamente na direção da esteira depois de um move() bem-sucedido. Pode economizar
                movimentos (e bateria) — ou te levar para onde você não queria.
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-yellow-900 p-4 min-w-0">
              <p className="text-sm font-semibold text-yellow-300 mb-2">🛢️ Óleo</p>
              <p className="text-xs text-slate-400 break-words">
                Ao usar move() sobre o óleo, o robô desliza na mesma direção até bater em uma parede ou estação. Planeje a rota
                com cuidado.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Referência da linguagem (DSL)</h3>
          <div className="rounded-lg bg-black/40 border border-slate-800 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
            <p className="text-slate-500">// ações — cada uma lê/afeta a célula que o robô está VIRADO para</p>
            <p>move("norte" | "sul" | "leste" | "oeste")</p>
            <p>take("nome_do_item")</p>
            <p>drop()</p>
            <p>chop()</p>
            <p>cook()</p>
            <p>deliver()</p>
            <p>
              scan() <span className="text-slate-500">// nome da estação | "vazio" | "parede"</span>
            </p>
            <p>
              orderItem() <span className="text-slate-500">// ex.: "tomate"</span>
            </p>
            <p>
              orderStage() <span className="text-slate-500">// "crua" | "picada" | "cozida"</span>
            </p>
            <p className="mt-3 text-slate-500">// novos sensores</p>
            <p>
              isHolding() <span className="text-slate-500">// true se o robô está segurando algo</span>
            </p>
            <p>
              distanceTo("fogao") <span className="text-slate-500">// distância (em passos) até a estação mais próxima desse tipo</span>
            </p>
            <p>
              battery() <span className="text-slate-500">// energia restante</span>
            </p>
            <p>charge() {'// recarrega no Carregador'}</p>
            <p className="mt-3 text-slate-500">// variáveis e funções</p>
            <p>var alvo = orderItem()</p>
            <p>alvo = "tomate" {'// reatribuição'}</p>
            <p>{'def ir_para_geladeira() { ... }'}</p>
            <p className="mt-3 text-slate-500">// controle de fluxo</p>
            <p>{'loop { ... }'}</p>
            <p>{'repeat(n) { ... }'}</p>
            <p>{'if (cond) { ... } else { ... }'}</p>
            <p>break · continue</p>
            <p className="mt-3 text-slate-500">// condições</p>
            <p>== · != · and · or · not · true · false</p>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Dicas</h3>
          <ul className="list-disc list-inside text-sm text-slate-400 space-y-1.5">
            <li>Estações têm colisão — move() em direção a uma delas só vira o robô para encará-la, ele nunca anda por cima.</li>
            <li>take(), chop(), cook(), deliver() e scan() agem sobre a célula que o robô está encarando no momento.</li>
            <li>O robô só segura um item por vez — use a lixeira e drop() para descartar o item errado ou queimado.</li>
            <li>Use def para criar blocos reutilizáveis e var para guardar estados, deixando o código mais organizado.</li>
            <li>Escreva um solver genérico com orderItem()/orderStage() e um loop {'{ ... }'} para resolver pedidos para sempre.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
