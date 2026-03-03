import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConversationMessageDto {
  @ApiProperty({ enum: ['CUSTOMER', 'AGENT', 'AI_ASSISTANT', 'SYSTEM'] })
  @IsIn(['CUSTOMER', 'AGENT', 'AI_ASSISTANT', 'SYSTEM'])
  role: string;

  @ApiProperty()
  @IsString()
  content: string;
}
