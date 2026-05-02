import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(username: string, password: string) {
    const adminUser = this.configService.get<string>('ADMIN_USERNAME');
    const adminPass = this.configService.get<string>('ADMIN_PASSWORD');

    if (username !== adminUser || password !== adminPass) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      access_token: this.jwtService.sign({
        username,
        sub: 'admin',
        role: 'admin',
      }),
    };
  }
}
