## Frontend (Next.js)

### Environment variables

Copy `frontend/.env.example` to `frontend/.env.local` and fill in values.

Vercel note: make sure you set the same `NEXT_PUBLIC_*` env vars for **Production** and **Preview**.

Required:
- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_FIREBASE_*` (Firebase web app config)

### Firebase Authorized Domains (Google sign-in)

If you deploy on Vercel and use `signInWithPopup`, make sure your Vercel domains are added to:

Firebase Console → Authentication → Settings → Authorized domains

Include:
- `youtube-myapp.vercel.app`
- every Vercel Preview Deployment domain you use
