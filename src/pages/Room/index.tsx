import CircularProgress from "@suid/material/CircularProgress";
import { useParams } from "solid-app-router";
import { Component, Match, Switch, createSignal, onMount } from "solid-js";
import { useBroadClient } from "../../helpers/BroadClient/solid";

enum RoomStatus {
    "Unknown",
    "Found",
    "Joint",
    "NotFound",
}

const Room: Component = () => {
    const params = useParams();
    const broadCli = useBroadClient();
    const [status, setStatus] = createSignal<RoomStatus>(RoomStatus.Unknown);

    onMount(async () => {
        const room = await broadCli.findRoomById(params.id);
        if (room) {
            setStatus(RoomStatus.Found);
            if (!await broadCli.isJoinedRoomById(room.id)) {
                await broadCli.joinRoomById(room.id);
            }
            setStatus(RoomStatus.Joint);
        } else {
            setStatus(RoomStatus.NotFound);
        }
    });
    
    return <>
        <span>Room for {params.id}</span><br />
        <Switch fallback={<span>Unknown Problem.</span>}>
            <Match when={status() === RoomStatus.Unknown || status() === RoomStatus.Found}>
                <CircularProgress color="secondary" />Please wait...
            </Match>
            <Match when={status() === RoomStatus.Joint}>
                <span>You join this room.</span>
            </Match>
            <Match when={status() === RoomStatus.NotFound}>
                <span>Not Found.</span>
            </Match>
        </Switch>
    </>;
};

export default Room;
