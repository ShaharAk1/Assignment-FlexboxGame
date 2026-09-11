/* =============================================================================
 * levels.js — the content of the game.
 * -----------------------------------------------------------------------------
 * This is the ONLY file you need to touch to add, remove or re-order levels.
 * Each entry is a `new Level({...})`; see js/Level.js for the full documentation
 * of every option, and the TEMPLATE at the bottom of this file for a copy/paste
 * starting point.
 *
 * Two worked examples are provided:
 *   1. an easy one that combines `display` + `justify-content`
 *   2. a medium one that combines three properties at once
 *
 * -----------------------------------------------------------------------------
 * TODO — what is still missing for the assignment (status: 2 of 6 levels done):
 *
 *   TODO: Write 4 more levels so the game has at least 6 in total.
 *   TODO: At least ONE level must use `flex-wrap`. None does yet — the TEMPLATE
 *         at the bottom of this file is already written as that level; uncomment
 *         it, tune the wording and it counts.
 *   TODO: At least THREE levels must need MORE THAN ONE property to solve.
 *         Currently 2 qualify ('docking-bay' and 'launch-column'), so at least
 *         one more combined level is required.
 *   TODO: Keep the tasks varied — the assignment explicitly forbids levels that
 *         only differ by `center` vs `flex-start`. Ideas not used yet:
 *         space-between / space-around / space-evenly, row-reverse,
 *         column-reverse, wrap-reverse, align-content.
 *   TODO: Play every new level once and confirm the instruction really describes
 *         the arrangement its `solution` produces.
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
        // TODO: re-check these offsets if you ever change the planet sizes above —
        //       the corridor should still visually contain the solved row.
        markers: [
            { orientation: 'vertical', side: 'left',  offset: '28%' },
            { orientation: 'vertical', side: 'right', offset: '28%' }
        ]
    }),

    /* -------------------------------------------------------------------------
     * LEVEL 2 — flex-direction + justify-content + align-items
     * A three-property level: the axes swap, so `justify-content` now works
     * vertically and `align-items` horizontally. This is exactly the kind of
     * combined level the assignment asks for ("at least three levels must need
     * more than one property").
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
    })

    /* -------------------------------------------------------------------------
     * TEMPLATE — copy this block, uncomment it and fill it in to add a level.
     * (Remember the comma after the previous level!)
     *
     * The example below is a flex-wrap level: ten large planets cannot fit on a
     * single 800px-wide row, so they only arrange themselves properly once the
     * player allows them to wrap.
     * ---------------------------------------------------------------------- */
    // ,
    // new Level({
    //     id: 'asteroid-belt',            // unique + never reused (progress is saved by id)
    //     title: 'Asteroid Belt',
    //     difficulty: 'hard',             // 'easy' | 'medium' | 'hard'
    //
    //     instruction:
    //         'Too many asteroids for one orbit! Let them <strong>wrap onto a second line</strong> ' +
    //         'and spread every line evenly across the belt.',
    //
    //     hint: 'Nothing can wrap while flex-wrap is nowrap.',
    //
    //     items: [                        // size: sm|md|lg, color: teal|amber|indigo|rose
    //         { size: 'lg', color: 'teal'   }, { size: 'lg', color: 'amber'  },
    //         { size: 'lg', color: 'indigo' }, { size: 'lg', color: 'rose'   },
    //         { size: 'lg', color: 'teal'   }, { size: 'lg', color: 'amber'  },
    //         { size: 'lg', color: 'indigo' }, { size: 'lg', color: 'rose'   },
    //         { size: 'lg', color: 'teal'   }, { size: 'lg', color: 'amber'  }
    //     ],
    //
    //     controls: ['flex-wrap', 'justify-content'],
    //     defaults: { 'flex-wrap': 'nowrap', 'justify-content': 'flex-start' },
    //     solution: { 'flex-wrap': 'wrap',   'justify-content': 'space-between' },
    //
    //     markers: [
    //         { orientation: 'horizontal', side: 'top', offset: '10%' }
    //     ]
    // })
];
