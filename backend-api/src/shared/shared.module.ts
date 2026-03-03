import { Global, Module } from '@nestjs/common';
import { ClsConfigModule } from './cls/cls.module';
import { AuditLogService } from '@common/services/audit-log.service';

@Global()
@Module({
  imports: [ClsConfigModule],
  providers: [AuditLogService],
  exports: [ClsConfigModule, AuditLogService],
})
export class SharedModule {}
