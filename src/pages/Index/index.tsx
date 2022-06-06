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
import { Component, For, Match, Show, Switch, createResource, createSignal } from "solid-js";
import { createSupabaseAuth } from "solid-supabase";
import { useBroadClient } from "../../helpers/BroadClient/solid";
import CardContent from "@suid/material/CardContent";
import Popover from "@suid/material/Popover";
import Divider from "@suid/material/Divider";
import Chip from "@suid/material/Chip";
import FaceIcon from "@suid/icons-material/Face";

const UserAvatar: Component = () => {//头像组件
    const auth = createSupabaseAuth();
    const user = auth.user();
    let buttomRef: HTMLButtonElement;
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
                            </List>
                        </Typography>
                    </CardContent>
                </Card>
            </Popover>
        </>
    );
};

const Index: Component = () => {
    const auth = createSupabaseAuth();
    const navigate = useNavigate();
    const broadCli = useBroadClient();

    const [roomName, setRoomName] = createSignal<string>("");

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
    const creating = async () => {
        console.log("creating");
        const user = auth.user();
        if (user) {
            await broadCli.createRoom(roomName());
            setRoomName("");
            await refetch();
        } else {
            navigate("/login");
        }
    };




    {/*-----------------------------------------*/ }
    const [open, setOpen] = createSignal(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    {/*-----------------------------------------*/ }

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
            position: "absolute",
            bottom: 50,
            padding: 0,
            paddingTop: 0,
        }}>
            <div>
                <Fab color="primary" aria-label="add" onClick={handleOpen}>
                    <AddIcon />
                </Fab>
                <Modal
                    open={open()}
                    onClose={handleClose}
                    aria-labelledby="modal-modal-title"
                    aria-describedby="modal-modal-description"
                >
                    <Card sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 350,
                        border: "0px solid #000",
                        p: 4,
                        padding: "15px",
                        paddingTop: "16px",
                        paddingBottom: 0,
                    }}>
                        <CardContent sx={{
                            padding: 0,
                        }}>
                            <List disablePadding>
                                <ListItem disablePadding>
                                    <TextField sx={{ width: "100%" }} label="RoomName" variant="standard"
                                        onChange={(_, val: string) => setRoomName(val)}
                                        helperText="Please input your Room name" value={roomName()}> </TextField>
                                </ListItem>
                            </List>
                        </CardContent>
                        <CardActions>
                            <Box sx={{
                                width: "100%",
                                padding: "5px",
                            }} />
                            <Button sx={{
                                width: "50%",
                                padding: "5px",
                            }} onClick={async () => {
                                setOpen(false);
                                await creating();
                            }}>create&nbspRoom</Button>
                        </CardActions>
                    </Card>
                </Modal>
            </div>
        </Box>
        {/*--------------------FAB---------------------*/}

        {/*--------------------List---------------------*/}
        <div >
            <Box sx={{ ml: "50%", transform: "translate(-50%, 0)", padding: 0, marginTop: "60px" }}>
                <Card sx={{ minWidth: 600, ml: "50%", transform: "translate(-50%,0)" }}>
                    <CardContent sx={{ padding: 0 }} style="padding: 0;">
                        <TextField sx={{ width: "100%" }} placeholder="房间ID"></TextField>
                    </CardContent>
                </Card>

                <Card sx={{ minWidth: 500, ml: "50%", transform: "translate(-50%,0)", marginTop: "30px" }}>
                    <CardContent sx={{ padding: 0 }} style="padding: 0;">
                        <List sx={{ padding: 0 }}>
                            <For each={rooms()} fallback={<List>No rooms here.</List>}>
                                {
                                    (item) => {
                                        return <>
                                            <ListItem >
                                                房间名字 :"{item.name}"
                                                <div class="Cchip"><Chip icon={<FaceIcon />} label="...房主信息..." sx={{ ml: "200px" }}></Chip></div>
                                            </ListItem>
                                            <Divider></Divider>
                                        </>;
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
