import { Component, Match, Switch, createEffect, createSignal, onMount } from "solid-js";
import { createOnAuthStateChange, createSupabaseAuth } from "solid-supabase";
import { useNavigate, useSearchParams } from "solid-app-router";
import getDeviceId from "../../helpers/getDeviceId";
import Box from "@suid/material/Box";

import Card from "@suid/material/Card";
import Typography from "@suid/material/Typography";
import CardHeader from "@suid/material/CardHeader";

import List from "@suid/material/List";
import ListItem from "@suid/material/ListItem";
import ListItemButton from "@suid/material/ListItemButton";
import ListItemIcon from "@suid/material/ListItemIcon";
import ListItemText from "@suid/material/ListItemText";
import SvgIcon from "@suid/material/SvgIcon";
import { getAndClearJumpback, setJumpback } from "../../helpers/jumpback";
import { supabaseURL } from "../../stores/supabase";
import { useStore } from "@nanostores/solid";
import { SupabaseConfigurationDialog } from "./configure_supabase";
import Link from "@suid/material/Link";
import Password from "@suid/icons-material/Password";
import Toolbar from "@suid/material/Toolbar";
import IconButton from "@suid/material/IconButton";
import ArrowBack from "@suid/icons-material/ArrowBack";
import CardContent from "@suid/material/CardContent";
import TextField from "@suid/material/TextField";
import CardActions from "@suid/material/CardActions";
import Button from "@suid/material/Button";

enum LoginFlowState {
    Start,
    GitHubFlow,
    PasswordFlow,
}

interface LoginFlowStateCallback {
    onRequestNext: ((ev: Record<string, never>, newFlow: LoginFlowState) => void)
}

type LoginMethodCardProps = LoginFlowStateCallback;

const LoginMethodCard: Component<LoginMethodCardProps> = (props) => {
    const iconSx = { width: 32, height: 32 };
    return (<Card sx={{ minWidth: 300 }}>
        <CardHeader title={<Typography variant="h6">Sign in</Typography>} />
        <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom >
            <Box sx={{ width: "100%", minWidth: 360, bgcolor: "background.paper" }}>
                <List>
                    <ListItem disablePadding onClick={() => props.onRequestNext({}, LoginFlowState.GitHubFlow)} id="login-with-github">
                        <ListItemButton >
                            <ListItemIcon>
                                <SvgIcon sx={iconSx} viewBox="0 0 16 16">
                                    <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                                </SvgIcon>
                            </ListItemIcon>
                            <ListItemText primary="Sign in with GitHub" />
                        </ListItemButton>
                    </ListItem>
                    <ListItem disablePadding onClick={() => props.onRequestNext({}, LoginFlowState.PasswordFlow)} id="login-with-github">
                        <ListItemButton >
                            <ListItemIcon>
                                <Password  sx={iconSx}/>
                            </ListItemIcon>
                            <ListItemText primary="Sign in with password" />
                        </ListItemButton>
                    </ListItem>
                </List>
            </Box>
        </Typography>
    </Card>);
};

type EmailLoginCardProps = LoginFlowStateCallback;

const EmailLoginCard: Component<EmailLoginCardProps> = (props) => {
    const [email, setEmail] = createSignal<string>("");
    const auth = createSupabaseAuth();
    const [password, setPassword] = createSignal<string>("");
    const [accountError, setAccountError] = createSignal<boolean>(false);

    const loginWithEmail = async () => {
        setAccountError(false);
        const url = new URL(window.location.href);
        url.search = "";
        const {error} = await auth.signIn({
            email: email(),
            password: password(),
        }, {
            redirectTo: url.toString(),
        });
        if (error) {
            if (error.status === 400) {
                setAccountError(true);
            } else {
                throw error;
            }
        }
    };

    createEffect(() => {
        if (email().length === 0 || password().length === 0) {
            setAccountError(false);
        }
    });

    return (<Card sx={{minWidth: "360px"}}>
        <Toolbar>
            <IconButton
                size="large"
                edge="start"
                color="inherit"
                sx={{mr: 2}}
                onClick={() => props.onRequestNext({}, LoginFlowState.Start)}
            ><ArrowBack /></IconButton>
            <Typography variant="h6" component="div" sx={{flexGrow: 1}}>Sign in with your password</Typography>
        </Toolbar>
        <CardContent>
            <List disablePadding>
                <ListItem>
                    <TextField
                        fullWidth={true}
                        label="Email Address"
                        variant="standard"
                        value={email()}
                        onChange={
                            (ev) => setEmail(ev.target.value)
                        }
                    />
                </ListItem>
                <ListItem>
                    <TextField
                        fullWidth={true}
                        label="Password"
                        variant="standard"
                        value={password()}
                        helperText={accountError() ? <Typography variant="inherit" color="error">Address or Password is Not Found</Typography>: undefined}
                        error={accountError()}
                        onChange={
                            (ev) => setPassword(ev.target.value)
                        }
                    />
                </ListItem>
            </List>
        </CardContent>
        <CardActions sx={{justifyContent: "end", marginX: "14px"}}>
            <Button disabled={email().length === 0 || password().length === 0} sx={{right: 0}} variant="contained" disableElevation onClick={loginWithEmail}>
                <Typography>Sign in</Typography>
            </Button>
        </CardActions>
        <Box sx={{height: "12px"}} />
    </Card>);
};

const Login: Component = () => {
    const auth = createSupabaseAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const supabaseServiceURL = useStore(supabaseURL);
    const [supabaseConfigDialogOpen, setSupabaseConfigDialogOpen] = createSignal<boolean>(false);
    const [flowState, setFlowState] = createSignal<LoginFlowState>(LoginFlowState.Start);

    const signInWithGithub = async () => {
        const url = new URL(window.location.href);
        url.search = "";
        await auth.signIn({
            provider: "github",
        }, {
            redirectTo: url.toString(),
        });
    };

    const onRequestNextStep = async (ev: Record<string, never>, newFlow: LoginFlowState) => {
        setFlowState(newFlow);
        if (newFlow === LoginFlowState.GitHubFlow) {
            await signInWithGithub();
        }
    };

    createOnAuthStateChange((_, session) => {
        // Check again to force jump back.
        if (session) {
            getDeviceId(); // Ensure we have a device identity.
            const jumpback = getAndClearJumpback();
            if (session.user) {
                navigate(jumpback || "/");
            }
        }
    });

    onMount(() => {
        const nextJumpPath = searchParams["next"];
        if (nextJumpPath && nextJumpPath.length > 0 && nextJumpPath.startsWith("/") && !auth.user()) {
            setJumpback(nextJumpPath);
        }
    });

    return (<>
        <SupabaseConfigurationDialog open={supabaseConfigDialogOpen()}
            onClose={(ev, reason) => {
                if (reason === "configSet") {
                    window.location.reload();
                }
                setSupabaseConfigDialogOpen(false);
            }} />
        <Box sx={{position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)"}}>
            <Switch>
                <Match when={flowState() === LoginFlowState.Start}>
                    <LoginMethodCard onRequestNext={onRequestNextStep} />
                </Match>
                <Match when={flowState() === LoginFlowState.PasswordFlow}>
                    <EmailLoginCard onRequestNext={onRequestNextStep} />
                </Match>
            </Switch>
            <Box sx={{textAlign: "end"}}>
                <Link sx={{cursor: "pointer"}} onClick={() => setSupabaseConfigDialogOpen(true)}><Typography variant="caption">Supabase Service: {new URL(supabaseServiceURL()).host}</Typography></Link>
            </Box>
        </Box>
    </>);
};

export default Login;
