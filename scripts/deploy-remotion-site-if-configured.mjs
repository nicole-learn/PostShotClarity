import { spawnSync } from "node:child_process"
import path from "node:path"

const forced = process.env.FORCE_REMOTION_SITE_DEPLOY === "1"
const productionVercelBuild =
  process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production"

if (!forced && !productionVercelBuild) {
  console.log("Skipping Remotion site deployment outside Production")
  process.exit(0)
}

const required = [
  "REMOTION_AWS_ACCESS_KEY_ID",
  "REMOTION_AWS_SECRET_ACCESS_KEY",
  "REMOTION_AWS_REGION",
]
const missing = required.filter((name) => !process.env[name])

if (missing.length > 0) {
  console.error(
    `Cannot deploy the Remotion site; missing ${missing.join(", ")}`
  )
  process.exit(1)
}

const executable = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "remotion.cmd" : "remotion"
)
const result = spawnSync(
  executable,
  [
    "lambda",
    "sites",
    "create",
    "compositions/index.ts",
    "--site-name=postshotclarity",
  ],
  { env: process.env, stdio: "inherit" }
)

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)
