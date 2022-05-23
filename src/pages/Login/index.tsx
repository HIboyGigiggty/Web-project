import { Component, onMount, Show } from "solid-js"
import { createOnAuthStateChange, createSupabaseAuth } from "solid-supabase"
import { Navigate, useNavigate } from "solid-app-router";
import { v5 as uuidv5} from 'uuid';

const Login: Component = () => {
    const auth = createSupabaseAuth();
    const navigate = useNavigate();
    let signInWithGithub = async () => {
        const { user, session, error } = await auth.signIn({
            provider: 'github',
        });
    };
    createOnAuthStateChange((_, session) => {
        // Check again to force jump back.
        // The Show's fallback could not be rendered when jumping back from supabase.
        // TODO: allow jumping back to specific address.
        if (session) {
            if (session.user) {
                navigate("/");
                GenerateUUID();
            }
        }
    });
    const GenerateUUID= () => {//Generate a DeviceUid to discern User Device
        let Device =uuidv5('dns','yourDevice');
        var myStorage=localStorage;
        myStorage.setItem("UserDevice",Device);
       onMount(async () =>
       {
           while(myStorage.getItem("UserDevice") ==null)
           {
               alert("You should try to login again");
           }
       });
    }
    return (<>
        <h1>Sign in with...</h1>
        <Show when={!auth.user()} fallback={<Navigate href="/" />}>
        <input type="button" value={"GitHub"} onClick={signInWithGithub} className="loginButton"/><br></br>
            <style jsx>
                {`
                .loginButton{
                    background-color:dodgerblue;
                    color:white;
                    width:200px;
                    height:47px;
                    border:0;
                    font-size:16px;
                    border-radius:30px;
                   margin-left:700px;
                   margin-top:150px;
                   position:relative;
                }
                `}
            </style>
        </Show>
    </>)
}

export default Login;
