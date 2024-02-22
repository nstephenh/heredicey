const parse = require("./index");
const fs = require("fs");
const path = require("path");

const {
    twoD6kh,
    reroll_less_than_threshold, filter_to_value,
} = require("./parser_commands")

let cached = {};
let cachePath = path.join(__dirname, "anydice-cache.json");

if (fs.existsSync(cachePath)) {
    cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
}

async function query(query) {
    if (cached[query]) {
        return cached[query];
    }

    if (!process.env.UPDATE_CACHE) {
        throw new Error(
            `The anydice cache is out of date, run with UPDATE_CACHE=1 to update`
        );
    }

    let fetch = require("node-fetch");
    let req = await fetch("https://anydice.com/calculator_limited.php", {
        headers: {
            accept: "application/json, text/javascript, */*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/x-www-form-urlencoded",
        },
        referrer: "https://anydice.com/",
        referrerPolicy: "strict-origin-when-cross-origin",
        body: new URLSearchParams([["program", query]]),
        method: "POST",
        mode: "cors",
    });

    let data = await req.json();
    data.query = query;
    cached[query] = data;
    fs.writeFileSync(cachePath, JSON.stringify(cached, null, "\t"), "utf8");

    return data;
}

function anytest(dice, anydice = null) {
    if (anydice === null) anydice = `output ${dice}`;

    test(dice, async () => {
        let adr = await query(anydice);
        expect(adr.error).toBeUndefined();

        let w = parse(dice, {calculatorMode: true});

        let d1 = adr.distributions.data[0].filter((x) => x[0] !== null);
        compare_distributions(w, d1)
    });
}


function skipParserAnyDiceTest(name, expression, anydice) {

    test(name, async () => {
        let adr = await query(anydice);
        expect(adr.error).toBeUndefined();

        let w = parse('3d6', {calculatorMode: true});
        w.parsed = {body: [], input: {calculatorMode: true}} // Reset this.parsed
        w.parsed.type = "block";
        w.parsed.body[0] = {
            "type": "output",
            "expression": expression,
            "text": name,
        }
        let d1 = adr.distributions.data[0].filter((x) => x[0] !== null);
        compare_distributions(w, d1);
    });
}


function skipParserBasicTest(name, expression, d1) {
    test(name, async () => {
        let w = parse('3d6', {calculatorMode: true});
        w.parsed = {body: [], input: {calculatorMode: true}} // Reset this.parsed
        w.parsed.type = "block";
        w.parsed.body[0] = {
            "type": "output",
            "expression": expression,
            "text": name,
        }
        compare_distributions(w, d1)
    });
}

function testWeapon(name, values, d1) {
    let w = parse('3d6', {});

}

function compare_distributions(w, d1) {
    let or = w.output()[0].denseCloud();
    let d2 = or.values.map((v) => [v.k[0], (100 * v.w) / or.total]);
    d2.sort((a, b) => a[0] - b[0]);
    expect(d2.length).toBe(d1.length);

    for (let i = 0; i < d1.length; ++i) {
        expect(d2[i][0]).toBe(d1[i][0]);
        expect(d2[i][1]).toBeCloseTo(d1[i][1]);
    }
}


anytest("3d6");
anytest("d0");
anytest("3d6+20");
anytest("100d6");
anytest("300d6");
anytest("500d6");

anytest("500/10/5");
anytest("2+2*2");
anytest("2*2+2");

anytest("4d6dl", "output [highest 3 of 4d6]");
anytest("4d6dl(d5-1)", "output [highest (d5-1) of 4d6]");

anytest("1d6 + 1d10");

anytest("d6 * d6");
anytest("4d6 * 2d6");

anytest("(3d20dl)dh", "output 2@3d20");

anytest("2d20kh", "output [highest 1 of 2d20]");
anytest("output 3d6kl2kh1", "output 2@3d6");
anytest("2@3d6");

anytest("(d3)d6");
anytest("(d6)d6");
anytest("(2d6)d4");

anytest("10d{-1,0,1}");
anytest("10dF", "output 10d{-1,0,1}");
anytest("10d{-1,0,1,5}");
anytest("(d6)d{1,1,2,3,5,6}");

anytest("d(d6)", "function: z F:n { result: dF } output [z d6]");
anytest("d(d6) + d(d6)", "function: z F:n { result: dF } output [z d6]+[z d6]");
anytest("6d(d6)", "function: z F:n { result: 6dF } output [z d6]");
anytest("(d6)d(d6)", "function: z F:n { result: (d6)dF } output [z d6]");
anytest("(d6)d6", "output d6d6");
anytest(
    "((d6)d(d6)) kh 2",
    "function: z F:n { result: (d6)dF } output [highest 2 of [z d6]]"
);

anytest("8d6+1 >= 40");
anytest("8d6 >= 7");

anytest("explode(d6)", "output [explode d6]");
anytest("repeat(explode(d6,2), 3)", "output 3d[explode d6]");
//anytest("2d(explode(d6))", "2d[explode d6]")

anytest("contains(3d6, 6)", "output [3d6 contains 6]");
anytest("count(3d6, 6)", "output [count 6 in 3d6]");

anytest("{1d20,10}kh + 5", "output 5 + [highest of d20 and 10]");

anytest("explode(2d6,1)", 'set "explode depth" to 1\noutput [explode 2d6]');
anytest("2d6xo=6", 'set "explode depth" to 1\noutput 2d[explode d6]');
anytest(
    "d6xo>3",
    `
function: explode N:n {
 if N > 3 { result: N + [explode d6] }
 result: N
}

set "maximum function depth" to 2
output [explode d6]
`
);
anytest(
    "2d6xo>3",
    `
function: explode N:n {
 if N > 3 { result: N + [explode d6] }
 result: N
}

set "maximum function depth" to 2
output 2d[explode d6]
`
);

anytest(
    "(5d10xo=10)kh3",
    'set "explode depth" to 1\noutput [highest 3 of 5d[explode d10]]'
);


//These test cases are defined in a block in index.js instead of here. Not the best way of handling ths
skipParserAnyDiceTest('2d6 Keep Highest',
    twoD6kh,
    "output [highest 1 of 2d6]")
skipParserAnyDiceTest('2d6 Keep Highest reroll once under 5',
    reroll_less_than_threshold(twoD6kh, 5),
    "function: reroll R:n under N:n {\n" +
    "   if R < N { result: [highest 1 of 2d6] } else {result: R}\n" +
    "}\n" +
    "\n" +
    "output [reroll [highest 1 of 2d6] under 5]")

skipParserBasicTest("2d6kh re-rolling values that are greater than 3 (keeping less than 3)",
    filter_to_value(twoD6kh, "<=", 3),
    [
        [1, 11.1111111],
        [2, 33.3333333],
        [3, 55.5555555],
    ])
