/* =============================================================================
 * Level.js — a single, self-contained level of the FlexOrbit game.
 * -----------------------------------------------------------------------------
 * A Level is pure DATA + RULES. It knows:
 *   - which planets (items) to show on the board,
 *   - which Flexbox properties the player is allowed to change,
 *   - what the starting (default) value of every property is,
 *   - which combination of values counts as the correct solution.
 *
 * A Level NEVER touches the DOM. Rendering and event handling are the Game
 * class' job (see js/Game.js). Keeping it that way means you can add, remove or
 * unit-test levels without ever opening index.html.
 * ========================================================================== */

class Level {

    /**
     * Build a new level.
     *
     * @param {Object}   config                 Level definition.
     * @param {string}   config.id              Unique, stable id (used to save progress in
     *                                          localStorage — never reuse an id).
     * @param {string}   config.title           Short name shown above the instruction.
     * @param {string}   [config.difficulty]    'easy' | 'medium' | 'hard'. Default 'easy'.
     *                                          Only drives the colour of the badge.
     * @param {string}   config.instruction     The task text. May contain simple HTML such as
     *                                          <code>justify-content</code> — it is injected with
     *                                          innerHTML, so only put YOUR OWN text here.
     * @param {Array<{size:string,color:string}>} config.items
     *                                          The planets placed inside the flex container.
     *                                          size  : 'sm' | 'md' | 'lg'
     *                                          color : 'teal' | 'amber' | 'indigo' | 'rose'
     * @param {string[]} config.controls        CSS properties the player may change, in the order
     *                                          they should appear in the editor pane. Every entry
     *                                          must be a key of Level.PROPERTIES.
     * @param {Object<string,string>} config.solution
     *                                          The winning value for EVERY property listed in
     *                                          `controls`. Checked with ===.
     * @param {Object<string,string>} [config.defaults]
     *                                          Starting values. Any property (controlled or not)
     *                                          may be listed here; anything omitted falls back to
     *                                          Level.BASE_STYLES. This is also what the "Reset"
     *                                          button restores.
     * @param {Array<{orientation:string,side:string,offset?:string}>} [config.markers]
     *                                          Decorative rocket lines that hint where the planets
     *                                          should end up.
     *                                          orientation : 'vertical' | 'horizontal'
     *                                          side        : 'left'|'right' for vertical,
     *                                                        'top'|'bottom' for horizontal
     *                                          offset      : optional CSS length/percentage that
     *                                                        overrides the position defined in
     *                                                        style.css, e.g. '28%' or '0'.
     * @param {string}   [config.hint]          Optional extra sentence shown after a wrong answer.
     *
     * @throws {Error} If the config is inconsistent (unknown property, illegal value, missing
     *                 solution entry...). Failing loudly here means a broken level is caught the
     *                 moment the page loads instead of halfway through the game.
     *
     * @example
     * const level = new Level({
     *     id: 'my-level',
     *     title: 'Bottom Row',
     *     difficulty: 'medium',
     *     instruction: 'Push every planet to the <code>bottom</code> of the board.',
     *     items: [{ size: 'md', color: 'teal' }, { size: 'lg', color: 'rose' }],
     *     controls: ['align-items'],
     *     defaults: { 'align-items': 'flex-start' },
     *     solution: { 'align-items': 'flex-end' },
     *     markers: [{ orientation: 'horizontal', side: 'bottom', offset: '0' }]
     * });
     */
    constructor(config) {
        // ---- 1. Required fields -------------------------------------------------
        if (!config || typeof config !== 'object') {
            throw new Error('Level: a configuration object is required.');
        }
        const required = ['id', 'title', 'instruction', 'items', 'controls', 'solution'];
        for (const key of required) {
            if (config[key] === undefined) {
                throw new Error(`Level "${config.id || '?'}": missing required field "${key}".`);
            }
        }

        this.id          = config.id;
        this.title       = config.title;
        this.difficulty  = config.difficulty || 'easy';
        this.instruction = config.instruction;
        this.items       = config.items;
        this.controls    = config.controls;
        this.solution    = config.solution;
        this.defaults    = config.defaults || {};
        this.markers     = config.markers  || [];
        this.hint        = config.hint     || '';
        // The selector printed in the fake style.css pane. Purely cosmetic.
        this.selector    = config.selector || '.orbit';

        // ---- 2. Sanity checks ---------------------------------------------------
        // Every controlled property must be a Flexbox property we know about, must have a
        // solution, and every value used must be one the <select> will actually offer —
        // otherwise the level could be unsolvable.
        for (const prop of this.controls) {
            if (!Level.PROPERTIES[prop]) {
                throw new Error(`Level "${this.id}": unknown property "${prop}" in controls.`);
            }
            if (this.solution[prop] === undefined) {
                throw new Error(`Level "${this.id}": no solution given for "${prop}".`);
            }
            if (!Level.isValidValue(prop, this.solution[prop])) {
                throw new Error(
                    `Level "${this.id}": "${this.solution[prop]}" is not a legal value for "${prop}".`
                );
            }
        }
        for (const [prop, value] of Object.entries(this.defaults)) {
            if (!Level.isValidValue(prop, value)) {
                throw new Error(
                    `Level "${this.id}": default "${value}" is not a legal value for "${prop}".`
                );
            }
        }
        // A level whose default values already equal the solution would be won before the
        // player touched anything — almost always a copy/paste mistake.
        if (this.controls.length > 0 && this.check(this.getDefaultValues()).solved) {
            throw new Error(`Level "${this.id}": the default values already solve the level.`);
        }
    }

