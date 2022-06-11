import { defineConfig } from "cypress";
import plugin_supabase from "./cypress/plugins/supabase";

const genTestingUsersEnv = () => {
    const env = {};
    for (const n of [1, 2, 3, 4, 5]) {
        env[`TEST_USER_${n}_EMAIL`] = `example${n}@example.org`;
        env[`TEST_USER_${n}_PASSWORD`] = "testing-purpose-only";
    }
    return env;
};

export default defineConfig({
    projectId: process.env.CYPRESS_PROJECT_ID,
    e2e: {
        setupNodeEvents: (on) => {
            on("task", plugin_supabase);
        },
        baseUrl: "http://localhost:8080",
        specPattern: "cypress/e2e/**/*.{js,jsx,ts,tsx}",
    },
    env: {
        ...genTestingUsersEnv(),
    },
});
