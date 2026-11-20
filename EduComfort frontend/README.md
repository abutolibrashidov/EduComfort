# Vercel shim

The frontend now lives in `../frontend`. This folder only exists because the
Vercel project's Root Directory still points here; its `vercel.json` builds
`../frontend` and serves the result. Once Root Directory is changed to
`frontend` in Vercel settings, delete this folder.
