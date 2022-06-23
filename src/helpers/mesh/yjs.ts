import Y from "yjs";
import {Router} from ".";
import { Frame, Message } from "./datachannel";
import * as awarenessProtocol from "y-protocols/awareness";

type DocChangeCallback = ((update: Uint8Array, origin: unknown, doc: Y.Doc) => void);
type DataReceivedCallback = ((message: Message) => void);

type AwarenessUpdateCallback = ((update: {added: number[], updated: number[], removed: number[]}, origin: unknown) => void);

type RouterPreStoppingCallback = (() => void);

const PROTO_TYPE_YJS_UPDATE = 535;
const PROTO_TYPE_YJS_UPDATE_AWARENESS = 536;
const TRANS_ORIGIN_MESH = "mesh";

const isFromMeshProvider = (origin: unknown) => {
    return (typeof origin === "string") && origin === TRANS_ORIGIN_MESH;
};

const PROTO_TYPE_YJS_UPDATE_FRAME = Frame.fromUInt(PROTO_TYPE_YJS_UPDATE, true);
const PROTO_TYPE_YJS_UPDATE_AWARENESS_FRAME = Frame.fromUInt(PROTO_TYPE_YJS_UPDATE_AWARENESS, true);

export interface PeerAwarenessState {
    usrDeviceId: string,
    userId: string,
    [key: string]: unknown,
}

export class MeshProvider {
    router: Router;
    doc: Y.Doc;
    kind: number;
    onDocChanged: DocChangeCallback;
    onDataReceived: DataReceivedCallback;
    awareness: awarenessProtocol.Awareness;
    onAwarenessUpdated: AwarenessUpdateCallback;
    onRouterStopping: RouterPreStoppingCallback;

    constructor(router: Router, kind: number, docs: Y.Doc) {
        this.router = router;
        this.doc = docs;
        this.kind = kind;
        this.onDocChanged = this.makeDocChangeCallback();
        this.onDataReceived = this.makeDataReceivedCallback();
        this.awareness = new awarenessProtocol.Awareness(new Y.Doc());
        this.onAwarenessUpdated = this.makeAwarenessUpdateCallback();
        this.onRouterStopping = this.makeRouterPrestoppingCallback();
    }

    makeDocChangeCallback(): DocChangeCallback {
        return (update, origin) => {
            if (!isFromMeshProvider(origin)) {
                this.router.broadcast([
                    PROTO_TYPE_YJS_UPDATE_FRAME,
                    Frame.fromUInt(this.kind, true),
                    Frame.fromArray(update, false),
                ], true);
            }
        };
    }

    makeDataReceivedCallback(): DataReceivedCallback {
        return (message) => {
            const frames = message.message;
            if (frames.length >= 3) {
                const [typeFrame, kindFrame, updateFrame] = frames;
                if (typeFrame.isUInt() && typeFrame.toUInt() === PROTO_TYPE_YJS_UPDATE) {
                    if (kindFrame.isUInt() && kindFrame.toUInt() === this.kind) {
                        Y.applyUpdate(this.doc, updateFrame.data(), TRANS_ORIGIN_MESH);
                    }
                } else if (typeFrame.isUInt() && typeFrame.toUInt() === PROTO_TYPE_YJS_UPDATE_AWARENESS) {
                    if (kindFrame.isUInt() && kindFrame.toUInt() === this.kind) {
                        awarenessProtocol.applyAwarenessUpdate(
                            this.awareness,
                            updateFrame.data(),
                            TRANS_ORIGIN_MESH
                        );
                    }
                }
            }
        };
    }

    makeAwarenessUpdateCallback(): AwarenessUpdateCallback {
        return ({added, updated, removed}, origin) => {
            if (!isFromMeshProvider(origin)) {
                const changedClients = added.concat(updated).concat(removed);
                this.router.broadcast([
                    PROTO_TYPE_YJS_UPDATE_AWARENESS_FRAME,
                    Frame.fromUInt(this.kind, true),
                    Frame.fromArray(
                        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients),
                        true
                    )
                ]);
            }
        };
    }

    makeRouterPrestoppingCallback(): RouterPreStoppingCallback {
        return () => {
            this.dismiss();
        };
    }

    listen() {
        this.router.bus.on("prestopping", this.onRouterStopping);
        this.doc.on("update", this.onDocChanged);
        this.awareness.on("update", this.onAwarenessUpdated);
        this.router.bus.on("data", this.onDataReceived);
    }

    dismiss() {
        awarenessProtocol.removeAwarenessStates(
            this.awareness,
            [this.awareness.clientID],
            "router is stopping"
        );
        this.doc.off("update", this.onDocChanged);
        this.awareness.off("update", this.onAwarenessUpdated);
        // Updates of awareness will not send to network
        // Now we can set all peers in awareness as offline
        awarenessProtocol.removeAwarenessStates(
            this.awareness,
            Array.from(this.awareness.getStates().keys())
                .filter(client => client !== this.awareness.clientID),
            "provider is leaving"
        );
        this.router.bus.detach("data", this.onDataReceived);
        this.router.bus.detach("prestopping", this.onRouterStopping);
    }

    updateAwarenessState(state: Partial<PeerAwarenessState> | null) {
        if (state !== null) {
            this.awareness.setLocalState({...this.awareness.getLocalState() || {}, ...state});
        } else {
            this.awareness.setLocalState(null);
        }
    }
}
