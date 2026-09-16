# Robot Kitchen 🤖

A browser-based programming game (inspired by *The Farmer Was Replaced*) where you
write English-syntax code to automate a robot in a kitchen: fetch ingredients,
prep them, and deliver them to complete orders.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

To type-check and build for production:

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  types.ts                 Shared types: grid, robot, orders, AST, tokens
  dsl/
    lexer.ts                Tokenizer for the DSL
    parser.ts                Recursive-descent parser -> AST
    interpreter.ts            Async-generator tree-walking interpreter (ticks one
                               action at a time so it never blocks the UI thread)
  game/
    initialState.ts            8x8 grid layout, stations, ingredients, recipes
    gameEngine.ts               Pure state-transition functions for each action
  hooks/
    useGameRunner.ts            Glues parser + interpreter + game state together,
                                 drives the run/pause/step/reset loop and speed control
  components/
    CodeEditor.tsx               Left panel: textarea editor + controls
    GridView.tsx                  Right panel: CSS-grid rendering of the kitchen
    StatusPanel.tsx                Status panel: order, score, robot state, console
  App.tsx                    Composes the three panels
```

## The DSL

All keywords are English. One program is a sequence of statements; each robot
action (`move`, `take`, `drop`, `chop`, `cook`, `deliver`, `scan`, `orderItem`,
`orderStage`) advances the game by exactly one tick.

```js
// Commands
move("north" | "south" | "east" | "west")
take("item_name")     // only works facing a supply station stocking that item
drop()
chop()                  // only works facing the Cutting Board
cook()                   // only works facing the Stove
deliver()                // only works facing the Delivery Counter
scan()                    // returns what's in the cell the robot is FACING:
                          // a station name, "empty", or "wall"
orderItem()               // returns the ingredient name the active order needs
orderStage()                // returns the stage it needs: "raw" | "chopped" | "cooked"

// Control flow
loop { ... }              // infinite loop, use break to exit
repeat(3) { ... }          // fixed number of iterations
if (cond) { ... } else { ... }
break
continue

// Conditions
scan() == "cutting_board"
orderItem() == "tomato"
true / false
a and b / a or b / not a
```

### Movement & collision

Stations now have **collision** — the robot can never stand on top of one.
Calling `move(dir)` toward a station (or the kitchen wall) doesn't move the
robot; it just turns to face that direction ("bumping" into it), which is
exactly what you want, since `take`, `chop`, `cook`, `deliver`, and `scan` all
act on the tile the robot is **facing**, not the tile it's standing on.

### Example program

```js
// Fetch whatever the order needs, prep it, and deliver it.
if (orderItem() == "tomato") {
  move("west")
  move("north")   // bump the Fridge -> now facing it
  take("tomato")
} else {
  repeat(5) { move("east") }
  move("north")   // bump the Pantry -> now facing it
  take(orderItem())
}
```

## Kitchen layout (8x8 grid)

| Station          | Position | Provides / Does        |
|------------------|----------|-------------------------|
| Fridge           | (0, 0)   | tomato                  |
| Cutting Board    | (3, 0)   | chop()                  |
| Pantry           | (6, 0)   | lettuce, onion          |
| Stove            | (4, 4)   | cook()                  |
| Delivery Counter | (7, 7)   | deliver()                |

The robot spawns at (1, 1) — stations block movement, so it can never spawn
on top of one.

## Items & orders

Ingredients: `tomato`, `lettuce`, `onion`. Each order randomly picks one of
five recipes, each needing a single ingredient prepped to a single stage:

| Order           | Needs             | Reward |
|-----------------|-------------------|--------|
| Salad           | chopped tomato    | 10     |
| Coleslaw        | chopped lettuce   | 10     |
| Grilled Onion   | cooked onion      | 15     |
| Onion Rings     | chopped onion     | 12     |
| Roasted Tomato  | cooked tomato     | 15     |

Delivering the right item scores its reward and queues a new random order.

## Notes on the interpreter

The interpreter (`src/dsl/interpreter.ts`) is a tree-walking evaluator built
entirely out of `async function*` generators. `yield` happens exactly once per
robot action, so the driving code (`useGameRunner`) can `await gen.next()` on a
`setTimeout` cadence controlled by the speed selector — this is what lets
`loop { move("east") }` run indefinitely at a chosen tick rate without ever
freezing the React UI, and lets Pause/Step/Reset interrupt or single-step
execution cleanly.
