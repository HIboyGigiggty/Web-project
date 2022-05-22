import { Component, Show } from "solid-js";
import { createOnAuthStateChange, createSupabaseAuth } from "solid-supabase";
import { Navigate, useNavigate } from "solid-app-router";

const Login: Component = () => {
    const auth = createSupabaseAuth();
    const navigate = useNavigate();
    const signInWithGithub = async () => {
        await auth.signIn({
            provider: "github",
        });
    };
    createOnAuthStateChange((_, session) => {
        // Check again to force jump back.
        // The Show's fallback could not be rendered when jumping back from supabase.
        // TODO: allow jumping back to specific address.
        if (session) {
            if (session.user) {
                navigate("/");
            }
        }
    });
    return (<>
        <h1>Sign in with...</h1>
        <Show when={!auth.user()} fallback={<Navigate href="/" />}>
            <input type="button" value={"GitHub"} onClick={signInWithGithub} /><br></br>
        </Show>
    </>);
};

export default Login;
