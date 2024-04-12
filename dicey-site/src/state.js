import {atom, selector} from "recoil";

import compile from "dicey.js";

const worker = () => require('./worker.js') // https://github.com/developit/workerize-loader/issues/131

let workerInstance = worker();

export let reload = atom({key: "reload", default: Math.random()});
export let query = atom({key: "query", default: "output 3d6"});

export let calculatorMode = atom({key: "calculatorMode", default: false})


export let weaponName = atom({key: "weaponName", default: "Bolt Pistol"})
export let ws_or_bs = atom({key: "ws_or_bs", default: "4"})
export let str = atom({key: "str", default: "4"})
export let ap = atom({key: "ap", default: "5"})
export let shots = atom({key: "shots", default: "1"})

export let twinLinked = atom({key: "twinLinked", default: false})
export let breaching = atom({key: "breaching", default: "7"})
export let rending = atom({key: "rending", default: "7"})
export let exoshock = atom({key: "exoshock", default: "7"})
export let sunder = atom({key: "sunder", default: 0}) // 0 = no, 1 = yes, 2 = reroll glances
export let ordnance = atom({key: "ordnance", default: false})
export let plasmaBurn = atom({key: "plasmaBurn", default: false})
export let shred = atom({key: "shred", default: true})




export let targetName = atom({key: "targetName", default: "Contemptor"})
export let targetWS = atom({key: "targetWS", default: "5"})
export let targetToughness = atom({key: "targetToughness", default: "7"})
export let targetSave = atom({key: "targetSave", default: "2"})
export let targetInvuln = atom({key: "targetInvuln", default: "5"})
export let isVehicle = atom({key: "isVehicle", default: false})




export let parsed = selector({
    key: "parsed",
    get: ({get}) => {
        let expression = {
            calculatorMode: get(calculatorMode),

            weaponName: get(weaponName),
            ws_or_bs: Number(get(ws_or_bs)),
            str: Number(get(str)),
            ap: Number(get(ap)),
            shots: Number(get(shots)),
            twinLinked: get(twinLinked),

            breaching: Number(get(breaching)),
            rending: Number(get(rending)),
            exoshock: Number(get(exoshock)),
            sunder: Number(get(sunder)),
            ordnance: get(ordnance),
            plasmaBurn: get(plasmaBurn),
            shred: get(shred),



          targetName: get(targetName),
            targetWS: Number(get(targetWS)),
            targetToughness: Number(get(targetToughness)),
            targetSave: Number(get(targetSave)),
            targetInvuln: Number(get(targetInvuln)),

        };
        try {
            //Still need a state to override, hence leaving in 3d6
            let x = compile("output 3d6", expression);
            return {ok: true, v: x};
        } catch (e) {
            return {ok: false, error: e};
        }
    },
});

export let showReload = atom({key: "showReload", default: false});
export let waitingWorker = atom({key: "waitingWorker", default: null});

export let collapse = atom({key: "collapse", default: true});
export let mode = atom({key: "mode", default: "normal"});
export let transpose = atom({key: "transpose", default: false});
export let hideInsignificant = atom({key: "hideInsignificant", default: false});

let working = false;

export let sample = atom({key: "sample", default: []});
export let fresh = atom({key: "fresh", default: false});
export let sampleError = atom({key: " sampleError", default: null});
export let activeSample = selector({
    key: "selector",
    get: async ({get}) => {
        let p = get(parsed);
        let c = get(collapse);
        let m = get(mode);
        let t = get(transpose);
        if (!p.ok) return false;

        if (working) {
            workerInstance = worker();
        } else {
            working = true;
        }

        let result = await workerInstance.compute({
            parsed: p,
            collapse: c,
            mode: m,
            transpose: t,
        });
        working = false;
        return result;
    },
});

export let errors = selector({
    key: "error",
    get: ({get}) => {
        let p = get(parsed);

        if (!p.ok) {
            let s = `${p.error.name}: `;
            if (p.error.location)
                s += ` ${p.error.location.start.line}:${p.error.location.start.column}`;
            s += ` ${p.error.message}`;
            return s;
        }

        let se = get(sampleError);
        if (se) return se;
        return false;
    },
});
