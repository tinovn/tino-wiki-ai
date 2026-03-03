import { IsString, IsOptional, IsArray, IsInt, IsIn, MinLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional({ enum: ['OFFICIAL', 'GUIDE', 'FAQ', 'REFERENCE', 'INTERNAL', 'PRICING', 'SERVICE'] })
  @IsOptional()
  @IsIn(['OFFICIAL', 'GUIDE', 'FAQ', 'REFERENCE', 'INTERNAL', 'PRICING', 'SERVICE'])
  type?: string;

  @ApiPropertyOptional({ enum: ['PUBLIC', 'INTERNAL', 'AGENT'] })
  @IsOptional()
  @IsIn(['PUBLIC', 'INTERNAL', 'AGENT'])
  audience?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;
}
