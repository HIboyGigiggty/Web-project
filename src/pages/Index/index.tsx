import Button from "@suid/material/Button";
import TextField from "@suid/material/TextField";
import { Navigate, useNavigate } from "solid-app-router";
import { Component, createResource, Show, For, createSignal } from "solid-js";
import { createSupabase, createSupabaseAuth } from "solid-supabase";

const Index: Component = () => {
    const auth = createSupabaseAuth();
    const supabase = createSupabase();
    const navigate = useNavigate();
    let [roomName, setRoomName] = createSignal<string>("")

    let getAllRooms = async () => {
        const user = auth.user();
        if (user) {
            let response = await supabase.from("rooms").select("id, owner, name, created_at").eq("owner", user.id);
            if (response.error) {
                throw response.error;
            }
            return response.data;
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
            const {data, error}= await supabase.from("rooms").insert({
                name: roomName(),
                owner: user.id,
            });
            if (error){
                throw error;
            }
            setRoomName("");
            await refetch();
        } else {
            navigate("/login");
        }
        
    }
    return <Show when={auth.user()} fallback={<Navigate href="/login" />}>
        <Button className="button1" onClick={() => navigate("/user")}>User Infomation</Button><br></br>
        <TextField className="testfield1" label="RoomName" helperText="Plz input your Room name" value={roomName()} onChange={(_, val) => setRoomName(val)}></TextField>
        <Button onClick={creating} >Create Room</Button>
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
    </Show>
}

export default Index;
