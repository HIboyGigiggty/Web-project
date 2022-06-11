import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line no-undef
const url = process.env.SUPABASE_URL;
// eslint-disable-next-line no-undef
const key = process.env.SERVICE_KEY;

if (!url || !key) {
    throw Error("SUPABASE_URL or SERVICE_KEY is undefined");
}

const client = createClient(url, key);

for (const n of [1, 2, 3, 4, 5]) {
    const {user, error} = await client.auth.signUp({
        email: `example${n}@example.org`,
        password: "testing-purpose-only",
    });
    if (error) {
        throw error;
    }
    if (user) {
        console.log(`id=${user.id}\nemail=${user.email}\npassword=testing-purpose-only\n`);
    }
}
