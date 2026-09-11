/* =============================================================================
 * Game.js — the engine that runs the whole game.
 * -----------------------------------------------------------------------------
 * Responsibilities:
 *   - own the list of Level objects and remember which one is being played,
 *   - build the board (planets + rocket markers) and the controls for that level,
 *   - apply the player's Flexbox choices to the board with JavaScript,
 *   - check the answer, give feedback, unlock and move to the next level,
 *   - reset a level, let the player revisit finished levels, keep score,
 *   - save/restore progress in localStorage,
 *   - keep the board at a FIXED 800x500 layout size on every screen (it is only
 *     scaled visually), so a level's solution never depends on the resolution.
 *
 * Everything happens on a single HTML page — no navigation, no libraries.
 * ========================================================================== */

class Game {

    /**
     * Create the game. Nothing is drawn until start() is called.
     *
     * @param {Level[]} levels   The levels to play, in order. Must contain at least one.
     * @param {Object}  [options]
     * @param {string}  [options.storageKey='flexorbit.progress']
     *        localStorage key used to save progress. Pass null to disable saving.
     * @param {number}  [options.pointsPerLevel=100]   Points for solving a level first try.
     * @param {number}  [options.penaltyPerMistake=20] Points lost per failed "Check".
     * @param {number}  [options.minPoints=20]         Points floor, however many tries it took.
     * @param {Object<string,string>} [options.elements]
     *        Override the default element ids, e.g. { board: 'my-board' }.
     *
     * @throws {Error} If `levels` is empty or a required element is missing from the page.
     *
     * @example
     * const game = new Game(LEVELS);            // LEVELS comes from js/levels.js
     * game.start();
     */
    constructor(levels, options = {}) {
        if (!Array.isArray(levels) || levels.length === 0) {
            throw new Error('Game: at least one Level is required.');
        }

        this.levels            = levels;
        this.storageKey        = options.storageKey === undefined ? 'flexorbit.progress' : options.storageKey;
        this.pointsPerLevel    = options.pointsPerLevel    || 100;
        this.penaltyPerMistake = options.penaltyPerMistake || 20;
        this.minPoints         = options.minPoints         || 20;

        /** @type {number} Index into this.levels of the level on screen. */
        this.currentIndex = 0;
        /** @type {Object<string,string>} The player's current choices for the current level. */
        this.values = {};
        /** @type {Set<string>} Ids of levels already solved. */
        this.completed = new Set();
        /** @type {number} Failed "Check" presses on the current level. */
        this.attempts = 0;
        /** @type {number} Total score. */
        this.score = 0;
        /** @type {boolean} True once the current level has been solved (locks the controls). */
        this.solved = false;
        /** @type {number} Current visual scale of the board (1 = full size). See fitBoard(). */
        this.boardScale = 1;

        // Collect every element we need once, up front, so a typo in index.html fails fast.
        const ids = Object.assign({
            levelNav:    'level-nav',
            title:       'level-title',
            instruction: 'level-instruction',
            indicator:   'level-indicator',
            difficulty:  'difficulty-badge',
            score:       'score',
            attempts:    'attempts',
            controls:    'controls',
            feedback:    'feedback',
            board:       'board',
            stage:       'stage',
            viewport:    'visualization',
            checkBtn:    'btn-check',
            resetBtn:    'btn-reset',
            nextBtn:     'btn-next'
        }, options.elements || {});

        this.elements = {};
        for (const [name, id] of Object.entries(ids)) {
            const el = document.getElementById(id);
            if (!el) throw new Error(`Game: missing element #${id} (expected for "${name}").`);
            this.elements[name] = el;
        }
    }

    /* =========================================================================
     * Lifecycle
     * ====================================================================== */

    /**
     * Start the game: restore saved progress, wire up the buttons and draw the
     * first (or last played) level.
     *
     * @returns {void}
     *
     * @example
     * new Game(LEVELS).start();
     */
    start() {
        this.loadProgress();

        // Buttons. Arrow functions keep `this` pointing at the Game instance.
        this.elements.checkBtn.addEventListener('click', () => this.check());
        this.elements.resetBtn.addEventListener('click', () => this.resetLevel());
        this.elements.nextBtn.addEventListener('click', () => this.handleNext());

        // The board keeps a fixed 800x500 layout box; only its on-screen size changes.
        window.addEventListener('resize', () => this.fitBoard());
        // Web fonts finishing late can change the panel widths, so measure once more.
        window.addEventListener('load', () => this.fitBoard());

        this.render();
    }

