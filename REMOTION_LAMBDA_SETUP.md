# Remotion Lambda Setup — PostShotClarity

This guide walks through everything **you** need to do in AWS and locally so
that I can finish wiring Remotion Lambda into the app. Follow the sections in
order. When you're done, paste the values into `.env.local` (template is in
`.env.lambda.example`) and let me know — I'll take over from step 6.

---

## What we're migrating and why

Today `app/api/render-vertical/route.ts` bundles the Remotion project
in-process, writes the uploaded source to `public/tmp/`, then calls
`@remotion/renderer` → `renderMedia()`. That forces the rendering machine
(your laptop in dev, a single Next.js server instance in prod) to do all the
CPU work, serialised by `Config.setConcurrency(1)` in `remotion.config.ts`.

The Lambda flow replaces that with:

1. A **deployed Remotion site** (your `compositions/` bundle uploaded to S3).
2. A **deployed Lambda function** that pulls from that site and renders.
3. The Next.js route calls `renderMediaOnLambda()` → `getRenderProgress()`
   and streams/redirects the user to the output file in S3.

Renders parallelise across many Lambdas, scale to zero, and don't block the
Next.js server.

---

## Prerequisites

- An AWS account with root access (or an admin user) — you said you have this.
- Node.js + npm locally (already in this repo).
- AWS CLI is **not** required; everything below uses the Remotion CLI
  (`npx remotion lambda ...`) and the AWS web console.

---

## Step 1 — Install the Remotion Lambda package

From the repo root:

```bash
npm install @remotion/lambda
```

This adds the CLI (`npx remotion lambda …`) and the JS SDK
(`renderMediaOnLambda`, `getRenderProgress`, etc.) that the API route will use.
Pin it to the same version as the rest of Remotion (currently `^4.0.448` in
`package.json`) — `npm install @remotion/lambda@^4.0.448` if npm doesn't
auto-resolve to a matching version.

---

## Step 2 — Pick an AWS region and stick with it

Choose the region closest to where your app runs (and where your users are).
Every Lambda + S3 resource Remotion creates is region-scoped, so mixing
regions silently breaks things.

Suggested: `us-east-1` (cheapest, most features). Write it down — you'll use
the same region for every command below and for `REMOTION_AWS_REGION`.

---

## Step 3 — Create the Remotion IAM **role** (used by the Lambda itself)

The Lambda function needs permissions to read/write S3 and emit logs. Remotion
generates the exact policy JSON for you.

### 3a. Generate the role policy JSON

```bash
npx remotion lambda policies role
```

Copy the JSON that prints to stdout.

### 3b. Create the policy in AWS

1. AWS Console → **IAM** → **Policies** → **Create policy**.
2. Switch to the **JSON** tab, paste the JSON from step 3a, **Next**.
3. Name it **`remotion-lambda-policy`**, **Create policy**.

### 3c. Create the role and attach the policy

1. IAM → **Roles** → **Create role**.
2. Trusted entity type: **AWS service**. Use case: **Lambda**. **Next**.
3. Search for and tick **`remotion-lambda-policy`**. **Next**.
4. Role name: **`remotion-lambda-role`** (must be exactly this — the CLI
   looks it up by name). **Create role**.

---

## Step 4 — Create the IAM **user** (used by the CLI + app to invoke Lambda)

This is a separate identity — the one whose access keys will live in
`.env.local`.

### 4a. Create the user

1. IAM → **Users** → **Create user**.
2. User name: **`remotion-user`**.
3. **Do not** check "Provide user access to the AWS Management Console" —
   this is a machine user.
4. Permissions options: **Attach policies directly**, but skip adding any
   now. **Next** → **Create user**.

### 4b. Attach the user policy

```bash
npx remotion lambda policies user
```

Copy the JSON output, then:

1. IAM → Users → **`remotion-user`** → **Permissions** tab.
2. **Add permissions** → **Create inline policy**.
3. JSON tab → paste → **Next**.
4. Name: **`remotion-user-policy`** → **Create policy**.

### 4c. Create access keys

1. IAM → Users → **`remotion-user`** → **Security credentials** tab.
2. **Access keys** → **Create access key**.
3. Use case: **Application running outside AWS**. Confirm. **Next** →
   **Create access key**.
4. **Copy both values now** — the secret is only shown once.
5. Paste them into `.env.local` as:
   ```
   REMOTION_AWS_ACCESS_KEY_ID=AKIA...
   REMOTION_AWS_SECRET_ACCESS_KEY=...
   ```

### 4d. (Optional but recommended) Validate permissions

```bash
npx remotion lambda policies validate
```

