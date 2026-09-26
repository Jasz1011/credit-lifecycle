import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'analista' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  identifier!: string;

  @ApiProperty({ example: 'Credito2026!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

