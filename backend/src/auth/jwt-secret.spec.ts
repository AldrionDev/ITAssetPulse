import { ConfigService } from '@nestjs/config';
import { getJwtSecret } from './jwt-secret';

const configWith = (value: unknown) =>
  ({ get: () => value }) as unknown as ConfigService;

/**
 * Regression: JwtStrategy used to fall back to the literal 'fallback-secret'
 * when JWT_SECRET was unset, so anyone reading the repository could mint a
 * valid admin token against such a deployment. A missing secret must stop the
 * application instead.
 */
describe('getJwtSecret', () => {
  it('returns the configured secret', () => {
    expect(getJwtSecret(configWith('a-real-secret'))).toBe('a-real-secret');
  });

  it.each([
    ['undefined', undefined],
    ['an empty string', ''],
  ])('throws when the secret is %s', (_label, value) => {
    expect(() => getJwtSecret(configWith(value))).toThrow(/JWT_SECRET/);
  });
});
