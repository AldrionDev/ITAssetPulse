import { Controller, Get, Post, Body } from '@nestjs/common';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  async create(@Body() body: any) {
    return this.employeesService.create(body);
  }

  @Get()
  findAll() {
    return this.employeesService.findAll();
  }
}
