# Testing Magicbroad
Magicbroad have configured [cypress](https://cypress.io) as test runner.

We provide a SQL file contains data to help tests works, it's the "docs/testing_res/seed.sql". It contains:

- Five testing users with password "testing-purpose-only".
  - The email of a user is `example$n@example.org`, the `$n` should be replaced by one of 1 to 5.
  - For example, `example2@example.org`.

The tests will assume the data is available.

Before starting the tests, you must copy the "seed.sql" to "supabase/seed.sql":

````
cp docs/testing_res/seed.sql supabase/seed.sql
````

Supabase will execute the file in database startup. Testing may reset the database. Switch the database branch (see `supabase db branch`) before starting tests if you want to keep your current data.

Besides, you need to configure fields to make helpers in cypress knows your environment. The cypress environment variable file template is "docs/testing_res/cypress.env.json".

````shell
cp docs/testing_res/cypress.env.json .
````

Fill the blanks:

- `SUPABASE_URL` and `SUPABASE_API_KEY`: url and public+anon key.

## Generate new "seed.sql"

After updating of supabase, the table structure of `auth.users` may change. We provide two simple scripts to generate new "seed.sql" with your supabase local deployment. 

Your environment must have a POSIX shell and the "pg_dump" commandline tool.

The first step is reset your database, this step make sure your database clean (If your "supabase/seed.sql" inserts new users, you need to remove them):

````shell
supabase db reset
````

The next step is filling database:

````shell
SUPABASE_URL="<Your Supabase URL>" SERVICE_KEY="<Your Supabase Service Role Key>" yarn node tools/local_users_gen.mjs
````

Replace "<>" with your information. If this command run successfully, dump the table:

````shell
./tools/local_dump_users.sh dump.sql
````

Now you have dump content in "dump.sql", open the file. Copy all of "INSERT"s and replace the old SQL statements in "seed.sql" with them.
