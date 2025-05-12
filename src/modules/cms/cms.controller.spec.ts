import { Test, TestingModule } from '@nestjs/testing';
import { CmsController } from './cms.controller';
import { CmsService } from './cms.service';

describe('CmsController', () => {
  let controller: CmsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CmsController],
      providers: [CmsService],
    }).compile();

    controller = module.get<CmsController>(CmsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
