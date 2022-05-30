import EventBus from "js-event-bus";
import { DataChannel, Frame, Message } from "../datachannel";

export class WebRTCDatachannel implements DataChannel {
    bus: EventBus;
    rtcDataChan: RTCDataChannel;

    constructor(rtcDataChan: RTCDataChannel) {
        this.bus = new EventBus();
        this.rtcDataChan = rtcDataChan;
        const onRemoteData = (ev: MessageEvent<unknown>) => this.onRemoteData(ev);
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
        const frames = [Frame.fromString(message.dstUserDeviceId), Frame.fromString(message.roomId), Frame.fromString(message.srcUserDeviceId), ...message.message];
        this.rtcDataChan.send(Frame.pack(...frames));
    }

    onRemoteData(ev: MessageEvent<unknown>) {
        const data = ev.data as Uint8Array;
        const [frames,,] = Frame.unpack(data);
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
