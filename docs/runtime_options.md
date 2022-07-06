# Runtime Options
Magicboard provides a set of options to configure the runtime behavior of the application.

They can be configured as environment variables or `.env` files. Since Vite supports multi-level `.env` files, you can manage the options for different situations with ease.

## Supabase
Magicboard acts as a client of Supabase. You must provide information about the Supabase instance for the communication.

### `VITE_SUPABASE_API_URL`
The URI of your Supabase instance HTTP API.

### `VITE_SUPABASE_API_KEY_PUBLIC`
The API key with `public` and `anon` role.

## Vite
This section of options provides alternative behavior to Vite.

### `HOT_MODULE_REPLACEMENT`
It could be undefined, `true` or `false`. This option is only taking effect on the built-in web server.

- `true` will enable hot module replacement.
- `false` will disable hot module replacement.
- The default behavior will be used if it's not defined.

## Adding & Refering Runtime Options

Application code should not directly access environment variables exposed by Vite. Environment variables should be organised in "src/configs" by their topics, and used by the rest of code.
