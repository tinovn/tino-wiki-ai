import { IsIn, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeRoleDto {
  @ApiProperty({ enum: ['ADMIN', 'EDITOR', 'AGENT', 'VIEWER'] })
  @IsString()
  @IsIn(['ADMIN', 'EDITOR', 'AGENT', 'VIEWER'])
  role: string;
}
