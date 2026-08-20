/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// One-off dev/test script — tạo (hoặc cập nhật) 1 tài khoản ADMIN mẫu,
// dùng để test các API /admin/** mà không phải tự tay INSERT bằng SQL.
// Không dùng trong request pipeline của app, chỉ chạy độc lập qua ts-node,
// giống pattern của migration-runner.ts / db-check.ts.
//
// Chạy: npm run seed:admin
// Đổi thông tin tài khoản bằng env var (không hardcode secret thật vào code):
//   SEED_ADMIN_EMAIL, SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD, SEED_ADMIN_PHONE
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import AppDataSource from './data-source';
import { User, UserRole, UserStatus } from './users/entities/user.entity';
import { BCRYPT_SALT_ROUNDS } from './auth/auth.service';

dotenv.config();

const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@hotel.com';
const SEED_ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? 'admin';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';
const SEED_ADMIN_PHONE = process.env.SEED_ADMIN_PHONE ?? null;

async function run() {
  try {
    await AppDataSource.initialize();
    console.log({ message: 'DataSource initialized' });

    const usersRepository = AppDataSource.getRepository(User);

    const existing = await usersRepository.findOne({
      where: [{ email: SEED_ADMIN_EMAIL }, { username: SEED_ADMIN_USERNAME }],
      withDeleted: true,
    });

    if (existing) {
      // Idempotent: chạy lại script không tạo trùng — chỉ đảm bảo tài khoản
      // đã có thật sự là ADMIN + ACTIVE (phòng trường hợp đã tồn tại với
      // role/status khác từ trước).
      existing.role = UserRole.ADMIN;
      existing.status = UserStatus.ACTIVE;
      existing.activatedAt ??= new Date();
      existing.password = await bcrypt.hash(
        SEED_ADMIN_PASSWORD,
        BCRYPT_SALT_ROUNDS,
      );
      await usersRepository.save(existing);
      console.log({
        message: 'Admin account already existed — updated to ADMIN/ACTIVE',
        email: existing.email,
        username: existing.username,
      });
    } else {
      const passwordHash = await bcrypt.hash(
        SEED_ADMIN_PASSWORD,
        BCRYPT_SALT_ROUNDS,
      );

      const admin = usersRepository.create({
        email: SEED_ADMIN_EMAIL,
        username: SEED_ADMIN_USERNAME,
        phone: SEED_ADMIN_PHONE,
        password: passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        activatedAt: new Date(),
      });

      await usersRepository.save(admin);
      console.log({ message: 'Admin account created', email: admin.email });
    }

    console.log({
      message: 'Đăng nhập bằng:',
      email: SEED_ADMIN_EMAIL,
      username: SEED_ADMIN_USERNAME,
      password: SEED_ADMIN_PASSWORD,
    });

    await AppDataSource.destroy();
    process.exit(0);
  } catch (err) {
    console.error({ message: 'Seed admin error', error: err });
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
