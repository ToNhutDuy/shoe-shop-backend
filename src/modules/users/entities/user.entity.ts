// src/module/users/entities/user.entity.ts
import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, Unique
} from 'typeorm';
import { Address } from './address.entity';
import { ProductReview } from 'src/modules/products/entities/product-review.entity';
import { Order } from 'src/modules/orders/entities/order.entity';
import { OrderStatusHistory } from 'src/modules/orders/entities/order-status-history.entity';
import { WishlistItem } from 'src/modules/carts/entities/wishlist-item.entity';
import { CartItem } from 'src/modules/carts/entities/cart-item.entity';
import { BlogPost } from 'src/modules/blogs/entities/blog-post.entity';
import { Media } from 'src/modules/media/entities/media.entity';
import { IUser } from '../interfaces/user.interface';
import { PasswordResetCode } from './password-reset-code.entity';
import { EmailVerificationCode } from './email-verification-code.entity';
import { Roles } from 'src/modules/roles/entities/role.entity';
import { MediaFolder } from 'src/modules/media/entities/media-folder.entity';

export enum AccountType {
    LOCAL = 'local',
    GOOGLE = 'google',
}

export enum UserStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    BANNED = 'banned',
}

@Entity('users')
@Unique(['email'])
@Unique(['googleId'])
export class User implements IUser {
    profilePictureMediaId: number | null;

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    email: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    password: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    fullName: string | null;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phoneNumber: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    googleId: string | null;

    @Column({
        type: 'enum',
        nullable: false,
        default: AccountType.LOCAL,
        enum: AccountType,
    })
    accountType: AccountType;

    @Column({ nullable: true, default: null })
    avatar: string;

    @Column({ name: 'role_id' })
    role_id: number;

    @ManyToOne(() => Roles, (role) => role.users, { eager: true })
    @JoinColumn({ name: 'role_id' })
    role: Roles;

    @Column({
        type: 'varchar',
        length: 500,
        nullable: true,
        default: null,
    })
    refreshToken: string | null;

    @Column({ type: 'datetime', nullable: true })
    emailVerifiedAt: Date | null;

    @Column({
        type: 'enum',
        nullable: false,
        default: UserStatus.INACTIVE,
        enum: UserStatus,
    })
    status: UserStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Address, (address) => address.user)
    addresses: Address[];

    @OneToOne(() => EmailVerificationCode, (code) => code.user, {
        cascade: true,
        nullable: true,
    })
    emailVerificationCode: EmailVerificationCode;

    @OneToOne(() => PasswordResetCode, (code) => code.user, {
        cascade: true,
        nullable: true,
    })
    passwordResetCodes: PasswordResetCode;

    @OneToMany(() => ProductReview, (review) => review.user)
    productReviews: ProductReview[];

    @OneToMany(() => Order, (order) => order.user)
    orders: Order[];

    @OneToMany(() => OrderStatusHistory, (history) => history.changedByUser)
    orderStatusHistoryEntries: OrderStatusHistory[];

    @OneToMany(() => WishlistItem, (wishlistItem) => wishlistItem.user)
    wishlistItems: WishlistItem[];

    @OneToMany(() => CartItem, (cartItem) => cartItem.user)
    cartItems: CartItem[];

    @OneToMany(() => BlogPost, (blogPost) => blogPost.author)
    blogPosts: BlogPost[];

    @OneToMany(() => Media, media => media.uploadedBy)
    uploadedMedias: Media[];

    @OneToMany(() => MediaFolder, folder => folder.createdBy)
    createdFolders: MediaFolder[];
}