# Hacking

## Setting up the development environment

See [Development Environment Suggestions](./docs/development_env.md).

Many checks are removed since we moved to Vite from Webpack, so it's up to your editor/IDE to perform these checks. On the other hand, the building speed goes up since these checks are removed.

## Configure runtime options

You may configure the Supabase information to correctly work with your instance. The default `.env` shipped for local Supabase deployment.

See [Runtime Options](./docs/runtime_options.md)

## Directory Structure

- "src": source files
  - "configs": Runtime options, see above
  - "pages": Page components.
  - "widgets": Common components.
  - "App.tsx": The main application.
  - "custom.d.ts": Declaration of global resources for typescript.
  - "index.tsx": Resource injections, call of render function, etc.
  - "supabase_client.ts": The global Supabase client, please don't use it in the application. Use `useSupabase*` from "solid-supabase" instead.
- "docs": Technical documents.
- "supabase": Files to work with Supabase.

## Start Your Work with Supabase Local Depolyment

This application can work with the local deployment of Supabase just like the online one.

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
Vite has configured to generate bundle size detail when doing production bundle.

````shell
yarn build
````

You will discover the new "stat.json" under dist directory. Use [rollup-plugin-visualizer](https://github.com/webpack-contrib/webpack-bundle-analyzer) to visualize:

````shell
yarn visualize-bundle
````

This command will generate a "stats.html" in the same directory. You can drag it onto your browser to view it.

## Migrated to Vite
Since commit e7c76e7, we have moved to vite to bundle package. It is a default to solid.js community and provides better performance instead webpack.

The npm scripts are correctly configured to use vite. Though there are some less popular scripts are removed.
