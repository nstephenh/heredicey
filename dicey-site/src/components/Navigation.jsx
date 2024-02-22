import React from "react";
import Drawer from "@material-ui/core/Drawer";
import clsx from "clsx";

import styles from "../styles";

import Divider from "@material-ui/core/Divider";
import IconButton from "@material-ui/core/IconButton";

import {makeStyles} from "@material-ui/core/styles";
import {NavLink as RouterLink} from "react-router-dom";

import {
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    //Switch,
    AccountTreeIcon,
    Box,
} from "../material";

import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";


import DescriptionIcon from "@material-ui/icons/Description";
import BallotIcon from "@material-ui/icons/Contactless";
import ContactlessIcon from "@material-ui/icons/Contactless";

const useStyles = makeStyles(styles);

export default function Navigation({open, handleDrawerClose}) {
    const classes = useStyles();

    let links = [
        ["Damage Probability", "/", <DescriptionIcon/>, {exact: true}],
        ["Documentation", "/docs", <BallotIcon/>],
        // ["Examples", "/examples", <ExploreIcon />],
        //["Function Library", "/functions", <FunctionsIcon />],
        ["About", "/about", <ContactlessIcon/>],
    ];
    return (
        <Drawer
            variant="permanent"
            classes={{
                paper: clsx(classes.drawerPaper, !open && classes.drawerPaperClose),
            }}
            open={open}
        >
            <div className={classes.toolbarIcon}>
                <IconButton onClick={handleDrawerClose}>
                    <ChevronLeftIcon/>
                </IconButton>
            </div>
            <Divider/>
            <List>
                {links.map(([name, url, icon, extra = {}]) => (
                    <ListItem
                        {...extra}
                        button
                        activeClassName="Mui-selected"
                        component={RouterLink}
                        key={name}
                        to={url}
                    >
                        <ListItemIcon>{icon}</ListItemIcon>
                        <ListItemText primary={name}/>
                    </ListItem>
                ))}
                <Divider/>
                {false && (
                    <ListItem>
                        <ListItemIcon>
                            <AccountTreeIcon/>
                        </ListItemIcon>
                        <ListItemText primary="Simulator"/>
                        <ListItemSecondaryAction hidden={!open}></ListItemSecondaryAction>
                    </ListItem>
                )}
            </List>
            {open && (
                <Box className={classes.filler}>
                    <Box className={classes.byline}>
                        Source on {" "}
                        <a className={classes.muted} href="https://github.com/nstephenh/heredicy">
                            Github
                        </a>
                        <br/>
                        Based on {" "}
                        <a className={classes.muted} href="https://dicey.js.org/">
                            Dicey
                        </a>
                    </Box>
                </Box>
            )}
        </Drawer>
    );
}
