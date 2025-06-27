import { z } from "zod";
import { AccountType, UserStatus } from "../entities/user.entity";


export const createUserSchema = z.object({
    fullName: z.string().optional().nullable(),
    phoneNumber: z
        .union([z.string(), z.number()])
        .transform(val => val.toString())
        .refine(val => /^(?:\+84|0)[1-9][0-9]{8}$/.test(val), {
            message: 'Số điện thoại không đúng định dạng Việt Nam',
        })
        .optional()
        .nullable(),
    email: z
        .string().min(1, { message: 'Email không được để trống' })
        .email({ message: 'Email không đúng định dạng' }),
    password: z
        .string().min(1, { message: 'Mật khẩu không được để trống' })
        .min(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
        .regex(/[a-z]/, { message: 'Mật khẩu phải chứa ít nhất một chữ cái thường' })
        .regex(/[A-Z]/, { message: 'Mật khẩu phải chứa ít nhất một chữ cái hoa' })
        .regex(/[0-9]/, { message: 'Mật khẩu phải chứa ít nhất một số' })
        .regex(/[^a-zA-Z0-9]/, { message: 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt' }),
    role: z.number().int({ message: 'ID vai trò phải là số nguyên.' }),

    profilePictureMediaId: z.number().int().optional().nullable(),
    accountType: z.nativeEnum(AccountType).default(AccountType.LOCAL).optional(),
    status: z.nativeEnum(UserStatus).default(UserStatus.INACTIVE).optional(),

})

export const updateUserSchema = z.object({
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    fullName: z.string().min(1, 'Full name cannot be empty').optional(),
    phoneNumber: z.string().optional(),
    role: z.number().int().positive().optional(),
    status: z.nativeEnum(UserStatus).default(UserStatus.INACTIVE).optional(),
}).partial();

export type CreateUserZodDto = z.infer<typeof createUserSchema>;
export type UpdateUserZodDto = z.infer<typeof updateUserSchema>;