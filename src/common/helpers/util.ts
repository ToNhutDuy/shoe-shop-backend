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