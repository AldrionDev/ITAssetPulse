import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';

interface RequestUser {
  role?: string;
}

const createContext = (user: RequestUser | undefined): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => undefined,
    getClass: () => undefined,
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  const requireRoles = (roles: string[] | undefined) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      return key === ROLES_KEY ? roles : undefined;
    });
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows a handler that declares no required roles', () => {
    requireRoles(undefined);

    expect(guard.canActivate(createContext({ role: 'viewer' }))).toBe(true);
  });

  it('allows a user whose role is in the required list', () => {
    requireRoles(['admin', 'manager']);

    expect(guard.canActivate(createContext({ role: 'manager' }))).toBe(true);
  });

  it('rejects a user whose role is not in the required list', () => {
    requireRoles(['admin']);

    expect(() => guard.canActivate(createContext({ role: 'viewer' }))).toThrow(
      ForbiddenException,
    );
  });

  // Regression: the guard must not fall through to "allowed" when the request
  // carries no authenticated user at all.
  it('rejects a request with no user attached', () => {
    requireRoles(['admin']);

    expect(() => guard.canActivate(createContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects a user object that carries no role', () => {
    requireRoles(['admin']);

    expect(() => guard.canActivate(createContext({}))).toThrow(
      ForbiddenException,
    );
  });
});
