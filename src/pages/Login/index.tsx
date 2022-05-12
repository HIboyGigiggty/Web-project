import type { Component } from "solid-js"
import { createSupabaseAuth } from "solid-supabase"


const Room: Component = () => {
    const auth = createSupabaseAuth();
    let signInWithGithub = async () => {
        const { user, session, error } = await auth.signIn({
            provider: 'github',
        });
        console.log("user", user);
    };
    let signOut = async () => {
        const { error } = await auth.signOut();
    };
    return (<>
        <input type="button" value={"Sig In"} onClick={signInWithGithub} /><br></br>
        <input type="button" value={"Sig Out"} onClick={signOut}></input>
    </>)
}

export default Room;
