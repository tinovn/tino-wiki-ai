import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { PrismaClientManager } from './prisma/prisma-client.manager';
import { TenantPrismaService } from './prisma/tenant-prisma.service';

@Global()
@Module({
  providers: [PrismaService, PrismaClientManager, TenantPrismaService],
  exports: [PrismaService, PrismaClientManager, TenantPrismaService],
})
export class DatabaseModule {}
