# Books on Cloudflare R2: runbook

The source of truth for every value in the Books R2 rollout. Secrets are never
written here, in chat, in a commit or in a log: they go into the Supabase
dashboard by the owner.

## What it is

- A free book's file lives in the R2 bucket **`dg-books-public`** (account
  `c7c89aa2bd55b8c89c894aeda12150c8`, APAC). Public access is **off** and stays
  off. Despite its name, nothing in it can be reached without a signed URL.
  `dg-books-private` exists and is unused.
- The edge function **`book-file`** (`supabase/functions/book-file/`) signs
  short-lived URLs with SigV4 (WebCrypto, no SDK):
  - `read` gives anyone RLS lets see the book a GET URL for **1 hour**, either
    `inline` for the reader or `download`, which saves the file as `<Title>.pdf`.
    A missing, unpublished or paid book gets **404 `not_found`**.
  - `upload` (admin only) gives a PUT URL for **10 minutes**.
  - `remove` (admin only) deletes one `files/…` object.
  - A request without a signed-in user gets **401**, a signed-in non-admin
    **403**, and a request when the four secrets are missing **503 `not_configured`**.
- It runs with `verify_jwt = true` and reads the row with the caller's own
  token. It has no service-role client (docs/DECISIONS.md, link-preview section).
- Keys: `files/<slug>/<timestamp>-<safe-name>.pdf|epub`. Covers stay in the
  Supabase `books` bucket.
- `books_uploads.file_store` is `'r2'` for every new upload and `'supabase'`
  for rows stored before R2. The function serves both.
- Reader: `/books-academia/<slug>/read` uses pdf.js for PDFs (range requests, so
  page 1 shows before the whole file arrives) and epub.js for EPUBs. Arrow keys
  and Page Up/Down turn pages.
- Copyright rule unchanged: a `free` book needs a file **and** a `license_note`.
  Commercial books are `paid` (purchase link only, no file).

## Values

| What | Value |
|---|---|
| Supabase project ref | `asypkbkiebjvvpimewfp` (ap-southeast-1) |
| Cloudflare account ID | `c7c89aa2bd55b8c89c894aeda12150c8` |
| Bucket | `dg-books-public` |
| R2 S3 endpoint | `https://c7c89aa2bd55b8c89c894aeda12150c8.r2.cloudflarestorage.com` |
| Function URL | `https://asypkbkiebjvvpimewfp.supabase.co/functions/v1/book-file` |
| Migration | `supabase/migrations/20261024120000_books_file_store.sql` (name `books_file_store`) |
| Its rollback | `supabase/rollback/20261024120100_books_file_store_down.sql` |

### Edge Function secrets (Supabase → Edge Functions → Secrets)

| Name | Value |
|---|---|
| `R2_ACCOUNT_ID` | `c7c89aa2bd55b8c89c894aeda12150c8` |
| `R2_BUCKET` | `dg-books-public` |
| `R2_ACCESS_KEY_ID` | the R2 API token's **Access Key ID** (owner enters it) |
| `R2_SECRET_ACCESS_KEY` | the R2 API token's **Secret Access Key** (owner enters it) |

The token: Cloudflare → R2 Object Storage → Manage API tokens → Create
**Account** API token, permission **Object Read & Write**, applied to the
specific buckets **dg-books-public** and **dg-books-private**.

### R2 CORS policy for `dg-books-public` (wrangler format, exactly this)

```json
{
  "rules": [
    {
      "allowed": {
        "origins": [
          "https://dikagustiana.com",
          "https://www.dikagustiana.com",
          "https://dikagustiana-com-*.vercel.app",
          "http://localhost:8080"
        ],
        "methods": ["GET", "HEAD", "PUT"],
        "headers": ["Range", "Content-Type"]
      },
      "exposeHeaders": ["Accept-Ranges", "Content-Range", "Content-Length", "Content-Type", "Content-Disposition", "ETag"],
      "maxAgeSeconds": 3600
    }
  ]
}
```

What each rule is for:
- **GET/HEAD with `Range`**: the reader (pdf.js asks for byte ranges; epub.js
  fetches the whole file).
- **PUT with `Content-Type`**: the admin form uploads straight to R2.
- **`exposeHeaders`**: lets pdf.js see the length and ranges.
- **Origins**: production, the Vercel previews of the `dikagustiana-com`
  project, and local `npm run dev`.
- A plain download is a navigation, not a CORS request. The DELETE is made by
  the function, not a browser.

## Steps (in order)

1. Create the R2 token (above). Copy its Access Key ID and Secret Access Key
   straight into step 2. Do not paste them anywhere else.
2. Add the four secrets in Supabase. Check the **names** only:
   `npx supabase secrets list --project-ref asypkbkiebjvvpimewfp`
3. Set CORS. Save the JSON above as `cors.json` in a temporary folder outside
   the repo, then:
   ```
   npx wrangler login
   npx wrangler r2 bucket cors set dg-books-public --file <folder>/cors.json
   npx wrangler r2 bucket cors list dg-books-public
   ```
4. Apply the migration **on its own**: Supabase MCP `apply_migration` with name
   `books_file_store`, or paste the file into the SQL editor. **Never** run
   `supabase db push` or `supabase migration repair`, because production's
   history uses different version numbers. Check:
   ```sql
   select column_name, data_type, column_default from information_schema.columns
   where table_schema='public' and table_name='books_uploads' and column_name='file_store';
   -- file_store | text | 'r2'::text
   ```
5. Deploy: `npx supabase functions deploy book-file --project-ref asypkbkiebjvvpimewfp`
6. Smoke tests, with the publishable key (public), `P=<publishable key>`:
   ```
   curl -s -w "\n%{http_code}\n" -X POST https://asypkbkiebjvvpimewfp.supabase.co/functions/v1/book-file -H "apikey: $P" -H "Authorization: Bearer $P" -H "Content-Type: application/json" -d '{"action":"read","slug":"does-not-exist","as":"inline"}'
   # 404 {"ok":false,"reason":"not_found"}
   ... -d '{"action":"upload","slug":"x","filename":"x.pdf","contentType":"application/pdf","size":10}'   # 401
   ... -d '{"action":"remove","key":"files/x/1-x.pdf"}'                                                  # 401
   ```
   503 `not_configured` means the secrets are missing (back to step 2).
7. Merge; Vercel deploys `main`.
8. Live check: add one open-licensed free book in `/admin/books`. Then check
   `file_store = 'r2'`, a `read` returning 200 with a URL, `curl -sI <url>`
   returning 200 `application/pdf`, a `Range: bytes=0-1023` request returning
   206, and the reader showing page 1 and turning pages with the arrow keys.

## Rollback

1. Revert the merge commit on `main` (Vercel redeploys the old Books page,
   whose Download points at the `books` bucket).
2. `npx supabase functions delete book-file --project-ref asypkbkiebjvvpimewfp`
3. Optional, only after step 1 is live: run
   `supabase/rollback/20261024120100_books_file_store_down.sql` in the SQL
   editor. The migration is additive, so leaving the column in place is harmless.
4. The R2 objects, CORS and secrets can stay. They expose nothing without a
   signed URL.
