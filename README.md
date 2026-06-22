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

## Deploy

This app is deployed as a Docker container on a dedicated server, fronted by
traefik (TLS + routing). See
[docs/adr/0018](docs/adr/0018-containerized-deployment-behind-traefik.md) for the
rationale and the load-bearing constraints.

Deployment is automated: pushing to `main` runs `.github/workflows/deploy.yml`,
which builds and pushes the image to GHCR, then runs the Ansible playbook in
`ansible/` over SSH. The playbook renders `docker-compose.yml` and `.env.production`
(secrets from the encrypted `ansible/vault.yml` — see `ansible/vault.yml.example`)
onto the server and runs `docker compose pull && up -d`.

The `Dockerfile` builds a Next.js standalone image; the compose template joins the
shared external `traefik` network and carries the router/TLS labels. The container
publishes **no host ports** — it is reachable only through traefik, which is what
makes the forwarded-host tenant resolution (ADR 0017) safe.
