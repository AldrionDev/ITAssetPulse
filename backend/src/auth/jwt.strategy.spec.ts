import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

const configWith = (value: unknown) =>
  ({ get: () => value }) as unknown as ConfigService;

describe('JwtStrategy', () => {
  // Regression: the strategy used to verify tokens with the literal
  // 'fallback-secret' when JWT_SECRET was unset, silently accepting tokens
  // anyone could forge from the public source. It must refuse to exist instead.
  it('cannot be constructed without a configured secret', () => {
    expect(() => new JwtStrategy(configWith(undefined))).toThrow(/JWT_SECRET/);
  });

  it('is constructed when a secret is configured', () => {
    expect(() => new JwtStrategy(configWith('a-real-secret'))).not.toThrow();
  });

  it('maps the token payload onto the request user', () => {
    const strategy = new JwtStrategy(configWith('a-real-secret'));

    expect(
      strategy.validate({ sub: 'admin', username: 'admin', role: 'admin' }),
    ).toEqual({ userId: 'admin', username: 'admin', role: 'admin' });
  });
});
