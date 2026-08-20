import { UserRole, UserStatus } from '../entities/user.entity';

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
    constructor(user: any){
    this.id = user.id;
    this.username = user.username;
    this.email = user.email;
    this.phone = user.phone;
    this.fullName = user.fullName;
    this.role = user.role;
    this.status= user.status;
    this.avatarUrl= user.avatarUrl;
    this.activatedAt= user.activatedAt;
    this.createdAt= user.createdAt;
    this.updatedAt= user.updatedAt;
    }
}