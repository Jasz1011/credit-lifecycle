import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreditsService } from './credits.service';

@ApiTags('Credits')
@ApiBearerAuth()
@Controller('credits')
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  @Get('approved')
  listApproved() {
    return this.credits.listApproved();
  }

  @Get('search')
  @ApiQuery({ name: 'identification', required: true })
  search(@Query('identification') identification = '') {
    return this.credits.searchByIdentification(identification);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.credits.findOne(id);
  }

  @Get(':id/payment-schedule')
  schedule(@Param('id', ParseIntPipe) id: number) {
    return this.credits.getSchedule(id);
  }
}

