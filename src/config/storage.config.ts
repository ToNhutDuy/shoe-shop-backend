import dayjs from 'dayjs';
import { diskStorage } from 'multer';
import { extname, basename } from 'path';
import unidecode from 'unidecode';
import iconv from 'iconv-lite';

export const storageConfig = (folder: string) => diskStorage({
    destination: `./uploads/${folder}`,
    filename: (req, file, callback) => {
        const ext = extname(file.originalname);
        const rawName = basename(file.originalname, ext);
        const buffer = Buffer.from(rawName, 'binary');
        let decodedName = iconv.decode(buffer, 'utf8');

        const safeName = unidecode(decodedName)
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\-_.]/g, '');

        const uniqueSuffix = `${dayjs().format('YYYYMMDD-HHmmssSSS')}-${Math.round(Math.random() * 1e9)}-${safeName}${ext.toLowerCase()}`;
        callback(null, uniqueSuffix);
    },
});
