/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class UsersService {
  constructor(private readonly i18n: I18nService) {}

  create(_createUserDto: CreateUserDto) {
    return this.i18n.t('messages.USERS.CREATE_SUCCESS');
  }

  findAll() {
    return this.i18n.t('messages.USERS.FIND_ALL_SUCCESS');
  }

  findOne(id: number) {
    return this.i18n.t('messages.USERS.FIND_ONE_SUCCESS', { args: { id } });
  }

  update(id: number, _updateUserDto: UpdateUserDto) {
    return this.i18n.t('messages.USERS.UPDATE_SUCCESS', { args: { id } });
  }

  remove(id: number) {
    return this.i18n.t('messages.USERS.REMOVE_SUCCESS', { args: { id } });
  }
}
