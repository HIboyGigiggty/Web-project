// eslint-disable-next-line @typescript-eslint/no-unused-vars
import adapter from "webrtc-adapter";
import EventBus from "js-event-bus";
import { broadcastId } from "../getDeviceId";
import { DataChannel, Frame, Message } from "./datachannel";
import { WebRTCDatachannel } from "./webrtc";
import { promiseTimeout } from "@solid-primitives/utils";
import {validate as uuidValidate} from "uuid";

const PROTO_TYPE_SYNC_PEERS = 1;
const PROTO_TYPE_MAX_NUM = 255;

export class Peer {
    userDeviceId: string;
    connection: RTCPeerConnection;
    clk: bigint;
    datachannel: WebRTCDatachannel;

    constructor(userDeviceId: string, clk: bigint) {
        this.userDeviceId = userDeviceId;
        this.connection = new RTCPeerConnection();
        this.clk = clk;
        this.datachannel = new WebRTCDatachannel(this.connection.createDataChannel("magicbroad-mesh"));
    }

    isConnectionAvaliable(): boolean {
        if (this.connection.connectionState === "connected") {
            return true;
        } else {
            return false;
        }
    }

    async send(roomId: string, srcUserDeviceId: string, frames: Frame[]) {
        await this.datachannel.send({
            roomId: roomId,
            srcUserDeviceId: srcUserDeviceId,
            dstUserDeviceId: this.userDeviceId,
            message: frames,
        });
    }
}

export class Router {
    peers: Peer[];
    alterChan: DataChannel;
    clk: bigint;
    userDeviceId: string;
    bus: EventBus;
    onMessageCallback: ((msg: Message) => void);

    constructor(userDeviceId: string, alterChan: DataChannel) {
        this.peers = [];
        this.alterChan = alterChan;
        this.clk = 0n;
        this.userDeviceId = userDeviceId;
        this.bus = new EventBus();
        this.onMessageCallback = (msg) => {
            if (msg.dstUserDeviceId === this.userDeviceId || msg.dstUserDeviceId === broadcastId) {
                if (msg.message.length >= 2 && msg.message[0].isUInt() && msg.message[0].toUInt() <= PROTO_TYPE_MAX_NUM && msg.message[1].isBigUInt()) {
                    this.handleProtocolMessage(msg);
                } else {
                    this.bus.emit("data", this, msg);
                }
            }
        };
        alterChan.bus.on("data", this.onMessageCallback);
    }

    async broadcast(roomId: string, frames: Frame[]) {
        const sendingPromises: Promise<void>[] = [];
        for (const peer of this.peers) {
            if (peer.isConnectionAvaliable()) {
                sendingPromises.push(peer.send(roomId, this.userDeviceId, frames));
            }
        }
        if (sendingPromises.length === 0) {
            await this.sendToAlternativeChannel(roomId, broadcastId, frames);
        } else {
            await Promise.all(sendingPromises);
        }
    }

    findPeerById(userDeviceId: string): Peer | null {
        for (const peer of this.peers) {
            if (peer.userDeviceId === userDeviceId) {
                return peer;
            }
        }
        return null;
    }

    async send(roomId: string, dstUserDeviceId: string, frames: Frame[]) {
        const peer = this.findPeerById(dstUserDeviceId);
        if (peer) {
            if (peer.isConnectionAvaliable()) {
                await peer.send(roomId, this.userDeviceId, frames);
            } else {
                await this.sendToAlternativeChannel(roomId, dstUserDeviceId, frames);
            }
        }
    }

    async broadcastPeerList(roomId: string, customPeerIdList?: string[]) {
        const peerIdList = customPeerIdList || [this.userDeviceId, ...this.peers.map(p => p.userDeviceId)];
        const frames = this.buildProtocolMessage(PROTO_TYPE_SYNC_PEERS, peerIdList);
        await this.broadcast(roomId, frames);
    }

    async sendToAlternativeChannel(roomId: string, dstUserDeviceId: string, frames: Frame[]) {
        await this.alterChan.send({
            srcUserDeviceId: this.userDeviceId,
            dstUserDeviceId: dstUserDeviceId,
            roomId: roomId,
            message: frames,
        });
    }

    addPeer(peer: Peer) {
        peer.datachannel.bus.on("data", this.onMessageCallback);
        this.peers.push(peer);
        this.bus.emit("addpeer", this, peer);
    }

    removePeer(peer: Peer) {
        const index = this.peers.indexOf(peer);
        this.peers.splice(index, 1);
        peer.datachannel.bus.detach("data", this.onMessageCallback);
        this.bus.emit("removepeer", this, peer);
    }

    async onSyncPeerMessage(message: Message) {
        const receivedPeerList = JSON.parse(message.message[2].toString()) as unknown; // JSON
        const remotePeerList = Array.isArray(receivedPeerList) ? receivedPeerList.filter(v => typeof v === "string" && uuidValidate(v)) : [];
        remotePeerList.filter(id => !this.findPeerById(id)).forEach(id => {
            const peer = new Peer(id, 0n);
            this.addPeer(peer);
        }); // add all unknown peers
        await promiseTimeout(Math.random() * 10); // wait random seconds to avoid network flood
        const remoteUnknownPeerIds = this.peers.map(p => p.userDeviceId).filter(id => !remotePeerList.includes(id));
        await this.broadcastPeerList(message.roomId, remoteUnknownPeerIds);
    }

    handleProtocolMessage(message: Message) {
        const msgTypeCode = message.message[0].toUInt();
        const clkUpdate = message.message[1].toBigUInt();
        let peer = this.findPeerById(message.srcUserDeviceId);
        if (!peer) {
            peer = new Peer(message.srcUserDeviceId, clkUpdate);
            this.addPeer(peer);
        } else {
            if (peer.clk >= clkUpdate) return;
        }
        if (msgTypeCode === PROTO_TYPE_SYNC_PEERS) {
            this.onSyncPeerMessage(message).catch((reason) => console.error("sync peer list failed", reason));
        } else {
            console.error("unknown message type #%d", msgTypeCode);
        }
    }

    buildProtocolMessage(msgType: number, obj: unknown): Frame[] {
        return [Frame.fromUInt(msgType, true), Frame.fromBigUInt(this.clk++, true), Frame.fromString(JSON.stringify(obj), false)];
    }
}
