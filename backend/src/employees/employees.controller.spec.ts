import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { Employee } from './schemas/employee.schema';
import { JwtStrategy } from '../auth/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';

const TEST_SECRET = 'employees-controller-spec-secret';

/**
 * Regression tests for the employee endpoints, which were reachable without any
 * authentication: `GET /employees` exposed the full staff list (name, e-mail,
 * position, department) and `POST /employees` accepted writes from anyone.
 * Access was only gated in the frontend router.
 */
describe('EmployeesController (authorization)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;

  const employeeModel = {
    create: jest.fn(),
    find: jest.fn(),
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
      controllers: [EmployeesController],
      providers: [
        EmployeesService,
        JwtStrategy,
        RolesGuard,
        { provide: getModelToken(Employee.name), useValue: employeeModel },
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
    employeeModel.find.mockResolvedValue([]);
    employeeModel.create.mockResolvedValue({ _id: 'e1', name: 'Test Person' });
  });

  describe('GET /employees', () => {
    it('rejects an unauthenticated request', async () => {
      await request(app.getHttpServer()).get('/employees').expect(401);

      expect(employeeModel.find).not.toHaveBeenCalled();
    });

    it('rejects a request carrying a token signed with another secret', async () => {
      const forged = new JwtService({ secret: 'not-the-real-secret' }).sign({
        sub: 'admin',
        username: 'admin',
        role: 'admin',
      });

      await request(app.getHttpServer())
        .get('/employees')
        .set('Authorization', `Bearer ${forged}`)
        .expect(401);

      expect(employeeModel.find).not.toHaveBeenCalled();
    });

    it.each(['admin', 'manager', 'viewer'])(
      'allows %s to read the employee list',
      async (role) => {
        await request(app.getHttpServer())
          .get('/employees')
          .set('Authorization', `Bearer ${tokenFor(role)}`)
          .expect(200);

        expect(employeeModel.find).toHaveBeenCalled();
      },
    );
  });

  describe('POST /employees', () => {
    const payload = { name: 'Test Person', department: 'IT' };

    it('rejects an unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/employees')
        .send(payload)
        .expect(401);

      expect(employeeModel.create).not.toHaveBeenCalled();
    });

    it.each(['manager', 'viewer'])('rejects %s with 403', async (role) => {
      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${tokenFor(role)}`)
        .send(payload)
        .expect(403);

      expect(employeeModel.create).not.toHaveBeenCalled();
    });

    it('allows admin to create an employee', async () => {
      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${tokenFor('admin')}`)
        .send(payload)
        .expect(201);

      expect(employeeModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Person' }),
      );
    });

    it('rejects a payload without a name', async () => {
      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${tokenFor('admin')}`)
        .send({ department: 'IT' })
        .expect(400);

      expect(employeeModel.create).not.toHaveBeenCalled();
    });

    it('rejects a malformed e-mail address', async () => {
      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${tokenFor('admin')}`)
        .send({ name: 'Test Person', email: 'not-an-email' })
        .expect(400);

      expect(employeeModel.create).not.toHaveBeenCalled();
    });
  });
});
