import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TenantPrismaService } from '@core/database/prisma/tenant-prisma.service';
import { ApiResponseDto } from '@common/dto';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai/jobs')
export class AiStatusController {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  @Get(':id')
  async getJobStatus(@Param('id') id: string) {
    const prisma = await this.tenantPrisma.getClient();
    const job = await prisma.aiProcessingJob.findUnique({
      where: { id },
      include: { document: { select: { id: true, title: true } } },
    });

    return ApiResponseDto.success(job);
  }
}
