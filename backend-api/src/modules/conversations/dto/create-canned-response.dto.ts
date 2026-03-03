import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCannedResponseDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  shortCode: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  content: string;
}

export class UpdateCannedResponseDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  content?: string;
}
