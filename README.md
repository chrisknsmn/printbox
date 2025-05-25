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

## Deploy on Cloudflare Pages

This project is configured for deployment on Cloudflare Pages. Follow these steps to deploy:

1. Push your code to a GitHub repository
2. Log in to your Cloudflare dashboard and navigate to Pages
3. Click 'Create a project' and connect your GitHub repository
4. Configure the build settings:
   - Build command: `npm run build`
   - Build output directory: `out`
   - Environment variables: Set `NODE_VERSION=20`
5. Click 'Save and Deploy'

The configuration files (`.cfpages.yaml`, `cloudflare.toml`, and `next.config.js`) are already set up for Cloudflare Pages deployment.

For more details, check out [Cloudflare Pages documentation](https://developers.cloudflare.com/pages/).
