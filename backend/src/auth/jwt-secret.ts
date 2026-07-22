import { ConfigService } from '@nestjs/config';

/**
 * Reads JWT_SECRET and fails fast when it is missing.
 *
 * Both the signing module and the verification strategy go through here, so
 * they can never end up using different keys, and neither can silently fall
 * back to a value committed to the repository.
 */
export const getJwtSecret = (configService: ConfigService): string => {
  const secret = configService.get<string>('JWT_SECRET');

  if (!secret) {
    throw new Error(
      'JWT_SECRET is not set. Refusing to start: without it, tokens would be signed and verified with a known key.',
    );
  }

  return secret;
};
