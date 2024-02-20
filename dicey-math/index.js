let parser;

try {
    parser = require("../pegjs-loader.js!./parser.js");
} catch (e) {
    parser = require("pegjs").generate(require("./parser.js"));
}

let {debug, valueize, keyComp} = require("./utils");

let roll = require("./roll");

/**
 * @typedef {import('./statements.js').Block} Block
 * @typedef {import('./statements.js').Output} Output
 */

class ParseResult {
    constructor() {
    }

    /**
     * @returns {string}
     */
    get debugString() {
        return debug(this.parsed);
    }

    /**
     * @returns {Block}
     */
    get result() {
        console.log("Object on call to results", this)

        const bal_skill = this.parsed.input.ws_or_bs; //X+ to hit
        const to_hit = 7 - bal_skill;
        console.log("Hitting on " + to_hit)


        const num_shots = this.parsed.input.shots;
        const weapon_strength = this.parsed.input.str;
        const WEAPON_AP = this.parsed.input.ap;
        const breaching_value = 5;

        const target_toughness = 4;
        let target_save = 3; //X+ save

        let to_wound_t_n = Math.max(weapon_strength - target_toughness + 4, 2)

        if (WEAPON_AP <= target_save) {
            target_save = 7
        }

        const successful_hit = on_target_number(to_hit)
        // display_wound is all wounding hits, no matter if they're special or not.
        const display_wound = multiply(successful_hit, on_target_number(to_wound_t_n))


        console.log("Wounding on " + to_wound_t_n)
        if (breaching_value < 7) {
            to_wound_t_n = to_wound_t_n + (7 - breaching_value)
            console.log("Regular wounding on " + to_wound_t_n)
            console.log("Breaching on " + breaching_value)
            // Offset our regular wound rolls
        }

        const no_special_rule_wounds = multiply(successful_hit, on_target_number(to_wound_t_n))


        const failed_saves = multiply(no_special_rule_wounds, failed_target_number(target_save))

        let final_damage = failed_saves
        let wounds_from_breaching = undefined;

        if (breaching_value < 7) {
            //Get the sum of failed saves with non-breaching and successful breaching rolls.
            wounds_from_breaching = multiply(successful_hit, on_target_number(breaching_value))
            final_damage = sum_results(failed_saves, wounds_from_breaching)
        }

        this.parsed = {body: [], input: this.parsed.input}
        this.parsed.type = "block";
        this.parsed.body[0] = {
            "type": "output",
            "expression": n_dice(successful_hit, num_shots),
            "text": `Hits from ${num_shots} shots at BS ${bal_skill}`,
        }
        this.parsed.body[1] = {
            "type": "output",
            "expression": n_dice(display_wound, num_shots),
            "text": `Wounds from ${num_shots} shots at BS ${bal_skill}, STR ${weapon_strength} weapon on a T ${target_toughness} target`,
        }

        let with_breaching = ""
        if (breaching_value < 7) {
            with_breaching = ` with Breaching(${breaching_value}+) `
        }

        this.parsed.body[2] = {
            "type": "output",
            "expression": n_dice(final_damage, num_shots),
            "text": `Unsaved wounds from ${num_shots} shots at BS ${bal_skill}, STR ${weapon_strength}, AP ${WEAPON_AP} ${with_breaching} weapon on a T ${target_toughness}, ${target_save}+ SV target`,
        }
        // if (breaching_value < 7) {
        //     this.parsed.body[3] = {
        //         "type": "output",
        //         "expression": n_dice(failed_saves, num_shots),
        //         "text": `Non-breaching wounds`,
        //     }
        //     this.parsed.body[4] = {
        //         "type": "output",
        //         "expression": n_dice(wounds_from_breaching, num_shots),
        //         "text": `Wounds from Breaching`,
        //     }
        // }
        if (!this.value) this.value = valueize(this.parsed)
        return this.value;
    }

    roll() {
        return roll(this.parsed);
    }

    /**
     * @returns {Output}
     */
    output() {
        return this.result.output();
    }
}

function on_target_number(target_number) {
    return {
        "type": "math",
        "right": target_number,
        "left": {
            "type": "die",
            "times": 1,
            "sides": 6
        },
        "m": "cs",
        "op": ">="
    }
}

function failed_target_number(target_number) {
    return {
        "type": "math",
        "right": target_number,
        "left": {
            "type": "die",
            "times": 1,
            "sides": 6
        },
        "m": "cs",
        "op": "<"
    }
}

function n_dice(expression, dice) {
    return {
        "type": "call",
        "name": "repeat",
        "args": [expression, dice]
    }
}

function multiply(a, b) {
    return {
        "type": "math",
        "left": a,
        "right": b,
        "op": "*"
    }
}


function sum_results(a, b) {
    return {
        "type": "math",
        "right": a,
        "left": b,
        "op": "++"
    }
}


/**
 *
 * @param {String} code
 * @param {Object} values
 * @returns {ParseResult}
 */
module
    .exports = (code, values) => {
    console.log("Input to dicey-math:", code, values)
    let o = new ParseResult();
    o.parsed = parser.parse(code); //This still needs to happen or it breaks.
    o.parsed.input = values;
    return o;
};

Object
    .assign(module

            .exports
        , {
            parser
            ,
            rehydrate: (i) => {
                let o = new ParseResult();
                o.parsed = i.parsed;
                return o;
            }
            ,
            debug
            ,
            valueize
            ,
            keyComp
            ,
        }
    )
;
