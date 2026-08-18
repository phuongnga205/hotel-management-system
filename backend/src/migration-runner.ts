/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import AppDataSource from './data-source';

async function run() {
  try {
    await AppDataSource.initialize();
    console.log({ message: 'DataSource initialized' });
    const showMigrationsFn = AppDataSource.showMigrations.bind(
      AppDataSource,
    ) as unknown as () => Promise<unknown>;
    const runMigrationsFn = AppDataSource.runMigrations.bind(
      AppDataSource,
    ) as unknown as () => Promise<unknown>;

    console.log({ pendingMigrations: Boolean(await showMigrationsFn()) });
    const rawResult = await runMigrationsFn();
    console.log({ migrationsApplied: rawResult });
    await AppDataSource.destroy();
    process.exit(0);
  } catch (err) {
    console.error({ message: 'Migration runner error', error: err });
    try {
      await AppDataSource.destroy();
    } catch (destroyErr) {
      console.error({
        message: 'failed to destroy datasource',
        error: destroyErr,
      });
    }
    process.exit(1);
  }
}

void run();
