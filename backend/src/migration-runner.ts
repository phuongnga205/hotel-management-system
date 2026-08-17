import AppDataSource from './data-source';

async function run() {
  try {
    await AppDataSource.initialize();
    console.log({ message: 'DataSource initialized' });
    const migrations = await AppDataSource.showMigrations();
    console.log({ pendingMigrations: migrations });
    const result = await AppDataSource.runMigrations();
    console.log({ migrationsApplied: result.map((r) => r.name) });
    await AppDataSource.destroy();
    process.exit(0);
  } catch (err) {
    console.error({ message: 'Migration runner error', error: err });
    try {
      await AppDataSource.destroy();
    } catch (destroyErr) {
      console.error({ message: 'failed to destroy datasource', error: destroyErr });
    }
    process.exit(1);
  }
}

run();
