import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ApproveApplicationDto {
  @ApiProperty({ example: 'Capacidad de pago verificada.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  observations!: string;
}

