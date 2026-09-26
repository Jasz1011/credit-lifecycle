import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectApplicationDto {
  @ApiPropertyOptional({ example: 'No cumple criterios internos.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observations?: string;
}

