import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AssetHistoryController } from './asset-history.controller';
import { AssetHistoryService } from './asset-history.service';
import { AssetHistory } from './schemas/asset-history.schema';
import { JwtStrategy } from '../auth/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';

const TEST_SECRET = 'asset-history-controller-spec-secret';

/**
 * Regression tests for the asset history endpoint, which served the full audit
 * trail of any asset to unauthenticated callers.
 */
describe('AssetHistoryController (authorization)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const exec = jest.fn();
  const sort = jest.fn(() => ({ exec }));
  const assetHistoryModel = {
    find: jest.fn(() => ({ sort })),
  };

  const tokenFor = (role: string) =>
    jwtService.sign({ sub: role, username: role, role });

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
      controllers: [AssetHistoryController],
      providers: [
        AssetHistoryService,
        JwtStrategy,
        RolesGuard,
        {
          provide: getModelToken(AssetHistory.name),
          useValue: assetHistoryModel,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    jwtService = moduleRef.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    exec.mockResolvedValue([]);
  });

  it('rejects an unauthenticated request', async () => {
    await request(app.getHttpServer()).get('/asset-history/abc123').expect(401);

    expect(assetHistoryModel.find).not.toHaveBeenCalled();
  });

  it('rejects a request carrying a token signed with another secret', async () => {
    const forged = new JwtService({ secret: 'not-the-real-secret' }).sign({
      sub: 'admin',
      username: 'admin',
      role: 'admin',
    });

    await request(app.getHttpServer())
      .get('/asset-history/abc123')
      .set('Authorization', `Bearer ${forged}`)
      .expect(401);

    expect(assetHistoryModel.find).not.toHaveBeenCalled();
  });

  it.each(['admin', 'manager', 'viewer'])(
    'allows %s to read the history of an asset',
    async (role) => {
      await request(app.getHttpServer())
        .get('/asset-history/abc123')
        .set('Authorization', `Bearer ${tokenFor(role)}`)
        .expect(200);

      expect(assetHistoryModel.find).toHaveBeenCalledWith({
        assetId: 'abc123',
      });
    },
  );
});
