import { User, UserRole, UserStatus } from '../entities/user.entity';

export class UserResponseDto {

    id!: string;

    username!: string;

    email!: string;

    phone!: string | null;

    fullName!: string | null;

    role!: UserRole;

    status!: UserStatus;

    avatarUrl!: string | null;

    activatedAt!: Date | null;

    createdAt?: Date;

    updatedAt?: Date;
    constructor(user: User){
    this.id = user.id;
    this.username = user.username;
    this.email = user.email;
    this.phone = user.phone;
    this.fullName = user.fullName?? null;
    this.role = user.role;
    this.status= user.status;
    this.avatarUrl= user.avatarUrl??null;
    this.activatedAt= user.activatedAt??null;
    this.createdAt= user.createdAt;
    this.updatedAt= user.updatedAt;
    }
}