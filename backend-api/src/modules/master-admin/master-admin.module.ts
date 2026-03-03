import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TenantModule } from '@modules/tenant/tenant.module';

// Auth
import { MasterAuthController } from './auth/master-auth.controller';
import { MasterAuthService } from './auth/master-auth.service';

// Wiki - Controllers
import { MasterDocumentController } from './wiki/controllers/master-document.controller';
import { MasterCategoryController } from './wiki/controllers/master-category.controller';
import { MasterTagController } from './wiki/controllers/master-tag.controller';

// Wiki - Services
import { MasterDocumentService } from './wiki/services/master-document.service';
import { MasterCategoryService } from './wiki/services/master-category.service';
import { MasterTagService } from './wiki/services/master-tag.service';

// Wiki - Repositories
import { MasterDocumentRepository } from './wiki/repositories/master-document.repository';
import { MasterVersionRepository } from './wiki/repositories/master-version.repository';
import { MasterCategoryRepository } from './wiki/repositories/master-category.repository';
import { MasterTagRepository } from './wiki/repositories/master-tag.repository';

// Tenant Management
import { MasterTenantController } from './tenant-management/master-tenant.controller';
import { MasterTenantService } from './tenant-management/master-tenant.service';

// Dashboard
import { MasterDashboardController } from './dashboard/master-dashboard.controller';
import { MasterDashboardService } from './dashboard/master-dashboard.service';

// Settings
import { MasterSettingsController } from './settings/master-settings.controller';

// Listeners
import { MasterDocumentEventListener } from './wiki/listeners/master-document.listener';

@Module({
  imports: [
    TenantModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: configService.get<string>('jwt.accessExpiration') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    MasterAuthController,
    MasterDocumentController,
    MasterCategoryController,
    MasterTagController,
    MasterTenantController,
    MasterDashboardController,
    MasterSettingsController,
  ],
  providers: [
    // Auth
    MasterAuthService,
    // Wiki Services
    MasterDocumentService,
    MasterCategoryService,
    MasterTagService,
    // Wiki Repositories
    MasterDocumentRepository,
    MasterVersionRepository,
    MasterCategoryRepository,
    MasterTagRepository,
    // Tenant Management
    MasterTenantService,
    // Dashboard
    MasterDashboardService,
    // Listeners
    MasterDocumentEventListener,
  ],
})
export class MasterAdminModule {}
