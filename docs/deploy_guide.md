# Deploy Guide

Welcome! This file is intended to guide you in deploying your Magicboard application. As the application improves, there may be additional options or ways to configure or deploy, but the most we covered here will apply still.

Thanks to "serverless architecture", you don't need to fill hundreds of blanks to start your Magicboard service. We will mention the Supabase service mostly, the deployment of Magicboard itself just takes a smaller part.

## Start your Supabase service
The Supabase handles most simple and repetitive tasks - database, user authorization, user authentication... That's why Magicboard chooses a "serverless architecture".

The Supabase software is a combination of multiple FOSSs (Free and Open Source Software). The guys made great progress to provide it as a cloud service. You can use it - if you could. It's way more simple than DIY. Check it out: https://supabase.com.

If you just want to run it locally, you can just use the Supabase command-line tool. The tool contains a command to start the testing-purpose Supabase instance. Supabase's document has covered such a use case: https://supabase.com/docs/guides/local-development.

You still need the tool whatever the way you choose to start your Supabase service. Let's get started here.

### Install the Supabase CLI

The tool is available on Windows, Linux and macOS. Visit the document for the installation guide: https://supabase.com/docs/reference/cli/installing-and-updating.

Make sure you have it:
````
supabase --version
````

### Start your Supabase instance

You have many ways to start your instance, the application only needs an API "key" and "url".

#### the Supabase Cloud

Sign in and create your project on https://app.supabase.com/. Click on "Settings" on sidebar > "API".

The "URL" under "Project URL" is your "url", and the "anon" "public" under "Project API Keys" is your "key".

##### Push database changes

The application requires a specific database structure to work. We use the Supabase CLI to record database changes. You must apply them to your database before deploying any version of the Magicboard.

Link your database if you had not done it. You can find the database URL on the "Settings" > "Database".

````
supabase db remote set "<your database url>"
````

Push changes by:
````
supabase db remote push
````

##### Change authentication callback URL
Some of the authorization methods will use a specific URL for callback. Navigate to "Authentication" > "Settings", and you will find "Site URL" and "Additional redirect URLs".

Add or change the value to the location your application serves.

#### the Supabase CLI

This approach is not recommended for usage that exposing to the Internet.

Make sure your system has [Docker](https://docker.com) installed. If you are on macOS or Windows, you can try Docker Desktop. Docker Desktop may ask you to upgrade the WSL2 kernel on Windows.

We have a copy of the Supabase configuration for testing purposes: `.github/supabase.toml`. You can use it as your base: `cp .github/supabase.toml supabase/config.toml`.

Start your instance by `supabase start`:

````
$ supabase start
Pulling...
````

This command will pull images, start containers and apply database changes. You will have anon "key" and API "url".

All data in this Supabase instance will be erased after being stopped.

- `supabase status` shows the status of the local service.
- `supabase stop` stops the service.
- `supabase reset` resets database manually.

##### Change authentication callback URL

The config we provided above uses "http://localhost:8080" as the site URL, which works as the default authentication callback URL. For the development server (`yarn serve`) it is mostly the correct URL, but it may not fits your use.

You can change "supabase/config.toml" for your use case.

````toml
[auth]
# The base URL of your website. Used as an allow-list for redirects and for constructing URLs used
# in emails.
site_url = "http://localhost:8080"
# A list of *exact* URLs that auth providers are permitted to redirect to post authentication.
additional_redirect_urls = ["https://localhost:8080"]
````

Supabase's authentication system works like OAuth 2, we recommend [OAuth 2.0 Simplified](https://www.oauth.com) if you are interested in the working detail.

#### DIY

There is a good starting point:
https://supabase.com/docs/guides/hosting/overview

## Configure runtime options

Before building the application, you need to configure the runtime options. We use environment variables for the runtime options, see [Runtime Options](./runtime_options.md) for details.

If you haven't experience with `.env` files, We recommend using a new file `.env.local` for your local environment variable. All file names that start with `.env`` and end with `.local` will be ignored by Git.

Create a `.env.local` in the project root directory:

````shell
touch .env.local
````

There are two blanks you must fill: `VITE_SUPABASE_API_URL` and `VITE_SUPABASE_API_KEY_PUBLIC`. We had filled the blanks with a default value, but we recommend you override these values for your needs. The default values:

- VITE_SUPABASEA_API_URL: `http://localhost:54321`
- VITE_SUPABASE_API_KEY_PUBLIC: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24ifQ.625_WdcF3KHqz5amU0x2X5WWHP-OEs_4qj0ssLNHzTs`


You will have a "url" and a "key" from the last section. Write them into `.env.local` in `key=value` form:

````dotenv
VITE_SUPABASE_API_URL="<url>"
VITE_SUPABASE_API_KEY_PUBLIC="<key>"
````

Your `.env.local` will be looked like this:

````dotenv
VITE_SUPABASE_API_URL="http://localhost:54321"
VITE_SUPABASE_API_KEY_PUBLIC="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24ifQ.625_WdcF3KHqz5amU0x2X5WWHP-OEs_4qj0ssLNHzTs"

````

## Build the application

Finally, build your application:

````
yarn && yarn build
````

Your application is ready for deployment in the "dist" directory.

## Deploy the application

The application is a "single page application" with "history mode", and the platform you deploy into must support it. In short, the HTTP server must serve "index.html" as "/login" "/" "/rooms/" or the other paths used in the application.

If you are finding a cloud service for the support, here are two as good starts:

- Cloudflare Pages
- Netilify

It's very simple to configure your server to behave like this. GitHub Pages does not support such behavior, but there is a workaround: https://github.com/rafgraph/spa-github-pages.

In the end, grab files under "dist" and serve on your platform/server. Visit your site and make sure it works correctly.