This runs every action through the AWS Policy Simulator and confirms nothing
is missing. If it complains, re-check steps 3 and 4.

---

## Step 5 — Deploy the Lambda function and the site

Make sure `.env.local` has `REMOTION_AWS_ACCESS_KEY_ID`,
`REMOTION_AWS_SECRET_ACCESS_KEY`, and `REMOTION_AWS_REGION` filled in before
running these — the CLI reads them automatically.

### 5a. Deploy the renderer Lambda

```bash
npx remotion lambda functions deploy --memory=3009 --disk=10240 --timeout=240
```

Notes on the flags:
- `--memory=3009` — 3 GB. Good balance for 1080p h264 renders; Lambda CPU
  scales linearly with memory up to 3009 MB, above which you pay more without
  much speedup for our workload.
- `--disk=10240` — 10 GB ephemeral storage (the Remotion default on v5+;
  explicit here so the command behaves the same on 4.x). Needed when muxing
  longer clips.
- `--timeout=240` — 4 minutes per invocation. Each Lambda only renders a
  chunk, so this is plenty; bump to the max of 900 only if you render very
  long single-shot videos.

The command prints a function name such as
`remotion-render-4-0-448-mem3009mb-disk10240mb-240sec`. Paste it into
`.env.local`:

```
REMOTION_AWS_FUNCTION_NAME=remotion-render-4-0-448-mem3009mb-disk10240mb-240sec
```

Re-run this command after every `@remotion/*` package upgrade — each Remotion
version gets its own function.

### 5b. Deploy the site (your compositions bundle)

```bash
npx remotion lambda sites create compositions/index.ts --site-name=postshotclarity
```

- `compositions/index.ts` matches `Config.setEntryPoint` in
  `remotion.config.ts`, so no change there.
- `--site-name=postshotclarity` gives it a stable URL. Re-running with the
  same name overwrites in place, which is what you want for deploys.

The CLI prints a **Serve URL** like
`https://remotionlambda-useast1-abcd1234.s3.us-east-1.amazonaws.com/sites/postshotclarity/index.html`.
Paste it into `.env.local`:

```
REMOTION_AWS_SERVE_URL=https://remotionlambda-useast1-abcd1234.s3.us-east-1.amazonaws.com/sites/postshotclarity/index.html
```

Re-run this command whenever you change anything under `compositions/` or
`public/` (anything baked into the bundle).

### 5c. (Optional) Check concurrency quota

```bash
npx remotion lambda quotas
```

Default is 1000 concurrent Lambda invocations per region, which is way more
than we need. If you ever see throttling, this is where you'd request an
increase.

---

## Step 6 — Hand off

Once `.env.local` contains all of:

- `REMOTION_AWS_ACCESS_KEY_ID`
- `REMOTION_AWS_SECRET_ACCESS_KEY`
- `REMOTION_AWS_REGION`
- `REMOTION_AWS_FUNCTION_NAME`
- `REMOTION_AWS_SERVE_URL`

let me know and I'll:

1. Rewrite `app/api/render-vertical/route.ts` to upload the input video to S3,
   call `renderMediaOnLambda()` with the existing `inputProps`, poll
   `getRenderProgress()`, and return the S3 output URL (or stream the file,
   whichever fits the frontend).
2. Update the frontend (`app/(app)/vertical/vertical-editor.tsx`) if the
   response shape changes (e.g. if we switch from a direct `video/mp4` stream
   to a redirect).
3. Delete the now-unused in-process bundling code and the `public/tmp/`
   shuffle.
4. Drop the `@remotion/bundler` + `@remotion/renderer` dependencies from
   `package.json` if nothing else uses them.

---

## Ongoing operations cheat sheet

| Task | Command |
| --- | --- |
| Redeploy site after composition changes | `npx remotion lambda sites create compositions/index.ts --site-name=postshotclarity` |
| List deployed functions | `npx remotion lambda functions ls` |
| List deployed sites | `npx remotion lambda sites ls` |
| Remove an old function (after upgrading Remotion) | `npx remotion lambda functions rmall` |
| Remove an old site | `npx remotion lambda sites rm <name>` |
| Smoke-test a render from the CLI | `npx remotion lambda render "$REMOTION_AWS_SERVE_URL" VerticalClip` |
| Re-validate IAM setup | `npx remotion lambda policies validate` |

---

## Cost sanity check

Remotion Lambda bills you twice: Lambda compute time (per-ms, scaled by
memory) and S3 storage/egress for the outputs. With `--memory=3009` a typical
30-second 1080×1920 h264 render costs a few cents. The bucket Remotion
creates has no default lifecycle policy — add an S3 lifecycle rule to expire
`renders/*` after N days if you don't want outputs to accumulate.
