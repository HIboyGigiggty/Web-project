import meyda from "meyda";

export class Player<T> {
    source: MediaStreamAudioSourceNode;
    onRemoved?: (player: Player<T>, node: MediaStreamAudioSourceNode) => void;
    level: number; // Bark Scale
    levelAnalyzer: unknown; // meyda analyzer
    udata: T;

    constructor(source: MediaStreamAudioSourceNode, levelAnalyzer: unknown, udata: T) {
        this.source = source;
        this.level = 0;
        this.levelAnalyzer = levelAnalyzer;
        this.udata = udata;
    }
}

export class VoiceChat<I, T> {
    audioCtx: AudioContext;
    destNode: MediaStreamAudioDestinationNode;
    players: Map<I, Player<T>>;
    onPlayerLevelChanged?: (chat: VoiceChat<I, T>, player: Player<T>) => void;

    constructor(ctx: AudioContext) {
        this.audioCtx = ctx;
        this.destNode = this.audioCtx.createMediaStreamDestination();
        this.players = new Map();
    }

    addPeerMediaStream(id: I, media: MediaStream, udata: T) {
        const sourceNode = this.audioCtx.createMediaStreamSource(media);
        sourceNode.connect(this.destNode);
        const analyzer = meyda.createMeydaAnalyzer({
            audioContext: this.audioCtx,
            source: sourceNode,
            bufferSize: 512,
            featureExtractors: ["loudness"],
            callback: (features: {loudness: {total: number, specific: Float32Array}}) => {
                if (player.level !== features.loudness.total) {
                    player.level = features.loudness.total;
                    if (this.onPlayerLevelChanged) {
                        this.onPlayerLevelChanged(this, player);
                    }
                }
                
            },
        });
        const player = new Player(sourceNode, analyzer, udata);
        this.players.set(id, player);
        analyzer.start();
        return player;
    }

    removePeerMediaStream(id: I) {
        const player = this.players.get(id);
        if (player) {
            (player.levelAnalyzer as {stop: () => void}).stop();
            player.source.disconnect();
            this.players.delete(id);
            if (player.onRemoved) {
                player.onRemoved(player, player.source);
            }
        }
    }

    clear() {
        this.onPlayerLevelChanged = undefined;
        for (const [, player] of this.players.entries()) {
            (player.levelAnalyzer as {stop: () => void}).stop();
            player.source.disconnect();
            if (player.onRemoved) {
                player.onRemoved(player, player.source);
            }
        }
        this.players.clear();
    }

    mixedStream() {
        return this.destNode.stream;
    }
}
