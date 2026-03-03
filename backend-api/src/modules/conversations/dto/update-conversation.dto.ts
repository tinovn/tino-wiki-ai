import { IsOptional, IsString, IsIn, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateConversationDto {
  @ApiPropertyOptional({ enum: ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'] })
  @IsOptional()
  @IsIn(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'])
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];
}
