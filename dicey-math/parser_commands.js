/*
 * This file is for commands we use to simulate the output of the parser.
 * It does not have anything to do with parsing.
 */

/**
 * @param {number || {type: string}} sides
 */
function mkDie(sides){
    return {
        "type": "die",
        "times": 1,
        "sides": sides
    }
}
/**
 * @param {[number || {type: string}]} sides
 */
function mkSetDie(sides){
    return mkDie(
        {
            "type": "set",
            "elements": sides
        }
    )
}

const d3 = {
    "type": "die",
    "times": 1,
    "sides": 3
};

const d6 = {
    "type": "die",
    "times": 1,
    "sides": 6
};

const twoD6kh = {
    "type": "math",
    "right": 1,
    "left": {
        "type": "die",
        "times": 2,
        "sides": 6
    },
    "op": "kh"
}

//Sometimes adding 0 to a die makes it behave differently. Unsure why.
function makeDiceCloudy(dice) {
    return {
        type: "math",
        left: dice,
        op: "+",
        right: 0
    }
}

/**
 * Use reroll to get a subset of the probabilities for a given occurrence.
 * @param {{type:string}} cloud_or_die
 * @param {string} op >=, <=, > or <
 * @param {number} val
 * @returns {{type:string}}
 */
function filter_to_value(cloud_or_die, op, val) {
    // Because we're re-rolling all values, we need to invert the operator.
    switch (op) {
        case ">=":
            op = "<"
            break
        case "<=":
            op = ">"
            break
        case ">":
            op = "<="
            break
        case "<":
            op = ">="
            break
    }
    return {
        "type": "math",
        "left": makeDiceCloudy(cloud_or_die),
        "m": "r",
        "op": op,
        "right": val,
    }
}

/**
 * @param {{type: string}} dice A die or expression that we can roll
 * @param {{number}} threshold number to reroll if we're under
 */
function reroll_less_than_threshold(dice, threshold) {
    return {
        "type": "math",
        "left": dice,
        "m": "ro",
        "op": "<",
        "right": threshold,
    }
}

/**
 * Gives us the equivalent of in_dice + conditional d3 if at or over rendingValue
 * @param {{type:string}} in_dice
 * @param {number} rendingValue
 * @param {number} rerollUnder threshold to reroll at, if under 7.
 */
function rendingPenRoll(in_dice, rendingValue, rerollUnder = 7) {
    let rolled_for_pen = in_dice
    let die_above_rend = filter_to_value(in_dice, ">=", rendingValue)
    let die_below_rend = filter_to_value(in_dice, "<", rendingValue)
    console.log(`Weighing based on d6 >= ${rendingValue}, values at or above rending ` +
        `+ d3, values below rending`)
    if (rerollUnder < 7) {
        console.log("\twith a re-roll")
        rolled_for_pen = reroll_less_than_threshold(in_dice, rerollUnder)
        die_above_rend = reroll_less_than_threshold(die_above_rend, rerollUnder)
        die_below_rend = reroll_less_than_threshold(die_below_rend, rerollUnder)
    }
    return {
        "type": "call",
        "name": "iif",
        "args": [
            {// If we get above the rending value,
                "type": "math",
                "left": rolled_for_pen,
                "op": ">=",
                "right": rendingValue,
            },
            { // Rending shot
                "type": "math",
                "left": die_above_rend, //Values we could have rolled that rend
                "op": "+",
                "right": { //Add the bonus d3
                    "type": "die",
                    "sides": 3
                },
            },
            die_below_rend //If we didn't hit the rend value, roll the remaining values
        ]
    }
}

function add_independent_condition(condition, added, regular_result) {
    return {
        "type": "call",
        "name": "iif",
        "args": [
            condition,
            add(regular_result, added),
            regular_result,
        ]
    }
}


function at_or_above_threshold(dice, target_number) {

    return {
        "type": "math",
        "left": dice,
        "right": target_number,
        "m": "cs",
        "op": ">="
    }
}

function at_threshold(dice, target_number) {

    return {
        "type": "math",
        "left": dice,
        "right": target_number,
        "m": "cs",
        "op": "=="
    }
}

