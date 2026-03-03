import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma/prisma.service';

@Injectable()
export class WidgetTokenGuard implements CanActivate {
  private readonly logger = new Logger(WidgetTokenGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const widgetToken = request.headers['x-widget-token'] as string;

    if (!widgetToken) {
      throw new UnauthorizedException('Missing x-widget-token header');
    }

    // Find tenant by widget token in settings JSON
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        slug: true,
        databaseUrl: true,
        llmProvider: true,
        llmConfig: true,
        settings: true,
      },
    });

    const tenant = tenants.find((t) => {
      const settings = typeof t.settings === 'string' ? JSON.parse(t.settings) : (t.settings || {});
      return settings?.chatwidget?.widgetToken === widgetToken;
    });

    if (!tenant) {
      this.logger.warn(`Invalid widget token attempt: ${widgetToken.slice(0, 10)}...`);
      throw new UnauthorizedException('Invalid widget token');
    }

    const settings = typeof tenant.settings === 'string'
      ? JSON.parse(tenant.settings)
      : (tenant.settings || {});

    if (!settings.chatwidget?.enabled) {
      throw new ForbiddenException('Chat widget is disabled for this tenant');
    }

    // Attach tenant to request (same shape as TenantGuard)
    request.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      databaseUrl: tenant.databaseUrl,
      llmProvider: tenant.llmProvider,
      llmConfig: typeof tenant.llmConfig === 'string'
        ? JSON.parse(tenant.llmConfig)
        : (tenant.llmConfig || {}),
      settings,
      status: 'ACTIVE',
    };

    return true;
  }
}
