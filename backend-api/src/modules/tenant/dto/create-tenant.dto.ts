import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiProperty({ description: 'Admin email for the tenant' })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ description: 'Admin password' })
  @IsString()
  @MinLength(8)
  adminPassword: string;
}
