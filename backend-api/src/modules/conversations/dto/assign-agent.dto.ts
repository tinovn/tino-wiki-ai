import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignAgentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  agentId: string;
}
