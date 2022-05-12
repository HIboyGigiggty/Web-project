import { Component, Show } from "solid-js"
import { createSupabaseAuth } from "solid-supabase"
import { Navigate } from "solid-app-router";

const Login: Component = () => {
    const auth = createSupabaseAuth();
    let signInWithGithub = async () => {
        const { user, session, error } = await auth.signIn({
            provider: 'github',
        });
    };
    return (<>
        <h1>Sign in with...</h1>
        <Show when={!auth.user()} fallback={<Navigate href="/user" />}>
            <input type="button" value={"GitHub"} onClick={signInWithGithub} /><br></br>
        </Show>
    </>)
}

export default Login;
