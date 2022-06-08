import AppBar from "@suid/material/AppBar";
import Box from "@suid/material/Box";
import IconButton from "@suid/material/IconButton";
import Toolbar from "@suid/material/Toolbar";
import { useNavigate, useParams } from "solid-app-router";
import { Component, Show, createEffect, createResource, createSignal, onCleanup, onMount } from "solid-js";
import { useBroadClient } from "../../helpers/BroadClient/solid";
import CloseIcon from "@suid/icons-material/Close";
import Typography from "@suid/material/Typography";
import { Participant, Room, RoomOpts } from "../../helpers/BroadClient";
import Modal from "@suid/material/Modal";
import Card from "@suid/material/Card";
import CardContent from "@suid/material/CardContent";
import Button from "@suid/material/Button";
import List from "@suid/material/List";
import ListItem from "@suid/material/ListItem";
import DrawBroad, { ContextMenuEvent, DrawBroadController, DrawTool, DrawPoint, DrawEvent } from "../../widgets/DrawBroad";
import PersonIcon from "@suid/icons-material/Person";
import Popover from "@suid/material/Popover";
import { Peer, Router } from "../../helpers/mesh";
import { SupabaseDatachannel } from "../../helpers/mesh/supabase";
import LinkIcon from "@suid/icons-material/Link";
import LinkOffIcon from "@suid/icons-material/LinkOff";
import { Frame, Message } from "../../helpers/mesh/datachannel";

const DEFAULT_DRAWING_SIZE_X = 3000;
const DEFAULT_DRAWING_SIZE_Y = 3000;

const PROTO_TYPE_SEND_DRAWING = 302;

enum RoomStatus {
    "Unknown",
    "Found",
    "Joined",
    "NotFound",
}

const RoomJoiningNotice: Component<{open: boolean}> = (props) => {
    return <Modal open={props.open}>
        <Card
            sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                maxWidth: "650px",
            }}>
            <CardContent sx={{textAlign: "center"}}>
                <Typography>Communicating with Magicbroad...</Typography>
            </CardContent>
        </Card>
    </Modal>;
};

const RoomNotFoundDialog: Component<{open: boolean}> = (props) => {
    const navigate = useNavigate();

    return <Modal open={props.open}>
        <Card
            sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                maxWidth: "650px",
            }}>
            <CardContent>
                <Typography variant="h6">The Room is Missing</Typography>
                <Typography>We could not found the room you want. The owner might have been deleted the room.</Typography>
            </CardContent>
            <List>
                <ListItem sx={{paddingLeft: 0, paddingRight: 0}}>
                    <Button variant="text" sx={{width: "100%", justifyContent: "flex-end"}} onClick={() => navigate("/")}>
                        <Typography sx={{marginRight: "20px"}} component="div">Go to the Home Page</Typography>
                    </Button>
                </ListItem>
            </List>
        </Card>
    </Modal>;
};

interface ContextMenuProps {
    position: undefined | [number, number],
    onClose: (() => void),
    currentDrawingTool: DrawTool,
    onChangingDrawingTool: ((newTool: DrawTool) => void),
}

const ContextMenu: Component<ContextMenuProps> = (props) => {
    const buildContextMenuAnchorPos = () => {
        const [left, top] = props.position as [number, number];
        return {left, top};
    };

    const itemSx = {cursor: "pointer"};

    return <Popover
        open={typeof props.position !== "undefined"}
        anchorReference="anchorPosition"
        anchorPosition={buildContextMenuAnchorPos()}
        onClose={() => props.onClose()}
    >
        <List>
            <ListItem sx={itemSx} onClick={() => props.onChangingDrawingTool(DrawTool.pen)}>
                <Typography>Pen</Typography><Show when={props.currentDrawingTool === DrawTool.pen}>*</Show>
            </ListItem>
            <ListItem sx={itemSx} onClick={() => props.onChangingDrawingTool(DrawTool.erase)}>
                <Typography>Erase</Typography><Show when={props.currentDrawingTool === DrawTool.erase}>*</Show>
            </ListItem>
            <ListItem sx={itemSx} onClick={() => props.onChangingDrawingTool(DrawTool.hand)}>
                <Typography>Move</Typography><Show when={props.currentDrawingTool === DrawTool.hand}>*</Show>
            </ListItem>
        </List>
    </Popover>;
};

