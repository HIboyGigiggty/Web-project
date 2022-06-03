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
        const isLongHeader = (expected_data_length > Frame.SHORT_MAX_LENGTH);
        const totalLength = (isLongHeader ? Frame.LONG_HEADER_SIZE : Frame.SHORT_HEADER_SIZE) + expected_data_length;
        const buffer = new Uint8Array(totalLength);
        const f = new Frame(buffer);
        f.setFlag("long", isLongHeader);
        f.length = expected_data_length;
        console.log(f);
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
    
    /**
     * Get the payload's length if it's valid.
     */
    validateLength(): number | null {
        if (this.byteLength > 1) {
            const headerSize = this.getFlags().long? Frame.LONG_HEADER_SIZE: Frame.SHORT_HEADER_SIZE;
            if (this.byteLength >= headerSize) {
                if (this.byteLength === (headerSize + this.length)) {
                    return this.length;
                }
            }
        }
        return null;
    }

    /**
     * Get the length attribute (the length of payload) from header.
     * For the total size of the frame, see `byteLength`; for verified length, see `validateLength`.
     */
    get length(): number {
        if (this.getFlags().long) {
            const view = new DataView(this.buffer.buffer, 1);
            return view.getUint32(0);
        } else {
            const view = new DataView(this.buffer.buffer, 1);
            return view.getUint16(0);
        }
    }

    /**
     * Set the length attribute (the length of payload) in the header.
     */
    set length(len: number) {
        if (this.getFlags().long) {
            new DataView(this.buffer.buffer, 1).setInt32(0, len);
        } else {
            new DataView(this.buffer.buffer, 1).setInt16(0, len);
        }
    }

    /**
     *  Get the total length of the header and payload.
     */
    get byteLength(): number {
        return this.buffer.length;
    }

    /**
     * Get the payload as a subarray.
     * 
     * WARNING: The length must be valid when using this method.
     */
    data(): Uint8Array {
        if (this.getFlags().long) {
            return this.buffer.subarray(Frame.LONG_HEADER_SIZE, Frame.LONG_HEADER_SIZE+this.length);
        } else {
            return this.buffer.subarray(Frame.SHORT_HEADER_SIZE, Frame.SHORT_HEADER_SIZE+this.length);
        }
    }

    static fromArray(array: Uint8Array, more?: boolean): Frame {
        const f = Frame.zero(array.length);
        const data = f.data();
        console.log(f.length, f.byteLength, data.length, array.length);
        data.set(array);
        f.setFlag("more", more || false);
        return f;
    }

    static fromString(s: string, more?: boolean): Frame {
        const encoder = new TextEncoder();
        const result = encoder.encode(s);
        return this.fromArray(result, more);
    }

    toString(): string {
        const decoder = new TextDecoder("utf-8");
        return decoder.decode(this.buffer);
    }

    static fromUInt(int: number, more?: boolean): Frame {
        const buffer = new Uint8Array(4);
        new DataView(buffer.buffer).setUint32(0, int);
        return Frame.fromArray(buffer, more);
    }

    toUInt(): number {
        const view = new DataView(this.buffer);
        return view.getUint32(0);
    }

    isUInt(): boolean {
        return this.length === 4;
    }

    static fromBigUInt(int: bigint, more?: boolean): Frame {
        const buffer = new Uint8Array(8);
        new DataView(buffer.buffer).setBigUint64(0, int);
        return Frame.fromArray(buffer, more);
    }

    toBigUInt(): bigint {
        const view = new DataView(this.buffer);
        return view.getBigUint64(0);
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

    /**
     * Get current header length.
     */
    get headerLength(): number {
        return this.getFlags().long? Frame.LONG_HEADER_SIZE: Frame.SHORT_HEADER_SIZE;
    }

    /**
     * Get current padding size.
     */
    get paddingLength(): number {
        return this.byteLength - this.headerLength - this.length;
    }

    /**
     * Get a clone of this frame.
     * @param padding the padding the clone will contain.
     * @returns a new frame.
     */
    clone(padding?: number): Frame {
        const array = new Uint8Array(this.headerLength + this.length + (padding || 0));
        array.set(this.buffer.slice(0, this.headerLength + this.length));
        console.log(this.buffer, array);
        return new Frame(array);
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
