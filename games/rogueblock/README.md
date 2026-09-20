# RogueBlock — Crisol do Éter

Deckbuilder roguelike de posicionamento, com temática de **alquimia cósmica
sombria**. Encaixe Relíquias no Crisol (tabuleiro), complete linhas e
colunas para disparar Ignição, Éter Vital, Baluarte, Corrosão Astral ou
Prisma Etéreo, e trace sua rota por um mapa procedural até enfrentar as
Colheitas.

## Changelog desta revisão

- **Correção crítica**: o modal de recompensa pós-Confronto podia abrir com
  `rewardOptions` ainda indefinido e lançar uma exceção no meio da fila do
  EventBus, travando a atualização de `RunState` logo depois de vencer uma
  luta (o jogo "parecia" ter botões que não respondiam mais). A causa era
  a ordem de inscrição dos listeners de `ENCOUNTER_WON`/`ENCOUNTER_LOST`:
  `DOMController` escutava o evento bruto e podia rodar antes de
  `RunState` terminar de montar o próprio estado. Agora `DOMController`
  reage só a `RUN_CHANGED`, publicado por `RunState` depois que tudo já
  foi atualizado — ver comentário em `src/ui/DOMController.js`.
- Removido um `zoom: 0.85` global no CSS que encolhia a interface inteira
  sem necessidade, prejudicando a legibilidade.
- Adicionados breakpoints responsivos para telas pequenas (celular).
- Novo Elemento: **Prisma Etéreo** (ciano) — dispersa o poder acumulado do
  Arauto; o excesso vira dano direto.
- Novas formas de Relíquia: Serpente e Bastião.
- Dois novos Arautos: Ceifador de Marés Etéreas e Guardião do Selo Partido.
- Dois novos Vestígios: O Santuário do Prisma Etéreo e A Cripta dos Arautos
  Esquecidos.
- Novo botão **Compêndio** na barra do topo: mostra todos os Elementos,
  todas as formas de Relíquia (com raridade) e o bestiário completo de
  Arautos — não só o que já está no baralho atual, mas tudo que o jogo
  pode liberar.
- Novo botão **Como Jogar**: regras resumidas em um modal, a qualquer
  momento.
- Jogo renomeado para **RogueBlock** (título, aba do navegador e cabeçalho;
  o subtítulo "Crisol do Éter" e todos os termos internos de lore foram
  mantidos).

## Como rodar

ES Modules não carregam via `file://` por restrição de CORS do navegador —
é preciso servir os arquivos por HTTP. Duas opções simples, sem instalar nada
além do que você já tem:

```bash
# Python (já vem em praticamente todo sistema)
cd RogueBlock
python3 -m http.server 8080
# depois abra http://localhost:8080

# ou, com Node instalado
npx serve .
```

Nenhum bundler, nenhuma dependência de build — é só HTML + ES Modules puros.

## Árvore de arquivos

```
RogueBlock/
├── index.html                 # shell HTML: 4 telas + modal, importa src/main.js
├── styles/
│   └── main.css                # todo o CSS do jogo (tema, telas, animações)
└── src/
    ├── main.js                 # bootstrap: cria RunState + DOMController
    ├── core/
    │   ├── Config.js            # todos os números de balanceamento
    │   ├── EventBus.js          # pub/sub — ponte entre lógica e UI
    │   ├── RunState.js          # orquestrador da Jornada (meta-jogo)
    │   └── utils.js             # rnd, pick, clamp, weightedPick, uid
    ├── data/                    # catálogos de conteúdo (dados puros)
    │   ├── ElementCatalog.js     # os 4 Elementos (Ignição, Éter Vital, ...)
    │   ├── ShapeCatalog.js       # poliominós das Relíquias
    │   ├── FoeArchetypes.js      # arquétipos e prefixos dos Arautos
    │   ├── StartingDeck.js       # baralho inicial
    │   └── EventCatalog.js       # Vestígios (eventos narrativos)
    ├── entities/                 # modelo de dados puro (sem DOM)
    │   ├── Piece.js               # Relíquia (forma + elemento + potência)
    │   ├── Deck.js                 # baralho / monte de compra / descarte
    │   ├── Board.js                 # o Crisol (grid)
    │   ├── Adventurer.js             # o Peregrino (jogador)
    │   └── Foe.js                     # o Arauto (inimigo)
    ├── systems/                  # regras de jogo, sem DOM
    │   ├── FoeCodex.js            # geração procedural de Arautos
    │   ├── RewardForge.js         # sorteio de Relíquias de recompensa
    │   ├── EncounterManager.js     # máquina de estados de UM combate
    │   ├── MapGenerator.js         # ondas de rotas do mapa (sempre 3 opções)
    │   ├── ShopSystem.js           # ofertas e custos do Entreposto
    │   └── EventSystem.js          # sorteio/resolução de Vestígios
    └── ui/                       # única camada que toca o DOM
        ├── DOMController.js       # alterna telas, liga a topbar
        ├── BattleRenderer.js      # desenha o Crisol, mão, painéis de combate
        ├── DragController.js      # captura de ponteiro para arrastar peças
        ├── MapRenderer.js         # cards de rota do mapa
        ├── ShopRenderer.js        # tela do Entreposto
        ├── EventRenderer.js       # tela de Vestígio
        └── ModalRenderer.js       # overlay genérico: recompensa, fim, inventário
```

