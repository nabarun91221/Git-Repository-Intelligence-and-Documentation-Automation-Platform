# CodeAtlas frontend

Next.js frontend for the Git Repository Intelligence and Documentation Automation Platform. It uses [shadcn/ui](https://ui.shadcn.com/) for the login interface.

## Run locally

1. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_GITHUB_APP_SLUG`.
2. Start the backend from `../backend`.
3. Start the frontend:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). The **Continue with GitHub** button starts the backend OAuth route at `/api/auth/github`.

The backend GitHub app callback must remain configured as:

```text
http://localhost:8080/api/auth/github/callback
```

Set `FRONTEND_URL=http://localhost:3000` in the backend environment. It redirects a completed OAuth flow to the frontend callback route. The backend stores the JWT in an HttpOnly `accessToken` cookie; the frontend never reads or stores the token. It only retains non-sensitive user display information locally.

## Checks

```bash
npm run lint
npx next build --webpack
```
