import { Component, Show } from "solid-js";
import { createSupabaseAuth } from "solid-supabase";
import { Navigate, useNavigate } from "solid-app-router";
import Button from "@suid/material/Button";
import getDeviceId from "../../helpers/getDeviceId";
import { useBroadClient } from "../../helpers/BroadClient/solid";

const User: Component = () => {
    const auth = createSupabaseAuth();
    const user_option = auth.user();
    const navigate = useNavigate();
    const signOut = async () => {
        await auth.signOut();
        navigate("/login");
    };
    const broadClient = useBroadClient();
    return (<>
        <h1>User Infomation</h1>
        <p>Deivce Id: {getDeviceId()}</p>
        <Show when={user_option} fallback={<Navigate href="/login" />}>
            {
                (user) => {
                    return <>
                        <p>Id: {user.id}</p>
                        <p>User-Device Id: {broadClient.getUserDeviceId()}</p>
                        <Button onClick={signOut}>Sign out</Button>
                    </>;
                }
            }
        </Show>
    </>);
};

export default User;
