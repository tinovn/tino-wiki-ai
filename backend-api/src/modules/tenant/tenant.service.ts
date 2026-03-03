import { Injectable, ConflictException, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execSync } from 'child_process';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@core/database/prisma/prisma.service';
import { TenantRepository } from './repositories/tenant.repository';
import { TenantNotFoundException } from '@common/exceptions';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly tenantRepo: TenantRepository,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateTenantDto) {
    const existing = await this.tenantRepo.findBySlug(dto.slug);
    if (existing) throw new ConflictException(`Tenant slug "${dto.slug}" already exists`);

    const databaseName = `tino_tenant_${dto.slug.replace(/-/g, '_')}`;
    const masterUrl = this.configService.get<string>('database.masterUrl')!;
    const baseUrl = masterUrl.substring(0, masterUrl.lastIndexOf('/'));
    const databaseUrl = `${baseUrl}/${databaseName}`;

    // 1. Create the PostgreSQL database
    try {
      await this.prisma.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      this.logger.log(`Created database: ${databaseName}`);
    } catch (err: any) {
      if (err.message?.includes('already exists')) {
        this.logger.warn(`Database ${databaseName} already exists, proceeding...`);
      } else {
        throw new InternalServerErrorException(`Failed to create database: ${err.message}`);
      }
    }

    // 2. Push tenant schema to the new database (creates all tables)
    try {
      const schemaPath = path.resolve(__dirname, '..', '..', '..', 'prisma', 'tenant-schema.prisma');
      execSync(
        `npx prisma db push --schema="${schemaPath}" --skip-generate`,
        {
          env: { ...process.env, TENANT_DATABASE_URL: databaseUrl },
          cwd: path.resolve(__dirname, '..', '..', '..'),
          stdio: 'pipe',
        },
      );
      this.logger.log(`Pushed tenant schema to database: ${databaseName}`);
    } catch (err: any) {
      // Cleanup: drop the database we just created
      await this.prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`).catch(() => {});
      throw new InternalServerErrorException(`Failed to push tenant schema: ${err.message}`);
    }

    // 3. Create tenant record in master DB
    const tenant = await this.tenantRepo.create({
      name: dto.name,
      slug: dto.slug,
      domain: dto.domain,
      databaseUrl,
      databaseName,
    });

    // 4. Create tenant admin in master DB
    const hashedPassword = await bcrypt.hash(dto.adminPassword, 12);
    await this.tenantRepo.createAdmin({
      tenantId: tenant.id,
      email: dto.adminEmail,
      password: hashedPassword,
    });

    // 5. Create initial admin user in the tenant database
    try {
      const { PrismaClient } = require('.prisma/tenant-client');
      const tenantPrisma = new PrismaClient({
        datasources: { db: { url: databaseUrl } },
      });
      await tenantPrisma.user.create({
        data: {
          email: dto.adminEmail,
          password: hashedPassword,
          displayName: dto.name + ' Admin',
          role: 'ADMIN',
        },
      });
      await tenantPrisma.$disconnect();
      this.logger.log(`Created admin user in tenant database: ${dto.adminEmail}`);
    } catch (err: any) {
      this.logger.warn(`Failed to create admin user in tenant DB: ${err.message}`);
    }

    this.logger.log(`Tenant created: ${tenant.name} (${tenant.slug})`);
    return tenant;
  }

  async findById(id: string) {
    const tenant = await this.tenantRepo.findById(id);
    if (!tenant) throw new TenantNotFoundException(id);
    return tenant;
  }

  async findBySlug(slug: string) {
    return this.tenantRepo.findBySlug(slug);
  }

  async findAll(page = 1, limit = 20) {
    return this.tenantRepo.findAll(page, limit);
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findById(id);
    return this.tenantRepo.update(id, dto);
  }

  async suspend(id: string) {
    return this.tenantRepo.update(id, { status: 'SUSPENDED' });
  }

  async activate(id: string) {
    return this.tenantRepo.update(id, { status: 'ACTIVE' });
  }

  async delete(id: string) {
    const tenant = await this.findById(id);

    // Drop the tenant database
    try {
      await this.prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${tenant.databaseName}"`);
      this.logger.log(`Dropped database: ${tenant.databaseName}`);
    } catch (err: any) {
      this.logger.warn(`Failed to drop database ${tenant.databaseName}: ${err.message}`);
    }

    // Delete tenant record (cascades to tenant_admins and api_keys)
    await this.tenantRepo.delete(id);
    this.logger.log(`Tenant deleted: ${tenant.name} (${tenant.slug})`);
    return { deleted: true };
  }

  async resolveFromHeader(tenantId: string) {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant || tenant.status !== 'ACTIVE') return null;
    return tenant;
  }

  async resolveFromSlug(slug: string) {
    const tenant = await this.tenantRepo.findBySlug(slug);
    if (!tenant || tenant.status !== 'ACTIVE') return null;
    return tenant;
  }
}
