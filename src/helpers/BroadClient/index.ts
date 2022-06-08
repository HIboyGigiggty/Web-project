import { RealtimeChannel, SupabaseClient, User } from "@supabase/supabase-js";
import { getUserDeviceId } from "../getDeviceId";

export interface Room {
    id: string,
    owner: string,
    name: string,
    created_at: string,
}

export interface Participant {
    user_id: string,
}

export interface RoomOpts {
    size_x?: number,
    size_y?: number,
}

class BroadClient {
    supabase: SupabaseClient;

    constructor(supabase: SupabaseClient) {
        this.supabase = supabase;
    }

    async getAllRooms(): Promise<Room[]> {
        const user = this.userOrError();
        const response = await this.supabase.from("rooms").select("id, owner, name, created_at").eq("owner", user.id);
        if (response.error) {
            throw response.error;
        }
        return response.data;
    }

    /// Find the room and return the room infomation.
    async findRoomById(id: string): Promise<Room | null> {
        const rooms = await this.supabase.rpc("find_room_by_id", {target_id: id});
        if (rooms.error) {
            throw rooms.error;
        } else {
            if (rooms.data) {
                if ((rooms.data as unknown as Record<string, unknown>)["id"]) {
                    return rooms.data as unknown as Room;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        }
    }

    /// Return user or throw an error.
    userOrError(): User {
        const user = this.supabase.auth.user();
        if (user) {
            return user;
        } else {
            throw new Error("login required");
        }
    }

    /// Join the room as current user.
    async joinRoomById(id: string): Promise<Room | null> {
        const room = await this.findRoomById(id);
        if (room) {
            const user = this.userOrError();
            const q = await this.supabase.from("room_joint").insert({
                room_id: room.id,
                user_id: user.id,
            });
            if (q.error) {
                if (q.error.code === "23505") {
                    return room; // Duplicated primary key
                } else {
                    throw q.error;
                }
            }
            return null;
        } else {
            return null;
        }
    }

    /// Check if current user joint to the room.
    /// Return false if the user joint the room or the room not exists.
    async isJoinedRoomById(id: string): Promise<boolean> {
        const user = this.userOrError();
        const q = await this.supabase.from("room_joint").select("created_at").eq("room_id", id).eq("user_id", user.id);
        if (q.error) {
            throw q.error;
        } else {
            return q.data.length > 0;
        }
    }

    /// Send a message to room message queue with open a channel.
    /// It is recommended to use the channel to push message (see `openRoomMessageQueueChannel`).
    async sendMessageTo(room_id: string, message: object): Promise<void> {
        const q = await this.supabase.from("room_message_queue").insert({
            room: room_id,
            message: message,
        });
        if (q.error) {
            throw q.error;
        }
    }

    /// Open a room message queue channel using supabse realtime.
    /// Your server must correctly configured: https://github.com/supabase/realtime#server .
    /// And you must use `setAuth` to set token on the realtime client manually
    /// to ensure you have permission to the rows: https://github.com/supabase/realtime#realtime-rls .
    async openRoomMessageQueueChannel(room_id: string): Promise<RealtimeChannel> {
        const room = await this.findRoomById(room_id);
        if (!room) {
            throw Error("Room not found");
        }
        return this.supabase.channel(`realtime:public:room_message_queue:room=eq.${room.id}`, {
            selfBroadcast: false,
        });
    }

    async createRoom(name: string): Promise<Room> {
        const user = this.userOrError();
        const {data, error} = await this.supabase.from("rooms").insert({
            name: name,
            owner: user.id,
        });
        if (error){
            throw error;
        }
        return (data as Room[])[0];
    }

    getUserDeviceId(): string {
        return getUserDeviceId(this.userOrError().id);
    }

    async getParticipants(roomId: string): Promise<Participant[]> {
        const {data, error} = await this.supabase.from("room_joint").select("user_id").eq("room_id", roomId);
        if (error) {
            throw error;
        }
        return (data as Participant[]); // WARNING: this casting is based on the table structure.
    }

    async getRoomOpts(roomId: string): Promise<RoomOpts> {
        const {data, error} = await this.supabase.from("room_opts").select("size_x, size_y").eq("room_id", roomId).limit(1);
        if (error) {
            throw error;
        }
        if (typeof data[0] === "object") {
            return data[0] as RoomOpts;
        } else {
            return {};
        }
    }

    async setRoomOpts(roomId: string, opts: Partial<RoomOpts>) {
        const {error} = await this.supabase.from("room_opts").upsert(
            {...opts, room_id: roomId},
        ).eq("room_id", roomId);
        if (error) {
            throw error;
        }
    }
}

export default BroadClient;
