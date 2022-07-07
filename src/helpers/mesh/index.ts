// eslint-disable-next-line @typescript-eslint/no-unused-vars
import adapter from "webrtc-adapter";
import EventBus from "js-event-bus";
import { broadcastId } from "../getDeviceId";
import { DataChannel, Frame, Message } from "./datachannel";
import { WebRTCDatachannel } from "./webrtc";
import { promiseTimeout } from "@solid-primitives/utils";
import {validate as uuidValidate} from "uuid";

const PROTO_TYPE_SYNC_PEERS = 1;
const PROTO_TYPE_RTC_PROVIDE_OFFER = 2;
const PROTO_TYPE_SYNC_PEERS_REP = 3;
const PROTO_TYPE_RTC_ICE_CANDIDATE = 4;
const PROTO_TYPE_MAX_NUM = 255;
const DATACHANNEL_LABEL = "magicmesh";
const DATACHANNEL_ID = 64;

const RTCPEERCONNECTION_OPTIONS: RTCConfiguration = {
    iceServers: [
        {
            urls: "stun:stun.stunprotocol.org",
        },
    ]
};

export enum PeerConnectionState {
    connecting = "connecting",
    connected = "connected",
    disconnected = "disconnected",
    closed = "closed",
    failed = "failed",
    unknown = "unknown",
}

export class Peer {
    userDeviceId: string;
    connection: RTCPeerConnection;
    clk: bigint;
    datachannel: WebRTCDatachannel;
    connectionState: PeerConnectionState;
    bus: EventBus;
    makingOffer: boolean;

    constructor(userDeviceId: string, clk: bigint) {
        this.userDeviceId = userDeviceId;
        this.connection = new RTCPeerConnection(RTCPEERCONNECTION_OPTIONS);
        this.clk = clk;
        this.datachannel = new WebRTCDatachannel(
            this.connection.createDataChannel(
                DATACHANNEL_LABEL, {
                    protocol: "magicmesh-rtc0",
                    id: DATACHANNEL_ID,
                    negotiated: true
                }
            )
        );
        this.connectionState = PeerConnectionState.unknown;
        this.bus = new EventBus();
        this.makingOffer = false;
        this.setupConnectionState();
        this.connection.addEventListener("negotiationneeded", () => this.bus.emit("negotiationneeded", undefined, this));
        this.connection.addEventListener("icecandidate", (ev) => this.bus.emit("icecandidate", undefined, this, ev));
        this.connection.addEventListener("iceconnectionstatechange", () => {
            if (this.connection.iceConnectionState === "failed") {
                this.connection.restartIce();
            }
        });
    }

    setupConnectionState() {
        if (typeof this.connection.connectionState !== "undefined") { // Firefox does not support connectionState and connectionstatechange
            this.connection.addEventListener("connectionstatechange", () => {
                switch (this.connection.connectionState) {
                case "new":
                case "connecting":
                    this.connectionState = PeerConnectionState.connecting;
                    break;
                case "closed":
                    this.connectionState = PeerConnectionState.closed;
                    break;
                case "connected":
                    this.connectionState = PeerConnectionState.connected;
                    break;
                case "disconnected":
                    this.connectionState = PeerConnectionState.disconnected;
                    break;
                case "failed":
                    this.connectionState = PeerConnectionState.failed;
                    break;
                default:
                    this.connectionState = PeerConnectionState.unknown;
                    break;
                }
                this.bus.emit("connectionstatechange", undefined, this, this.connectionState);
            });
        } else {
            this.connection.addEventListener("iceconnectionstatechange", () => {
                const state = this.connection.iceConnectionState;
                if (state === "new" || state === "checking" || state === "completed") {
                    this.connectionState = PeerConnectionState.connecting;
                } else if (state === "connected") {
                    this.connectionState = PeerConnectionState.connected;
                } else if (state === "disconnected") {
                    this.connectionState = PeerConnectionState.disconnected;
                } else if (state === "closed") {
                    this.connectionState = PeerConnectionState.closed;
                } else if (state === "failed") {
                    this.connectionState = PeerConnectionState.failed;
                } else {
                    this.connectionState = PeerConnectionState.unknown;
                }
                this.bus.emit("connectionstatechange", undefined, this, this.connectionState);
            });
        }
    }

