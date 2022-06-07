import AppBar from "@suid/material/AppBar";
import Box from "@suid/material/Box";
import IconButton from "@suid/material/IconButton";
import Toolbar from "@suid/material/Toolbar";
import { useNavigate, useParams } from "solid-app-router";
import { Component, createSignal, onMount } from "solid-js";
import { useBroadClient } from "../../helpers/BroadClient/solid";
import CloseIcon from "@suid/icons-material/Close";
import Typography from "@suid/material/Typography";
import { Room } from "../../helpers/BroadClient";
import Modal from "@suid/material/Modal";
import Card from "@suid/material/Card";
import CardContent from "@suid/material/CardContent";
import Button from "@suid/material/Button";
import List from "@suid/material/List";
import ListItem from "@suid/material/ListItem";

enum RoomStatus {
    "Unknown",
    "Found",
    "Joined",
    "NotFound",
}

const RoomJoiningNotice: Component<{open: boolean}> = (props) => {
    return <Modal open={props.open}>
        <Card
            sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                maxWidth: "650px",
            }}>
            <CardContent sx={{textAlign: "center"}}>
                <Typography>Communicating with Magicbroad...</Typography>
            </CardContent>
        </Card>
    </Modal>;
};

const RoomNotFoundDialog: Component<{open: boolean}> = (props) => {
    const navigate = useNavigate();

    return <Modal open={props.open}>
        <Card
            sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                maxWidth: "650px",
            }}>
            <CardContent>
                <Typography variant="h6">The Room is Missing</Typography>
                <Typography>We could not found the room you want. The owner might have been deleted the room.</Typography>
            </CardContent>
            <List>
                <ListItem sx={{paddingLeft: 0, paddingRight: 0}}>
                    <Button variant="text" sx={{width: "100%", justifyContent: "flex-end"}} onClick={() => navigate("/")}>
                        <Typography sx={{marginRight: "20px"}} component="div">Go to the Home Page</Typography>
                    </Button>
                </ListItem>
            </List>
        </Card>
    </Modal>;
};

const RoomPage: Component = () => {
    const params = useParams();
    const broadCli = useBroadClient();
    const navigate = useNavigate();
    const [status, setStatus] = createSignal<RoomStatus>(RoomStatus.Unknown);
    const [roomInfo, setRoomInfo] = createSignal<Room>();

    onMount(async () => {
        const room = await broadCli.findRoomById(params.id);
        if (room) {
            setStatus(RoomStatus.Found);
            setRoomInfo(room);
            if (!await broadCli.isJoinedRoomById(room.id)) {
                await broadCli.joinRoomById(room.id);
            }
            setStatus(RoomStatus.Joined);
        } else {
            setStatus(RoomStatus.NotFound);
        }
    });

    const shouldShowJoiningNotice = () => status() === RoomStatus.Unknown || status() === RoomStatus.Found;

    const shouldShowRoomNotFound = () => status() === RoomStatus.NotFound;
    
    return <>
        <RoomJoiningNotice open={shouldShowJoiningNotice()} />
        <RoomNotFoundDialog open={shouldShowRoomNotFound()} />
        <Box sx={{flexGrow: 1}}>
            <AppBar position="absolute" color="transparent">
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="close"
                        sx={{mr: 2}}
                        onClick={() => navigate("/")}
                    ><CloseIcon /></IconButton>
                    <Typography variant="h6" component="div" sx={{flexGrow: 1}}>
                        {() => roomInfo()?.name}
                    </Typography>
                </Toolbar>
            </AppBar>
        </Box>
    </>;
};

export default RoomPage;
