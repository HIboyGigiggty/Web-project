import Y from "yjs";
import type {Router} from ".";
import { Frame, Message } from "./datachannel";

type DocChangeCallback = ((update: Uint8Array, origin: unknown, doc: Y.Doc) => void);
type DataReceivedCallback = ((message: Message) => void);

const PROTO_TYPE_YJS_UPDATE = 535;
const TRANS_ORIGIN_MESH = "mesh";

const isFromMeshProvider = (origin: unknown) => {
    return (typeof origin === "string") && origin === TRANS_ORIGIN_MESH;
};

const PROTO_TYPE_YJS_UPDATE_FRAME = Frame.fromUInt(PROTO_TYPE_YJS_UPDATE, true);

export class MeshProvider {
    router: Router;
    doc: Y.Doc;
    kind: number;
    onDocChanged: DocChangeCallback;
    onDataReceived: DataReceivedCallback;

    constructor(router: Router, kind: number, docs: Y.Doc) {
        this.router = router;
        this.doc = docs;
        this.kind = kind;
        this.onDocChanged = this.makeDocChangeCallback();
        this.onDataReceived = this.makeDataReceivedCallback();
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
                }
            }
        };
    }

    listen() {
        this.doc.on("update", this.onDocChanged);
        this.router.bus.on("data", this.onDataReceived);
    }

    dismiss() {
        this.doc.off("update", this.onDocChanged);
        this.router.bus.detach("data", this.onDataReceived);
    }
}
