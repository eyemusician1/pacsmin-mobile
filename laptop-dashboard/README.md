# Pacsmin Laptop Dashboard (Vercel)

This is a standalone web dashboard for laptop monitoring, deployed separately from the React Native app.

## Features

- Supabase admin login
- Realtime counters for attendance, food, and bundle
- Realtime recent activity table
- Uses the same Supabase project as mobile

## Deploy on Vercel

1. In Vercel, create a new project from your repo.
2. Set **Root Directory** to `PacsminMobile/laptop-dashboard`.
3. Deploy.

No build step is required for this static dashboard.

## Local preview

From this folder, run a static server (any one):

- `npx serve .`
- `python -m http.server 8080`

Then open `http://localhost:8080`.

## Notes

- The dashboard currently includes Supabase URL and anon key in `main.js`.
- This is acceptable for browser-side access with proper RLS policies.
- Keep write/delete policies restricted to authenticated roles only.
