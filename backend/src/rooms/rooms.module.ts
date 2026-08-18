import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { RoomsExportService } from './rooms-export.service';
import { Room } from './entities/room.entity';
import { AuthModule } from '../auth/auth.module';
import { RoomsLogger } from './rooms.logger';
import { RoomPersistenceExceptionFilter } from './filters/room-persistence-exception.filter';

@Module({
  imports: [TypeOrmModule.forFeature([Room]), AuthModule],
  controllers: [RoomsController],
  providers: [
    RoomsService,
    RoomsExportService,
    RoomsLogger,
    RoomPersistenceExceptionFilter,
  ],
})
export class RoomsModule {}
