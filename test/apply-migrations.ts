// thanks to this example for this approach:
// https://github.com/cloudflare/workers-sdk/tree/main/fixtures/vitest-pool-workers-examples/d1

import '../worker-configuration.d.ts'
import { applyD1Migrations, env } from "cloudflare:test";

// Setup files run outside isolated storage, and may be run multiple times.
// `applyD1Migrations()` only applies migrations that haven't already been
// applied, therefore it is safe to call this function here.
await applyD1Migrations(env.REFERRALS, env.TEST_MIGRATIONS);