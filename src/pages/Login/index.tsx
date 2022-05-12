import type { Component } from "solid-js"
import { createSupabaseAuth } from "solid-supabase"


const Login: Component = () => {
    const auth = createSupabaseAuth();
    let signInWithGithub = async () => {
        const { user, session, error } = await auth.signIn({
            provider: 'github',
        });
        console.log("user", user);
    };
    return (<>
        <h1>Sign in with...</h1>
        <input type="button" value={"GitHub"} onClick={signInWithGithub} /><br></br>
    </>)
}

export default Login;
