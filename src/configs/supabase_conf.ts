// We have migrated to .env for the runtime options managing.
// Directly editing the files might not be supported in future.
// For details to use new method managing the runtime options, see docs/runtime_options.md

export default {
    url: import.meta.env.VITE_SUPABASE_API_URL,
    key: import.meta.env.VITE_SUPABASE_API_KEY_PUBLIC,
};
