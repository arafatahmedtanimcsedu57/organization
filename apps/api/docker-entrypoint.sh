#!/bin/sh
set -e

echo "[api entrypoint] waiting for the database..."
node scripts/wait-for-db.mjs

echo "[api entrypoint] running migrations..."
npm run migration:run

echo "[api entrypoint] running seed/import..."
npm run seed

echo "[api entrypoint] starting the api..."
exec npm run start
