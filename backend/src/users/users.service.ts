import { Repository } from "typeorm";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { User, UserStatus } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { I18nService } from "nestjs-i18n";
import { InjectRepository } from "@nestjs/typeorm";
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { UserQueryDto } from "./dto/user-query.dto";
import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from "../auth/auth.service";
import { UserResponseDto } from "./dto/user-response.dto";
import { AdminUpdateUserDto } from "./dto/admin-update-user.dto";
import * as jwt from 'jsonwebtoken';
import { TokenUtil } from "../token/token.util";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly tokenUtil: TokenUtil,
    private readonly i18n: I18nService,
  ) { }

  async create(dto: CreateUserDto) {
    // 1. Check duplicate email
    const existingEmail = await this.usersRepository.findOne({
      where: {
        email: dto.email,
      },
      withDeleted: false,
    });

    if (existingEmail) {
      throw new ConflictException(
        this.i18n.t('messages.USERS.EMAIL_ALREADY_EXISTS'),
      );
    }

    // 2. Check duplicate username
    const existingUsername = await this.usersRepository.findOne({
      where: {
        username: dto.username,
      },
      withDeleted: true,
    });

    if (existingUsername) {
      throw new ConflictException(
        this.i18n.t('messages.USERS.USERNAME_ALREADY_EXISTS'),
      );
    }

    // 3. Check duplicate phone
    if (dto.phone) {
      const existingPhone = await this.usersRepository.findOne({
        where: {
          phone: dto.phone,
        },
        withDeleted: true,
      });

      if (existingPhone) {
        throw new ConflictException(
          this.i18n.t('messages.USERS.PHONE_ALREADY_EXISTS'),
        );
      }
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(
      dto.password,
      BCRYPT_SALT_ROUNDS,
    );

    // 5. Create entity
    const user = this.usersRepository.create({
      email: dto.email,
      username: dto.username,
      phone: dto.phone ?? null,
      password: passwordHash,
      status: UserStatus.ACTIVE,
    });

    // 6. Save database
    const savedUser = await this.usersRepository.save(user);

    // 7. Never return password

    return new UserResponseDto(savedUser);
  }

  async findAll(query: UserQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      role,
    } = query;

    const skip = (page - 1) * limit;

    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.username',
        'user.email',
        'user.phone',
        'user.fullName',
        'user.status',
        'user.role',
        'user.avatarUrl',
        'user.activatedAt',
        'user.createdAt',
        'user.updatedAt',
      ]);

    // Search
    if (search) {
      queryBuilder.andWhere(
        `
        (
          user.username ILIKE :search
          OR user.email ILIKE :search
          OR user.fullName ILIKE :search
        )
        `,
        {
          search: `%${search}%`,
        },
      );
    }

    // Filter status
    if (status) {
      queryBuilder.andWhere(
        'user.status = :status',
        {
          status,
        },
      );
    }

    // Filter role
    if (role) {
      queryBuilder.andWhere(
        'user.role = :role',
        {
          role,
        },
      );
    }

    // Pagination
    queryBuilder
      .skip(skip)
      .take(limit);

    // Sort
    queryBuilder.orderBy(
      'user.createdAt',
      'DESC',
    );

    const [users, total] =
      await queryBuilder.getManyAndCount();

    return {
      data: users.map(
        (user) => new UserResponseDto(user),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({
      where: {
        id,
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        fullName: true,
        status: true,
        role: true,
        avatarUrl: true,
        activatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        this.i18n.t('messages.USERS.NOT_FOUND'),
      );
    }

    return new UserResponseDto(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    // 1. Find user
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(
        this.i18n.t('messages.USERS.NOT_FOUND'),
      );
    }

    // 2. Check duplicate email
    if (dto.email && dto.email !== user.email) {
      const existingEmail = await this.usersRepository.findOne({
        where: {
          email: dto.email,
        },
        withDeleted: true,
      });

      if (existingEmail) {
        throw new ConflictException(
          this.i18n.t('messages.USERS.EMAIL_ALREADY_EXISTS'),
        );
      }
    }

    // 3. Check duplicate username
    if (dto.username && dto.username !== user.username) {
      const existingUsername = await this.usersRepository.findOne({
        where: {
          username: dto.username,
        },
        withDeleted: true,
      });

      if (existingUsername) {
        throw new ConflictException(
          this.i18n.t('messages.USERS.USERNAME_ALREADY_EXISTS'),
        );
      }
    }

    // 4. Check duplicate phone
    if (dto.phone && dto.phone !== user.phone) {
      const existingPhone = await this.usersRepository.findOne({
        where: {
          phone: dto.phone,
        },
        withDeleted: true,
      });

      if (existingPhone) {
        throw new ConflictException(
          this.i18n.t('messages.USERS.PHONE_ALREADY_EXISTS'),
        );
      }
    }

    // 5. Update user
    Object.assign(user, dto);

    const updatedUser = await this.usersRepository.save(user);

    return new UserResponseDto(updatedUser);
  }

  async adminUpdate(
    id: string,
    dto: AdminUpdateUserDto,
  ): Promise<UserResponseDto> {
    // 1. Find user
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(
        this.i18n.t('messages.USERS.NOT_FOUND'),
      );
    }

    // 2. Check duplicate email
    if (dto.email && dto.email !== user.email) {
      const existingEmail = await this.usersRepository.findOne({
        where: {
          email: dto.email,
        },
        withDeleted: true,
      });

      if (existingEmail) {
        throw new ConflictException(
          this.i18n.t('messages.USERS.EMAIL_ALREADY_EXISTS'),
        );
      }
    }

    // 3. Check duplicate username
    if (dto.username && dto.username !== user.username) {
      const existingUsername = await this.usersRepository.findOne({
        where: {
          username: dto.username,
        },
        withDeleted: true,
      });

      if (existingUsername) {
        throw new ConflictException(
          this.i18n.t('messages.USERS.USERNAME_ALREADY_EXISTS'),
        );
      }
    }

    // 4. Check duplicate phone
    if (dto.phone && dto.phone !== user.phone) {
      const existingPhone = await this.usersRepository.findOne({
        where: {
          phone: dto.phone,
        },
        withDeleted: true,
      });

      if (existingPhone) {
        throw new ConflictException(
          this.i18n.t('messages.USERS.PHONE_ALREADY_EXISTS'),
        );
      }
    }

    // 5. Update user
    Object.assign(user, dto);

    const updatedUser = await this.usersRepository.save(user);

    return new UserResponseDto(updatedUser);
  }

  async remove(id: string) {
    // Check user exists
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(
        this.i18n.t('messages.USERS.NOT_FOUND'),
      );
    }

    await this.usersRepository.softDelete(id);

    return {
      message: this.i18n.t(
        'messages.USERS.REMOVE_SUCCESS',
      ),
    };
  }



  async changePassword(
    id: string,
    dto: ChangePasswordDto,
    token: string,
  ) {
    // 1. Find user including password
    const user = await this.usersRepository.findOne({
      where: { id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        this.i18n.t('messages.USERS.NOT_FOUND'),
      );
    }

    // 2. Compare current password
    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        this.i18n.t(
          'messages.USERS.INVALID_CURRENT_PASSWORD',
        ),
      );
    }

    // 3. Prevent using the same password
    const isSamePassword = await bcrypt.compare(
      dto.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        this.i18n.t(
          'messages.USERS.NEW_PASSWORD_MUST_BE_DIFFERENT',
        ),
      );
    }

    // 4. Hash new password
    user.password = await bcrypt.hash(
      dto.newPassword,
      BCRYPT_SALT_ROUNDS,
    );

    await this.usersRepository.save(user);

    const payload = jwt.decode(token) as { exp?: number } | null;

    if (payload?.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      const ttl = payload.exp - currentTime;

      if (ttl > 0) {
        await this.tokenUtil.revokeAuthToken(token, ttl);
      }
    }

    return {
      message: this.i18n.t(
        'messages.USERS.CHANGE_PASSWORD_SUCCESS',
      ),
    };
  }
}