    /**
     * Draw everything for the current level: header, instruction, board, controls, buttons.
     * Called on start, on every level change and after a reset.
     *
     * @returns {void}
     *
     * @example
     * game.currentIndex = 2;
     * game.render();      // jump straight to the third level (see goTo() for the safe way)
     */
    render() {
        const level = this.getCurrentLevel();

        this.attempts = 0;
        this.solved   = this.completed.has(level.id);   // revisiting a solved level? keep it solved
        this.values   = level.getDefaultValues();

        // --- header -----------------------------------------------------------
        this.elements.title.textContent       = `Level ${this.currentIndex + 1}: ${level.title}`;
        this.elements.instruction.innerHTML   = level.instruction;
        this.elements.indicator.textContent   = `Level ${this.currentIndex + 1} of ${this.levels.length}`;
        this.elements.difficulty.textContent  = level.difficulty;
        this.elements.difficulty.className    = `difficulty-badge difficulty-badge--${level.difficulty}`;

        this.renderLevelNav();
        this.renderBoard(level);
        this.renderControls(level);
        this.applyStyles({ animate: false });   // new board: nothing to slide from
        this.updateStatus();

        this.setFeedback(
            this.solved ? 'Already solved — replay it or pick another level.' : '',
            this.solved ? 'success' : 'idle'
        );
        // Undo the end-of-game state in case the player came back from the victory screen.
        this.elements.nextBtn.onclick = null;
        this.elements.nextBtn.textContent = this.isLastLevel() ? 'Finish ★' : 'Next level →';
        this.elements.nextBtn.hidden = !this.solved;
        this.elements.checkBtn.disabled = false;
    }

    /* =========================================================================
     * Rendering helpers
     * ====================================================================== */

