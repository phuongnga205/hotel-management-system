/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { I18nService } from 'nestjs-i18n';
import { User } from './entities/user.entity';
import { AppEvent } from '../common/events/event-names.constants';
import { PasswordChangedEvent } from '../common/events/password-changed.event';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly i18n: I18nService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  create(_createUserDto: CreateUserDto) {
    return this.i18n.t('messages.USERS.CREATE_SUCCESS');
  }

  findAll() {
    return this.i18n.t('messages.USERS.FIND_ALL_SUCCESS');
  }

  findOne(id: string) {
    return this.i18n.t('messages.USERS.FIND_ONE_SUCCESS', { args: { id } });
  }

  update(id: string, _updateUserDto: UpdateUserDto) {
    return this.i18n.t('messages.USERS.UPDATE_SUCCESS', { args: { id } });
  }

  remove(id: string) {
    return this.i18n.t('messages.USERS.REMOVE_SUCCESS', { args: { id } });
  }

  // userId luôn lấy từ JWT (@GetUser trong controller), không bao giờ nhận
  // từ body — tránh 1 user tự đổi mật khẩu của người khác.
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(this.i18n.t('messages.USER_NOT_FOUND'));
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException(
        this.i18n.t('messages.USERS.CHANGE_PASSWORD_INVALID_CURRENT'),
      );
    }

    user.password = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);
    await this.userRepository.save(user);

    this.eventEmitter.emit(
      AppEvent.PASSWORD_CHANGED,
      new PasswordChangedEvent(user.id, user.email, user.username),
    );

    return {
      message: this.i18n.t('messages.USERS.CHANGE_PASSWORD_SUCCESS'),
    };
  }
}
