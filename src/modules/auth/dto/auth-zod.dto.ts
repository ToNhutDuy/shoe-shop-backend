import { string, z } from "zod";

export const loginSchema = z.object({
    email: z.string().min(1, 'Email không được để trống.').email('Email không hợp lệ.'),
    password: z.string().min(1, 'Mật khẩu không được để trống.'),
}).required();

export const registerSchema = z.object({
    fullName: z.string().min(1, 'Họ tên không được để trống').min(3, 'Họ và tên phải có ít nhất 3 ký tự.').max(100, 'Họ và tên không được quá 100 ký tự.'),
    email: z.string().email('Email không hợp lệ.').min(1, 'Email không được để trống'),
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
        .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái thường.')
        .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ cái hoa.')
        .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một số.')
        .regex(/[^a-zA-Z0-9]/, 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt.'),
    confirmPassword: z.string().min(1, 'Mật khẩu xác nhận không được để trống'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Xác nhận mật khẩu không khớp.',
    path: ['confirmPassword'],
});

export const checkCodeSchema = z.object({
    email: z.string().email('Email không hợp lệ.').min(1, 'Email không được để trống.'),
    code: z.string().min(1, 'Mã kích hoạt không được để trống.'),
}).required();

export const forgotPasswordSchema = z.object({
    email: z.string().email('Email không hợp lệ.').min(1, 'Email không được để trống.'),
}).required();

export const changePasswordSchema = z.object({
    code: z.string().min(1, 'Token không được để trống.'),
    email: z.string().min(1, 'Email không được để trống').email('Email sai định dạng'),
    password: z.string().min(1, 'Mật khẩu không được để trống.').min(8, 'Mật khẩu phải có ít nhất 8 ký tự.')
        .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái thường.')
        .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ cái hoa.')
        .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một số.')
        .regex(/[^a-zA-Z0-9]/, 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt.'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Xác nhận mật khẩu không khớp.',
    path: ['confirmPassword'],
});

export type LoginZodDto = z.infer<typeof loginSchema>;
export type RegisterZodDto = z.infer<typeof registerSchema>;
export type CheckCodeZodDto = z.infer<typeof checkCodeSchema>;
export type ForgotPasswordZodDto = z.infer<typeof forgotPasswordSchema>;
export type ChangePasswordZodDto = z.infer<typeof changePasswordSchema>;