    /**
     * The value every control starts with (and returns to when "Reset" is pressed).
     *
     * @returns {Object<string,string>} Map of controlled property -> starting value.
     *
     * @example
     * level.getDefaultValues();   // { 'display': 'block', 'justify-content': 'flex-start' }
     */
    getDefaultValues() {
        const values = {};
        for (const prop of this.controls) {
            // A property the author did not give a default for starts at its CSS initial value.
            values[prop] = this.defaults[prop] !== undefined
                ? this.defaults[prop]
                : Level.BASE_STYLES[prop];
        }
        return values;
    }

    /**
     * Turn the player's current choices into the COMPLETE set of Flexbox declarations that
     * should sit on the board element.
     *
     * We always return every known property (not just the controlled ones) so the board can
     * never keep a leftover value from a previous level — the result fully describes the board.
     *
     * @param {Object<string,string>} values Current value of each controlled property.
     * @returns {Object<string,string>} Every Flexbox property -> value to apply.
     *
     * @example
     * level.getStyles({ 'justify-content': 'center' });
     * // { display:'flex', 'flex-direction':'row', 'flex-wrap':'nowrap',
     * //   'justify-content':'center', 'align-items':'flex-start' }
     */
    getStyles(values) {
        const styles = {};
        for (const prop of Object.keys(Level.PROPERTIES)) {
            if (this.controls.includes(prop) && values[prop] !== undefined) {
                styles[prop] = values[prop];          // 1st: what the player picked
            } else if (this.defaults[prop] !== undefined) {
                styles[prop] = this.defaults[prop];   // 2nd: what the level author fixed
            } else {
                styles[prop] = Level.BASE_STYLES[prop]; // 3rd: the CSS initial value
            }
        }
        return styles;
    }

    /**
     * Properties that are fixed for this level (the player cannot change them) but still differ
     * from the plain CSS default — the Game prints them as read-only lines in the editor pane so
     * the player can see the full rule, e.g. a permanent `display: flex;`.
     *
     * @returns {Array<{property:string,value:string}>} Read-only declarations, in registry order.
     *
     * @example
     * level.getFixedDeclarations();  // [ { property: 'display', value: 'flex' } ]
     */
    getFixedDeclarations() {
        const fixed = [];
        for (const prop of Object.keys(Level.PROPERTIES)) {
            if (this.controls.includes(prop)) continue;            // player-editable, skip
            const value = this.defaults[prop] !== undefined
                ? this.defaults[prop]
                : Level.BASE_STYLES[prop];
            if (value !== Level.INITIAL_VALUES[prop]) {            // only show what is interesting
                fixed.push({ property: prop, value });
            }
        }
        return fixed;
    }

