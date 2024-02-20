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
        this.parsed = {body: [], input: this.parsed.input} // Reset this.parsed so we can override the 3d6 result.


        const bal_skill = this.parsed.input.ws_or_bs; //X+ to hit
        const to_hit = 7 - bal_skill;
        console.log("Hitting on " + to_hit)


        const num_shots = this.parsed.input.shots;
        const weapon_strength = this.parsed.input.str;
        const WEAPON_AP = this.parsed.input.ap;
        const breaching_value = 7;

        let show_hits_and_initial_wounds = false

        let output_counter = 0;

        for (let target of [
            {
                name: this.parsed.input.targetName,
                t: this.parsed.input.targetToughness,
                save: this.parsed.input.targetSave,
                invuln: this.parsed.input.targetInvuln,
            },
            {name: "Power Armour", t: 4, save: 3, invuln: 7},
            {name: "Cataphractii", t: 4, save: 2, invuln: 4},
        ]) {

            let to_wound_t_n = Math.max(4 - (weapon_strength - target.t), 2)
            if (to_wound_t_n === 7) {
                to_wound_t_n = 6 // There are 2 entries of 6+ on the table, so even if 3 below still hit.
            }

            let save_description = `${target.save}+ save`
            if (WEAPON_AP <= target.save) {
                if (target.invuln < 7) {
                    target.save = target.invuln
                    save_description = `${target.save}+ invulnerable save`
                } else {
                    target.save = 7
                    save_description = `no ${target.save}+ save because AP ${WEAPON_AP}`
                }
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


            const failed_saves = multiply(no_special_rule_wounds, failed_target_number(target.save))

            let final_damage = failed_saves
            let wounds_from_breaching = undefined;

            let special_rules_text = ""


            if (breaching_value < 7) {
                //Get the sum of failed saves with non-breaching and successful breaching rolls.
                wounds_from_breaching = multiply(successful_hit, on_target_number(breaching_value))
                final_damage = sum_results(failed_saves, wounds_from_breaching)
                special_rules_text = ` with Breaching(${breaching_value}+) `
            }

            this.parsed.type = "block";
            if (show_hits_and_initial_wounds) {
                this.parsed.body[output_counter++] = {
                    "type": "output",
                    "expression": n_dice(successful_hit, num_shots),
                    "text": `Hits from ${num_shots} shots at BS ${bal_skill}`,
                }
                this.parsed.body[output_counter++] = {
                    "type": "output",
                    "expression": n_dice(display_wound, num_shots),
                    "text": `Wounds from ${num_shots} shots at BS ${bal_skill}, STR ${weapon_strength} weapon on a T ${target.t} target`,
                }
            }

            this.parsed.body[output_counter++] = {
                "type": "output",
                "expression": n_dice(final_damage, num_shots),
                "text": `Unsaved wounds on ${target.name} (T${target.t}, ${save_description}) from ${num_shots} shots at BS ${bal_skill}, STR ${weapon_strength}, AP ${WEAPON_AP} ${special_rules_text} weapon`,
            }

            // if (breaching_value < 7) {
            //     this.parsed.body[output_counter++] = {
            //         "type": "output",
            //         "expression": n_dice(failed_saves, num_shots),
            //         "text": `Non-breaching wounds`,
            //     }
            //     this.parsed.body[output_counter++] = {
            //         "type": "output",
            //         "expression": n_dice(wounds_from_breaching, num_shots),
            //         "text": `Wounds from Breaching`,
            //     }
            // }
        }
        console.log("After processing", this.parsed)

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
