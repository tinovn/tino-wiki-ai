import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WidgetMessageDto {
  @ApiProperty({ description: 'Session ID from init' })
  @IsString()
  @MinLength(1)
  sessionId: string;

  @ApiProperty({ description: 'User message text' })
  @IsString()
  @MinLength(1)
  message: string;
}
