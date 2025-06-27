// src/common/pipes/unaccent-vietnamese.pipe.ts
import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import unidecode from 'unidecode';


@Injectable()
export class UnaccentVietnamesePipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        if (typeof value === 'string') {
            return unidecode(value);
        }
        if (typeof value === 'object' && value !== null) {
            for (const key in value) {
                if (typeof value[key] === 'string') {
                    value[key] = unidecode(value[key]);
                }
            }
            return value;
        }
        return value;
    }
}