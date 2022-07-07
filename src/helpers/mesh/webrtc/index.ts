import EventBus from "js-event-bus";
import { DataChannel, Frame, Message } from "../datachannel";


const toArrayBuffer = (data: string | ArrayBuffer | Blob): Promise<ArrayBuffer> => {
    if (typeof data !== "string") {
        if (typeof (data as Blob).arrayBuffer !== "undefined") {
            return (data as Blob).arrayBuffer();
        } else {
            return Promise.resolve(data as ArrayBuffer);
        }
    } else {
        const encoder = new TextEncoder();
        return Promise.resolve(encoder.encode(data));
    }
};

export class WebRTCDatachannel implements DataChannel {
    bus: EventBus;
    rtcDataChan: RTCDataChannel;

    constructor(rtcDataChan: RTCDataChannel) {
        this.bus = new EventBus();
        this.rtcDataChan = rtcDataChan;
        const onRemoteData = async (ev: MessageEvent<ArrayBuffer | Blob | string>) => this.onRemoteData(ev);
        this.rtcDataChan.addEventListener("open", () => {
            this.bus.emit<WebRTCDatachannel>("open", this);
            this.rtcDataChan.addEventListener("message", onRemoteData);
        });
        this.rtcDataChan.addEventListener("close", () => {
            this.rtcDataChan.removeEventListener("message", onRemoteData);
            this.bus.emit<WebRTCDatachannel>("close", this);
        });
    }

    async send(message: Message): Promise<void> {
        const frames = [Frame.fromString(message.dstUserDeviceId, true), Frame.fromString(message.roomId, true), Frame.fromString(message.srcUserDeviceId, true), ...message.message];
        this.rtcDataChan.send(Frame.pack(...frames));
    }

    async onRemoteData(ev: MessageEvent<Blob | ArrayBuffer | string>) {
        const data = await toArrayBuffer(ev.data);
        const [frames,] = Frame.unpack(new Uint8Array(data));
        const [dstId, roomId, srcId, ...payload] = frames;
        const message: Message = {
            dstUserDeviceId: dstId.toString(),
            roomId: roomId.toString(),
            srcUserDeviceId: srcId.toString(),
            message: payload,
        };
        this.bus.emit("data", this, message);
    }

    close() {
        this.rtcDataChan.close();
    }
}