    /**
     * Compare the player's choices against the solution.
     *
     * @param {Object<string,string>} values Current value of each controlled property.
     * @returns {{solved:boolean, wrong:string[], correct:string[]}}
     *          solved  - true only when EVERY controlled property matches.
     *          wrong   - names of the properties that are still not right (used to outline the
     *                    offending <select> in red).
     *          correct - names of the properties that already match.
     *
     * @example
     * level.check({ 'display': 'flex', 'justify-content': 'flex-end' });
     * // { solved: false, wrong: ['justify-content'], correct: ['display'] }
     */
    check(values) {
        const wrong = [];
        const correct = [];
        for (const prop of this.controls) {
            if (values[prop] === this.solution[prop]) {
                correct.push(prop);
            } else {
                wrong.push(prop);
            }
        }
        return { solved: wrong.length === 0, wrong, correct };
    }

    /**
     * Pretty-print the rule the player has built, e.g. for a "show me the CSS" panel or for
     * debugging in the console.
     *
     * @param {Object<string,string>} values Current value of each controlled property.
     * @returns {string} A formatted CSS rule.
     *
     * @example
     * console.log(level.toCssText(level.getDefaultValues()));
     * // .orbit {
     * //   display: flex;
     * //   justify-content: flex-start;
     * // }
     */
    toCssText(values) {
        const styles = this.getStyles(values);
        const lines = Object.entries(styles)
            // Hide declarations that are just the CSS initial value — they add noise.
            .filter(([prop, value]) => value !== Level.INITIAL_VALUES[prop] || this.controls.includes(prop))
            .map(([prop, value]) => `  ${prop}: ${value};`);
        return `${this.selector} {\n${lines.join('\n')}\n}`;
    }

    /**
     * The CSS classes that render one planet.
     *
     * @param {{size:string,color:string}} item One entry of `config.items`.
     * @returns {string[]} Class names for the planet element.
     *
     * @example
     * Level.getItemClasses({ size: 'lg', color: 'amber' });
     * // ['planet', 'planet--lg', 'planet--amber']
     */
    static getItemClasses(item) {
        return ['planet', `planet--${item.size}`, `planet--${item.color}`];
    }

    /**
     * Is `value` an option the game will offer for `property`?
     *
     * @param {string} property A CSS property name, e.g. 'align-items'.
     * @param {string} value    The value to test, e.g. 'center'.
     * @returns {boolean} true when the pair is known to the game.
     *
     * @example
     * Level.isValidValue('flex-wrap', 'wrap');     // true
     * Level.isValidValue('flex-wrap', 'centre');   // false
     */
    static isValidValue(property, value) {
        const options = Level.PROPERTIES[property];
        return Array.isArray(options) && options.includes(value);
    }
}

/* -----------------------------------------------------------------------------
 * The registry of every property the game can teach, together with the values a
 * <select> will offer for it. Add a property here and it immediately becomes
 * usable in a level's `controls` array — nothing else has to change.
 * The key order is also the order the declarations are printed in.
 * -------------------------------------------------------------------------- */
/* TODO (optional, only if you want harder levels): every property here applies to the
 * CONTAINER. Per-ITEM properties (`order`, `align-self`, `flex-grow`) would need the
 * controls to target a single planet instead of the board — a bigger change to Game.js.
 *
 * GOTCHA: do not use `align-items: stretch` as a solution. Our planets have a fixed
 * width/height, so stretching does nothing visible and the level would be unsolvable in
 * practice. It is kept in the list only as a plausible wrong answer. */
Level.PROPERTIES = {
    'display':         ['block', 'flex', 'inline-flex'],
    'flex-direction':  ['row', 'row-reverse', 'column', 'column-reverse'],
    'flex-wrap':       ['nowrap', 'wrap', 'wrap-reverse'],
    'justify-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
    'align-items':     ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'],
    'align-content':   ['stretch', 'flex-start', 'flex-end', 'center', 'space-between', 'space-around']
};

/* The real CSS initial value of each property — used to decide which declarations are
 * "interesting" enough to print in the editor pane. */
Level.INITIAL_VALUES = {
    'display':         'block',
    'flex-direction':  'row',
    'flex-wrap':       'nowrap',
    'justify-content': 'flex-start',
    'align-items':     'stretch',
    'align-content':   'stretch'
};

/* What the board looks like before a level customises anything. `display: flex` is the
 * game's baseline (the board is a Flex Container by definition) and align-items is pinned to
 * flex-start so that our fixed-size planets sit predictably at the top. */
Level.BASE_STYLES = {
    'display':         'flex',
    'flex-direction':  'row',
    'flex-wrap':       'nowrap',
    'justify-content': 'flex-start',
    'align-items':     'flex-start',
    'align-content':   'stretch'
};
