## YouTube Clone (Next.js + Node/Express)

### Production configuration (Vercel + Render)

This repo is a Next.js frontend deployed on Vercel and an Express backend deployed on Render.

#### Frontend environment variables

Create `frontend/.env.local` for local dev, and set the same variables in Vercel.

Important (Vercel): set `NEXT_PUBLIC_*` env vars for **both** `Production` and `Preview` environments.
If `Preview` is missing `NEXT_PUBLIC_BACKEND_URL`, your preview deployments may fall back to incorrect defaults
and you can end up with requests/media/socket URLs pointing at localhost or the Vercel origin.

- `NEXT_PUBLIC_BACKEND_URL`
	- Development: `http://localhost:5000`
	- Production: `https://youtube-myapp.onrender.com`

The frontend uses this value for:
- API requests (axios)
- Media URL building (videos/thumbnails)
- Socket.IO client connection

See `frontend/.env.example` for the full list.

#### Firebase `auth/unauthorized-domain` (Google sign-in)

If `signInWithPopup` fails with `FirebaseError: auth/unauthorized-domain`, you must add your deployed domains to:

Firebase Console → Authentication → Settings → Authorized domains

Include at least:
- `youtube-myapp.vercel.app`
- every Vercel Preview Deployment domain you use

Important: this is a Firebase Console configuration step (no frontend hardcoding can safely bypass it).
