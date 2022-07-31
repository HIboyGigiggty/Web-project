import Box from "@suid/material/Box";
import Button from "@suid/material/Button";
import Paper from "@suid/material/Paper";
import Popper, { PopperProps } from "@suid/material/Popper";
import Typography from "@suid/material/Typography";
import { Accessor, Component, JSX, Setter, Show, createEffect, createSignal } from "solid-js";
import CloseIcon from "@suid/icons-material/Close";

export interface OverlayWindowProps {
    id: string,
    title?: string,
    open: boolean,
    children?: JSX.Element,
    position: {x: number, y: number},
    onClose?: ((event: Record<string, never>) => void),
    onPositionChanging?: ((newPosition: {x: number, y: number}) => void),
}

export const OverlayWindow: Component<OverlayWindowProps> = (props) => {
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

export class OverlayWindowState {
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

export interface StatefulOverlayWindow {
    id: string,
    state: OverlayWindowState,
    children?: JSX.Element,
}

export const StatefulOverlayWindow: Component<StatefulOverlayWindow> = (props) => {
    return <OverlayWindow
        id={props.id}
        open={props.state.open()}
        title={props.state.title()}
        position={props.state.position()}
        onPositionChanging={(pos) => props.state.setPosition(pos)}
        onClose={() => props.state.setOpen(false)}
    >{props.children}</OverlayWindow>;
};
