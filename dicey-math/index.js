let parser;
const {
    d6, twoD6kh, damageTableDie, ap1TableDie, ap2TableDie, d3,
    makeDiceCloudy, filter_to_value, reroll_less_than_threshold, rendingPenRoll,
    add_independent_condition,
    at_or_above_threshold, at_threshold, above_threshold, boost_damage, on_x_up,
    failed_target_number, n_dice, multiply, multiply_odds, add, sum_odds, count,
    DisplayAsDamageTable
} = require("./parser_commands")

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
        if (this.parsed.input.calculatorMode) {
            if (!this.value) this.value = valueize(this.parsed);
            return this.value;
        }

        this.parsed = {body: [], input: this.parsed.input} // Reset this.parsed, so we can override the 3d6 result.
        this.parsed.type = "block";
        let output_counter = 0;


        const bal_skill = this.parsed.input.ws_or_bs; //X+ to hit
        const to_hit = 7 - bal_skill;
        if (!this.parsed.input.template){
          console.log("Hitting on " + to_hit)
        }


        const num_shots = this.parsed.input.shots;
        const weapon_strength = this.parsed.input.str;
        const weapon_ap = this.parsed.input.ap;

        let show_hits_and_initial_wounds = false


        for (let target of [
            {
                name: this.parsed.input.targetName,
                t: this.parsed.input.targetToughness,
                save: this.parsed.input.targetSave,
                invuln: this.parsed.input.targetInvuln,
            },
            {name: "Power Armour", t: 4, save: 3, invuln: 7},
            {name: "Cataphractii", t: 4, save: 2, invuln: 4},
            {name: "Rhino", t: 11},
        ]) {
          console.log(`Vs ${target.name}`)


            let special_rules_text_arr = []
            let successful_hit = on_x_up(to_hit)
            if (this.parsed.input.twinLinked) {
                // Can't call re-roll the result of on_x_up because it returns 0-1
                // We could just use twoD6kh but that could be an issue for any
                // future special rules that trigger of the to-hit roll.
                successful_hit = at_or_above_threshold(reroll_less_than_threshold(d6, to_hit), to_hit)
                special_rules_text_arr.push(`Twin-linked`)
            }
            if (this.parsed.input.template){
              console.log("auto-hitting with a template")
              successful_hit = 1
              special_rules_text_arr.push("Auto-hitting due to blast or template")
            }

            //Handling for vehicles
            if (target.t >= 10) {
                const to_glance_tn = target.t - weapon_strength
                console.log("Glancing on " + to_glance_tn)
                if (this.parsed.input.ordnance) {
                    special_rules_text_arr.push(`Ordnance`)
                }
                let pen_roll = this.parsed.input.ordnance ? twoD6kh : d6;
                let reroll_hits_under = 7
                console.log("Sunder? " + this.parsed.input.sunder)

                if (this.parsed.input.sunder > 0) {
                    // Either reroll all misses or misses + glances
                    reroll_hits_under = this.parsed.input.sunder === 2 ? to_glance_tn + 1 : to_glance_tn
                    console.log("Rerolling pen rolls under " + reroll_hits_under)
                    if (this.parsed.input.sunder === 2) {
                        special_rules_text_arr.push(`Sunder (rerolling glances to look for pens)`)
                    } else {
                        special_rules_text_arr.push(`Sunder`)
                    }
                }

                if (this.parsed.input.rending < 7) { //Will handle sunder if present
                    pen_roll = rendingPenRoll(pen_roll, this.parsed.input.rending, reroll_hits_under)
                    special_rules_text_arr.push(`Rending (${this.parsed.input.rending}+)`)
                } else if (this.parsed.input.sunder > 0) { // Handle sunder if no rending
                    pen_roll = reroll_less_than_threshold(pen_roll, reroll_hits_under)
                }

                let glance_odds = multiply_odds(successful_hit, at_threshold(pen_roll, to_glance_tn))
                let pen_odds = multiply_odds(successful_hit, above_threshold(pen_roll, to_glance_tn))


                let hull_points_per_glance = 1
                let hull_points_per_pen = 1
                let dt_rolls_per_pen = 1

                if (this.parsed.input.plasmaBurn) {
                    hull_points_per_glance = add_independent_condition(on_x_up(4), d3, hull_points_per_glance)
                    hull_points_per_pen = add_independent_condition(on_x_up(4), d3, hull_points_per_pen)
                    special_rules_text_arr.push(`Plasma Burn`)
                }

                if (this.parsed.input.exoshock < 7) {
                    hull_points_per_pen = add_independent_condition(on_x_up(this.parsed.input.exoshock), 1, hull_points_per_pen)
                    dt_rolls_per_pen = add_independent_condition(on_x_up(this.parsed.input.exoshock), 1, dt_rolls_per_pen)
                    special_rules_text_arr.push(`Exoshock (${this.parsed.input.exoshock}+)`)
                }

                const lost_hull_points = sum_odds(
                    multiply_odds(glance_odds, hull_points_per_glance),
                    multiply_odds(pen_odds, hull_points_per_pen)
                ) // Since these events are independent we can add them together.

                const special_rules_text = special_rules_text_arr.length ? "with " + special_rules_text_arr.join(", ") : "";
                this.parsed.body[output_counter++] = {
                    "type": "output",
                    "expression": n_dice(lost_hull_points, num_shots),
                    "text": `Lost hull points on ${target.name} (A${target.t}) from ${num_shots} shots at BS ${bal_skill}, STR ${weapon_strength}, AP ${weapon_ap} ${special_rules_text} weapon`,
                }

                let damage_table_die = damageTableDie
                if (weapon_ap === 2) {
                    damage_table_die = ap2TableDie
                }
                if (weapon_ap === 1) {
                    damage_table_die = ap1TableDie
                }

                this.parsed.body[output_counter++] = {
                    "type": "output",
                    "expression": n_dice(multiply_odds(pen_odds, hull_points_per_pen), num_shots),
                    "text": `Penetrating hits for ${target.name} over ${num_shots} shots`,
                }
                this.parsed.body[output_counter++] = {
                    "type": "output",
                    "expression": damage_table_die,
                    "text": `Die for each of those pen hits (do the math yourself because I can't right now)`,
                }
                continue;
            }
            //Handling for non-vehicles
            let applied_rend_to_wound = false;

            let to_wound_t_n = Math.max(4 - (weapon_strength - target.t), 2)
            if (to_wound_t_n === 7) {
                to_wound_t_n = 6 // There are 2 entries of 6+ on the table, so even if 3 below still hit.
            }
            if (this.parsed.input.rending < to_wound_t_n) {
                to_wound_t_n = this.parsed.input.rending
                special_rules_text_arr.push(`Rending (${this.parsed.input.rending}+)`)
                applied_rend_to_wound = true;

            }

            let save_description = `${target.save}+ save`
            if (weapon_ap <= target.save) {
                if (target.invuln < 7) {
                    target.save = target.invuln
                    save_description = `${target.save}+ invulnerable save`
                } else {
                    target.save = 7
                    save_description = `no ${target.save}+ save because AP ${weapon_ap}`
                }
            }

            // display_wound is all wounding hits, no matter if they're special or not.
            let wound_die = d6;
            let to_wound_description = `Wounding on ${to_wound_t_n}+`
            if (this.parsed.input.shred){
              wound_die = reroll_less_than_threshold(d6, to_wound_t_n)
              to_wound_description += `, rerolling failed wounds from Shred`
              special_rules_text_arr.push("Shred")
            }

            console.log(to_wound_description)

            let resolve_at_ap2_threshold = Math.min(this.parsed.input.breaching, this.parsed.input.rending)
            let regular_wound_threshold = to_wound_t_n
            if (resolve_at_ap2_threshold < 7) {
                const number_of_ap2_sides = (7 - resolve_at_ap2_threshold)
                console.log("Regular wounding on " + (7 - to_wound_t_n - number_of_ap2_sides) + " sides")
                regular_wound_threshold = to_wound_t_n + number_of_ap2_sides
                console.log("Therefore, regular wounding on a " + regular_wound_threshold + "+")
                console.log("AP2 on a " + resolve_at_ap2_threshold + "+")
                if (this.parsed.input.breaching < 7) {
                    special_rules_text_arr.push(`Breaching (${this.parsed.input.breaching}+)`)
                }
                if ((this.parsed.input.rending < 7) && !applied_rend_to_wound) {
                    // Don't add rending to the rules list if it already affected the to-wound roll
                    special_rules_text_arr.push(`Rending (${this.parsed.input.rending}+)`)
                }
                if (target.invuln < 7) {
                    save_description += `, ${target.invuln}+ invulnerable save against wounds resolved at AP2`
                } else {
                    save_description += `, no save against wounds resolved at AP2`
                }
            }

            // Roll to wound
            const no_special_rule_wounds = multiply_odds(successful_hit, at_or_above_threshold(wound_die,regular_wound_threshold))
            const ap2_wounds = multiply_odds(successful_hit, at_or_above_threshold(wound_die,resolve_at_ap2_threshold))

            // Roll saves
            const failed_saves = multiply_odds(no_special_rule_wounds, failed_target_number(target.save))
            const failed_invulns = multiply_odds(ap2_wounds, failed_target_number(target.invuln))

            // Sum both types of failed save
            const final_damage = sum_odds(failed_saves, failed_invulns)

            // Prepare this.parsed to display results
            const special_rules_text = special_rules_text_arr.length ? "with " + special_rules_text_arr.join(", ") : "";

            if (show_hits_and_initial_wounds) {
                this.parsed.body[output_counter++] = {
                    "type": "output",
                    "expression": n_dice(successful_hit, num_shots),
                    "text": `Hits from ${num_shots} shots at BS ${bal_skill}`,
                }
              const display_wound = multiply_odds(successful_hit, on_x_up(to_wound_t_n))
              this.parsed.body[output_counter++] = {
                    "type": "output",
                    "expression": n_dice(display_wound, num_shots),
                    "text": `Wounds from ${num_shots} shots at BS ${bal_skill}, STR ${weapon_strength} weapon on a T ${target.t} target`,
                }
              if (resolve_at_ap2_threshold < 7) {
                this.parsed.body[output_counter++] = {
                  "type": "output",
                  "expression": n_dice(no_special_rule_wounds, num_shots),
                  "text": `Non-ap2 wounds`,
                }
                this.parsed.body[output_counter++] = {
                  "type": "output",
                  "expression": n_dice(ap2_wounds, num_shots),
                  "text": `Wounds at ap2`,
                }
              }
            }
            this.parsed.body[output_counter++] = {
                "type": "output",
                "expression": n_dice(final_damage, num_shots),
                "text": `Unsaved wounds on ${target.name} (T${target.t}, ${save_description}) from ${num_shots} shots at BS ${bal_skill}, STR ${weapon_strength}, AP ${weapon_ap} ${special_rules_text} weapon`,
            }


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
