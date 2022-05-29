import Button from "@suid/material/Button";
import TextField from "@suid/material/TextField";
import AppBar from "@suid/material/AppBar";
import Box from "@suid/material/Box";
import IconButton from "@suid/material/IconButton";
import Toolbar from "@suid/material/Toolbar";
import Typography from "@suid/material/Typography";
import MenuIcon from "@suid/icons-material/Menu";
import Fab from "@suid/material/Fab";
import AddIcon from "@suid/icons-material/Add";
import Card from "@suid/material/Card";
import List from "@suid/material/List";
import Avatar from "@suid/material/Avatar";

import { Navigate, useNavigate } from "solid-app-router";
import { Component, For, Show, createResource, createSignal } from "solid-js";
import { createSupabase, createSupabaseAuth } from "solid-supabase";
import BroadClient from "../../helpers/BroadClient";
import CardContent from "@suid/material/CardContent";



const useBroadClient = () => {
    const supabase = createSupabase();

    return new BroadClient(supabase);
};

const Index: Component = () => {
    const auth = createSupabaseAuth();
    const navigate = useNavigate();
    const broadCli = useBroadClient();

    const [roomName, setRoomName] = createSignal<string>("");

    const getAllRooms = async () => {//获取所以房间
        const user = auth.user();
        if (user) {
            return await broadCli.getAllRooms();
        } else {
            navigate("/login");
        }
    };
    const [rooms, {refetch}] = createResource(getAllRooms, {
        initialValue: []
    });
    const creating = async () => {//创建房间方法
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

    const AlterAnThings =async() =>{
        window.alert("开发中！");
    };

    return <Show when={auth.user()} fallback={<Navigate href="/login" />}>
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        画板
                    </Typography>
                    <Avatar>
                        <Button onClick={AlterAnThings}>
                            H
                        </Button>
                    </Avatar>
                </Toolbar>
            </AppBar>
        </Box>

        <Box sx={{
            right:40,
            position:"absolute",
            bottom:50,
        }}>
            <Fab color="primary" aria-label="add">
                <AddIcon onClick={AlterAnThings}/>
            </Fab>
        </Box>

        <Box sx={{ml: "50%", transform: "translate(-50%, 0)", width: "fit-content", padding:0}} >
            <Card sx={{ minWidth: 275 }}>
                <CardContent>
                    <Typography>
                        <TextField variant="standard" placeholder="房间ID"></TextField>
                    </Typography>
                </CardContent>
            </Card>
        </Box>

        <Box sx={{ml: "50%", transform: "translate(-50%, 0)", width: "fit-content", padding:0}}>
            <Card sx={{padding:0,minWidth:275}}>
                <CardContent>                
                    <Typography>
                        <List>
                            <For each={rooms()} fallback={<List>No rooms here.</List>}>
                                {
                                    (item) => {
                                        return <List> 房间名字 :"{item.name}"</List>;
                                    }
                                }
                            </For>
                        </List>
                    </Typography>                    
                </CardContent>
            </Card>
        </Box>

        <TextField class="testfield1" label="RoomName" helperText="Plz input your Room name" value={roomName()} onChange={(_, val) => setRoomName(val)}></TextField>

        <Button onClick={creating} >Create Room</Button><br></br>
        
        <Show when={!rooms.loading} fallback={<p>Loading rooms</p>}>
        </Show>
    </Show>;
};

export default Index;
