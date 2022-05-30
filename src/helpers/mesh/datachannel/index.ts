import EventBus from "js-event-bus";

export interface FrameFlags {
    more: boolean,
    long: boolean,
}

export class Frame {
    buffer: Uint8Array;
    
    static FLAG_MORE = 1;
    static FLAG_LONG = 1 << 1;
    static SHORT_MAX_LENGTH = 2 ^ 16 - (1 + 2);
    static LONG_MAX_LENGTH = 2 ^ 32 - (1 + 4);
    static SHORT_HEADER_SIZE = 1 + 2;
    static LONG_HEADER_SIZE = 1 + 4;

    constructor(buffer: Uint8Array) {
        this.buffer = buffer;
    }

    static zero(expected_data_length: number): Frame {
        const totalLength = (expected_data_length > Frame.SHORT_MAX_LENGTH ? (1 + 4) : (1 + 2)) + expected_data_length;
        const buffer = new Uint8Array(totalLength);
        const f = new Frame(buffer);
        f.setFlag("long", expected_data_length > Frame.SHORT_MAX_LENGTH);
        return f;
    }

    getFlags(): FrameFlags {
        const flags = this.buffer.at(0) as number;
        return {
            more: (flags & Frame.FLAG_MORE) > 0,
            long: (flags & Frame.FLAG_LONG) > 0,
        };
    }

    setFlag<K extends keyof FrameFlags>(key: K, value: boolean): FrameFlags {
        const oldFlags = this.buffer.at(0) as number;
        if (key === "more") {
            this.buffer[0] = value ? (oldFlags | Frame.FLAG_MORE) : (oldFlags & (~Frame.FLAG_MORE));
        } else if (key === "long") {
            this.buffer[0] = value ? (oldFlags | Frame.FLAG_LONG) : (oldFlags & (~Frame.FLAG_LONG));
        }
        return this.getFlags();
    }

    get length(): number {
        if (this.getFlags().long) {
            const numberBytes = this.buffer.slice(1, 5);
            const buffer = Buffer.from(numberBytes);
            return buffer.readUInt32BE();
        } else {
            const numberBytes = this.buffer.slice(1, 3);
            const buffer = Buffer.from(numberBytes);
            return buffer.readUInt16BE();
        }
    }

    get byteLength(): number {
        return this.buffer.length;
    }

    data(): Uint8Array {
        if (this.getFlags().long) {
            return this.buffer.subarray(Frame.LONG_HEADER_SIZE);
        } else {
            return this.buffer.subarray(Frame.SHORT_HEADER_SIZE);
        }
    }

    static fromArray(array: Uint8Array): Frame {
        const f = Frame.zero(array.length);
        const data = f.data();
        for (let i=0; i < array.length; i++) {
            data[i] = array[i];
        }
        return f;
    }

    static fromString(s: string): Frame {
        const encoder = new TextEncoder();
        const result = encoder.encode(s);
        return this.fromArray(result);
    }

    toString(): string {
        const decoder = new TextDecoder("utf-8");
        return decoder.decode(this.buffer);
    }

    static fromUInt(int: number): Frame {
        const buffer = Buffer.alloc(4);
        buffer.writeUInt32BE(int);
        return Frame.fromArray(buffer);
    }

    toUInt(): number {
        const buffer = Buffer.from(this.buffer);
        return buffer.readUInt32BE();
    }

    isUInt(): boolean {
        return this.length === 4;
    }

    static fromBigUInt(int: bigint): Frame {
        const buffer = Buffer.alloc(8);
        buffer.writeBigUInt64BE(int);
        return Frame.fromArray(buffer);
    }

    toBigUInt(): bigint {
        const buffer = Buffer.from(this.buffer);
        return buffer.readBigUInt64BE();
    }

    isBigUInt(): boolean {
        return this.length === 8;
    }

    /// Packing frames.
    static pack(...frames: Frame[]): Uint8Array {
        const length = frames.map((v) => v.byteLength).reduce((prev, curr) => prev + curr, 0);
        const bundle = new Uint8Array(length);
        let offest = 0;
        frames.forEach(f => {
            bundle.set(f.buffer, offest);
            offest += f.byteLength;
        });
        return bundle;
    }

    /// Reading frames from buffer.
    /// Return parsed_frames, rest data and the required data length for next complete frame.
    static unpack(array: Uint8Array): [Frame[], Uint8Array, number] {
        let rest = array;
        const frames: Frame[] = [];
        while (rest.length > 0) {
            const more = (rest[0] & this.FLAG_MORE) > 0;
            const long = (rest[0] & this.FLAG_LONG) > 0;
            const headerSize = (long? this.LONG_HEADER_SIZE: this.SHORT_HEADER_SIZE);
            const lengthBytes = Buffer.from(rest.subarray(1, headerSize));
            const length = long? lengthBytes.readUInt32BE(): lengthBytes.readUInt16BE();
            if (rest.length >= (length + headerSize)) {
                frames.push(new Frame(rest.subarray(0, headerSize + length)));
                rest = rest.subarray(headerSize + length);
                if (!more) break;
            } else {
                return [frames, rest, (length + headerSize) - rest.length];
            }
        }
        return [frames, rest, 0];
    }
}

export interface Message {
    dstUserDeviceId: string,
    roomId: string,
    srcUserDeviceId: string,
    message: Frame[],
}

export interface DataChannel {
    send(message: Message) : Promise<void>;

    get bus(): EventBus;
}