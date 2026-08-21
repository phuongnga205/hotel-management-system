import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminUsersController } from './admin-users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { AvatarFileValidationPipe } from './pipes/avatar-file-validation.pipe';
import { buildAvatarMulterOptions } from '../config/avatar-upload.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AuthModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        buildAvatarMulterOptions(configService),
    }),
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, AvatarFileValidationPipe],
  exports: [UsersService],
})
export class UsersModule {}
