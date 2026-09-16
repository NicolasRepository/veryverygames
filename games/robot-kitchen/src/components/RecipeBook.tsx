import React from 'react';
import {
  BOARD_EXTRA_TICKS,
  COLD_PANTRY_CAPACITY,
  COMPOSITE_RECIPES,
  DOOR_OPEN_TICKS,
  ECONOMY_THRESHOLD,
  FRYER_MAX_OIL,
  ITEM_ICONS,
  ITEM_SOURCE,
  OVEN_BURN_TICKS,
  OVEN_READY_TICKS,
  POT_BURN_TICKS,
  POT_READY_TICKS,
  POT_RECIPE,
  POT_VEGGIES_NEEDED,
  PROCESSOR_ENERGY_COST,
  RECIPES,
  STATION_LABELS,
} from '../game/initialState';
import { StationType } from '../types';

const STAGE_LABELS: Record<string, string> = {
  crua: 'Crua',
  picada: 'Picada',
  cozida: 'Cozida',
  frita: 'Frita',
  queimada: 'Queimada',
  suja: 'Suja',
  limpa: 'Limpa',
};

const STAGE_BADGE: Record<string, string> = {
  crua: 'bg-red-500/20 text-red-300 border-red-700',
  picada: 'bg-orange-500/20 text-orange-300 border-orange-700',
  cozida: 'bg-yellow-500/20 text-yellow-200 border-yellow-700',
  frita: 'bg-amber-500/20 text-amber-200 border-amber-700',
  queimada: 'bg-black/40 text-red-400 border-red-800',
  suja: 'bg-stone-500/20 text-stone-300 border-stone-700',
  limpa: 'bg-sky-500/20 text-sky-200 border-sky-700',
};

