import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.scope) {
      throw new UnauthorizedException('Invalid token payload');
    }
    if (payload.scope !== 'superadmin' && payload.scope !== 'tenant') {
      throw new UnauthorizedException('Invalid token scope');
    }
    if (payload.scope === 'tenant' && !payload.tenantId) {
      throw new UnauthorizedException('Tenant token requires tenantId');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.scope === 'tenant' ? payload.tenantId : undefined,
      scope: payload.scope,
    };
  }
}
