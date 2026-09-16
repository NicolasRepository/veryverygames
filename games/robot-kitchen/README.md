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
- `chop()`
- `cook()`
- `deliver()`
- `scan()` → nome da estação em frente, `"vazio"` ou `"parede"`
- `orderItem()` / `orderStage()` → o que o pedido ativo precisa
- `isHolding()` → `true`/`false` se o robô está com algo em mãos
- `distanceTo("fogao")` → distância (em passos) até a estação mais próxima desse tipo
- `battery()` → energia restante do robô
- `charge()` → recarrega a bateria (precisa estar de frente para o Carregador)

### Variáveis e funções
```
var alvo = orderItem()
alvo = "tomate"

def ir_para_geladeira() {
  move("oeste")
  move("norte")
}
```

### Controle de fluxo
```
loop { ... }
repeat(n) { ... }
if (cond) { ... } else { ... }
break
continue
== · != · and · or · not · true · false
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
- **Bateria**: cada `move()` custa 1 de energia; recarregue com `charge()`
  na Estação de Carga antes que ela acabe.
