import { ApiProperty } from '@nestjs/swagger';
import { EmploymentType, PaymentFrequency } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLoanApplicationDto {
  @ApiProperty({ example: 'María López' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ example: '001-010190-0001A' })
  @IsString()
  @Matches(/^[A-Za-z0-9-]{5,30}$/)
  identification!: string;

  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @ApiProperty({ example: '+505 8888 8888' })
  @IsString()
  @Matches(/^\+?[0-9 ()-]{7,25}$/)
  phone!: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsDateString({ strict: true })
  birthDate!: string;

  @ApiProperty({ enum: EmploymentType })
  @IsEnum(EmploymentType)
  employmentType!: EmploymentType;

  @ApiProperty({ example: 'Comercial Centroamérica' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  workplace!: string;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(70)
  employmentYears!: number;

  @ApiProperty({ example: 1200.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000000)
  monthlyIncome!: number;

  @ApiProperty({ example: 10000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000000)
  requestedAmount!: number;

  @ApiProperty({ example: 24 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  installmentCount!: number;

  @ApiProperty({ example: 12.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  annualInterestRate!: number;

  @ApiProperty({ enum: PaymentFrequency })
  @IsEnum(PaymentFrequency)
  paymentFrequency!: PaymentFrequency;
}

