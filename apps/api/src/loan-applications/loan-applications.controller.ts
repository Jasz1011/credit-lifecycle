import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { LoanApplicationsService } from './loan-applications.service';

@ApiTags('Loan applications')
@ApiBearerAuth()
@Controller('loan-applications')
export class LoanApplicationsController {
  constructor(private readonly applications: LoanApplicationsService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Pending loan application created' })
  create(
    @Body() dto: CreateLoanApplicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applications.create(dto, user.id);
  }

  @Get()
  list() {
    return this.applications.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.applications.findOne(id);
  }
}