const STATION_BADGE: Record<StationType, string> = {
  geladeira: 'bg-cyan-500/20 text-cyan-300 border-cyan-700',
  despensa: 'bg-violet-500/20 text-violet-300 border-violet-700',
  dispensa_clima: 'bg-teal-500/20 text-teal-300 border-teal-700',
  tabua_corte: 'bg-amber-500/20 text-amber-300 border-amber-700',
  processador: 'bg-yellow-500/20 text-yellow-300 border-yellow-700',
  fritadeira: 'bg-red-500/20 text-red-300 border-red-700',
  pia: 'bg-blue-500/20 text-blue-300 border-blue-700',
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

const PREP_STATION: Record<string, StationType> = {
  picada: 'tabua_corte',
  cozida: 'fogao',
  frita: 'fritadeira',
  crua: 'vazio',
  queimada: 'vazio',
  suja: 'vazio',
  limpa: 'pia',
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

                  {recipe.requires.stage === 'frita' && (
                    <p className="text-[11px] text-amber-300/90 break-words">
                      Pique primeiro (chop()) e só então use fry() de frente para a Fritadeira — o óleo rende{' '}
                      {FRYER_MAX_OIL} frituras e depois precisa de wash().
                    </p>
                  )}
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
                  <code className="text-indigo-300">take("{recipe.name.split(' ')[0].toLowerCase()}")</code> para pegar o
                  prato pronto.
                </p>
                {recipe.hint && <p className="text-[11px] text-orange-300/90 break-words">🔥 {recipe.hint}</p>}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Receita de panela (Fogão + recipiente intermediário)
          </h3>
          <div className="rounded-lg bg-slate-900/60 border border-sky-900 p-4 flex flex-col gap-3 min-w-0">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <h4 className="font-semibold text-slate-100 truncate">🍲 {POT_RECIPE.name}</h4>
              <span className="shrink-0 text-xs font-semibold text-emerald-400">+{POT_RECIPE.reward} pts</span>
            </div>
            <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1">
              <li>
                Na Pia: <code className="text-indigo-300">take("agua")</code> e leve até o Fogão; o{' '}
                <code className="text-indigo-300">drop()</code> enche a panela.
              </li>
              <li>
                Pegue {POT_VEGGIES_NEEDED} <span className="text-slate-200">legume</span> na Dispensa Climatizada
                (popItem()/takeAt(i)), pique cada um com <code className="text-indigo-300">chop()</code> e solte na panela
                com <code className="text-indigo-300">drop()</code>.
              </li>
              <li>
                Com as mãos vazias, <code className="text-indigo-300">cook()</code> acende o fogo. A sopa fica pronta em{' '}
                {POT_READY_TICKS} ticks e <span className="text-red-400">queima</span> depois de {POT_BURN_TICKS}.
              </li>
              <li>
                <code className="text-indigo-300">take("sopa")</code> e entregue no Balcão. Enquanto ferve, adiante outro
                pedido.
              </li>
            </ol>
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
              <p className="text-sm font-semibold text-teal-300 mb-2">❄️ Dispensa Climatizada</p>
              <p className="text-xs text-slate-400 break-words">
                Guarda até {COLD_PANTRY_CAPACITY} itens <span className="text-teal-300">em fila</span> (massa, molho,
                queijo, legume, batata) e repõe sozinha com o tempo. take() não funciona aqui: use{' '}
                <code className="text-indigo-300">popItem()</code> para tirar o primeiro da fila ou{' '}
                <code className="text-indigo-300">takeAt(i)</code> para escolher por índice — com{' '}
                <code className="text-indigo-300">queueSize()</code> e <code className="text-indigo-300">peekItem(i)</code>{' '}
                para inspecionar antes.
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-amber-300 mb-2">🔪 Tábua de Corte</p>
              <p className="text-xs text-slate-400 break-words">
                Transforma um ingrediente cru em picado com chop(). Não gasta bateria extra, mas é{' '}
                <span className="text-amber-300">lenta</span>: o mundo avança {BOARD_EXTRA_TICKS} ticks a mais, o que pode
                queimar o que está no forno ou na panela.
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-yellow-300 mb-2">🌀 Processador de Alimentos</p>
              <p className="text-xs text-slate-400 break-words">
                Mesmo chop(), num tick só — mas consome {PROCESSOR_ENERGY_COST} de bateria de uma vez. Vale quando há algo
                no forno/panela correndo contra o tempo; evite quando a bateria está baixa.
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-red-300 mb-2">🍟 Fritadeira</p>
              <p className="text-xs text-slate-400 break-words">
                <code className="text-indigo-300">fry()</code> frita um item já picado. O óleo quente é reutilizável e
                rende {FRYER_MAX_OIL} frituras; depois disso fry() falha até você usar{' '}
                <code className="text-indigo-300">wash()</code> de frente para a fritadeira para trocar o óleo.{' '}
                <code className="text-indigo-300">oil()</code> diz quantas frituras restam.
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-4 min-w-0">
              <p className="text-sm font-semibold text-blue-300 mb-2">🚰 Pia / Lava-Louças</p>
              <p className="text-xs text-slate-400 break-words">
                Fonte de <span className="text-blue-300">agua</span> para a panela e o único lugar para lavar louça. Cada
                deliver() consome um prato limpo e devolve um prato sujo ao Balcão: recolha com{' '}
                <code className="text-indigo-300">take("prato")</code>, lave com <code className="text-indigo-300">wash()</code>{' '}
                e guarde com <code className="text-indigo-300">drop()</code>. Sem prato limpo, deliver() falha —{' '}
                <code className="text-indigo-300">plates()</code> e <code className="text-indigo-300">dirtyPlates()</code>{' '}
                avisam a tempo.
              </p>
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
            <div className="rounded-lg bg-slate-900/60 border border-blue-900 p-4 min-w-0">
              <p className="text-sm font-semibold text-blue-300 mb-2">💧 Piso Molhado / Poça</p>
              <p className="text-xs text-slate-400 break-words">
                Um move() sobre a poça avança <span className="text-blue-300">2 casas em vez de 1</span>. Seu código
                precisa contar os passos certos e tratar os limites do grid — se a segunda casa for parede ou estação, o
                robô simplesmente para ali.
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-zinc-700 p-4 min-w-0">
              <p className="text-sm font-semibold text-zinc-300 mb-2">🚪 Porta Automática (sensor de presença)</p>
              <p className="text-xs text-slate-400 break-words">
                Fechada, a porta bloqueia a passagem como uma parede. Fique de frente para ela, confira com{' '}
                <code className="text-indigo-300">isOpen()</code> e use <code className="text-indigo-300">trigger()</code>{' '}
                para abri-la por {DOOR_OPEN_TICKS} ticks — tempo suficiente para atravessar, mas não para enrolar.
              </p>
            </div>
            <div className="rounded-lg bg-slate-900/60 border border-lime-900 p-4 min-w-0">
              <p className="text-sm font-semibold text-lime-300 mb-2">🔋 Falha de Bateria (Modo Economia)</p>
              <p className="text-xs text-slate-400 break-words">
                Com {ECONOMY_THRESHOLD} de bateria ou menos, cada move() passa a custar{' '}
                <span className="text-lime-300">2 em vez de 1</span>. Compare{' '}
                <code className="text-indigo-300">distanceTo()</code> (distância em linha reta) com{' '}
                <code className="text-indigo-300">pathCost()</code> (menor caminho real, contornando estações e portas)
                para escolher a rota mais barata antes de sair andando — é o seu Dijkstra/A* de bolso.
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
            <p>chop() {'// Tábua de Corte (lenta) ou Processador (cara)'}</p>
            <p>cook() {'// Fogão; de mãos vazias acende o fogo da panela'}</p>
            <p>fry() {'// Fritadeira (precisa estar picado)'}</p>
            <p>wash() {'// lava prato na Pia ou troca o óleo da Fritadeira'}</p>
            <p>trigger() {'// abre a Porta Automática à frente'}</p>
            <p>popItem() {'// 1º item da fila da Dispensa Climatizada'}</p>
            <p>takeAt(i) {'// item da fila por índice'}</p>
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
            <p>
              pathCost("balcao") <span className="text-slate-500">// menor caminho real (BFS), respeita portas</span>
            </p>
            <p>
              isOpen() <span className="text-slate-500">// a porta à frente está aberta?</span>
            </p>
            <p>
              plates() · dirtyPlates() <span className="text-slate-500">// louça limpa / suja no balcão</span>
            </p>
            <p>
              oil() <span className="text-slate-500">// frituras restantes na fritadeira</span>
            </p>
            <p>
              queueSize() · peekItem(i) <span className="text-slate-500">// fila da Dispensa Climatizada</span>
            </p>
            <p className="mt-3 text-slate-500">// variáveis e funções</p>
            <p>var alvo = orderItem()</p>
            <p>alvo = "tomate" {'// reatribuição'}</p>
            <p>{'def ir_para_geladeira() { ... }'}</p>
            <p>{'def preparar(ingrediente, passos) { ... return algo }'}</p>
            <p className="mt-3 text-slate-500">// listas nativas</p>
            <p>{'var lista = [orderItem(), orderItem()]'}</p>
            <p>lista[0] · lista[1] = "tomate"</p>
            <p>length(lista) · push(lista, x) · pop(lista) · shift(lista) · contains(lista, x)</p>
            <p className="mt-3 text-slate-500">// controle de fluxo</p>
            <p>{'loop { ... }'}</p>
            <p>{'repeat(n) { ... }'}</p>
            <p>{'if (cond) { ... } else { ... }'}</p>
            <p>{'switch (orderItem()) { case "tomate" { ... } default { ... } }'}</p>
            <p>break · continue · return</p>
            <p className="mt-3 text-slate-500">// condições e contas</p>
            <p>== · != · &lt; · &lt;= · &gt; · &gt;= · + · - · and · or · not · true · false</p>
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
            <li>
              Troque cadeias de if/else por um switch (orderItem()) — fica muito mais curto quando há muitas receitas.
            </li>
            <li>
              Funções com argumentos evitam repetição: {'def andar(n, dir) { repeat(n) { move(dir) } }'} resolve metade do
              seu código.
            </li>
            <li>
              Guarde uma fila de tarefas numa lista e consuma com shift(lista) — útil para planejar vários pedidos de uma
              vez.
            </li>
            <li>Lave a louça antes de ficar sem prato limpo: deliver() falha se plates() chegar a zero.</li>
            <li>Antes de andar, compare pathCost() com a bateria restante; abaixo de {ECONOMY_THRESHOLD} cada passo custa o dobro.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
