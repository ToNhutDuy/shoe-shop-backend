const bcrypt = require('bcrypt');
const saltRounds = 10;

export const hashBcryptUtil = async (plain: string) => {
    try {
        return await bcrypt.hash(plain, saltRounds);
    } catch (error) {
        console.log(error);
    }
}

export const compareBcryptUtil = async (plain: string, hash: string) => {
    try {
        return await bcrypt.compare(plain, hash);
    } catch (error) {
        console.log(error);
    }
}

export function slugify(text: string): string {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
}