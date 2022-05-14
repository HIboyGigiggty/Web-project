# Hacking

## Configure runtime options

Before you start, you should configure runtime options. Runtime options are placed at "src/configs".

- `supabase_conf.ts`: Supabase configuration

You can find the templates under "docs/runtime_options".

## Directory Structure

- "src": source files
  - "configs": Runtime options, see above
  - "pages": Page components.
  - "widgets": Common components.
  - "App.tsx": The main application.
  - "custom.d.ts": Declaration of global resources for typescript.
  - "index.tsx": Resource injections, call of render function, etc.
  - "supabase_client.ts": The global supabase client, please don't use it in application. Use `useSupabase*` from "solid-supabase" instead.
- "docs": Technical documents.
- "supabase": Files to works with supabase.

## Start Your Work with Supabase Local Depolyment

This application can work with local depolyment of supabase just like the online one.

Follow the instruction: https://supabase.com/docs/guides/local-development

Just after `supabase start`, you can see such text:
````
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
        anon key: ******
service_role key: ******
````

Then edit the runtime option of supabase in "src/configs/supabase_conf.ts" to use the local depolyment.

## Analyze Bundle Size

Webpack have configured to generate bundle size detail when doing production bundle.

````shell
yarn build
````

You will discover the new "stats.json" under dist directory. Use [webpack bundle analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) to visualise:

````shell
yarn webpack-bundle-analyzer dist/stats.json
````
