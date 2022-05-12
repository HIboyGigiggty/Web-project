import { Component, Show } from "solid-js";
import { createSupabaseAuth } from "solid-supabase";
import { Navigate, useNavigate } from "solid-app-router";
import Button from "@suid/material/Button";

const User: Component = () => {
    let auth = createSupabaseAuth();
    let user_option = auth.user();
    let navigate = useNavigate();
    let signOut = async () => {
        await auth.signOut();
        navigate("/login");
    };
    return (<>
        <h1>User Infomation</h1>
        <Show when={user_option} fallback={<Navigate href="/login" />}>
            {
                (user) => {
                    return <>
                    <p>Id: {user.id}</p>
                    <Button onClick={signOut}>Sign out</Button>
                    </>
                }
            }
        </Show>
    </>)
}

export default User;
