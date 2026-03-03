import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AgentReplyDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  content: string;
}
