import AppDataSource from './data-source';

async function main() {
  try {
    await AppDataSource.initialize();

    const ds = AppDataSource;

    const tables = await ds.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('Public tables:', tables.map((r: any) => r.table_name));

    const check = async (sql: string, label: string) => {
      try {
        const res = await ds.query(sql);
        console.log(label + ':', res);
      } catch (err: any) {
        console.error({ label, error: err });
      }
    };

    await check("SELECT to_regclass('public.bookings') AS exists", 'bookings exists');
    await check("SELECT to_regclass('public.payments') AS exists", 'payments exists');
    await check("SELECT enum_range(NULL::public.bookings_status_enum) AS values", 'bookings_status_enum');
    await check("SELECT enum_range(NULL::public.payments_status_enum) AS values", 'payments_status_enum');
    await check("SELECT enum_range(NULL::public.payments_payment_method_enum) AS values", 'payments_payment_method_enum');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (err: any) {
    console.error({ message: 'db-check failed', error: err });
    try {
      await AppDataSource.destroy();
    } catch (destroyErr) {
      console.error({ message: 'failed to destroy datasource', error: destroyErr });
    }
    process.exit(1);
  }
}

void main();
