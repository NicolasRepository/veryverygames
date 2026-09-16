# Robot Kitchen 🤖

Um jogo de programação no navegador (inspirado em *The Farmer Was Replaced*) em
que você escreve código com sintaxe em inglês para automatizar um robô numa
cozinha: buscar ingredientes, prepará-los e entregá-los para completar
pedidos. Nomes de lugares e itens do jogo ficam em português.

## Como rodar

```bash
npm install
npm run dev
```

Depois abra a URL local impressa no terminal (geralmente `http://localhost:5173`).

Para checar os tipos e gerar o build de produção:

```bash
npm run build
npm run preview
```

## Estrutura do projeto

```
src/
  types.ts                 Tipos compartilhados: grade, robô, pedidos, AST, tokens
  dsl/
    lexer.ts                Tokenizador da DSL
    parser.ts                Parser recursivo-descendente -> AST
    interpreter.ts           Interpretador (gerador assíncrono, um yield por ação)
  game/
    initialState.ts          Layout da cozinha, receitas, estado inicial
    gameEngine.ts             Regras do jogo: mover, pegar, picar, cozinhar, entregar...
  hooks/
    useGameRunner.ts          Liga o interpretador ao estado do jogo e ao loop de execução
  components/
    CodeEditor.tsx            Editor de código + controles de execução
    GridView.tsx              Renderização da grade da cozinha
    StatusPanel.tsx           Pedido ativo, robô, bateria, forno, bancada e console
    RecipeBook.tsx            Referência de receitas e da DSL
  App.tsx                     Layout principal com abas Cozinha / Receitas
```

## A linguagem (DSL)

A sintaxe (palavras-chave, chamadas de função, operadores) é em inglês; os
valores literais que representam lugares e itens do jogo (direções, nomes de
estações, ingredientes) são em português.

### Ações
- `move("norte" | "sul" | "leste" | "oeste")`
- `take("nome_do_item")`
- `drop()`
- `chop()` — Tábua de Corte (barata, mas gasta 2 ticks a mais) ou Processador de Alimentos (1 tick, -5 de bateria)
- `cook()` — Fogão; de mãos vazias, acende o fogo da panela
- `fry()` — Fritadeira (o item precisa estar picado)
- `wash()` — lava prato na Pia ou troca o óleo da Fritadeira
- `trigger()` — abre a Porta Automática à frente
- `popItem()` / `takeAt(i)` — retira da fila da Dispensa Climatizada
- `deliver()`
- `scan()` → nome da estação em frente, `"vazio"` ou `"parede"`
- `orderItem()` / `orderStage()` → o que o pedido ativo precisa
- `isHolding()` → `true`/`false` se o robô está com algo em mãos
- `distanceTo("fogao")` → distância (em passos) até a estação mais próxima desse tipo
- `battery()` → energia restante do robô
- `charge()` → recarrega a bateria (precisa estar de frente para o Carregador)
- `pathCost("balcao")` → menor caminho real (BFS, respeita estações e portas)
- `isOpen()` → a Porta Automática à frente está aberta?
- `plates()` / `dirtyPlates()` → louça limpa disponível / suja no balcão
- `oil()` → frituras restantes na fritadeira
- `queueSize()` / `peekItem(i)` → inspeciona a fila da Dispensa Climatizada

### Variáveis e funções
```
var alvo = orderItem()
alvo = "tomate"

def ir_para_geladeira() {
  move("oeste")
  move("norte")
}

// funções com argumentos e valor de retorno
def andar(passos, direcao) {
  repeat(passos) { move(direcao) }
}

def mais_barato(a, b) {
  if (pathCost(a) <= pathCost(b)) { return a }
  return b
}
```

### Listas nativas
```
var lista = [orderItem(), orderItem()]
lista[0]
lista[1] = "tomate"
length(lista) · push(lista, x) · pop(lista) · shift(lista) · contains(lista, x)
```

### Controle de fluxo
```
loop { ... }
repeat(n) { ... }
if (cond) { ... } else { ... }

switch (orderItem()) {
  case "tomate" { ... }
  case "batata" { ... }
  default { ... }
}

break
continue
return valor
== · != · < · <= · > · >= · + · - · and · or · not · true · false
```

## Mecânicas de cozinha

- **Lixeira**: como o robô só segura um item por vez, use `drop()` na
  Lixeira para descartar um item errado ou queimado.
- **Bancada de Montagem**: pratos compostos (como o Hamburguer) exigem levar
  cada parte até a bancada com `drop()`; quando a receita se completa, use
  `take("hamburguer")` para retirar o prato pronto.
- **Forno (com timer)**: `drop()` no forno começa a cozinhar o item por
  alguns ticks; se você não usar `take()` a tempo, o item queima e só serve
  para a lixeira.
- **Esteiras Rolantes**: empurram o robô automaticamente na direção da
  esteira depois de um `move()` bem-sucedido.
- **Óleo**: ao pisar nele com `move()`, o robô desliza até bater numa parede
  ou estação.
- **Bateria / Modo Economia**: cada `move()` custa 1 de energia; com 12 ou
  menos de bateria cada passo passa a custar 2. Compare `distanceTo()` com
  `pathCost()` para planejar a rota mais barata e recarregue com `charge()`
  na Estação de Carga antes que ela acabe.
- **Panela (Fogão)**: a Sopa de Legumes usa um recipiente intermediário —
  `drop()` com `"agua"` (pega na Pia) enche a panela, `drop()` com legumes
  picados completa os ingredientes e `cook()` de mãos vazias acende o fogo.
  A sopa fica pronta em 6 ticks e queima depois de 13; retire com
  `take("sopa")`.
- **Pizza de Queijo**: monte `massa + molho + queijo` na Bancada de Montagem,
  retire com `take("pizza")` — ela sai **crua** — e asse no Forno antes de
  entregar.
- **Fritadeira**: `fry()` frita o que já está picado. O óleo quente é
  reutilizável e rende 3 frituras; depois disso use `wash()` de frente para a
  fritadeira para trocá-lo.
- **Pia / Lava-Louças**: cada `deliver()` consome um prato limpo e devolve um
  prato sujo ao Balcão. Recolha com `take("prato")`, lave com `wash()` e
  guarde com `drop()` na Pia. Sem prato limpo, `deliver()` falha.
- **Dispensa Climatizada**: guarda até 5 itens **em fila** e repõe sozinha.
  `take()` não funciona nela: use `popItem()` (primeiro da fila) ou
  `takeAt(i)` (por índice).
- **Processador de Alimentos**: alternativa rápida à Tábua de Corte — um tick
  só, mas consome 5 de bateria de uma vez.
- **Piso Molhado / Poça**: um `move()` sobre a poça avança 2 casas em vez de
  1; trate os limites do grid e as colisões.
- **Porta Automática**: bloqueia a passagem como uma parede. Confira com
  `isOpen()` e abra com `trigger()` — ela fica aberta por 4 ticks.
