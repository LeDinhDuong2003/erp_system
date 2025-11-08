import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from '../database/entities/File.entity';
import { Employee } from '../database/entities/Employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([File, Employee])],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}

