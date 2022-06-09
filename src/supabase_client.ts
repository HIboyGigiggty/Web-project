import {supabaseKey, supabaseURL} from "./stores/supabase";
import { createClient } from "@supabase/supabase-js";

const supabase_client = createClient(supabaseURL.get(), supabaseKey.get(), {
    realtime: {
        params: {
            vsndate: "1.0.0", // required to use realtime (but it's not specified in supabase-js document...:/)
        }
    }
});

export default supabase_client;
