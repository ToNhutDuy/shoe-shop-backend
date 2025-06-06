import { AddressType } from 'src/common/enums/address.enum';
import { z } from 'zod';

export const createAddressSchema = z.object({
    recipientFullName: z.string().min(1, 'Họ tên không được để trống'),
    recipientPhoneNumber: z.string().regex(/^(?:\+84|0)[1-9][0-9]{8}$/, {
        message: 'Số điện thoại không đúng định dạng Việt Nam',
    }),
    streetAddress: z.string({ required_error: 'Địa chỉ không được để trống' }),
    ward: z.string({ required_error: 'Phường/xã không được để trống' }),
    district: z.string({ required_error: 'Quận/huyện không được để trống' }),
    cityProvince: z.string({ required_error: 'Tỉnh/thành phố không được để trống' }),
    addressType: z.preprocess(
        (val) => (typeof val === 'string' ? val.trim().toUpperCase() : val),
        z.nativeEnum(AddressType, {
            errorMap: () => ({ message: 'Loại địa chỉ không hợp lệ (HOME, OFFICE, OTHER)' }),
        }).optional().nullable()
    ),

    isDefault: z.preprocess(
        (val) => {
            if (val === 'true') return true;
            if (val === 'false') return false;
            return val;
        },
        z.boolean().optional()
    ),
});


export const updateAddressSchema = z.object({
    recipientFullName: z.string().optional(),
    recipientPhoneNumber: z.string().regex(/^(?:\+84|0)[1-9][0-9]{8}$/, {
        message: 'Số điện thoại không đúng định dạng Việt Nam',
    }),
    streetAddress: z.string().optional(),
    ward: z.string().optional(),
    district: z.string().optional(),
    cityProvince: z.string().optional(),


    addressType: z.preprocess(
        (val) => (typeof val === 'string' ? val.trim().toUpperCase() : val),
        z.nativeEnum(AddressType, {
            errorMap: () => ({ message: 'Loại địa chỉ không hợp lệ (HOME, OFFICE, OTHER)' }),
        }).optional().nullable()
    ),

    isDefault: z.preprocess(
        (val) => {
            if (val === 'true') return true;
            if (val === 'false') return false;
            return val;
        },
        z.boolean().optional()
    ),
});
export type CreateAddressZodDto = z.infer<typeof createAddressSchema>;
export type UpdateAddressZodDto = z.infer<typeof updateAddressSchema>;
