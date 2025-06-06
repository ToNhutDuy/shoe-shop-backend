// src/modules/auth/interfaces/user.interface.ts

import { AccountType, UserStatus } from '../entities/user.entity'; // Đảm bảo import đúng enum

export interface IUser {
    id: number;
    email: string;
    fullName: string | null;
    phoneNumber: string | null;
    googleId: string | null;
    accountType: AccountType;
    profilePictureMediaId: number | null;
    role_id: number;
    refreshToken?: string | null;
    emailVerifiedAt: Date | null;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
    // password không có ở đây vì đã được Exclude
    // Thêm các thuộc tính khác nếu bạn muốn trả về chúng (ví dụ: profilePictureMedia.url)
    // code?: string; // Nếu bạn muốn code có mặt trong interface (tùy chọn)
}