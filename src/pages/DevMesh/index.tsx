import Button from "@suid/material/Button";
import TextField from "@suid/material/TextField";
import { Component, For, Show, createEffect, createResource, createSignal, onCleanup, onMount } from "solid-js";
import { useBroadClient } from "../../helpers/BroadClient/solid";
import { createSupabaseAuth } from "solid-supabase";
import { Participant } from "../../helpers/BroadClient";
import { validate as uuidValidate } from "uuid";
import { Peer, PeerConnectionState, Router } from "../../helpers/mesh";
import { SupabaseDatachannel } from "../../helpers/mesh/supabase";

const PeerView: Component<{peer: Peer}> = (props) => {
    const [connectionState, setConnectionState] = createSignal<PeerConnectionState>(PeerConnectionState.unknown);
    const [singalingState, setSingalingState] = createSignal<RTCSignalingState>("stable");
    const [stateChangedCounter, setStateChangedCounter] = createSignal<number>(0);

    const onConnectionStateChanged = (newState: PeerConnectionState) => {
        setConnectionState(newState);
        setStateChangedCounter(prev => prev+1);
    };

    const onSingalingStateChanged = () => {
        setSingalingState(props.peer.connection.signalingState);
        setStateChangedCounter(prev => prev+1);
    };

    createEffect(() => {
        setConnectionState(props.peer.connectionState);
    });

    onMount(() => {
        props.peer.bus.on("connectionstatechange", onConnectionStateChanged);
        props.peer.connection.addEventListener("signalingstatechange", onSingalingStateChanged);
    });

    onCleanup(() => {
        props.peer.bus.detach("connectionstatechange", onConnectionStateChanged);
        props.peer.connection.removeEventListener("signalingstatechange", onSingalingStateChanged);
    });

    return <p>Peer "{props.peer.userDeviceId}" [changed x{stateChangedCounter()}], clk {props.peer.clk.toString()}, connectionState {connectionState()}, singalingState {singalingState()}</p>;
};

const DevMesh: Component = () => {
    const [roomName, setRoomName] = createSignal<string>("");
    const [roomId, setRoomId] = createSignal<string>("");
    const [peers, setPeers] = createSignal<Peer[]>([], {equals: false});
    const broadClient = useBroadClient();
    const auth = createSupabaseAuth();

    const [routerG, setRouterG] = createSignal<Router>();

    const [participants, participantsCtl] = createResource<Participant[]>(() => {
        if (uuidValidate(roomId())) {
            return broadClient.getParticipants(roomId());
        }
        return [];
    });

    const connectNetwork = async (roomId: string) => {
        if (!await broadClient.isJoinedRoomById(roomId)) {
            await broadClient.joinRoomById(roomId);
        }
        participantsCtl.refetch();
        const alterChan = SupabaseDatachannel.ofRoom(broadClient.supabase, roomId, broadClient.getUserDeviceId());
        const router = new Router(broadClient.getUserDeviceId(), alterChan, roomId);
        router.bus.on("addpeer", () => {
            setPeers(router.peers);
        });
        router.bus.on("removepeer", (peer: Peer) => {
            peer.disconnect();
            setPeers(router.peers);
        });
        await router.broadcastPeerList();
        setRouterG(router);
    };

    const createRoom = async () => {
        const room = await broadClient.createRoom(roomName());
        setRoomId(room.id);
        setRoomName(room.name);
        await connectNetwork(room.id);
    };

    const enterRoom = async () => {
        const room = await broadClient.findRoomById(roomId());
        if (room) {
            setRoomId(room.id);
            setRoomName(room.name);
            await connectNetwork(room.id);
        } else {
            alert(`Could not found room ${roomId()}`);
        }
    };

    onCleanup(() => {
        const routerg = routerG();
        if (routerg) {
            setRouterG();
            routerg.stop();
        }
    });

    const getRouterId = () => {
        const routerg = routerG();
        if (routerg) {
            return routerg.userDeviceId;
        }
    };

    return <div>
        <p>User: {JSON.stringify(auth.user(), undefined, 2)}</p>
        <TextField variant="standard" value={roomName()} label="Room Name" onChange={(ev) => setRoomName(ev.target.value)} /><Button onClick={createRoom}>Create New Room</Button><br />
        <TextField variant="standard" value={roomId()} label="Room ID" onChange={(ev) => setRoomId(ev.target.value)} />
        <Button onClick={enterRoom}>Enter Room</Button>
        <Button onClick={() => {
            const routerg = routerG();
            if (routerg) {
                routerg.broadcastPeerList();
            }
        }}>Sync Peer List</Button>
        <br />
        <p>User-Device Id: {getRouterId() || "unknown"}</p>
        <div>
            <Show when={participants.loading}><p>Loading participants...</p></Show>
            <p>Participants:</p>
            <ul>
                <For each={participants()}>{(p) => <li>User Id: {p.user_id}</li>}</For>
            </ul>
        </div>
        <div>
            <p>Peers:</p>
            <ul>
                <For each={peers()} fallback={<li>No peers.</li>}>{(p) => <li><PeerView peer={p} /></li>}</For>
            </ul>
        </div>
    </div>;
};

export default DevMesh;
