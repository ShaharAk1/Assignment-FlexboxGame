# FlexOrbit — a game for learning CSS Flexbox

> Assignment 2 — Web Application Programming course, Colman.

A small space-themed browser game. Each level shows a board of planets plus a task, and the
player arranges the planets by choosing Flexbox values in a `style.css`-looking panel. The
board reacts live; a **Check solution** button decides whether the arrangement is the one the
task asked for.

Built with plain **HTML + CSS + JavaScript** — no libraries, no build step, no CSS Grid in the
puzzles, and a single page (levels swap without ever loading a new HTML file).

- **Live game (GitHub Pages):** <https://shaharak1.github.io/Assignment-FlexboxGame/>
- **Repository:** <https://github.com/ShaharAk1/Assignment-FlexboxGame>
- **Submitted by:** Shahar Akiva, <!-- TODO: partner's name -->

## How to run

**Option 1 — just open the file (nothing to install).**

Double-click `index.html`, or from a terminal in the project folder:

```bash
xdg-open index.html      # Linux
# open index.html        # macOS
# start index.html       # Windows
```

This works straight from disk (`file://`) because the scripts are ordinary
`<script defer>` tags rather than ES modules, so no browser security rule gets in the way.

**Option 2 — serve it locally** (closer to how GitHub Pages will serve it):

```bash
python3 -m http.server 8000
```

then open <http://localhost:8000>.

**Option 3 — publish it.** Push the repo, then GitHub → **Settings → Pages → Source: `main`,
folder `/ (root)`**. No configuration is needed because `index.html` sits at the repo root.

### While developing

The running game is available in the browser console as `game`:

```js
game.restart();                          // wipe the saved progress and start from level 1
game.goTo(1);                            // jump to level 2 (if it is unlocked)
game.onControlChange('flex-wrap', 'wrap');
game.check();                            // -> true / false
game.getCurrentLevel().toCssText(game.values);   // print the rule the player has built
```

Progress is stored in `localStorage`, so a reload continues where you left off.

## Code structure

The project separates **what a level is** from **how the game is played**, so new levels can be
added without touching any game logic.

| File | Role |
| --- | --- |
| `index.html` | The one and only page. Every dynamic part (board, controls, level picker) is an empty container that JavaScript fills in. |
| `style.css` | All styling: the dark space theme, the fixed-size board, the fake code editor, and the win/lose animations. |
| `js/Level.js` | **The `Level` class** — one level's data *and* rules. |
| `js/Game.js` | **The `Game` class** — the engine that runs the game. |
| `js/levels.js` | **The level list.** The only file you edit to add levels. |
| `script.js` | Entry point — three lines: build a `Game` from `LEVELS` and start it. |

The four scripts are loaded in that order with `defer`, so each one exists before the next
needs it, and the DOM is ready before any of them runs.

### `Level` (js/Level.js)

Pure data and rules — **it never touches the DOM**, which is what makes levels easy to write
and to reason about. A level knows:

* which planets to put on the board (`items`),
* which Flexbox properties the player may change (`controls`),
* the starting value of each property (`defaults`) — also what **Reset** restores,
* the winning combination (`solution`), checked by `level.check(values)`.

It **validates itself when constructed**: an unknown property, a value no `<select>` will
offer, a missing solution, or defaults that already solve the level all throw an error the
moment the page loads — so a broken level can never sneak into the game.

`Level.PROPERTIES` is the registry of every supported property and its options. Adding an
entry there instantly makes that property usable in a level.

### `Game` (js/Game.js)

The "main" class. It owns the level list and the current position in it, and does everything
that involves the page:

* **renders** the header, instruction, level picker, board (planets + rocket markers) and the
  controls for the current level;
* **applies** the player's choices to the board with JavaScript (`applyStyles`);
* **animates** the planets between arrangements using the FLIP technique — a plain CSS
  transition cannot animate a Flexbox change, so the code measures each planet before and
  after, translates it back to where it was, then releases it (the long comment on
  `applyStyles()` explains it step by step);
* **checks** the answer, gives feedback, outlines the properties that are still wrong, shakes
  or celebrates the board;
* **scores** (100 points a level, −20 per failed check, never below 20) and counts attempts;
* **unlocks** the next level, and lets the player replay finished ones from the level picker;
* **saves** progress to `localStorage` and restores it on the next visit;
* **scales** the board so it fits any screen *without* changing its layout size.

### The fixed-size board

The assignment requires the board to keep the same width and height on every screen, so that a
level's solution never depends on the resolution. The board is therefore **always 800×500 CSS
pixels** as far as layout is concerned; on a smaller screen `Game.fitBoard()` only shrinks it
*visually* with `transform: scale()`, and a wrapper element reserves the scaled size in the
page flow. Flexbox always solves the same 800×500 box, whether you are on a phone or a monitor.

## Adding a level

Everything happens in `js/levels.js` — copy the commented `TEMPLATE` block at the bottom of
that file:

```js
new Level({
    id: 'new-level-id',               // unique + permanent (progress is saved by id)
    title: 'New Level',
    difficulty: 'hard',               // easy | medium | hard
    instruction: 'Let the asteroids <strong>wrap</strong> onto a second line.',
    items: [{ size: 'lg', color: 'teal' }, /* ... */],   // size: sm|md|lg
    controls: ['flex-wrap', 'justify-content'],          // what the player may change
    defaults: { 'flex-wrap': 'nowrap', 'justify-content': 'flex-start' },
    solution: { 'flex-wrap': 'wrap',   'justify-content': 'space-between' },
    markers:  [{ orientation: 'horizontal', side: 'top', offset: '10%' }]  // rocket hints
})
```

Every option is documented in the JSDoc comment on the `Level` constructor in `js/Level.js`.

The game currently ships all **6 required levels**, ramping from easy to hard, with `asteroid-belt`
covering the mandatory `flex-wrap` requirement and 4 of the 6 levels combining more than one
Flexbox property.
