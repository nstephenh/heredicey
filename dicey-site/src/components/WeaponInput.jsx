import React from "react";
import {Alert, Card, CardContent, CardActions, TextField} from "../material";
import { useRecoilState, useRecoilValue } from "recoil";
import { makeStyles } from "@material-ui/core/styles";

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

export default function WeaponInput() {
  const classes = useStyles();
  const [ws_or_bs, setWsOrBs] = useRecoilState(state.ws_or_bs);
    const [str, setStr] = useRecoilState(state.str);
    const [ap, setAp] = useRecoilState(state.ap);
    const [shots, setShots] = useRecoilState(state.shots);


    const error = useRecoilValue(state.errors);

  return (
    <Card>
      <CardContent className={classes.card}>
          <TextField
              id="outlined-ws_or_bs"
              label="WS or BS"
              type="number"
              value={ws_or_bs}
              InputLabelProps={{
                  shrink: true,
              }}
              onChange={(e) => setWsOrBs(e.target.value)}

          />
          <TextField
              id="outlined-str"
              label="Strength"
              type="number"
              value={str}
              InputLabelProps={{
                  shrink: true,
              }}
              onChange={(e) => setStr(e.target.value)}
          />
          <TextField
              id="outlined-ap"
              label="AP"
              type="number"
              value={ap}
              InputLabelProps={{
                  shrink: true,
              }}
              onChange={(e) => setAp(e.target.value)}
          />
          <TextField
              id="outlined-shots"
              label="Shots"
              type="number"
              value={shots}
              InputLabelProps={{
                  shrink: true,
              }}
              onChange={(e) => setShots(e.target.value)}
          />
      </CardContent>
    </Card>
  );
}
