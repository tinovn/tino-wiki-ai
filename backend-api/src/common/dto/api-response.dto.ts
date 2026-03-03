import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}

export class ApiResponseDto<T> {
  @ApiProperty()
  data: T;

  @ApiPropertyOptional()
  meta?: PaginationMeta;

  @ApiPropertyOptional()
  message?: string;

  static success<T>(data: T, meta?: PaginationMeta): ApiResponseDto<T> {
    const response = new ApiResponseDto<T>();
    response.data = data;
    response.meta = meta;
    return response;
  }

  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): ApiResponseDto<T[]> {
    const response = new ApiResponseDto<T[]>();
    response.data = data;
    response.meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
    return response;
  }
}
