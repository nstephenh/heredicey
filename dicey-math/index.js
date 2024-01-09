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
        const bal_skill = 4; //4+ to hit
        const num_shots = 4;
        const WEAPON_AP = 6;
        const UNIT_SAVE = 3; //X + save
        let unit_save = UNIT_SAVE

        if (WEAPON_AP <= unit_save) {
            unit_save = 7
        }
        const successful_hit_expressions = {
            "type": "math",
            "right": bal_skill,
            "left": {
                "type": "die",
                "times": num_shots,
                "sides": 6
            },
            "m": "cs",
            "op": ">="
        }

        function multiply_clouds(a, b) {
            return {
                "type": "call",
                "name": "repeat",
                "args": [a, b]
            }
        }

        const saves_expression = {
            "type": "math",
            "left": multiply_clouds({
                "type": "die",
                "sides": 6
            }, successful_hit_expressions),
            "right": unit_save,
            "m": "cs",
            "op": "<"
        }
        this.parsed = {body: []}
        this.parsed.type = "block";
        this.parsed.body[0] = {
            "type": "output",
            "expression": successful_hit_expressions,
            "text": `Successful hits with ${num_shots} shots at BS ${bal_skill}`,//`Fail a ${unit_save}+ Save vs an ${num_shots} shots at ${bal_skill}, STR TBD, AP ${WEAPON_AP} weapon`,
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