    /**
     * Draw the level picker (one chip per level). Solved levels and the next unlocked
     * level are clickable, later levels stay locked.
     *
     * @returns {void}
     * @example game.renderLevelNav();
     */
    renderLevelNav() {
        const nav = this.elements.levelNav;
        nav.innerHTML = '';

        this.levels.forEach((level, index) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'level-chip';
            chip.textContent = String(index + 1);
            chip.title = level.title;

            const unlocked = this.isUnlocked(index);
            if (this.completed.has(level.id)) chip.classList.add('level-chip--done');
            if (index === this.currentIndex)  chip.classList.add('level-chip--current');
            if (!unlocked) {
                chip.classList.add('level-chip--locked');
                chip.disabled = true;
                chip.title = 'Locked — finish the previous level first';
            }

            chip.addEventListener('click', () => this.goTo(index));
            nav.appendChild(chip);
        });
    }

    /**
     * Fill the flex container with this level's planets and rocket markers.
     * The markers are absolutely positioned, so they are NOT flex items and can never
     * interfere with the puzzle.
     *
     * @param {Level} level The level to draw.
     * @returns {void}
     * @example game.renderBoard(game.getCurrentLevel());
     */
    renderBoard(level) {
        const board = this.elements.board;
        board.innerHTML = '';

        // 1. Rocket guide lines (decoration / hint about the target position).
        for (const marker of level.markers) {
            const line = document.createElement('div');
            line.className = `rocket-line rocket-line--${marker.orientation} rocket-line--${marker.side}`;
            line.setAttribute('aria-hidden', 'true');
            if (marker.offset !== undefined) line.style[marker.side] = marker.offset;  // e.g. left: 28%
            for (let i = 0; i < 5; i++) {           // five rockets flying along the line
                const rocket = document.createElement('span');
                rocket.className = 'rocket';
                line.appendChild(rocket);
            }
            board.appendChild(line);
        }

        // 2. The actual flex items.
        for (const item of level.items) {
            const planet = document.createElement('div');
            planet.classList.add(...Level.getItemClasses(item));
            board.appendChild(planet);
        }

        this.fitBoard();
    }

    /**
     * Build the fake style.css pane: a read-only selector line, one <select> per property the
     * player may change, plus read-only lines for properties the level pins down.
     *
     * @param {Level} level The level to draw controls for.
     * @returns {void}
     * @example game.renderControls(game.getCurrentLevel());
     */
    renderControls(level) {
        const host = this.elements.controls;
        host.innerHTML = '';
        this.selectRows = {};   // property -> the row element, so check() can flag wrong ones

        host.appendChild(this.createCssLine(`${level.selector} {`, 'selector'));

        // Read-only declarations (for example a permanent `display: flex;`).
        for (const decl of level.getFixedDeclarations()) {
            const line = document.createElement('div');
            line.className = 'css-line css-line--static';
            line.innerHTML =
                `<span class="css-prop">${decl.property}</span>: ` +
                `<span class="css-value">${decl.value}</span>;`;
            host.appendChild(line);
        }

        // Editable declarations.
        for (const prop of level.controls) {
            const row = document.createElement('div');
            row.className = 'control-row';

            const name = document.createElement('span');
            name.className = 'css-prop';
            name.textContent = prop;

            const select = document.createElement('select');
            select.className = 'control-select';
            select.id = `control-${prop}`;
            select.setAttribute('aria-label', prop);
            for (const option of Level.PROPERTIES[prop]) {
                const opt = document.createElement('option');
                opt.value = option;
                opt.textContent = option;
                if (option === this.values[prop]) opt.selected = true;
                select.appendChild(opt);
            }
            // Every change is applied to the board immediately — that is the "live" part
            // of the game; "Check" only decides whether it is the RIGHT arrangement.
            select.addEventListener('change', () => this.onControlChange(prop, select.value));

            row.append(name, document.createTextNode(': '), select, document.createTextNode(';'));
            host.appendChild(row);
            this.selectRows[prop] = row;
        }

        host.appendChild(this.createCssLine('}', 'selector'));
    }

    /**
     * Small helper: one non-interactive line of "code" in the editor pane.
     *
     * @param {string} text      The text to show, e.g. '.orbit {'.
     * @param {string} [variant] Extra modifier appended to the class name.
     * @returns {HTMLDivElement} The ready-to-append element.
     * @example host.appendChild(game.createCssLine('}', 'selector'));
     */
    createCssLine(text, variant) {
        const line = document.createElement('div');
        line.className = 'css-line' + (variant ? ` css-line--${variant}` : '');
        line.textContent = text;
        return line;
    }

    /**
     * Push the player's current choices onto the board and animate the planets from where
     * they were to where Flexbox has just put them.
     *
     * WHY THIS IS NOT JUST A CSS TRANSITION: a planet moves because its *parent's* Flexbox
     * rules changed, not because one of its own animatable properties changed — `left`,
     * `top`, `margin`... never move, so the browser has nothing to transition and the
     * planets would simply teleport. The trick below is the standard "FLIP" technique:
     *
     *   First   - measure every planet before the change.
     *   Last    - apply the new Flexbox rules and measure again.
     *   Invert  - instantly translate each planet back to its old spot (transition off),
     *             so it *looks* like nothing happened yet.
     *   Play    - drop the translation; now a normal CSS transition on `transform` carries
     *             each planet smoothly to its real position.
     *
     * @param {Object}  [options]
     * @param {boolean} [options.animate=true] Pass false to snap instantly — used when a new
     *                  level is drawn, where there is no previous position to slide from.
     * @returns {void}
     *
     * @example
     * game.values['justify-content'] = 'center';
     * game.applyStyles();                    // the planets glide to the middle
     * game.applyStyles({ animate: false });  // ...or jump there immediately
     */
    applyStyles(options = {}) {
        const animate = options.animate !== false;
        // Only the planets are flex items; the rocket markers are absolutely positioned.
        const planets = Array.from(this.elements.board.querySelectorAll('.planet'));

        if (!animate || planets.length === 0 || this.prefersReducedMotion()) {
            this.writeStyles();
            return;
        }

        // --- FIRST: where is every planet right now? ---------------------------
        const first = planets.map(planet => planet.getBoundingClientRect());

        // --- LAST: apply the new rules and let Flexbox decide the new positions -
        this.writeStyles();
        const last = planets.map(planet => planet.getBoundingClientRect());

        // --- INVERT: translate each planet back to its old position ------------
        // getBoundingClientRect() returns *screen* pixels, but the board is visually
        // scaled (see fitBoard), and a transform on a planet lives inside that scaled
        // coordinate system — so the measured distance has to be divided by the scale.
        const scale = this.boardScale || 1;
        let anythingMoved = false;

        planets.forEach((planet, i) => {
            const dx = (first[i].left - last[i].left) / scale;
            const dy = (first[i].top  - last[i].top)  / scale;
            if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;   // it did not really move

            anythingMoved = true;
            planet.style.transition = 'none';                       // move it back invisibly
            planet.style.transform  = `translate(${dx}px, ${dy}px)`;
        });

        if (!anythingMoved) return;

        // Reading a layout property forces the browser to commit the inverted positions
        // now, instead of batching them together with the next step (which would cancel
        // the whole effect out).
        void this.elements.board.offsetWidth;

        // --- PLAY: clear the translation and let the CSS transition do the work -
        requestAnimationFrame(() => {
            for (const planet of planets) {
                planet.style.transition = '';   // back to the transition defined in style.css
                planet.style.transform  = '';
            }
        });
    }

    /**
     * Write the full set of Flexbox declarations onto the board element. This is the single
     * place in the game where CSS is written from JavaScript.
     *
     * @returns {void}
     * @example game.writeStyles();   // usually called for you by applyStyles()
     */
    writeStyles() {
        const styles = this.getCurrentLevel().getStyles(this.values);
        for (const [prop, value] of Object.entries(styles)) {
            this.elements.board.style.setProperty(prop, value);
        }
    }

    /**
     * Has the player asked their operating system for less motion? If so we skip the
     * sliding animation (accessibility — the game must stay fully playable).
     *
     * @returns {boolean} true when animations should be suppressed.
     * @example if (!game.prefersReducedMotion()) game.playAnimation('orbit--success');
     */
    prefersReducedMotion() {
        return typeof window.matchMedia === 'function' &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Refresh the score / attempts read-outs.
     *
     * @returns {void}
     * @example game.updateStatus();
     */
    updateStatus() {
        this.elements.score.textContent = `${this.score} pts`;
        this.elements.attempts.textContent = this.attempts === 0
            ? 'No mistakes yet'
            : `${this.attempts} wrong ${this.attempts === 1 ? 'try' : 'tries'}`;
    }

    /**
     * Show a message under the controls.
     *
     * @param {string} message Text to display ('' clears it).
     * @param {'success'|'error'|'idle'} [type='idle'] Controls the colour and the animation.
     * @returns {void}
     * @example game.setFeedback('Not quite — look at the main axis.', 'error');
     */
    setFeedback(message, type = 'idle') {
        const el = this.elements.feedback;
        el.textContent = message;
        el.className = `feedback feedback--${type}` + (message ? ' feedback--visible' : '');
    }

    /* =========================================================================
     * Player actions
     * ====================================================================== */

    /**
     * Handle one <select> change: store it, re-draw the board, clear stale feedback.
     *
     * @param {string} property The CSS property that changed, e.g. 'align-items'.
     * @param {string} value    The newly chosen value, e.g. 'center'.
     * @returns {void}
     * @example game.onControlChange('flex-direction', 'column');
     */
    onControlChange(property, value) {
        this.values[property] = value;
        this.applyStyles();

        // Drop the red outlines and the old message as soon as the player experiments again.
        if (this.selectRows[property]) this.selectRows[property].classList.remove('control-row--wrong');
        if (!this.solved) this.setFeedback('', 'idle');
    }

    /**
     * Check the current arrangement against the level's solution and react:
     * success -> message, animation, score, unlock the next level.
     * failure -> message, shake, outline the properties that are still wrong.
     *
     * @returns {boolean} true if the level is solved.
     * @example
     * if (game.check()) console.log('solved!');
     */
    check() {
        const level  = this.getCurrentLevel();
        const result = level.check(this.values);

        // Clear previous highlighting.
        for (const row of Object.values(this.selectRows)) row.classList.remove('control-row--wrong');

        if (!result.solved) {
            this.attempts++;
            for (const prop of result.wrong) {
                this.selectRows[prop].classList.add('control-row--wrong');
            }
            const near = result.correct.length > 0 && result.wrong.length === 1;
            this.setFeedback(
                (near ? 'So close! One property is still off. ' : 'Not there yet. ') +
                (level.hint || 'Compare the planets with the rocket markers and try again.'),
                'error'
            );
            this.playAnimation('orbit--error');
            this.updateStatus();
            return false;
        }

        // ---- solved ----------------------------------------------------------
        const firstTime = !this.completed.has(level.id);
        this.solved = true;
        this.completed.add(level.id);

        if (firstTime) {
            // Fewer mistakes -> more points, but never less than minPoints.
            const earned = Math.max(
                this.minPoints,
                this.pointsPerLevel - this.attempts * this.penaltyPerMistake
            );
            this.score += earned;
            this.setFeedback(`Perfect orbit! +${earned} points.`, 'success');
        } else {
            this.setFeedback('Solved again — nice.', 'success');
        }

        this.playAnimation('orbit--success');
        this.elements.nextBtn.hidden = false;
        this.elements.nextBtn.textContent = this.isLastLevel() ? 'Finish ★' : 'Next level →';
        this.elements.nextBtn.focus();
        this.renderLevelNav();      // repaint the chip as "done" and unlock the next one
        this.updateStatus();
        this.saveProgress();
        return true;
    }

    /**
     * Put the current level back to its default values (board and controls).
     * Progress and score are untouched.
     *
     * @returns {void}
     * @example game.resetLevel();
     */
    resetLevel() {
        const level = this.getCurrentLevel();
        this.values = level.getDefaultValues();

        // Push the defaults back into the <select> elements.
        for (const [prop, value] of Object.entries(this.values)) {
            const select = document.getElementById(`control-${prop}`);
            if (select) select.value = value;
            this.selectRows[prop].classList.remove('control-row--wrong');
        }

        this.applyStyles();
        this.setFeedback('Level reset to its starting values.', 'idle');
    }

    /**
     * What the "Next level" / "Finish" button does.
     *
     * @returns {void}
     * @example game.handleNext();
     */
    handleNext() {
        if (this.isLastLevel()) {
            this.showVictory();
        } else {
            this.goTo(this.currentIndex + 1);
        }
    }

    /**
     * Jump to a level by index, if it is unlocked.
     *
     * @param {number} index 0-based position in the levels array.
     * @returns {boolean} true if the jump happened.
     * @example
     * game.goTo(0);   // back to the first level
     */
    goTo(index) {
        if (index < 0 || index >= this.levels.length) return false;
        if (!this.isUnlocked(index)) return false;

        this.currentIndex = index;
        this.render();
        this.saveProgress();
        return true;
    }

    /**
     * End-of-game screen: all levels are done.
     *
     * @returns {void}
     * @example game.showVictory();
     */
    showVictory() {
        this.setFeedback(
            `Mission complete! You finished all ${this.levels.length} levels with ${this.score} points.`,
            'success'
        );
        this.elements.nextBtn.textContent = 'Play again';
        // From now on the button restarts the game instead of advancing.
        this.elements.nextBtn.onclick = () => this.restart();
    }

    /**
     * Wipe all progress and start over from level 1.
     *
     * @returns {void}
     * @example game.restart();
     */
    restart() {
        this.completed.clear();
        this.score = 0;
        this.currentIndex = 0;
        this.elements.nextBtn.onclick = null;
        this.elements.nextBtn.textContent = 'Next level →';
        this.clearProgress();
        this.render();
    }

    /* =========================================================================
     * Small utilities
     * ====================================================================== */

    /**
     * @returns {Level} The level currently on screen.
     * @example game.getCurrentLevel().title;   // 'Docking Bay'
     */
    getCurrentLevel() {
        return this.levels[this.currentIndex];
    }

    /**
     * @returns {boolean} true when the current level is the last one.
     * @example if (game.isLastLevel()) console.log('final challenge');
     */
    isLastLevel() {
        return this.currentIndex === this.levels.length - 1;
    }

    /**
     * A level is playable if it is the first one or the level before it is solved.
     *
     * @param {number} index 0-based position in the levels array.
     * @returns {boolean} true when the player may open it.
     * @example game.isUnlocked(3);
     */
    isUnlocked(index) {
        if (index === 0) return true;
        return this.completed.has(this.levels[index - 1].id);
    }

    /**
     * Replay a CSS animation class on the board (removing it first so it can retrigger).
     *
     * @param {string} className 'orbit--success' or 'orbit--error'.
     * @returns {void}
     * @example game.playAnimation('orbit--error');
     */
    playAnimation(className) {
        if (this.prefersReducedMotion()) return;
        const board = this.elements.board;
        board.classList.remove('orbit--success', 'orbit--error');
        void board.offsetWidth;                       // force reflow -> restart the animation
        board.classList.add(className);
        setTimeout(() => board.classList.remove(className), 900);
    }

    /**
     * Scale the board so it always fits the available space WITHOUT changing its layout size.
     * The element stays exactly 800x500 CSS pixels for layout purposes (so every level has the
     * same solution on a phone and on a desktop); only `transform: scale()` changes.
     *
     * @returns {void}
     * @example window.addEventListener('resize', () => game.fitBoard());
     */
    fitBoard() {
        const view    = this.elements.viewport;
        const styles  = window.getComputedStyle(view);
        const availW  = view.clientWidth  - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
        const availH  = view.clientHeight - parseFloat(styles.paddingTop)  - parseFloat(styles.paddingBottom);

        const scale = Math.min(1, availW / Game.BOARD_WIDTH, availH / Game.BOARD_HEIGHT);
        const safe  = Math.max(scale, 0.25);          // never shrink into invisibility

        this.boardScale = safe;                       // needed by the FLIP maths in applyStyles()
        this.elements.board.style.setProperty('--board-scale', safe);
        // The stage is the placeholder that occupies the *scaled* size in the page flow.
        this.elements.stage.style.width  = `${Game.BOARD_WIDTH  * safe}px`;
        this.elements.stage.style.height = `${Game.BOARD_HEIGHT * safe}px`;
    }

    /* =========================================================================
     * Progress persistence (bonus requirement: "save the player's progress")
     * ====================================================================== */

    /**
     * Write the current progress to localStorage.
     *
     * @returns {void}
     * @example game.saveProgress();
     */
    saveProgress() {
        if (!this.storageKey) return;
        try {
            localStorage.setItem(this.storageKey, JSON.stringify({
                currentId: this.getCurrentLevel().id,
                completed: Array.from(this.completed),
                score: this.score
            }));
        } catch (e) {
            // Private-browsing mode or a full quota: the game still works, it just forgets.
            console.warn('Could not save progress:', e);
        }
    }

    /**
     * Restore progress written by saveProgress(). Unknown level ids (levels that were renamed
     * or removed) are ignored, so old saves can never break the game.
     *
     * @returns {boolean} true if something was restored.
     * @example game.loadProgress();
     */
    loadProgress() {
        if (!this.storageKey) return false;
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return false;

            const data = JSON.parse(raw);
            const knownIds = new Set(this.levels.map(l => l.id));
            this.completed = new Set((data.completed || []).filter(id => knownIds.has(id)));
            this.score = Number(data.score) || 0;

            const index = this.levels.findIndex(l => l.id === data.currentId);
            this.currentIndex = (index >= 0 && this.isUnlocked(index)) ? index : 0;
            return true;
        } catch (e) {
            console.warn('Could not read saved progress:', e);
            return false;
        }
    }

    /**
     * Forget the saved progress.
     *
     * @returns {void}
     * @example game.clearProgress();
     */
    clearProgress() {
        if (!this.storageKey) return;
        try {
            localStorage.removeItem(this.storageKey);
        } catch (e) {
            console.warn('Could not clear saved progress:', e);
        }
    }
}

/* The board's fixed layout size, in CSS pixels. Must match `.orbit` in style.css. */
Game.BOARD_WIDTH  = 800;
Game.BOARD_HEIGHT = 500;
