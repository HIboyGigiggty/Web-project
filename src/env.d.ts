/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_HOT_MODULE_REPLACEMENT?: boolean,
    readonly VITE_SUPABASE_API_URL: string,
    readonly VITE_SUPABASE_API_KEY_PUBLIC: string,
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
  