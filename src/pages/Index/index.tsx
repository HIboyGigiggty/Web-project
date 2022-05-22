import Button from "@suid/material/Button";
import TextField from "@suid/material/TextField";
import { Navigate, useNavigate } from "solid-app-router";
import { Component, For, Show, createResource, createSignal } from "solid-js";
import { createSupabaseAuth } from "solid-supabase";
import { useBroadClient } from "../../helpers/BroadClient/solid";

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
    const [rooms, {refetch}] = createResource(getAllRooms, {
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
    return <Show when={auth.user()} fallback={<Navigate href="/login" />}>
        <Button class="button1" onClick={() => navigate("/user")}>User Infomation</Button><br></br>
        <TextField class="testfield1" label="RoomName" helperText="Plz input your Room name" value={roomName()} onChange={(_, val) => setRoomName(val)}></TextField>
        <Button onClick={creating} >Create Room</Button>
        <Show when={!rooms.loading} fallback={<p>Loading rooms</p>}>
            <For each={rooms()} fallback={<p>No rooms here.</p>}>
                {
                    (item) => {
                        return <p>Room {item.id}: name "{item.name}", owner {item.owner}, created_at {item.created_at}</p>;
                    }
                }
            </For>
        </Show>
        <style jsx>
            {`
            .button1{
                background-color:blue;
                color: white;
                border: none;
                font-size: 20px;
                }
            .textfield1{
                border: none;
                }
            `}
        </style>
    </Show>;
};

export default Index;
