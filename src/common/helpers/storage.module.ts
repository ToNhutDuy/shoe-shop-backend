import { Module, Global } from '@nestjs/common';
import { LocalStorageProvider } from './local-storage.provider';



const storageProviderFactory = {
    provide: 'STORAGE_PROVIDER',
    useClass: LocalStorageProvider,
    // useFactory: (configService: ConfigService) => {
    //   const storageType = configService.get<string>('STORAGE_TYPE');
    //   if (storageType === 's3') {
    //     return new S3StorageProvider(configService.get('AWS_S3_BUCKET'));
    //   }
    //   return new LocalStorageProvider();
    // },
    // inject: [ConfigService], 
};

@Global()
@Module({
    providers: [
        LocalStorageProvider,
        storageProviderFactory,
    ],
    exports: [
        'STORAGE_PROVIDER',
        LocalStorageProvider,
    ],
})
export class StorageModule { }