const RoomPage: Component = () => {
    const params = useParams();
    const broadCli = useBroadClient();
    const navigate = useNavigate();
    const [status, setStatus] = createSignal<RoomStatus>(RoomStatus.Unknown);
    const [roomInfo, setRoomInfo] = createSignal<Room>();
    const [currentDrawingTool, setCurrentDrawingTool] = createSignal<DrawTool>(DrawTool.pen);
    const [contextMenuPos, setContextMenuPos] = createSignal<[number, number] | undefined>();
    const [gRouter, setGRouter] = createSignal<Router>();
    const drawCtl = new DrawBroadController("black", 20);

    const strokes: Map<string, DrawPoint[]> = new Map();

    const [participants, participantsCtl] = createResource<Participant[]>(() => {
        const room = roomInfo();
        if (room) {
            return broadCli.getParticipants(room.id);
        }
        return [];
    });

    const [roomOpts, roomOptsCtl] = createResource<RoomOpts | undefined>(() => {
        const room = roomInfo();
        if (room) {
            return (broadCli.getRoomOpts(room.id)
                .then(async (opts) => {
                    if (!(opts.size_x && opts.size_y)) {
                        await broadCli.setRoomOpts(room.id, {size_x: DEFAULT_DRAWING_SIZE_X, size_y: DEFAULT_DRAWING_SIZE_Y});
                        return await broadCli.getRoomOpts(room.id);
                    } else {
                        return opts;
                    }
                }));
        }
        return Promise.resolve(undefined);
    });

    const onBroadContextMenu = (e: ContextMenuEvent) => {
        setContextMenuPos([e.pageX, e.pageY]);
    };

    const getStroke = (peerId: string): DrawPoint[] => {
        const stroke = strokes.get(peerId);
        if (typeof stroke === "undefined") {
            strokes.set(peerId, []);
            return getStroke(peerId);
        } else {
            return stroke;
        }
    };

    const onDataReceived = (message: Message) => {
        if (message.message.length >= 1) {
            const codeFrame = message.message[0];
            if (codeFrame.isUInt()) {
                const code = codeFrame.toUInt();
                console.log(code);
                if ((code === PROTO_TYPE_SEND_DRAWING) && message.message.length >= 5) {
                    const [, xFrame, yFrame, lineWidthFrame, colorFrame] = message.message;
                    const point: DrawPoint = {
                        x: xFrame.toUInt(),
                        y: yFrame.toUInt(),
                        lineWidth: lineWidthFrame.toUInt(),
                        color: colorFrame.toString(),
                    };
                    const stroke = getStroke(message.srcUserDeviceId);
                    stroke.push(point);
                    drawCtl.draw(stroke);
                } else if (code === PROTO_TYPE_SEND_DRAWING && message.message.length >= 2) {
                    strokes.set(message.srcUserDeviceId, []);
                }
            }
        }
    };

    const onDrawing = (stroke: DrawPoint[]) => {
        const point = stroke[stroke.length-1];
        const routerg = gRouter();
        if (routerg) {
            routerg.broadcast([
                Frame.fromUInt(PROTO_TYPE_SEND_DRAWING, true),
                Frame.fromUInt(point.x, true),
                Frame.fromUInt(point.y, true),
                Frame.fromUInt(point.lineWidth, true),
                Frame.fromString(point.color, false),
            ], true);
        }
    };

    const onDrawingEnd = () => {
        const routerg = gRouter();
        if (routerg) {
            routerg.broadcast([
                Frame.fromUInt(PROTO_TYPE_SEND_DRAWING, true),
                Frame.zero(0),
            ], true);
        }
    };

    const connectMesh = (roomId: string) => {
        const alterChan = SupabaseDatachannel.ofRoom(broadCli.supabase, roomId, broadCli.getUserDeviceId());
        const router = new Router(broadCli.getUserDeviceId(), alterChan, roomId);
        router.bus.on("addpeer", (peer: Peer) => {
            console.log("addpeer", peer);
        });
        router.bus.on("removepeer", (peer: Peer) => {
            peer.disconnect();
        });
        router.bus.on("data", onDataReceived);
        return router;
    };

    onMount(async () => {
        const room = await broadCli.findRoomById(params.id);
        if (room) {
            setStatus(RoomStatus.Found);
            setRoomInfo(room);
            if (!await broadCli.isJoinedRoomById(room.id)) {
                await broadCli.joinRoomById(room.id);
            }
            setStatus(RoomStatus.Joined);
            roomOptsCtl.refetch();
        } else {
            setStatus(RoomStatus.NotFound);
        }
    });

    createEffect(() => {
        if (status() === RoomStatus.Joined) {
            participantsCtl.refetch();
        }
    });

    createEffect(() => {
        drawCtl.setTool(currentDrawingTool());
    });

    createEffect(() => {
        const opts = roomOpts();
        if (opts) {
            if (opts.size_x && opts.size_y) {
                drawCtl.setOffscreenSize([opts.size_x, opts.size_y]);
            }
        } else {
            roomOptsCtl.refetch();
        }
    });

    createEffect(() => {
        const room = roomInfo();
        if (room) {
            setGRouter(prev => {
                if (prev && prev.roomId !== room.id) {
                    prev.stop();
                    return connectMesh(room.id);
                } else if (typeof prev === "undefined") {
                    return connectMesh(room.id);
                } else {
                    return prev;
                }
            });
        }
    });

    createEffect(() => {
        const routerg = gRouter();
        if (routerg) {
            routerg.broadcastPeerList();
        }
    });

    onCleanup(() => {
        const routerg = gRouter();
        if (routerg) {
            routerg.stop();
        }
    });

    const shouldShowJoiningNotice = () => status() === RoomStatus.Unknown || status() === RoomStatus.Found;

    const shouldShowRoomNotFound = () => status() === RoomStatus.NotFound;
    
    return <>
        <RoomJoiningNotice open={shouldShowJoiningNotice()} />
        <RoomNotFoundDialog open={shouldShowRoomNotFound()} />
        <ContextMenu
            position={contextMenuPos()}
            onClose={() => setContextMenuPos()}
            currentDrawingTool={currentDrawingTool()}
            onChangingDrawingTool={(newTool) => setCurrentDrawingTool(newTool)}
        />
        <Box sx={{flexGrow: 1}}>
            <AppBar position="absolute" color="transparent">
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="close"
                        sx={{mr: 2}}
                        onClick={() => navigate("/")}
                    ><CloseIcon /></IconButton>
                    <Typography variant="h6" component="div" sx={{flexGrow: 1}}>
                        {() => roomInfo()?.name}
                    </Typography>
                    <Button size="large" color="inherit" variant="text">
                        <Show when={gRouter()} fallback={<LinkOffIcon />}><LinkIcon /></Show>
                    </Button>
                    <Button
                        size="large" color="inherit" variant="text">
                        <PersonIcon />{participants.loading? "..." : participants()?.length}
                    </Button>
                </Toolbar>
            </AppBar>
        </Box>
        <DrawBroad
            ctl={drawCtl}
            onContextMenu={onBroadContextMenu}
            onStart={onDrawing}
            onDrawing={onDrawing}
            onEnd={onDrawingEnd}
        />
    </>;
};

export default RoomPage;
