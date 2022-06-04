import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { DataChannel, Frame, Message } from "../datachannel";
import EventBus from "js-event-bus";
import { broadcastId } from "../../getDeviceId";
import z85 from "./z85";

interface MessagePushPayload {
    room: string,
    dst_user_dev_id: string,
    src_user_dev_id: string,
    message: string[]
    id: number,
    created_at: string,
}

interface MessagePush {
    columns: ({type: string, name: string})[],
    commit_timestamp: string,
    errors: unknown | null,
    type: string,
    record: MessagePushPayload,
    schema: string,
    table: string,
}

export class SupabaseDatachannel implements DataChannel {
    rtDbChannel: RealtimeChannel;
    rtDbBroadcastChan: RealtimeChannel;
    supabase: SupabaseClient;
    bus: EventBus;
    roomId: string;

    constructor(rtDbChannel: RealtimeChannel, rtDbBroadcastChan: RealtimeChannel, supabase: SupabaseClient, roomId: string) {
        this.rtDbChannel = rtDbChannel;
        this.rtDbBroadcastChan = rtDbBroadcastChan;
        this.supabase = supabase;
        this.bus = new EventBus();
        this.rtDbChannel.on("INSERT", undefined, (ev: MessagePush) => this.onRemoteMessage(ev));
        this.rtDbBroadcastChan.on("INSERT", undefined, (ev: MessagePush) => this.onRemoteMessage(ev));
        this.rtDbChannel.onClose(() => this.onAnyChannelClose());
        this.rtDbBroadcastChan.onClose(() => this.onAnyChannelClose());
        this.roomId = roomId;
        if (!(this.rtDbChannel.isJoined() || this.rtDbChannel.isJoining())) {
            this.rtDbChannel.subscribe();
        }
        if (!(this.rtDbBroadcastChan.isJoined() || this.rtDbBroadcastChan.isJoining())) {
            this.rtDbBroadcastChan.subscribe();
        }
    }

    static ofRoom(supabase: SupabaseClient, roomId: string, myUserDeviceId: string) {
        const rtChan = supabase.channel(`realtime:public:room_message_queue:dst_user_dev_id=eq.${myUserDeviceId}`, {selfBroadcast: true});
        const rtBroadcast = supabase.channel(`realtime:public:room_message_queue:dst_user_dev_id=eq.${broadcastId}`, {selfBroadcast: false});
        return new SupabaseDatachannel(rtChan, rtBroadcast, supabase, roomId);
    }

    async send(message: Message): Promise<void> {
        const {error} = await this.supabase.from("room_message_queue").insert({
            room: message.roomId,
            dst_user_dev_id: message.dstUserDeviceId,
            src_user_dev_id: message.srcUserDeviceId,
            message: message.message.map((f) => {
                if ((f.byteLength % 4) !== 0) {
                    const padding = 4 - (f.byteLength % 4);
                    return z85.encode(f.clone(padding).buffer);
                } else {
                    return z85.encode(f.buffer);
                }
            }),
        });
        if (error) {
            throw error;
        }
    }

    onAnyChannelClose() {
        this.close();
        if (this.rtDbBroadcastChan.isClosed() && this.rtDbChannel.isClosed()) {
            this.bus.emit("close", this);
        }
    }

    onRemoteMessage(push: MessagePush): void {
        if (push.errors) {
            return;
        }
        let allFramesDecodedMark = true;
        const payload = push.record;
        const message: Message = {
            roomId: payload.room,
            dstUserDeviceId: payload.dst_user_dev_id,
            srcUserDeviceId: payload.src_user_dev_id,
            message: payload.message.map((s) => {
                if ((s.length % 5) !== 0) { // Invalid z85 data
                    allFramesDecodedMark = false;
                    return Frame.zero(0);
                }
                const decodedBuf = z85.decode(s); 
                if (decodedBuf) {
                    return new Frame(decodedBuf);
                } else {
                    allFramesDecodedMark = false;
                    return Frame.zero(0);
                }
            })
        };
        if (allFramesDecodedMark) {
            this.bus.emit<SupabaseDatachannel>("data", this, message);
        }
    }

    close() {
        if (!this.rtDbChannel.isClosed()) {
            this.rtDbChannel.unsubscribe();
        }
        if (!this.rtDbBroadcastChan.isClosed()) this.rtDbBroadcastChan.unsubscribe();
    }
}
