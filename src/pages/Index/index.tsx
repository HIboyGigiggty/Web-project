import Button from "@suid/material/Button";
import TextField from "@suid/material/TextField";
import AppBar from "@suid/material/AppBar";
import Box from "@suid/material/Box";
import Toolbar from "@suid/material/Toolbar";
import Typography from "@suid/material/Typography";
import Fab from "@suid/material/Fab";
import AddIcon from "@suid/icons-material/Add";
import Card from "@suid/material/Card";
import List from "@suid/material/List";
import Avatar from "@suid/material/Avatar";
import CardActions from "@suid/material/CardActions";
import Modal from "@suid/material/Modal";
import ListItem from "@suid/material/ListItem";
import { Navigate, useNavigate } from "solid-app-router";
import { Component, For, Match, Show, Switch, createEffect, createResource, createSignal } from "solid-js";
import { createSupabaseAuth } from "solid-supabase";
import { useBroadClient } from "../../helpers/BroadClient/solid";
import CardContent from "@suid/material/CardContent";
import Popover from "@suid/material/Popover";
import Chip from "@suid/material/Chip";
import ListItemText from "@suid/material/ListItemText";
import { Room } from "../../helpers/BroadClient";
import Divider from "@suid/material/Divider";

const UserAvatar: Component = () => {//头像组件
    const auth = createSupabaseAuth();
    const user = auth.user();
    let buttomRef: HTMLButtonElement;
    const navigate = useNavigate();
    const UserSignOut = async () => {
        await auth.signOut();
        navigate("/login");
    };
    const [datailPopoverOpen, setdatailPopoverOpen] = createSignal<boolean>(false);
    return (
        <>
            <Button
                variant="contained"
                size="small"
                onClick={() => setdatailPopoverOpen(true)}
                //@ts-expect-error :The value is assigned by SolidJS when it is used
                ref={buttomRef}

                disableElevation
                disableRipple
                sx={{
                    padding: 0,
                    minWidth: "25px",
                }}
            >
                <Switch fallback={<Avatar>?</Avatar>}>
                    <Match when={user?.user_metadata.avatar_url}>
                        <Avatar src={user?.user_metadata.avatar_url} />
                    </Match>
                </Switch>
            </Button>
            <Popover
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left"
                }}
                open={datailPopoverOpen()}

                onClose={() => setdatailPopoverOpen(false)}
                //@ts-expect-error :The value is assigned by SolidJS when it is used
                anchorEl={buttomRef}
            >
                <Card>
                    <CardContent sx={{ padding: 0 }} style="padding: 0;">
                        <Typography sx={{
                            padding: 0
                        }}>
                            <List sx={{
                                padding: 0,
                            }}>
                                <ListItem sx={{
                                    padding: 0
                                }}>
                                    用户ID:<br></br>
                                    {user?.id}

                                </ListItem>
                                <Divider></Divider>
                            </List>
                        </Typography>
                    </CardContent >
                    <CardContent sx={{ padding: 0 }} style="padding:10px">
                        <Button color="error" variant="contained" size="small" sx={{ ml: "35%" }} onClick={UserSignOut}>SIGN OUT</Button>
                    </CardContent>

                </Card>
            </Popover>
        </>
    );
};

interface RoomListItemProps {
    name: string;
    owner_id: string;
    room_id: string;
    onClick?: ((event: Record<string, never>, room_id: string) => void);
}

const RoomListItem: Component<RoomListItemProps> = (props) => {
    const auth = createSupabaseAuth();

    const [ownerName, ownerNameCtl] = createResource<string, string>(() => props.owner_id, (owner_id: string) => {
        const user = auth.user();
        if (user) {
            if (user.id === owner_id) {
                if (typeof user.user_metadata["name"] === "string") {
                    return user.user_metadata["name"];
                }
            }
        }
        return owner_id;
    }, { initialValue: "You" });

    createEffect(() => {
        ownerNameCtl.refetch(props.owner_id);
    });

    return <>
        <ListItem divider onClick={() => {
            if (props.onClick) {
                props.onClick({}, props.room_id);
            }
        }} sx={{ cursor: "pointer" }}>
            <ListItemText
                primary={<Typography sx={{ marginBottom: "8px" }}>{props.name}</Typography>}
                secondary={
                    <Chip icon={
                        <Switch fallback={<Avatar>?</Avatar>}>
                            <Match when={auth.user()?.user_metadata.avatar_url}>
                                <Avatar sizes="small" sx={{ maxHeight: "24px", maxWidth: "24px" }} src={auth.user()?.user_metadata.avatar_url} />
                            </Match>
                        </Switch>
                    } label={ownerName()}></Chip>
                }
            />
        </ListItem>
    </>;
};

