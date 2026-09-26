import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';
import { DisbursementsService } from './disbursements.service';

@ApiTags('Disbursements')
@ApiBearerAuth()
@Controller('credits')
export class DisbursementsController {
  constructor(private readonly disbursements: DisbursementsService) {}

  @Post(':id/disburse')
  disburse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDisbursementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.disbursements.disburse(id, dto, user.id);
  }
}

