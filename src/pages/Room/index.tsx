import type { Component } from "solid-js"
import supabase_conf from "../../configs/supabase_conf";
import supabase_client from "../../supabase_client";


const Room: Component = () => {
    return (<>
        <input type="button" value={"Sig In"} onClick={signInwithGithub} /><br></br>
        <input type="button" value={"Sig Out"} onClick={signOut}></input>
    </>)
}
let signInwithGithub = async function () {
    const { user, session, error } = await supabase_client.auth.signIn({
        provider: 'github',
    })
}
async function signOut() {
    const { error } = await supabase_client.auth.signOut()
}

export default Room;