## Padrão de comunicação Lógica ↔ UI

**Observer / Pub-Sub** via `core/EventBus.js`.

- `entities/`, `systems/` e `core/RunState.js` nunca importam nada de `ui/`
  nem tocam `document`. Quando algo relevante muda (combate atualizado,
  linhas limpas, vitória, derrota, moeda/mapa mudou), eles fazem
  `eventBus.emit(EVENTS.ALGO, payload)`.
- `ui/DOMController.js` e os renderers assinam esses eventos com
  `eventBus.on(...)` e decidem como desenhar. Eles nunca alteram estado de
  jogo diretamente — sempre chamam um método público de `RunState` ou
  `EncounterManager` (ex.: `runState.chooseNode(id)`,
  `encounter.playPiece(piece, r, c)`), que por sua vez emite o evento de
  atualização.

Isso mantém a lógica testável isoladamente (dá pra simular uma Jornada
inteira em Node, sem DOM — foi assim que este projeto foi validado) e
permite trocar a camada visual (ex.: React, Canvas) sem tocar em uma linha
de regra de jogo.

## Tema escolhido: Alquimia Cósmica Sombria

O jogo se chama **Crisol do Éter**. O jogador é um Peregrino que atravessa
um Crisol — um tabuleiro de convergência alquímica — encaixando Relíquias
para canalizar quatro Elementos:

| Elemento (cor) | Nome temático     | Efeito              |
|----------------|--------------------|----------------------|
| Vermelho       | Ignição            | Dano ao Arauto        |
| Verde          | Éter Vital         | Restaura vida          |
| Azul           | Baluarte           | Escudo temporário        |
| Roxo           | Corrosão Astral    | Veneno acumulado           |

Os inimigos são **Arautos** (ex.: *Autômato de Escória*, *Arauto da Última
Colheita*, *Tecelã do Véu Negro*), com prefixos como *Corrompido*, *Úmbrio*
ou *Profano*. A cada 5 profundidades no mapa, uma onda vira uma **Colheita**
— um chefe fixo com o prefixo *Arqui-*.

A moeda da economia é o **Fragmento Astral** (💠), ganho ao vencer
Confrontos e gasto no **Entreposto do Mercador Errante** — que vende
Relíquias novas e permite aprimorar ou remover Relíquias do baralho.

## Sistemas de metajogo novos

- **Mapa procedural**: `MapGenerator.generateWave(depth)` sempre retorna 3
  nós de rota (Confronto 👹, Entreposto 💰, Vestígio 📜, Véu Nebuloso ❓),
  exceto em ondas de Colheita (nó único e forçado). O Véu Nebuloso só
  revela seu tipo real (`MapGenerator.revealMystery`) quando escolhido.
- **Economia**: `RunState.addCurrency` / `spendCurrency`, usadas pelo
  ganho de recompensa em combate e pelas compras do Entreposto.
- **Entreposto**: `ShopSystem.generateOffers(depth)` gera 3 Relíquias à
  venda com preço crescente; `RunState.buyPiece/upgradePiece/removePiece`
  aplicam a transação.
- **Vestígios**: `EventCatalog` define 6 eventos narrativos com 2–3
  escolhas cada, resolvidos por `EventSystem.resolveChoice`.
- **Inventário**: botão "Baralho" na topbar abre
  `ModalRenderer.showInventory(deck)`, listando todas as Relíquias
  atualmente no baralho (não só a mão).

## Como estender

- **Elemento novo**: acrescente uma entrada em `data/ElementCatalog.js` +
  uma variável de cor em `styles/main.css` — o sorteio de recompensa e a
  loja já pegam a cor nova sozinhos (leem as chaves do catálogo).
- **Forma nova**: acrescente uma entrada em `data/ShapeCatalog.js`.
- **Arauto novo**: acrescente uma entrada em `data/FoeArchetypes.js`.
- **Vestígio novo**: acrescente uma entrada em `data/EventCatalog.js`.
- **Tipo de nó de mapa novo**: adicione um peso em `CONFIG.MAP.WEIGHTS`,
  uma entrada em `NODE_META` (`systems/MapGenerator.js`) e trate o novo
  tipo em `RunState.chooseNode`.
