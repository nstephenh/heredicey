import React from "react";
import {Card, CardContent, TextField} from "../material";
import {useRecoilState} from "recoil";
import {makeStyles} from "@material-ui/core/styles";

import * as state from "../state";

const useStyles = makeStyles((theme) => ({
    textbox: {
        "& textarea": {
            fontFamily: "monospace",
        },
    },
    card: {
        paddingBottom: 0,
    },
}));

export default function TargetInput() {
    const classes = useStyles();
    const [targetName, setTargetName] = useRecoilState(state.targetName);

    const [ws, setWs] = useRecoilState(state.targetWS);
    const [t, setT] = useRecoilState(state.targetToughness);
    const [sv, setSv] = useRecoilState(state.targetSave);
    const [invuln, setInvuln] = useRecoilState(state.targetInvuln);


    return (
        <Card>
            <CardContent className={classes.card}>
                <TextField
                    id="outlined-target-name"
                    label="Target Name"
                    type="text"
                    value={targetName}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    onChange={(e) => setTargetName(e.target.value)}
                />
                <TextField
                    id="outlined-ws"
                    label="WS (for melee)"
                    type="number"
                    value={ws}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    onChange={(e) => setWs(e.target.value)}

                />
                <TextField
                    id="outlined-tough"
                    label="Toughness"
                    type="number"
                    value={t}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    onChange={(e) => setT(e.target.value)}
                />
                <TextField
                    id="outlined-save"
                    label="Save"
                    type="number"
                    value={sv}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    onChange={(e) => setSv(e.target.value)}
                />
                <TextField
                    id="outlined-invuln"
                    label="Invulnerable Save"
                    type="number"
                    value={invuln}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    onChange={(e) => setInvuln(e.target.value)}
                />
            </CardContent>
        </Card>
    );
}
