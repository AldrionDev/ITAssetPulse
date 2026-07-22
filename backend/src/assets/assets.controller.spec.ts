import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';

const TEST_SECRET = 'assets-controller-spec-secret';

/**
 * Regression tests for asset request validation.
 *
 * The update handler used to declare its body as `Partial<CreateAssetDto>`,
 * which erases to `Object` at runtime, so the global ValidationPipe skipped it
 * entirely: unknown fields and raw MongoDB update operators reached
 * `findByIdAndUpdate` untouched.
 */
describe('AssetsController (request validation)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const assetsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const tokenFor = (role: string) =>
    jwtService.sign({ sub: role, username: role, role });

  const patch = (body: unknown, role = 'admin') =>
    request(app.getHttpServer())
      .patch('/assets/abc123')
      .set('Authorization', `Bearer ${tokenFor(role)}`)
      .send(body as object);

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET;

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PassportModule,
        JwtModule.register({
          secret: TEST_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AssetsController],
      providers: [
        JwtStrategy,
        RolesGuard,
        { provide: AssetsService, useValue: assetsService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // Mirrors the global pipe configured in main.ts.
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    jwtService = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    assetsService.update.mockResolvedValue({ _id: 'abc123' });
    assetsService.create.mockResolvedValue({ _id: 'abc123' });
  });

  describe('PATCH /assets/:id', () => {
    it('accepts a valid partial update and forwards only those fields', async () => {
      await patch({ status: 'maintenance', department: 'IT' }).expect(200);

      expect(assetsService.update).toHaveBeenCalledWith('abc123', {
        status: 'maintenance',
        department: 'IT',
      });
    });

    it('rejects a body containing an unknown field', async () => {
      await patch({ status: 'available', isAdmin: true }).expect(400);

      expect(assetsService.update).not.toHaveBeenCalled();
    });

    it('rejects a body containing a MongoDB update operator', async () => {
      await patch({ $unset: { serialNumber: 1 } }).expect(400);

      expect(assetsService.update).not.toHaveBeenCalled();
    });

    it('rejects a field of the wrong type', async () => {
      await patch({ status: 42 }).expect(400);

      expect(assetsService.update).not.toHaveBeenCalled();
    });

    it('accepts an empty body without touching unrelated fields', async () => {
      await patch({}).expect(200);

      expect(assetsService.update).toHaveBeenCalledWith('abc123', {});
    });

    // The edit form sends an empty string when the date input is cleared, and
    // Mongoose casts that to null. Validation must not turn clearing a date
    // into a 400.
    it('accepts an empty assignedAt as "clear the date"', async () => {
      await patch({ assignedAt: '' }).expect(200);

      expect(assetsService.update).toHaveBeenCalledWith('abc123', {
        assignedAt: '',
      });
    });

    it('accepts a valid assignedAt', async () => {
      await patch({ assignedAt: '2026-01-10' }).expect(200);

      expect(assetsService.update).toHaveBeenCalledWith('abc123', {
        assignedAt: '2026-01-10',
      });
    });

    it('rejects an assignedAt that is neither empty nor a date', async () => {
      await patch({ assignedAt: 'not-a-date' }).expect(400);

      expect(assetsService.update).not.toHaveBeenCalled();
    });

    it('still enforces the role gate', async () => {
      await patch({ status: 'available' }, 'viewer').expect(403);

      expect(assetsService.update).not.toHaveBeenCalled();
    });
  });

  describe('POST /assets', () => {
    const validAsset = {
      name: 'Dell Latitude 5420',
      serialNumber: 'DL-2024-001',
      category: 'Laptop',
    };

    it('rejects a body containing an unknown field', async () => {
      await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${tokenFor('admin')}`)
        .send({ ...validAsset, unexpected: 'value' })
        .expect(400);

      expect(assetsService.create).not.toHaveBeenCalled();
    });

    // Pre-existing bug: the create form always sends assignedAt, so submitting
    // it with a blank date field was rejected with 400 before this DTO change.
    it('accepts an asset submitted with a blank date field', async () => {
      await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${tokenFor('admin')}`)
        .send({ ...validAsset, assignedAt: '', department: '' })
        .expect(201);

      expect(assetsService.create).toHaveBeenCalled();
    });

    it('accepts a valid asset', async () => {
      await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${tokenFor('admin')}`)
        .send(validAsset)
        .expect(201);

      expect(assetsService.create).toHaveBeenCalledWith(validAsset);
    });
  });
});
