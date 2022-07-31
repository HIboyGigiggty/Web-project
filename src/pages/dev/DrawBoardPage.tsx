import AppBar from "@suid/material/AppBar";
import Box from "@suid/material/Box";
import Toolbar from "@suid/material/Toolbar";
import Typography from "@suid/material/Typography";
import { Component, For, createSignal, onCleanup, onMount } from "solid-js";
import { DrawBoard } from "../../widgets/DrawBroad/board";
import Button from "@suid/material/Button";
import IconButton from "@suid/material/IconButton";
import MoreVertIcon from "@suid/icons-material/MoreVert";
import Popover from "@suid/material/Popover";
import List from "@suid/material/List";
import ListItem from "@suid/material/ListItem";
import ListItemButton from "@suid/material/ListItemButton";
import ListItemIcon from "@suid/material/ListItemIcon";
import Checkbox from "@suid/material/Checkbox";
import ListItemText from "@suid/material/ListItemText";
import Divider from "@suid/material/Divider";
import TextField from "@suid/material/TextField";

import {DrawBoardView} from "../../widgets/DrawBroad/solid";
import ScrollbarController from "../../widgets/DrawBroad/ScrollbarController";
import { OverlayWindowState, StatefulOverlayWindow } from "../../widgets/overlay_windows";
import ListItemSecondaryAction from "@suid/material/ListItemSecondaryAction";
import Switch from "@suid/material/Switch";

const DrawBoardPage: Component = () => {
    const [isMoreMenuOpen, setIsMoreMenuOpen] = createSignal<boolean>(false);
    const [boardSize, setBoardSize] = createSignal<{ w: number, h: number }>({ w: 0, h: 0 });
    const [viewOutlineEnabled, setViewOutlineEnabled] = createSignal<boolean>(false);

    let moreIconButtonRef: HTMLButtonElement;

    const board = new DrawBoard(document.createElement("canvas"));
    const boardConfigWindowState = new OverlayWindowState("DrawBoard Config");
    const boardSampleDrawingWindowState = new OverlayWindowState("Sample Drawings");
    const boardViewConfigWindowState = new OverlayWindowState("DrawBoardView Config");

    const scrollCtl = new ScrollbarController();

    const onBoardResized = (event: Event) => {
        const target = (event.target as HTMLCanvasElement);
        setBoardSize({
            w: target.width,
            h: target.height,
        });
    };

    const applyBoardSize = () => {
        const {w, h} = boardSize();
        board.offscreen.width = w;
        board.offscreen.height = h;
        setBoardSize({w, h}); // make sure buttons' disabling are applied
    };

    const isConfigBoardSizeEqualsTheActual = () => {
        const size = boardSize();
        return (size.w === board.offscreen.width) && (size.h === board.offscreen.height);
    };

    const applySampleDrawing = () => {
        const pen = board.getPen();
        const points = [
            { x: 100, y: 100 },
            { x: 150, y: 150 },
            { x: 200, y: 200 },
            { x: 250, y: 250 },
            { x: 250, y: 100 },
            { x: 100, y: 100 },
        ];
        for (const point of points) {
            pen.addPoint({ color: "black", lineWidth: 40, ...point });
        }
    };

    onMount(() => {
        board.offscreen.addEventListener("resize", onBoardResized);
        setBoardSize({ w: board.offscreen.width, h: board.offscreen.height });
    });

    onCleanup(() => {
        board.offscreen.removeEventListener("resize", onBoardResized);
    });

    return <Box sx={{flexGrow: 1}}>
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" component="div" sx={{flexGrow: 1}}>
                    New DrawBoard Testing Page
                </Typography>
                <IconButton
                    // @ts-expect-error: this value will be assigned before onMount
                    ref={moreIconButtonRef}
                    color="inherit"
                    onClick={() => setIsMoreMenuOpen(true)}>
                    <MoreVertIcon />
                </IconButton>
                <Popover
                    // @ts-expect-error: this value will be assigned before onMount
                    anchorEl={moreIconButtonRef}
                    open={isMoreMenuOpen()}
                    onClose={() => setIsMoreMenuOpen(false)}>
                    <Typography sx={{padding: "8px"}}>Available windows</Typography>
                    <Divider />
                    <List disablePadding>
                        <For each={[boardConfigWindowState, boardSampleDrawingWindowState, boardViewConfigWindowState]}>
                            {(state) => <ListItem disablePadding>
                                <ListItemButton onClick={() => state.setOpen(prev => !prev)}>
                                    <ListItemIcon><Checkbox checked={state.open()}/></ListItemIcon>
                                    <ListItemText primary={state.title()} />
                                </ListItemButton>
                            </ListItem>}
                        </For>
                        
                    </List>
                </Popover>
            </Toolbar>
        </AppBar>

        <Box sx={{
            outline: viewOutlineEnabled() ? "dashed red 2px" : undefined
        }}>
            <DrawBoardView board={board} scrollCtl={scrollCtl} />
        </Box>
        
        <StatefulOverlayWindow id="draw-board-config" state={boardConfigWindowState}>
            <Box sx={{padding: "24px"}}>
                <TextField
                    sx={{padding: "2px"}}
                    label="width"
                    variant="standard"
                    value={boardSize().w.toString()}
                    onChange={
                        event => 
                            setBoardSize(
                                ({h}) => ({w: new Number(event.target.value).valueOf(), h})
                            )
                    }
                />
                <TextField
                    sx={{padding: "2px"}}
                    label="height"
                    variant="standard"
                    value={boardSize().h.toString()}
                    onChange={
                        event => {
                            setBoardSize(
                                ({w}) => ({w, h: new Number(event.target.value).valueOf()})
                            );
                        }
                    }
                />
                <Box sx={{display: "flex"}}>
                    <Button onClick={() => {
                        setBoardSize({
                            w: board.offscreen.width,
                            h: board.offscreen.height,
                        });
                    }} disabled={isConfigBoardSizeEqualsTheActual()}>Cancel Changes</Button>
                    <Box sx={{flexGrow: 1}} />
                    <Button onClick={applyBoardSize} disabled={isConfigBoardSizeEqualsTheActual()}>Apply</Button>
                </Box>
            </Box>
        </StatefulOverlayWindow>

        <StatefulOverlayWindow id="draw-board-sample-drawings" state={boardSampleDrawingWindowState}>
            <Box sx={{ padding: "24px" }}>
                <List>
                    <ListItemButton onClick={() => board.reset()}><Typography>Clear</Typography></ListItemButton>
                    <ListItemButton onClick={() => applySampleDrawing()}><Typography>Basic</Typography></ListItemButton>
                </List>
            </Box>
        </StatefulOverlayWindow>

        <StatefulOverlayWindow id="draw-board-view-config" state={boardViewConfigWindowState}>
            <Box>
                <List>
                    <ListItem>
                        <Typography>Outline</Typography>
                        <ListItemSecondaryAction>
                            <Switch
                                value={viewOutlineEnabled()}
                                onChange={
                                    (ev, val) => setViewOutlineEnabled(val)
                                } />
                        </ListItemSecondaryAction>
                    </ListItem>
                </List>
            </Box>
        </StatefulOverlayWindow>
    </Box>;
};

export default DrawBoardPage;
