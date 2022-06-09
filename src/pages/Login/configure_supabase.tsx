import Card from "@suid/material/Card";
import Modal from "@suid/material/Modal";
import { Component, createEffect, createSignal } from "solid-js";
import { supabaseKey, supabaseURL } from "../../stores/supabase";
import { useStore } from "@nanostores/solid";
import TextField from "@suid/material/TextField";
import CardContent from "@suid/material/CardContent";
import CardActions from "@suid/material/CardActions";
import Typography from "@suid/material/Typography";
import Button from "@suid/material/Button";
import { createSupabase } from "solid-supabase";
import CardHeader from "@suid/material/CardHeader";
import ListItem from "@suid/material/ListItem";
import List from "@suid/material/List";
import Box from "@suid/material/Box";
import supabase_conf from "../../configs/supabase_conf";

interface Props {
    open: boolean,
    onClose: ((ev: Record<string, never>, reason: "escapeKeyDown" | "backdropClick" | "configSet") => void)
}

export const SupabaseConfigurationDialog: Component<Props> = (props) => {
    const [userUrl, setUserUrl] = createSignal<string>("");
    const [userKey, setUserKey] = createSignal<string>("");
    const url = useStore(supabaseURL);
    const key = useStore(supabaseKey);
    const supabase = createSupabase();

    const confirmConfig = async () => {
        supabaseURL.set(userUrl());
        supabaseKey.set(userKey());
        await supabase.auth.signOut();
        await supabase.removeAllSubscriptions();
        props.onClose({}, "configSet");
    };

    const setDefault = () => {
        setUserKey(supabase_conf.key);
        setUserUrl(supabase_conf.url);
    };

    createEffect(() => {
        setUserUrl(url());
        setUserKey(key());
    });

    return <Modal open={props.open} onClose={(ev, reason) => props.onClose(ev, reason)}>
        <Card
            sx={{
                maxWidth: "650px",
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                minWidth: "300px",
            }}>
            <CardHeader title="Enter Supabase Details"></CardHeader>
            <CardContent>
                <Typography>This selection helps you use another supabase instance instead the built-in one.
                    The instance used here must allow auth callback url.</Typography>
                <List disablePadding>
                    <ListItem>
                        <TextField
                            type="url"
                            sx={{width: "100%"}}
                            variant="standard"
                            label="URL"
                            value={userUrl()}
                            fullWidth={true}
                            onChange={(ev) => setUserUrl(ev.target.value)} />
                    </ListItem>
                    <ListItem>
                        <TextField
                            sx={{width: "100%"}}
                            variant="standard"
                            label="Anon Key"
                            value={userKey()}
                            multiline={true}
                            fullWidth={true}
                            onChange={(ev) => setUserKey(ev.target.value)} />
                    </ListItem>
                </List>
                <Typography>Your account will be sign out and unsaved progress will be lost.</Typography>
            </CardContent>
            <CardActions>
                <Button onClick={setDefault}><Typography>Use Default</Typography></Button>
                <Box sx={{flexGrow: 1}} />
                <Button onClick={() => props.onClose({}, "escapeKeyDown")}><Typography>Cancel</Typography></Button>
                <Button onClick={confirmConfig}><Typography>Set & Refresh</Typography></Button>
            </CardActions>
        </Card>
    </Modal>;
};
