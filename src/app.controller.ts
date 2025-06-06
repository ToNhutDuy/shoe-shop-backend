import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Resource } from './modules/roles/enums/resource.enum';
import { Permissions } from './common/decorators/permissions.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }


  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
