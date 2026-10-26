import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'analista@demo.concilia.app' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'Concilia2026!' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
