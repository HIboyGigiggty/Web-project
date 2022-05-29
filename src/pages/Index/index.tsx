import Button from "@suid/material/Button";
import TextField from "@suid/material/TextField";
import { Navigate, useNavigate } from "solid-app-router";
import { Component, createResource, Show, For, createSignal } from "solid-js";
import { createSupabase, createSupabaseAuth } from "solid-supabase";
import BroadClient from "../../helpers/BroadClient";

const useBroadClient = () => {
    const supabase = createSupabase();

    return new BroadClient(supabase);
}

const Index: Component = () => {
    const auth = createSupabaseAuth();
    const supabase = createSupabase();
    const navigate = useNavigate();
    const broadCli = useBroadClient();

    let [roomName, setRoomName] = createSignal<string>("")

    let getAllRooms = async () => {
        let user = auth.user();
        if (user) {
            return await broadCli.getAllRooms();
        } else {
            navigate("/login")
        }
    }
    let [rooms, {refetch}] = createResource(getAllRooms, {
        initialValue: []
    });
    const creating = async () => {
        console.log("creating");
        let user = auth.user();
        if (user) {
            await broadCli.createRoom(roomName());
            setRoomName("");
            await refetch();
        } else {
            navigate("/login");
        }
    }


    const ROOM = ()=>{
        navigate('/room');
    }
    return <Show when={auth.user()} fallback={<Navigate href="/login" />}>
        <Button className="button1" onClick={() => navigate("/user")}>用户中心</Button><br></br>
        <TextField className="testfield1" label="RoomName" helperText="Plz input your Room name" value={roomName()} onChange={(_, val) => setRoomName(val)}></TextField>
        <Button onClick={creating} >Create Room</Button><br></br>
        <button onClick={ROOM}>GO TO ROOM</button>
        <Show when={!rooms.loading} fallback={<p>Loading rooms</p>}>
            <For each={rooms()} fallback={<p>No rooms here.</p>}>
                {
                    (item) => {
                        return <p>Room {item.id}: name "{item.name}", owner {item.owner}, created_at {item.created_at}</p>
                    }
                }
            </For>
        </Show>
        <style jsx>
            {`
            .button1{
                width:150px;
                height:47px;
                background-color:dodgerblue;
                color: white;
                border: none;
                font-size: 20px;
                border-radius:30px;
                }
            .textfield1{
                border: none;
                }
            `}
        </style>
    </Show>
}

export default Index;
