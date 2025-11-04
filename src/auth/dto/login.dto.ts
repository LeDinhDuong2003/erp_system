import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Username for login',
    example: 'superadmin',
  })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({
    description: 'Password for login',
    example: 'superadmin123',
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

