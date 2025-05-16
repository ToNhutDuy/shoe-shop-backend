import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne,
    OneToMany, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn,
    Unique
} from 'typeorm';

import { Address } from './address.entity';
import { EmailVerificationToken } from './email-verification-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { ProductReview } from 'src/modules/products/entities/product-review.entity';
import { Order } from 'src/modules/orders/entities/order.entity';
import { OrderStatusHistory } from 'src/modules/orders/entities/order-status-history.entity';
import { WishlistItem } from 'src/modules/cart/entities/wishlist-item.entity';
import { CartItem } from 'src/modules/cart/entities/cart-item.entity';
import { BlogPost } from 'src/modules/blogs/entities/blog-post.entity';
import { Media } from 'src/modules/media/entities/media.entity';
import { Role } from 'src/modules/role/entities/role.entity';

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
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    email: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    passwordHash: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    fullName: string | null;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phoneNumber: string | null;

    @Column({
        type: 'enum',
        nullable: false,
        default: AccountType.LOCAL,
        enum: AccountType,
    })
    accountType: AccountType;

    @Column({ type: 'bigint', nullable: true })
    profilePictureMediaId: number | null;

    @ManyToOne(() => Media, (media) => media.users)
    @JoinColumn({ name: 'profilePictureMediaId' })
    profilePictureMedia: Media | null;

    @Column({ type: 'int', nullable: false })
    roleId: number;

    @ManyToOne(() => Role, (role) => role.users)
    @JoinColumn({ name: 'roleId' })
    role: Role;

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

    @OneToOne(
        () => EmailVerificationToken,
        (emailVerificationToken) => emailVerificationToken.user,
    )
    emailVerificationToken: EmailVerificationToken;

    @OneToMany(
        () => PasswordResetToken,
        (passwordResetToken) => passwordResetToken.user,
    )
    passwordResetTokens: PasswordResetToken[];

    @OneToMany(() => ProductReview, (review) => review.user)
    productReviews: ProductReview[];

    @OneToMany(() => Order, (order) => order.user)
    orders: Order[];

    @OneToMany(() => OrderStatusHistory, (history) => history.changedBy)
    orderStatusHistoryEntries: OrderStatusHistory[];

    @OneToMany(() => WishlistItem, (wishlistItem) => wishlistItem.user)
    wishlistItems: WishlistItem[];

    @OneToMany(() => CartItem, (cartItem) => cartItem.user)
    cartItems: CartItem[];

    @OneToMany(() => BlogPost, (blogPost) => blogPost.author)
    blogPosts: BlogPost[];

    @OneToMany(() => Media, (media) => media.uploadedBy)
    uploadedMedia: Media[];
}
