import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PushTypeDto {
  WEB_PUSH = 'WEB_PUSH',
  FCM = 'FCM',
}

export class RegisterPushDto {
  @ApiProperty({ enum: PushTypeDto })
  @IsEnum(PushTypeDto)
  type: PushTypeDto;

  @ApiProperty({ description: 'Web Push endpoint URL or FCM device token' })
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @ApiPropertyOptional({ description: 'Web Push keys { p256dh, auth }' })
  @IsObject()
  @IsOptional()
  keys?: Record<string, string>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  userAgent?: string;
}

export class UnregisterPushDto {
  @ApiProperty({ description: 'The endpoint to unregister' })
  @IsString()
  @IsNotEmpty()
  endpoint: string;
}
