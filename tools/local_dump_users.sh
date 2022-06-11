#! /bin/sh
# Usage: ./local_dump_users.sh <filename>
# Example: ./local_dump_users.sh dump.sql

pg_dump postgresql://postgres:postgres@localhost:54322/postgres --inserts -f "$1" --data-only -t auth.users