interface RoomCreatingDialogProps {
    open: boolean,
    onClose: ((event: Record<string, never>, reason: "backdropClick" | "escapeKeyDown" | "roomCreated") => void),
    onRoomCreated: ((room: Room) => void),
    onSignInNeeded: (() => void),
}

const RoomCreatingDialog: Component<RoomCreatingDialogProps> = (props) => {
    const [roomName, setRoomName] = createSignal<string>("");
    const [isCreating, setIsCreating] = createSignal<boolean>(false);

    const broadCli = useBroadClient();
    const auth = createSupabaseAuth();

    const creating = async () => {
        setIsCreating(true);
        const user = auth.user();
        if (user) {
            const room = await broadCli.createRoom(roomName());
            setRoomName("");
            props.onRoomCreated(room);
        } else {
            props.onSignInNeeded();
        }
        setIsCreating(false);
    };

    return <Modal
        open={props.open}
        onClose={(event, reason) => props.onClose(event, reason)}
    >
        <Card sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 350,
            border: "0px solid #000",
            p: 4,
            padding: "24px",
            paddingBottom: "8px",
        }}>
            <CardContent sx={{ padding: 0, marginBottom: "28px" }}>
                <Typography variant="h6">New Room</Typography>
                <List>
                    <ListItem disablePadding>
                        <TextField sx={{ width: "100%" }} label="Name" variant="standard" disabled={isCreating()}
                            onChange={(_, val: string) => setRoomName(val)} value={roomName()}> </TextField>
                    </ListItem>
                </List>
            </CardContent>
            <CardActions>
                <Box sx={{
                    width: "100%",
                }} />
                <Button sx={{
                    width: "fit-content",
                    paddingLeft: "24px",
                    paddingRight: "24px",
                }} onClick={async () => {
                    await creating();
                    props.onClose({}, "roomCreated");
                }} disabled={isCreating()}>{isCreating() ? "Creating..." : "Create"}</Button>
            </CardActions>
        </Card>
    </Modal>;
};

const Index: Component = () => {
    const auth = createSupabaseAuth();
    const navigate = useNavigate();
    const broadCli = useBroadClient();

    const getAllRooms = async () => {
        const user = auth.user();
        if (user) {
            return await broadCli.getAllRooms();
        } else {
            navigate("/login");
        }
    };

    const [rooms, { refetch }] = createResource(getAllRooms, {
        initialValue: []
    });

    const [open, setOpen] = createSignal(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const onSignInNeeded = () => {
        navigate("/login");
    };

    const onNavigateRoom = (event: Record<string, never>, room_id: string) => {
        navigate(`/rooms/${room_id}`);
    };

    return <Show when={auth.user()} fallback={<Navigate href="/login" />}>
        {/*---------------------App bar--------------------*/}
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>

                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        画板
                    </Typography>
                    <UserAvatar />
                </Toolbar>
            </AppBar>
        </Box>
        {/*-------------------App bar----------------------*/}

        {/*---------------------FAB--------------------*/}
        <Box sx={{
            right: 40,
            position: "fixed",
            bottom: 50,
            padding: 0,
            paddingTop: 0,
            zIndex: 99,
        }}>
            <div>
                <Fab color="primary" aria-label="add" onClick={handleOpen}>
                    <AddIcon />
                </Fab>
                <RoomCreatingDialog open={open()} onClose={handleClose} onRoomCreated={() => refetch()} onSignInNeeded={onSignInNeeded} />
            </div>
        </Box>
        {/*--------------------FAB---------------------*/}

        {/*--------------------List---------------------*/}
        <div >
            <Box sx={{ ml: "50%", transform: "translate(-50%, 0)", padding: 0, marginTop: "60px" }}>
                <Card sx={{ minWidth: "120%", ml: "50%", transform: "translate(-50%,0)", width: "auto" }}>
                    <CardContent sx={{ padding: 0 }} style="padding: 0;">
                        <TextField sx={{ width: "100%" }} placeholder="房间ID"></TextField>
                    </CardContent>
                </Card>

                <Card sx={{ minWidth: "110%", ml: "50%", transform: "translate(-50%,0)", marginTop: "30px", width: "auto", height: "auto" }}>
                    <CardContent sx={{ padding: 0 }} style="padding: 0;">
                        <List sx={{ padding: 0 }}>
                            <For each={rooms()} fallback={<List>No rooms here.</List>}>
                                {
                                    (item) => {
                                        return <RoomListItem owner_id={item.owner} name={item.name} room_id={item.id} onClick={onNavigateRoom} />;
                                    }
                                }
                            </For>
                        </List>
                    </CardContent>
                </Card>
            </Box>
        </div>

        {/*------------------List-----------------------*/}

    </Show>;
};

export default Index;
