import { Component, Show } from "solid-js";
import { Navigate } from "solid-app-router";
import { createSupabaseAuth } from "solid-supabase";

export interface LoginGuardProps {
    fallback: string
}

const LoginGuard: Component<LoginGuardProps> = (props) => {
    const auth = createSupabaseAuth();
    return <Show when={auth.user()} fallback={<Navigate href={props.fallback} />}>{props.children}</Show>;
};

export default LoginGuard;
