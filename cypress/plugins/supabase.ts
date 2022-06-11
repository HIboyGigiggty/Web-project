// getCurrentSession are copied from https://github.com/supabase/supabase/discussions/6177#discussioncomment-2796540
import { SupabaseClient, createClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | undefined;

const sessions = {};

async function getCurrentSession({
    email, password, supabaseURL, supabaseApiKey,
}) {
    // If there's already a supabase client, use it, don't create a new one.
    if (!supabase) {
        supabase = createClient(supabaseURL, supabaseApiKey);
    }

    // Create a session for the user if it doesn't exist already.
    // You can then log in as any number of test users from your tests.
    if (!sessions[email]) {
        const res = await supabase.auth.signIn({
            email,
            password,
        });
        
        if (res.error) {
            throw res.error;
        }

        sessions[email] = res.session;
    }

    return sessions[email];
}

export default {
    getCurrentSession,
};
