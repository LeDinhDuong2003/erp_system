import { Module } from '@nestjs/common';
import { PositionService } from './position.service';
import { PositionController } from './position.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Position } from '../database/entities/Position.entity';
import { Department } from '../database/entities/Department.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Position, Department])],
  controllers: [PositionController],
  providers: [PositionService],
  exports: [PositionService],
})
export class PositionModule {}

