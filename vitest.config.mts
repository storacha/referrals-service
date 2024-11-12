import path from 'node:path'
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig(async () => {
	// thanks to this example for this approach to handling migrations in test:
	// https://github.com/cloudflare/workers-sdk/tree/main/fixtures/vitest-pool-workers-examples/d1
	const migrationsPath = path.join(__dirname, "migrations");
	const  migrations = await readD1Migrations(migrationsPath);
	return (
		{
			test: {
				setupFiles: ["./test/apply-migrations.ts"],
				poolOptions: {
					workers: {
						wrangler: { configPath: './wrangler.toml' },
						miniflare: {
							// Add a test-only binding for migrations, so we can apply them in a
							// setup file
							bindings: { TEST_MIGRATIONS: migrations },
						},
					},
				},
			}
		})
});
