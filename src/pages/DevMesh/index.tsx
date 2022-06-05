import Button from "@suid/material/Button";
import TextField from "@suid/material/TextField";
import { Component, createResource, createSignal, For, onCleanup, Show } from "solid-js";
import { useBroadClient } from "../../helpers/BroadClient/solid";
import { createSupabaseAuth } from "solid-supabase";
import { Participant } from "../../helpers/BroadClient";
import { validate as uuidValidate } from "uuid";
import { Peer, Router } from "../../helpers/mesh";
import { SupabaseDatachannel } from "../../helpers/mesh/supabase";

const DevMesh: Component = () => {
    const [roomName, setRoomName] = createSignal<string>("");
    const [roomId, setRoomId] = createSignal<string>("");
    const [peers, setPeers] = createSignal<Peer[]>([]);
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
        const router = new Router(broadClient.getUserDeviceId(), alterChan);
        router.bus.on("addpeer", () => {
            setPeers(router.peers);
        });
        router.bus.on("removepeer", () => {
            setPeers(router.peers);
        });
        await router.broadcastPeerList(roomId);
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

    onCleanup(async () => {
        const routerg = routerG();
        if (routerg) {
            await routerg.stop();
            setRouterG();
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
        <TextField variant="standard" value={roomId()} label="Room ID" onChange={(ev) => setRoomId(ev.target.value)} /><Button onClick={enterRoom}>Enter Room</Button><br />
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
                <For each={peers()} fallback={<li>No peers.</li>}>{(p) => <li>Peer "{p.userDeviceId}", clk {p.clk.toString()}</li>}</For>
            </ul>
        </div>
    </div>;
};

export default DevMesh;
