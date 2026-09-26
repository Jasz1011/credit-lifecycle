import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ApproveApplicationDto } from './dto/approve-application.dto';
import { RejectApplicationDto } from './dto/reject-application.dto';
import { RiskCommitteeService } from './risk-committee.service';

@ApiTags('Risk committee')
@ApiBearerAuth()
@Controller('risk-committee')
export class RiskCommitteeController {
  constructor(private readonly committee: RiskCommitteeService) {}

  @Get('pending')
  listPending() {
    return this.committee.listPending();
  }

  @Get(':id')
  findCase(@Param('id', ParseIntPipe) id: number) {
    return this.committee.findCase(id);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveApplicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.committee.approve(id, dto, user.id);
  }

  @Post(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectApplicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.committee.reject(id, dto, user.id);
  }
}

