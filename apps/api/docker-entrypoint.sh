#!/bin/sh
set -eu

if [ -z "${JWT_ACCESS_SECRET:-}" ]; then
  JWT_ACCESS_SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))")"
  export JWT_ACCESS_SECRET
fi

if [ -z "${JWT_REFRESH_SECRET:-}" ]; then
  JWT_REFRESH_SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))")"
  export JWT_REFRESH_SECRET
fi

pnpm --filter @credit/api prisma:migrate
pnpm --filter @credit/api prisma:seed
exec node apps/api/dist/main.js

