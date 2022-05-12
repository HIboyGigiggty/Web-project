import { render } from 'solid-js/web'
import App from './App'
import { SupabaseProvider } from 'solid-supabase'
import supabase_client from './supabase_client'
import { Router } from 'solid-app-router'

import "solid-styled-jsx";

import './index.styl'
import './async-rt-injected'

import("@fontsource/roboto").then(() => {
    render(() => (
        <SupabaseProvider client={supabase_client}>
            <Router>
                <App />
            </Router>
        </SupabaseProvider>
    ), document.getElementById("app") as HTMLElement);
})