    isConnectionAvaliable(): boolean {
        if (this.connectionState === "connected") {
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

    disconnect() {
        this.datachannel.close();
        this.connection.close();
    }
}

/** The router object for transmiting data over channels.
 * 
 * Supported events:
 * - `addpeer`
 * - `removepeer`
 * - `prestopping`
 * - `stopped`
 * - `data`
 * - `peerconnectionstatechange`
 */
export class Router {
    peers: Peer[];
    alterChan: DataChannel;
    clk: bigint;
    userDeviceId: string;
    bus: EventBus;
    onMessageCallback: ((msg: Message) => void);
    onNegotiate: ((peer: Peer) => void);
    onIceCandidate: ((peer: Peer, ev: RTCPeerConnectionIceEvent) => void);
    roomId: string;
    onPeerConnectionStateChanged: ((peer: Peer, state: PeerConnectionState) => void);

    constructor(userDeviceId: string, alterChan: DataChannel, roomId: string) {
        this.peers = [];
        this.alterChan = alterChan;
        this.clk = BigInt(0);
        this.userDeviceId = userDeviceId;
        this.bus = new EventBus();
        this.roomId = roomId;
        this.onMessageCallback = (msg) => {
            if (msg.dstUserDeviceId === this.userDeviceId || msg.dstUserDeviceId === broadcastId) {
                if (msg.message[0].isUInt() && msg.message[0].toUInt() <= PROTO_TYPE_MAX_NUM && msg.message[1].isBigUInt()) {
                    this.handleProtocolMessage(msg);
                } else {
                    this.bus.emit("data", this, msg);
                }
            }
        };
        this.onNegotiate = (peer) => {
            peer.makingOffer = true;
            peer.connection.setLocalDescription()
                .then(() => {
                    const offer = peer.connection.localDescription;
                    if (offer) {
                        const {sdp, type} = offer;
                        return this.provideRTCOffer(peer.userDeviceId, {sdp, type});
                    }
                })
                .finally(() => peer.makingOffer = false);
        };
        this.onIceCandidate = (peer, ev) => {
            if (ev.candidate) {
                this.sendRTCIceCandidate(peer.userDeviceId, ev.candidate);
            }
        };
        this.onPeerConnectionStateChanged = (peer: Peer, state: PeerConnectionState) => {
            this.bus.emit("peerconnectionstatechange", undefined, this, peer, state);
        };
        alterChan.bus.on("data", this.onMessageCallback);
    }

    async broadcast(frames: Frame[], noAlternativeChannel?: boolean) {
        const sendingPromises: Promise<void>[] = [];
        for (const peer of this.peers) {
            if (peer.isConnectionAvaliable()) {
                sendingPromises.push(peer.send(this.roomId, this.userDeviceId, frames));
            }
        }
        if (!noAlternativeChannel && sendingPromises.length === 0) {
            await this.sendToAlternativeChannel(broadcastId, frames);
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

    loopbackSend(dstUserDeviceId: string, frames: Frame[]) {
        this.bus.emit("data", this, <Message>{
            srcUserDeviceId: this.userDeviceId,
            dstUserDeviceId: dstUserDeviceId,
            message: frames,
            roomId: this.roomId,
        });
    }

    async send(dstUserDeviceId: string, frames: Frame[]) {
        if (dstUserDeviceId === this.userDeviceId) {
            this.loopbackSend(dstUserDeviceId, frames);
            return;
        }
        const peer = this.findPeerById(dstUserDeviceId);
        if (peer) {
            if (peer.isConnectionAvaliable()) {
                await peer.send(this.roomId, this.userDeviceId, frames);
            } else {
                await this.sendToAlternativeChannel(dstUserDeviceId, frames);
            }
        }
    }

    async broadcastPeerList(customPeerIdList?: string[], isReply?: boolean) {
        const peerIdList = customPeerIdList || [this.userDeviceId, ...this.peers.map(p => p.userDeviceId)];
        const frames = this.buildProtocolMessage(isReply ? PROTO_TYPE_SYNC_PEERS_REP : PROTO_TYPE_SYNC_PEERS, peerIdList);
        await this.broadcast(frames);
    }

    async sendToAlternativeChannel(dstUserDeviceId: string, frames: Frame[]) {
        await this.alterChan.send({
            srcUserDeviceId: this.userDeviceId,
            dstUserDeviceId: dstUserDeviceId,
            roomId: this.roomId,
            message: frames,
        });
    }

    addPeer(peer: Peer) {
        peer.datachannel.bus.on("data", this.onMessageCallback);
        peer.bus.on("negotiationneeded", this.onNegotiate);
        peer.bus.on("icecandidate", this.onIceCandidate);
        peer.bus.on("connectionstatechange", this.onPeerConnectionStateChanged);
        this.peers.push(peer);
        this.bus.emit("addpeer", this, peer);
    }

    removePeer(peer: Peer) {
        const index = this.peers.indexOf(peer);
        this.peers.splice(index, 1);
        peer.datachannel.bus.detach("data", this.onMessageCallback);
        peer.bus.detach("negotiationneeded", this.onNegotiate);
        peer.bus.detach("icecandidate", this.onIceCandidate);
        peer.bus.detach("connectionstatechange", this.onPeerConnectionStateChanged);
        this.bus.emit("removepeer", this, peer);
    }

    async onSyncPeerMessage(message: Message) {
        const code = message.message[0].toUInt();
        const receivedPeerList = JSON.parse(message.message[2].toString()) as unknown; // JSON
        const remotePeerList = Array.isArray(receivedPeerList) ? receivedPeerList.filter(v => typeof v === "string" && uuidValidate(v)) : [];
        remotePeerList.filter(id => this.findPeerById(id) == null).forEach(id => {
            const peer = new Peer(id, BigInt(0));
            this.addPeer(peer);
        }); // add all unknown peers
        if (code === PROTO_TYPE_SYNC_PEERS) {
            const waitingTime = Math.random() * 2000;
            await promiseTimeout(waitingTime); // wait random seconds to avoid network flood
            const remoteUnknownPeerIds = this.peers.map(p => p.userDeviceId).filter(id => !remotePeerList.includes(id));
            if (!remotePeerList.includes(this.userDeviceId)) {
                remoteUnknownPeerIds.push(this.userDeviceId);
            }
            if (remoteUnknownPeerIds.length > 0) {
                await this.broadcastPeerList(remoteUnknownPeerIds, true);
            }
        }
    }

    handleProtocolMessage(message: Message) {
        if (message.srcUserDeviceId === this.userDeviceId) {
            return;
        }
        const msgTypeCode = message.message[0].toUInt();
        const clkUpdate = message.message[1].toBigUInt();
        let peer = this.findPeerById(message.srcUserDeviceId);
        if (!peer) {
            peer = new Peer(message.srcUserDeviceId, clkUpdate);
            this.addPeer(peer);
        } else {
            if (peer.clk >= clkUpdate) return;
        }
        if (msgTypeCode === PROTO_TYPE_SYNC_PEERS || msgTypeCode === PROTO_TYPE_SYNC_PEERS_REP) {
            this.onSyncPeerMessage(message).catch((reason) => console.error(reason));
        } else if (msgTypeCode === PROTO_TYPE_RTC_PROVIDE_OFFER) {
            this.onProvideRTCOfferMessage(message).catch(reason => console.error(reason));
        } else if (msgTypeCode === PROTO_TYPE_RTC_ICE_CANDIDATE) {
            this.onRTCIceCandidateMessage(message).catch(reason => console.error(reason));
        } else {
            console.error("unknown message type #%d", msgTypeCode);
        }
    }

    tick() {
        return ++this.clk;
    }

    buildProtocolMessage(msgType: number, obj: unknown): Frame[] {
        return [Frame.fromUInt(msgType, true), Frame.fromBigUInt(this.tick(), true), Frame.fromString(JSON.stringify(obj), false)];
    }

    async stop(): Promise<void> {
        this.bus.emit("prestopping", undefined, this);
        const closePromise = this.alterChan.close();
        if (typeof closePromise !== "undefined") {
            await closePromise;
        }
        for (const peer of this.peers) {
            peer.disconnect();
        }
        for (let i=0; i<this.peers.length; i++) {
            this.peers.pop();
        }
        this.bus.emit("stopped", this);
        this.bus.detachAll();
    }

    async provideRTCOffer(dstUserDevId: string, offer: RTCSessionDescriptionInit) {
        this.send(dstUserDevId, this.buildProtocolMessage(
            PROTO_TYPE_RTC_PROVIDE_OFFER,
            offer,
        ));
    }

    async onProvideRTCOfferMessage(message: Message) {
        const offer = JSON.parse(message.message[2].toString()) as unknown;
        if (offer && typeof offer === "object") {
            if ((offer as {[key: string]: unknown})["type"]) { // Guess it is an RTCSessionDesscriptionInit
                const peer = this.findPeerById(message.srcUserDeviceId);
                const offerTyped = offer as RTCSessionDescriptionInit;
                if (peer) {
                    await peer.connection.setRemoteDescription(offerTyped);
                    if (offerTyped.type === "offer") {
                        await peer.connection.setLocalDescription();
                        const description = peer.connection.localDescription;
                        if (description) {
                            await this.provideRTCOffer(message.srcUserDeviceId, description);
                        }
                    }
                }
            }
        }
    }

    async sendRTCIceCandidate(dstUsrDevId: string, candidate: RTCIceCandidate) {
        await this.send(dstUsrDevId, this.buildProtocolMessage(
            PROTO_TYPE_RTC_ICE_CANDIDATE,
            candidate.toJSON(),
        ));
    }

    async onRTCIceCandidateMessage(message: Message) {
        const candidate = JSON.parse(message.message[2].toString()) as unknown;
        if (candidate && typeof candidate === "object" && (candidate as {[key: string]: unknown})["candidate"]) {
            const candidateTyped = candidate as RTCIceCandidateInit;
            const peer = this.findPeerById(message.srcUserDeviceId);
            if (peer && peer.connection.remoteDescription) {
                peer.connection.addIceCandidate(candidateTyped);
            }
        }
    }
}
