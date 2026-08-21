/* sunlint-disable C018, C030, C033, S041 */
import { Repository } from 'typeorm';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { I18nService } from 'nestjs-i18n';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserQueryDto } from './dto/user-query.dto';
import * as bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../auth/auth.service';
import { PostgresErrorCode } from '../common/enums/postgres-error-code.enum';
import { UserResponseDto } from './dto/user-response.dto';
import { TokenUtil } from '../token/token.util';
import { buildAvatarPublicId } from '../config/environment.constants';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

type UniqueFieldsDto = {
  email?: string;
  username?: string;
  phone?: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly tokenUtil: TokenUtil,
    private readonly jwtService: JwtService,
    private readonly i18n: I18nService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // Dùng chung cho create/update/adminUpdate: báo lỗi 409 sớm (UX tốt hơn,
  // thấy được field nào trùng) trước khi chạm DB. Không thay thế được
  // try/catch 23505 ở saveUser() — 2 request đồng thời vẫn có thể vượt qua
  // bước check này rồi mới đụng unique constraint lúc save().
  private async ensureNoDuplicates(
    dto: UniqueFieldsDto,
    currentUser?: Pick<User, 'email' | 'username' | 'phone'>,
  ): Promise<void> {
    if (dto.email && dto.email !== currentUser?.email) {
      const existingEmail = await this.usersRepository.findOne({
        where: { email: dto.email },
        withDeleted: true,
      });

      if (existingEmail) {
        throw new ConflictException(
          this.i18n.t('messages.USERS.EMAIL_ALREADY_EXISTS'),
        );
      }
    }

    if (dto.username && dto.username !== currentUser?.username) {
      const existingUsername = await this.usersRepository.findOne({
        where: { username: dto.username },
        withDeleted: true,
      });

      if (existingUsername) {
        throw new ConflictException(
          this.i18n.t('messages.USERS.USERNAME_ALREADY_EXISTS'),
        );
      }
    }

    if (dto.phone && dto.phone !== currentUser?.phone) {
      const existingPhone = await this.usersRepository.findOne({
        where: { phone: dto.phone },
        withDeleted: true,
      });

      if (existingPhone) {
        throw new ConflictException(
          this.i18n.t('messages.USERS.PHONE_ALREADY_EXISTS'),
        );
      }
    }
  }

  // Lưới an toàn cuối cùng cho race condition: 2 request cùng qua được
  // ensureNoDuplicates() ở trên rồi mới cùng save() thì vẫn có 1 request
  // đụng unique constraint (23505) — bắt ở đây, giống AuthService.register().
  private async saveUser(user: User): Promise<User> {
    try {
      return await this.usersRepository.save(user);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === PostgresErrorCode.UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          this.i18n.t('messages.USERS.ALREADY_EXISTS'),
        );
      }
      throw error;
    }
  }

  async create(dto: CreateUserDto) {
    await this.ensureNoDuplicates(dto);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    // Admin tạo user thì kích hoạt luôn (status=ACTIVE), nên phải set luôn
    // activatedAt — nếu không cột này sẽ mãi là null dù tài khoản đã active.
    const user = this.usersRepository.create({
      email: dto.email,
      username: dto.username,
      phone: dto.phone ?? null,
      password: passwordHash,
      status: UserStatus.ACTIVE,
      activatedAt: new Date(),
    });

    const savedUser = await this.saveUser(user);

    return {
      statusCode: 201,
      message: this.i18n.t('messages.USERS.CREATE_SUCCESS'),
      data: new UserResponseDto(savedUser),
    };
  }

  async findAll(query: UserQueryDto) {
    const { page = 1, limit = 10, search, status, role } = query;

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
      queryBuilder.andWhere('user.status = :status', {
        status,
      });
    }

    // Filter role
    if (role) {
      queryBuilder.andWhere('user.role = :role', {
        role,
      });
    }

    // Pagination
    queryBuilder.skip(skip).take(limit);

    // Sort
    queryBuilder.orderBy('user.createdAt', 'DESC');

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      statusCode: 200,
      message: this.i18n.t('messages.USERS.FIND_ALL_SUCCESS'),
      data: {
        items: users.map((u) => new UserResponseDto(u)),
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
      throw new NotFoundException(this.i18n.t('messages.USERS.NOT_FOUND'));
    }

    return {
      statusCode: 200,
      message: this.i18n.t('messages.USERS.FIND_ONE_SUCCESS'),
      data: new UserResponseDto(user),
    };
  }

  // Dùng chung cho update() (self-service) và adminUpdate() — 2 hàm này chỉ
  // khác nhau ở kiểu DTO (Admin có thêm role/status) và message trả về.
  private async applyUpdate(
    id: string,
    dto: UpdateUserDto | AdminUpdateUserDto,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(this.i18n.t('messages.USERS.NOT_FOUND'));
    }

    await this.ensureNoDuplicates(dto, user);

    Object.assign(user, dto);

    // Admin đổi status sang ACTIVE mà tài khoản chưa từng active thì set
    // luôn activatedAt, tránh mãi null giống lúc create().
    if (user.status === UserStatus.ACTIVE && !user.activatedAt) {
      user.activatedAt = new Date();
    }

    return this.saveUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const updatedUser = await this.applyUpdate(id, dto);

    return {
      statusCode: 200,
      message: this.i18n.t('messages.USERS.UPDATE_SUCCESS'),
      data: new UserResponseDto(updatedUser),
    };
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto) {
    const updatedUser = await this.applyUpdate(id, dto);

    return {
      statusCode: 200,
      message: this.i18n.t('messages.USERS.UPDATE_SUCCESS'),
      data: new UserResponseDto(updatedUser),
    };
  }

  async remove(id: string) {
    // Check user exists
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.t('messages.USERS.NOT_FOUND'));
    }

    await this.usersRepository.softDelete(id);

    return {
      statusCode: 200,
      message: this.i18n.t('messages.USERS.REMOVE_SUCCESS'),
    };
  }

  async changePassword(id: string, dto: ChangePasswordDto, token: string) {
    // 1. Find user including password
    const user = await this.usersRepository.findOne({
      where: { id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException(this.i18n.t('messages.USERS.NOT_FOUND'));
    }

    // 2. Compare current password
    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        this.i18n.t('messages.USERS.INVALID_CURRENT_PASSWORD'),
      );
    }

    // 3. Prevent using the same password
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);

    if (isSamePassword) {
      throw new BadRequestException(
        this.i18n.t('messages.USERS.NEW_PASSWORD_MUST_BE_DIFFERENT'),
      );
    }

    // 4. Hash new password
    user.password = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);

    await this.usersRepository.save(user);

    // 5. Revoke the token used to change the password — buộc phải đăng nhập
    // lại bằng mật khẩu mới, giống cơ chế logout ở AuthService.
    const payload = this.jwtService.decode<{ exp?: number } | null>(token);

    if (payload?.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      const ttl = payload.exp - currentTime;

      if (ttl > 0) {
        await this.tokenUtil.revokeAuthToken(token, ttl);
      }
    }

    return {
      statusCode: 200,
      message: this.i18n.t('messages.USERS.CHANGE_PASSWORD_SUCCESS'),
    };
  }

  async updateAvatar(id: string, file: Express.Multer.File) {
    // Tìm user trước khi gọi Cloudinary — tránh tốn 1 lượt upload cho
    // request nhắm vào user không tồn tại.
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(this.i18n.t('messages.USERS.NOT_FOUND'));
    }

    // public_id cố định theo userId + overwrite:true → Cloudinary tự đè
    // avatar cũ tại đúng chỗ, không cần lưu/tra public_id cũ để dọn rác.
    const uploadResult = await this.cloudinaryService.uploadBuffer(
      file.buffer,
      {
        public_id: buildAvatarPublicId(id),
        overwrite: true,
        resource_type: 'image',
      },
    );

    user.avatarUrl = uploadResult.secure_url;

    const updatedUser = await this.saveUser(user);

    return {
      statusCode: 200,
      message: this.i18n.t('messages.USERS.AVATAR_UPLOAD_SUCCESS'),
      data: new UserResponseDto(updatedUser),
    };
  }

  async removeAvatar(id: string) {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(this.i18n.t('messages.USERS.NOT_FOUND'));
    }

    if (!user.avatarUrl) {
      throw new NotFoundException(
        this.i18n.t('messages.USERS.AVATAR_NOT_FOUND'),
      );
    }

    user.avatarUrl = null;

    await this.saveUser(user);

    // public_id suy ra được từ userId (xem updateAvatar) — không cần đọc
    // lại từ DB. Best-effort: không tồn tại trên Cloudinary thì bỏ qua.
    await this.cloudinaryService.destroy(buildAvatarPublicId(id));

    return {
      statusCode: 200,
      message: this.i18n.t('messages.USERS.AVATAR_REMOVE_SUCCESS'),
    };
  }
}
