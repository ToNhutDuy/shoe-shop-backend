import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { StatisticsService } from './statistics.service';


@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) { }


}
