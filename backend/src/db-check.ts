import AppDataSource from './data-source';

async function main() {
  try {
    await AppDataSource.initialize();

    const ds = AppDataSource;

    const queryFn = ds.query.bind(ds) as unknown as (
      sql: string,
    ) => Promise<unknown>;
    const rawTables = await queryFn(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
    );
    const tables = rawTables as Array<{ table_name: string }>;
    console.log(
      'Public tables:',
      tables.map((r) => r.table_name),
    );

    const check = async (sql: string, label: string) => {
      try {
        const res: unknown = await queryFn(sql);
        console.log(label + ':', res);
      } catch (err: unknown) {
        console.error({ label, error: err });
      }
    };

    await check(
      "SELECT to_regclass('public.bookings') AS exists",
      'bookings exists',
    );
    await check(
      "SELECT to_regclass('public.payments') AS exists",
      'payments exists',
    );
    await check(
      "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rooms' ORDER BY ordinal_position",
      'rooms columns',
    );
    await check(
      'SELECT "id", "name", "description", "price_per_night", "capacity", "created_at", "updated_at" FROM "rooms" ORDER BY "id" ASC LIMIT 1',
      'rooms query',
    );
    await check(
      'SELECT enum_range(NULL::public.bookings_status_enum) AS values',
      'bookings_status_enum',
    );
    await check(
      'SELECT enum_range(NULL::public.payments_status_enum) AS values',
      'payments_status_enum',
    );
    await check(
      'SELECT enum_range(NULL::public.payments_payment_method_enum) AS values',
      'payments_payment_method_enum',
    );

    await AppDataSource.destroy();
    process.exit(0);
  } catch (err: unknown) {
    console.error({ message: 'db-check failed', error: err });
    try {
      await AppDataSource.destroy();
    } catch (destroyErr: unknown) {
      console.error({
        message: 'failed to destroy datasource',
        error: destroyErr,
      });
    }
    process.exit(1);
  }
}

void main();
