import AppBar from "@suid/material/AppBar";
import Box from "@suid/material/Box";
import Toolbar from "@suid/material/Toolbar";
import Typography from "@suid/material/Typography";
import Popper, { PopperProps } from "@suid/material/Popper";
import { Accessor, Component, For, JSX, Setter, Show, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { DrawBoard } from "../../widgets/DrawBroad/board";
import Paper from "@suid/material/Paper";
import CloseIcon from "@suid/icons-material/Close";
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

interface OverlayWindowProps {
    id: string,
    title?: string,
    open: boolean,
    children?: JSX.Element,
    position: {x: number, y: number},
    onClose?: ((event: Record<string, never>) => void),
    onPositionChanging?: ((newPosition: {x: number, y: number}) => void),
}

const OverlayWindow: Component<OverlayWindowProps> = (props) => {
    const [anchorEl, setAnchorEl] = createSignal<PopperProps["anchorEl"]>(null);

    const getId = () => (props.open ? props.id : undefined);

    const onMouseMoving = (event: MouseEvent) => {
        if (props.onPositionChanging) {
            props.onPositionChanging({
                x: event.pageX,
                y: event.pageY - 12,
            });
        }
    };

    createEffect(() => {
        const {x, y} = props.position;
        const object = {
            width: 0,
            height: 0,
            top: y,
            right: x,
            bottom: y,
            left: x,
            x: x,
            y: y,
            toJSON: () => {
                return object;
            },
        };
        setAnchorEl({
            getBoundingClientRect: () => object,
        });
    });

    return <Popper
        id={getId()}
        open={props.open}
        anchorEl={anchorEl()}
    >
        <Paper elevation={3}>
            <Box
                sx={{
                    height: "24px",
                    width: "100%",
                    minWidth: "240px",
                    display: "flex",
                    cursor: "move",
                }}
                backgroundColor="primary.light"
                onMouseDown={() => {
                    document.addEventListener("mousemove", onMouseMoving);
                }}
                onMouseUp={() => {
                    document.removeEventListener("mousemove", onMouseMoving);
                }}
            >
                <Typography component="div" sx={{flexGrow: 1, userSelect: "none"}} color="inherit">{props.title? props.title: ""}</Typography>
                <Show when={!!props.onClose}>
                    <Button
                        variant="text"
                        disableRipple
                        disableFocusRipple
                        disableTouchRipple
                        disableElevation
                        color="inherit"
                        sx={{minWidth: undefined, height: "24px", width: "24px"}}
                        onClick={() => {
                            if (props.onClose) {
                                props.onClose({});
                            }
                        }}
                    ><CloseIcon /></Button>
                </Show>
            </Box>
            {props.children}
        </Paper>
    </Popper>;
};

class OverlayWindowState {
    open: Accessor<boolean>;
    setOpen: Setter<boolean>;
    title: Accessor<string | undefined>;
    setTitle: Setter<string | undefined>;
    position: Accessor<{x: number, y: number}>;
    setPosition: Setter<{x: number, y: number}>;

    constructor(defauleTitle?: string, defaultOpen = false, defaultPosition = {x: window.innerWidth / 2, y: window.innerHeight / 2}) {
        const [open, setOpen] = createSignal<boolean>(defaultOpen);
        this.open = open;
        this.setOpen = setOpen;
        const [title, setTitle] = createSignal<string | undefined>(defauleTitle);
        this.title = title;
        this.setTitle = setTitle;
        const [position, setPosition] = createSignal<{x: number, y: number}>(defaultPosition);
        this.position = position;
        this.setPosition = setPosition;
    }
}

interface StatefulOverlayWindow {
    id: string,
    state: OverlayWindowState,
    children?: JSX.Element,
}

const StatefulOverlayWindow: Component<StatefulOverlayWindow> = (props) => {
    return <OverlayWindow
        id={props.id}
        open={props.state.open()}
        title={props.state.title()}
        position={props.state.position()}
        onPositionChanging={(pos) => props.state.setPosition(pos)}
        onClose={() => props.state.setOpen(false)}
    >{props.children}</OverlayWindow>;
};

const DrawBoardPage: Component = () => {
    const [isMoreMenuOpen, setIsMoreMenuOpen] = createSignal<boolean>(false);
    const [boardSize, setBoardSize] = createSignal<{w: number, h: number}>({w: 0, h: 0});

    let moreIconButtonRef: HTMLButtonElement;

    const board = new DrawBoard(document.createElement("canvas"));
    const boardConfigWindowState = new OverlayWindowState("DrawBoard Config");

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

    onMount(() => {
        board.offscreen.addEventListener("resize", onBoardResized);
        setBoardSize({w: board.offscreen.width, h: board.offscreen.height});
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
                        <For each={[boardConfigWindowState]}>
                            {(state) => <ListItem disablePadding>
                                <ListItemButton onClick={() => state.setOpen(prev => !prev)}>
                                    <ListItemIcon><Checkbox checked={state.open()}/></ListItemIcon>
                                    <ListItemText primary={state.title()}></ListItemText>
                                </ListItemButton>
                            </ListItem>}
                        </For>
                        
                    </List>
                </Popover>
            </Toolbar>
        </AppBar>

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
    </Box>;
};

export default DrawBoardPage;
