import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Order } from 'src/modules/orders/entities/order.entity';

export enum AddressType {
    HOME = 'home',
    COMPANY = 'company',
}

@Entity('addresses')
export class Address {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'bigint', nullable: false })
    userId: number;

    @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'varchar', length: 255, nullable: false })
    recipientFullName: string;

    @Column({ type: 'varchar', length: 20, nullable: false })
    recipientPhoneNumber: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    streetAddress: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    ward: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    district: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    cityProvince: string;

    @Column({ type: 'varchar', length: 100, nullable: false, default: 'Vietnam' })
    country: string;

    @Column({
        type: 'enum',
        enum: AddressType,
        nullable: true,
    })
    addressType: AddressType | null;

    @Column({ type: 'boolean', nullable: false, default: false })
    isDefault: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Order, (order) => order.shippingAddress)
    orders: Order[];
}
