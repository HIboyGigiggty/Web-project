import BroadClient from "./index";
import { createSupabase } from "solid-supabase";

export const useBroadClient = () => {
    const supabase = createSupabase();

    return new BroadClient(supabase);
};