function above_threshold(dice, target_number) {

    return {
        "type": "math",
        "left": dice,
        "right": target_number,
        "m": "cs",
        "op": ">"
    }
}

function boost_damage(damage_1_event, condition, new_damage) {
    return multiply(damage_1_event, {
        "type": "call",
        "name": "iif",
        "args": [condition,
            new_damage,
            1
        ]
    })
}

function on_x_up(x) {
    return {
        "type": "math",
        "right": x,
        "left": d6,
        "m": "cs",
        "op": ">="
    }
}

function failed_target_number(target_number) {
    return {
        "type": "math",
        "right": target_number,
        "left": d6,
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

function multiply_odds(a, b) {
    return {
        "type": "call",
        "name": "iif",
        "args": [a,
            b,
            0
        ]
    }
}


function add(a, b) {

    return {
        "type": "math",
        "right": a,
        "left": b,
        "op": "+"
    }
}

/**
 * Add the odds of the outcome of two independent events with a total nonzero outcome less than 1.
 * @param {{}} a
 * @param {{}} b
 * @returns {{type: "math", op: "++", left: {}, right: {}}}
 */
function sum_odds(a, b) {
    return {
        "type": "math",
        "op": "++",
        "left": a,
        "right": b
    }
}


function count(expression, value) {
    return {
        "type": "call",
        "name": "count",
        "args": [
            expression,
            value
        ]
    }
}
const damageTableDie = {
    "type": "die",
    "sides": {
        "type": "set",
        "elements": [
            {
                "type": "string",
                "value": "1-3 Crew Shaken"
            },
            {
                "type": "string",
                "value": "1-3 Crew Shaken"
            },
            {
                "type": "string",
                "value": "1-3 Crew Shaken"
            },
            {
                "type": "string",
                "value": "4 Crew Stunned"
            },
            {
                "type": "string",
                "value": "5 Weapon Destroyed"
            },
            {
                "type": "string",
                "value": "6 Immobilized"
            }
        ]
    }
}

const ap2TableDie = {
    "type": "die",
    "sides": {
        "type": "set",
        "elements": [
            {
                "type": "string",
                "value": "1-3 Crew Shaken"
            },
            {
                "type": "string",
                "value": "1-3 Crew Shaken"
            },
            {
                "type": "string",
                "value": "4 Crew Stunned"
            },
            {
                "type": "string",
                "value": "5 Weapon Destroyed"
            },
            {
                "type": "string",
                "value": "6 Immobilized"
            },
            {
                "type": "string",
                "value": "7+ Explodes"
            }
        ]
    }
}
const ap1TableDie = {
    "type": "die",
    "sides": {
        "type": "set",
        "elements": [
            {
                "type": "string",
                "value": "1-3 Crew Shaken"
            },
            {
                "type": "string",
                "value": "4 Crew Stunned"
            },
            {
                "type": "string",
                "value": "5 Weapon Destroyed"
            },
            {
                "type": "string",
                "value": "6 Immobilized"
            },
            {
                "type": "string",
                "value": "7+ Explodes"
            }
            ]
    }
}


function DisplayAsDamageTable(roll) {
    return {
        "type": "call",
        "name": "bucket",
        "args": [
            {
                "type": "math",
                "right": 1,
                "left": roll,
                "op": "kh"
            },
            {
                "type": "string",
                "value": "0 Miss or Glance"
            },
            1,
            {
                "type": "string",
                "value": "1-3 Crew Shaken"
            },
            4,
            {
                "type": "string",
                "value": "4 Crew Stunned"
            },
            5,
            {
                "type": "string",
                "value": "5 Weapon Destroyed"
            },
            6,
            {
                "type": "string",
                "value": "6 Immobilized"
            },
            7,
            {
                "type": "string",
                "value": "7+ Explodes"
            }
        ]
    }
}


module.exports = {
    d6, twoD6kh, damageTableDie, ap1TableDie, ap2TableDie, d3,
    makeDiceCloudy, filter_to_value, reroll_less_than_threshold, rendingPenRoll,
    add_independent_condition,
    at_or_above_threshold, at_threshold, above_threshold, boost_damage, on_x_up,
    failed_target_number, n_dice, multiply, multiply_odds, add, sum_odds, count,
    DisplayAsDamageTable
}
