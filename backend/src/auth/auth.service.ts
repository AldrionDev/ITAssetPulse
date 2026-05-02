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
    // For demo purposes, demoUsers is hardcoded. In production, use a database.
    const demoUsers = [
      { username: 'admin', password: 'secret123', role: 'admin' },
      { username: 'manager', password: 'project123', role: 'manager' },
      { username: 'viewer', password: 'viewer1234', role: 'viewer' },
    ];

    const user = demoUsers.find(
      (u) => u.username === username && u.password === password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      access_token: this.jwtService.sign({
        username: user.username,
        sub: user.username,
        role: user.role,
      }),
    };
  }
}
