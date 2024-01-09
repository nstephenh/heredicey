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
        const bal_skill = 3; //X+ to hit
        const to_hit = 7-bal_skill;


        const num_shots = 2;
        const weapon_strength = 4;
        const target_toughness = 4;
        const WEAPON_AP = 6;

        let target_save = 3; //X+ save

        let to_wound_roll = Math.max(weapon_strength - target_toughness + 4, 2)

        if (WEAPON_AP <= target_save) {
            target_save = 7
        }
        const successful_hits = {
            "type": "math",
            "right": to_hit,
            "left": {
                "type": "die",
                "times": num_shots,
                "sides": 6
            },
            "m": "cs",
            "op": ">="
        }

        const successful_wounds = {
            "type": "math",
            "right": to_wound_roll,
            "left": multiply_clouds({
                "type": "die",
                "sides": 6
            }, successful_hits),
            "m": "cs",
            "op": ">="
        }

        const failed_saves = {
            "type": "math",
            "left": multiply_clouds({
                "type": "die",
                "sides": 6
            }, successful_wounds),
            "right": target_save,
            "m": "cs",
            "op": "<"
        }
        this.parsed = {body: []}
        this.parsed.type = "block";
        this.parsed.body[0] = {
            "type": "output",
            "expression": successful_hits,
            "text": `Hits from ${num_shots} shots at BS ${bal_skill}`,
            "name": null
        }
        this.parsed.body[1] = {
            "type": "output",
            "expression": successful_wounds,
            "text": `Wounds from ${num_shots} shots at BS ${bal_skill}, STR ${weapon_strength} weapon on a T ${target_toughness} target`,
            "name": null
        }
        this.parsed.body[2] = {
            "type": "output",
            "expression": failed_saves,
            "text": `Wounds from ${num_shots} shots at BS ${bal_skill}, STR ${weapon_strength}, AP ${WEAPON_AP} weapon on a T ${target_toughness}, ${target_save}+ target`,
            "name": null
        }
        if (!this.value) this.value = valueize(this.parsed);
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

function multiply_clouds(a, b) {
    return {
        "type": "call",
        "name": "repeat",
        "args": [a, b]
    }
}

/**
 *
 * @param {String} code
 * @returns {ParseResult}
 */
module
    .exports = (code) => {
    let o = new ParseResult();
    o.parsed = parser.parse(code);
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
