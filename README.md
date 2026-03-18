This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database design for smart farm traceability

A comprehensive PostgreSQL schema for the smart farm and product traceability domain is available in:

- `docs/database/farm_traceability_schema.sql`
- `docs/database/README.md`


## Run the full project with Docker

This repository now includes a Docker setup for the full project:

- `Dockerfile` for the Next.js application
- `docker-compose.yml` for the app + PostgreSQL database
- automatic database initialization from `docs/database/farm_traceability_schema.sql`
- deployment guide at `docs/database/docker-deployment.md`

### Start

```bash
docker compose up --build
```

Or use the helper scripts:

```powershell
./scripts/docker-up.ps1
```

```bash
./scripts/docker-up.sh
```

### Stop

```bash
docker compose down
```

### Windows note

If you see an error like `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified` or `unable to get image 'cnm-farm-product-traceability-db'`, Docker Desktop is not running yet. Start Docker Desktop first, wait for the engine to become available, then run the command again. See `docs/database/docker-deployment.md` for troubleshooting steps.

