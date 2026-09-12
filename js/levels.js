/* =============================================================================
 * levels.js — the content of the game.
 * -----------------------------------------------------------------------------
 * This is the ONLY file you need to touch to add, remove or re-order levels.
 * Each entry is a `new Level({...})`; see js/Level.js for the full documentation
 * of every option.
 *
 * The 6 levels ramp up gradually and, between them, combine every Flexbox
 * property the assignment requires (`display`, `flex-direction`, `flex-wrap`,
 * `justify-content`, `align-items`, `align-content`) without ever repeating the
 * same value pair:
 *
 *   1. Docking Bay        (easy)        display + justify-content
 *   2. Satellite Row      (easy)        justify-content only (space-between)
 *   3. Reverse Thrusters  (medium)      flex-direction only (row-reverse)
 *   4. Launch Column      (medium)      flex-direction + justify-content + align-items
 *   5. Asteroid Belt      (medium-hard) flex-wrap + justify-content + align-content
 *   6. Reentry Formation  (hard)        flex-direction + justify-content + align-items
 *
 * Levels 1, 4, 5 and 6 all require more than one property to solve.
 * ========================================================================== */

const LEVELS = [

    /* -------------------------------------------------------------------------
     * LEVEL 1 — display + justify-content
     * The board starts as `display: block`, so the planets are stacked on top of
     * each other and ignore every Flexbox property: the player first has to turn
     * the container into a flex container, then centre the row.
     * ---------------------------------------------------------------------- */
    new Level({
        id: 'docking-bay',
        title: 'Docking Bay',
        difficulty: 'easy',

        instruction:
            'The fleet is piled up in the corner because the bay is not a flex container yet. ' +
            'Switch <code>display</code> to <code>flex</code> so the planets line up in a row, ' +
            'then move the whole row into the docking corridor marked by the rockets — the ' +
            '<strong>centre of the main axis</strong>.',

        hint: 'One property turns the box into a flex container, the other moves items along the main axis.',

        items: [
            { size: 'sm', color: 'teal'   },
            { size: 'lg', color: 'amber'  },
            { size: 'md', color: 'indigo' },
            { size: 'sm', color: 'rose'   },
            { size: 'md', color: 'teal'   }
        ],

        controls: ['display', 'justify-content'],
        defaults: { 'display': 'block', 'justify-content': 'flex-start' },
        solution: { 'display': 'flex',  'justify-content': 'center'     },

        // Two vertical rocket lines framing the middle of the board.
        markers: [
            { orientation: 'vertical', side: 'left',  offset: '28%' },
            { orientation: 'vertical', side: 'right', offset: '28%' }
        ]
    }),

    /* -------------------------------------------------------------------------
     * LEVEL 2 — justify-content only
     * A single-property level, but a value the game has not used yet:
     * space-between (as opposed to level 1's center).
     * ---------------------------------------------------------------------- */
    new Level({
        id: 'satellite-row',
        title: 'Satellite Row',
        difficulty: 'easy',

        instruction:
            'Mission control wants the relay satellites spread out with ' +
            '<strong>equal gaps between each one</strong> — but the two end satellites must stay ' +
            'docked against the bay walls, with no gap at the edges. Adjust ' +
            '<code>justify-content</code> to divide the empty space evenly between the satellites.',

        hint: 'Only one property to change here — think about how left-over space can be split ' +
              'BETWEEN the items instead of around them.',

        items: [
            { size: 'md', color: 'teal'   },
            { size: 'sm', color: 'amber'  },
            { size: 'lg', color: 'indigo' },
            { size: 'sm', color: 'rose'   },
            { size: 'md', color: 'teal'   }
        ],

        controls: ['justify-content'],
        defaults: { 'justify-content': 'flex-start' },
        solution: { 'justify-content': 'space-between' },

        // The docking walls: right at the board's edges.
        markers: [
            { orientation: 'vertical', side: 'left',  offset: '0' },
            { orientation: 'vertical', side: 'right', offset: '0' }
        ]
    }),

    /* -------------------------------------------------------------------------
     * LEVEL 3 — flex-direction only
     * Another single-property level: row-reverse mirrors the row. Solvable by
     * eye because every planet is a different size/colour, so the reversed
     * order is clearly visible without needing rocket markers.
     * ---------------------------------------------------------------------- */
    new Level({
        id: 'reverse-thrusters',
        title: 'Reverse Thrusters',
        difficulty: 'medium',

        instruction:
            'For re-entry the fleet has to fly in <strong>reverse formation</strong>: the small teal ' +
            'scout, currently leading on the left, must end up at the back on the right — with the ' +
            'whole line-up mirrored. Nothing else about the row should change.',

        hint: 'The items are still in a row; only the direction they are read in needs to flip.',

        items: [
            { size: 'sm', color: 'teal'   },
            { size: 'md', color: 'amber'  },
            { size: 'lg', color: 'indigo' },
            { size: 'md', color: 'rose'   }
        ],

        controls: ['flex-direction'],
        defaults: { 'flex-direction': 'row' },
        solution: { 'flex-direction': 'row-reverse' }
    }),

    /* -------------------------------------------------------------------------
     * LEVEL 4 — flex-direction + justify-content + align-items
     * A three-property level: the axes swap, so `justify-content` now works
     * vertically and `align-items` horizontally.
     * ---------------------------------------------------------------------- */
    new Level({
        id: 'launch-column',
        title: 'Launch Column',
        difficulty: 'medium',

        instruction:
            'Countdown! The fleet has to queue up for launch: stack the planets ' +
            '<strong>from top to bottom</strong>, send the queue down to the <strong>launch pad ' +
            'at the bottom</strong> of the bay, and line it up with the <strong>central corridor</strong>. ' +
            'Careful — once the direction changes, <code>justify-content</code> and ' +
            '<code>align-items</code> swap axes.',

        hint: 'In a column, the main axis points down and the cross axis points sideways.',

        items: [
            { size: 'md', color: 'rose'   },
            { size: 'sm', color: 'teal'   },
            { size: 'lg', color: 'indigo' },
            { size: 'md', color: 'amber'  }
        ],

        controls: ['flex-direction', 'justify-content', 'align-items'],
        defaults: {
            'flex-direction':  'row',
            'justify-content': 'flex-start',
            'align-items':     'flex-start'
        },
        solution: {
            'flex-direction':  'column',
            'justify-content': 'flex-end',
            'align-items':     'center'
        },

        // A floor of rockets under the launch pad + the central corridor.
        markers: [
            { orientation: 'horizontal', side: 'bottom', offset: '0'   },
            { orientation: 'vertical',   side: 'left',   offset: '40%' },
            { orientation: 'vertical',   side: 'right',  offset: '40%' }
        ]
    }),

    /* -------------------------------------------------------------------------
     * LEVEL 5 — flex-wrap + justify-content + align-content
     * Ten large planets cannot fit on a single 800px-wide row, so they only
     * arrange themselves properly once the player allows them to wrap. Once
     * there are two lines, align-content becomes meaningful too: it decides
     * how the lines themselves (not the planets within a line) are spaced
     * along the cross axis.
     * ---------------------------------------------------------------------- */
    new Level({
        id: 'asteroid-belt',
        title: 'Asteroid Belt',
        difficulty: 'hard',

        instruction:
            'Too many asteroids for one lane! Let the belt <strong>wrap onto multiple lines</strong>, ' +
            'spread each line\'s asteroids evenly from edge to edge, and <strong>centre the whole ' +
            'stack of lines</strong> vertically between the corridor markers.',

        hint: 'Nothing can wrap while flex-wrap is nowrap — and align-content only does anything ' +
              'once there is more than one line.',

        items: [
            { size: 'lg', color: 'teal'   }, { size: 'lg', color: 'amber'  },
            { size: 'lg', color: 'indigo' }, { size: 'lg', color: 'rose'   },
            { size: 'lg', color: 'teal'   }, { size: 'lg', color: 'amber'  },
            { size: 'lg', color: 'indigo' }, { size: 'lg', color: 'rose'   },
            { size: 'lg', color: 'teal'   }, { size: 'lg', color: 'amber'  }
        ],

        controls: ['flex-wrap', 'justify-content', 'align-content'],
        defaults: {
            'flex-wrap':       'nowrap',
            'justify-content': 'flex-start',
            'align-content':   'flex-start'
        },
        solution: {
            'flex-wrap':       'wrap',
            'justify-content': 'space-between',
            'align-content':   'center'
        },

        // A top and bottom corridor line — the wrapped lines should centre between them.
        markers: [
            { orientation: 'horizontal', side: 'top',    offset: '12%' },
            { orientation: 'horizontal', side: 'bottom', offset: '12%' }
        ]
    }),

    /* -------------------------------------------------------------------------
     * LEVEL 6 — flex-direction + justify-content + align-items
     * The final challenge: a different three-property combination than level 4
     * (column-reverse instead of column, space-around instead of flex-end,
     * flex-end instead of center), so it cannot be solved by pattern-matching
     * the earlier column level.
     * ---------------------------------------------------------------------- */
    new Level({
        id: 'reentry-formation',
        title: 'Reentry Formation',
        difficulty: 'hard',

        instruction:
            'Final approach: the capsules must stack <strong>bottom-to-top in reverse launch ' +
            'order</strong>, spaced <strong>evenly with room on every side</strong>, and hug the ' +
            '<strong>right edge</strong> of the module.',

        hint: 'Column-reverse changes which end of the stack fills first; align-items now controls ' +
              'left/right, not up/down.',

        items: [
            { size: 'md', color: 'indigo' },
            { size: 'sm', color: 'rose'   },
            { size: 'lg', color: 'teal'   },
            { size: 'md', color: 'amber'  },
            { size: 'sm', color: 'indigo' }
        ],

        controls: ['flex-direction', 'justify-content', 'align-items'],
        defaults: {
            'flex-direction':  'row',
            'justify-content': 'flex-start',
            'align-items':     'flex-start'
        },
        solution: {
            'flex-direction':  'column-reverse',
            'justify-content': 'space-around',
            'align-items':     'flex-end'
        },

        // The right-hand wall the capsules should hug.
        markers: [
            { orientation: 'vertical', side: 'right', offset: '12%' }
        ]
    })
];
