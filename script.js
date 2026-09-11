/* =============================================================================
 * script.js — entry point.
 * -----------------------------------------------------------------------------
 * Loaded last (see index.html). By then Level.js, Game.js and levels.js have all
 * run, so the `Level` and `Game` classes and the `LEVELS` array exist.
 *
 * All four scripts use `defer`, which means they run in order AFTER the HTML has
 * been parsed — so the elements the Game looks for are guaranteed to be there.
 * ========================================================================== */

/**
 * Build the game and put it on screen.
 *
 * @returns {Game} The running game instance.
 *
 * @example
 * // In the browser console you can drive the game by hand:
 * game.goTo(1);                                  // jump to level 2 (if unlocked)
 * game.onControlChange('justify-content', 'center');
 * game.check();                                  // -> true / false
 * game.restart();                                // wipe the saved progress
 */
function startGame() {
    const game = new Game(LEVELS);
    game.start();
    return game;
}

// Assigned to `window` on purpose (a plain `const` would not be reachable from the
// console): it makes the running game inspectable while developing new levels.
window.game = startGame();
