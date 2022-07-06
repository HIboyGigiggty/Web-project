/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_API_URL: string,
  readonly VITE_SUPABASE_API_KEY_PUBLIC: string,
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
