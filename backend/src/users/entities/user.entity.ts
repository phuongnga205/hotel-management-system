import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Booking } from '../../bookings/entities/booking.entity';
import { Review } from '../../reviews/entities/review.entity';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
@Entity('users')
@Check('chk_users_status', `"status" IN ('ACTIVE','INACTIVE')`)
@Check('chk_users_role', `"role" IN ('USER','ADMIN')`)
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({
    length: 50,
    unique: true,
  })
  username!: string;

  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: true,
  })
  phone!: string | null;

  @Column({
    length: 255,
    unique: true,
  })
  email!: string;

  // Never serialized out — see also auth.service.ts, which maps through
  // instanceToPlain() rather than relying on this decorator alone.
  @Exclude()
  @Column({
    name: 'password_hash',
    length: 255,
  })
  password!: string;

  @Column({
    name: 'full_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  fullName?: string | null;

  @Column({
    length: 20,
    default: UserStatus.INACTIVE,
  })
  status!: UserStatus;

  // Set the moment the account activation succeeds (email verification),
  // distinct from `createdAt`. Stays null while status = INACTIVE.
  @Column({
    name: 'activated_at',
    type: 'timestamptz',
    nullable: true,
  })
  activatedAt?: Date | null;

  @Column({
    name: 'avatar_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  avatarUrl?: string | null;

  @Column({
    length: 20,
    default: UserRole.USER,
  })
  role!: UserRole;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt?: Date;
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt?: Date;
  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt?: Date | null;

  @OneToMany(() => Booking, (booking) => booking.user)
  bookings?: Booking[];

  @OneToMany(() => Review, (review) => review.user)
  reviews?: Review[];
}
