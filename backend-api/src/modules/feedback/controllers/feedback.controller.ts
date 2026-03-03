import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FeedbackService } from '../services/feedback.service';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { PaginationDto, ApiResponseDto } from '@common/dto';
import { CurrentUser, Roles } from '@common/decorators';

@ApiTags('Feedback')
@ApiBearerAuth()
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async submit(
    @Body() dto: CreateFeedbackDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'];
    const feedback = await this.feedbackService.submit(dto, userId, tenantId);
    return ApiResponseDto.success(feedback);
  }

  @Get()
  async findAll(@Query() query: PaginationDto) {
    const { data, total } = await this.feedbackService.findAll(query.page, query.limit);
    return ApiResponseDto.paginated(data, total, query.page!, query.limit!);
  }

  @Get('summary')
  @Roles('ADMIN')
  async getSummary() {
    const summary = await this.feedbackService.getSummary();
    return ApiResponseDto.success(summary);
  }

  @Get('documents/:id')
  async getByDocumentId(@Param('id') id: string) {
    const feedbacks = await this.feedbackService.getByDocumentId(id);
    return ApiResponseDto.success(feedbacks);
  }
}
