import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  displayName: string;

  // SECURITY: role is NOT accepted from client.
  // New users created by admin default to AGENT.
  // Role changes go through dedicated PATCH /users/:id/role endpoint.
}
