const bcrypt = require('bcrypt');
const saltRounds = 10;

export const hashPasswordUtil = async (plainPassword: string) => {
    try {
        return await bcrypt.hash(plainPassword, saltRounds);
    } catch (error) {
        console.log(error);
    }
}

export const comparePasswordUtil = async (plainPassword: string, hashPassword: string) => {
    try {
        return await bcrypt.compare(plainPassword, hashPassword);
    } catch (error) {
        console.log(error);
    }
}