export enum AccountType {
    LOCAL = 'local',
    GOOGLE = 'google',
}

export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    BANNED = 'banned',
}

export interface IUser {
    id: number;
    email: string;
    password?: string | null;

    fullName?: string | null;
    phoneNumber?: string | null;

    googleId?: string | null; // ID duy nhất từ Google

    accountType: AccountType;
    profilePictureMediaId?: number | null;


    roleId: number; // Foreign key
    // role?: Role;

    emailVerifiedAt?: Date | null;
    status: UserStatus;

    createdAt?: Date;
    updatedAt?: Date;

    // Các quan hệ khác (tùy chọn trong interface nếu không cần thiết cho logic chính)
    // addresses?: Address[];
    // emailVerificationToken?: EmailVerificationToken;
    // passwordResetTokens?: PasswordResetToken[];
    // productReviews?: ProductReview[];
    // orders?: Order[];
    // orderStatusHistoryEntries?: OrderStatusHistory[];
    // wishlistItems?: WishlistItem[];
    // cartItems?: CartItem[];
    // blogPosts?: BlogPost[];
    // uploadedMedia?: Media[];
}