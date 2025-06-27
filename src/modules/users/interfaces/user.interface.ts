// src/modules/auth/interfaces/user.interface.ts
import { AccountType, UserStatus } from '../entities/user.entity';

export interface IUser {
    id: number;
    email: string;
    fullName: string | null;
    phoneNumber: string | null;
    googleId: string | null;
    accountType: AccountType;
    profilePictureMediaId: number | null;
    profilePictureUrl?: string;
    role_id: number;
    refreshToken?: string | null;
    emailVerifiedAt: Date | null;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
}