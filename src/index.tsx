import { render } from "solid-js/web";
import App from "./App";
import { SupabaseProvider } from "solid-supabase";
import supabase_client from "./supabase_client";
import { Router } from "solid-app-router";

import "solid-styled-jsx";

import "./index.styl";
import "@fontsource/roboto";

render(() => (
    // @ts-expect-error: solid-supabase does not updated for solidjs 1.4, include the children property.
    <SupabaseProvider client={supabase_client}>
        <Router>
            <App />
        </Router>
    </SupabaseProvider>
), document.getElementById("app") as HTMLElement);
