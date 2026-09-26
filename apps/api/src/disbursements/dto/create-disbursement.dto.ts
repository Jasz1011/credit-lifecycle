import { ApiProperty } from '@nestjs/swagger';
import { Bank } from '@prisma/client';
import { IsEnum, IsString, MaxLength } from 'class-validator';

export class CreateDisbursementDto {
  @ApiProperty({ enum: Bank })
  @IsEnum(Bank)
  bank!: Bank;

  @ApiProperty({ example: '100200300400', description: 'Local account number or valid IBAN.' })
  @IsString()
  @MaxLength(64)
  accountNumber!: string;
}
