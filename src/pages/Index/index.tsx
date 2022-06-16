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
import ListItemAvatar from "@suid/material/ListItemAvatar";
import { User } from "@supabase/supabase-js";
import { Theme } from "@suid/material";
import SxProps from "@suid/system/sxProps";
import AccountCircle from "@suid/icons-material/AccountCircle";
import IconButton from "@suid/material/IconButton";

const getNavigatePath = (path: string, search?: Record<string, string>) => {
    if (search) {
        path += "?";
        for (const k in search) {
            path += `${encodeURIComponent(k)}=${encodeURIComponent(search[k])}`;
        }
    }
    return path;
};

const UserAvatar: Component<{user: User | null, sizes?: string, sx?: SxProps<Theme>}> = (props) => {
    return <Switch fallback={<Avatar sx={props.sx} style="background-color: initial;"><AccountCircle sx={{width: "100%", height: "100%"}}/></Avatar>}>
        <Match when={props.user?.user_metadata.avatar_url}>
            <Avatar src={props.user?.user_metadata.avatar_url} sizes={props.sizes} sx={props.sx} />
        </Match>
    </Switch>;
};

const UserInfoAvatarButton: Component = () => {//头像组件
    const auth = createSupabaseAuth();
    const navigate = useNavigate();
    const [datailPopoverOpen, setdatailPopoverOpen] = createSignal<boolean>(false);

    const user = auth.user();
    let buttonRef: HTMLButtonElement;


    const userSignOut = async () => {
        await auth.signOut();
        navigate(getNavigatePath("/login", {next: "/"}));
    };

    const getName = () => {
        if (typeof user?.app_metadata?.name !== "undefined") {
            return user?.app_metadata?.name;
        } else {
            return "You";
        }
    }; 

    return (
        <>
            <IconButton
                size="small"
                onClick={() => setdatailPopoverOpen(true)}
                //@ts-expect-error :The value is assigned by SolidJS when it is used
                ref={buttonRef}
            >
                <UserAvatar user={user} />
            </IconButton>
            <Popover
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left"
                }}
                open={datailPopoverOpen()}

                onClose={() => setdatailPopoverOpen(false)}
                //@ts-expect-error :The value is assigned by SolidJS when it is used
                anchorEl={buttonRef}
            >
                <Card>
                    <CardContent>
                        <List disablePadding>
                            <ListItem disablePadding>
                                <ListItemAvatar children={<UserAvatar user={user}/>} />
                                <ListItemText primary={getName()} secondary={user?.id || "Unknown ID"} />
                            </ListItem>
                        </List>
                    </CardContent >
                    <Divider />
                    <CardActions sx={{ justifyContent: "end" }}>
                        <Button sx={{padding: "8px"}} color="error" variant="text" size="small" onClick={userSignOut}>
                            Sign out
                        </Button>
                    </CardActions>

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

    const smallAvatarSx = {
        maxWidth: "24px",
        maxHeight: "24px",
    };

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
                        <UserAvatar user={auth.user()?.id === props.owner_id ? auth.user(): null} sizes="small" sx={smallAvatarSx} />
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
            navigate(getNavigatePath("/login", {next: "/"}));
        }
    };

    const [rooms, { refetch }] = createResource(getAllRooms, {
        initialValue: []
    });

    const [open, setOpen] = createSignal(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const onSignInNeeded = () => {
        navigate(getNavigatePath("/login", {next: "/"}));
    };

    const onNavigateRoom = (event: Record<string, never>, room_id: string) => {
        navigate(`/rooms/${room_id}`);
    };

    return <Show when={auth.user()} fallback={<Navigate href={getNavigatePath("/login", {next: "/"})} />}>
        {/*---------------------App bar--------------------*/}
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>

                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        画板
                    </Typography>
                    <UserInfoAvatarButton />
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
