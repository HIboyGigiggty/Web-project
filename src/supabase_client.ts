import supabase_conf from "./configs/supabase_conf";
import { createClient } from "@supabase/supabase-js";

const supabase_client = createClient(supabase_conf.url, supabase_conf.key, {
    realtime: {
        params: {
            vsndate: "1.0.0", // required to use realtime (but it's not specified in supabase-js document...:/)
        }
    }
});

export default supabase_client;
