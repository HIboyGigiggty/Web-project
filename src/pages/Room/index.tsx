import Button from "@suid/material/Button";
import TextField from "@suid/material/TextField";
import { Navigate, useNavigate } from "solid-app-router";
import { Component, createResource, Show, For } from "solid-js";
import { createSupabase, createSupabaseAuth } from "solid-supabase";

const Room: Component = () => {
    const auth = createSupabaseAuth();
    const supabase = createSupabase();
    const navigate = useNavigate();

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

    let [rooms] = createResource(getAllRooms, {
        initialValue: []
    });

    return <Show when={auth.user()} fallback={<Navigate href="/login" />}>
        <Button onClick={() => navigate("/user")}>User Infomation</Button>
        <Button>Create Room</Button>
        <Show when={!rooms.loading} fallback={<p>Loading rooms</p>}>
            <For each={rooms()} fallback={<p>No rooms here.</p>}>
                {
                    (item) => {
                        return <p>Room {item.id}: name "{item.name}", owner {item.owner}, created_at {item.created_at}</p>
                    }
                }
            </For>
        </Show>
    </Show>
}

export default Room;
