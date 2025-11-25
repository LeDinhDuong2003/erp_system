import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from '../database/assethandover/assignment.entity';
import { Asset } from '../database/assetmanagement/asset.entity';
import { Employee } from '../database/entities/Employee.entity';
import { AssetHandoverService } from './assethandover.service';
import { AssetHandoverController } from './assethandover.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, Asset, Employee])],
  controllers: [AssetHandoverController],
  providers: [AssetHandoverService],
  exports: [AssetHandoverService],
})
export class AssetHandoverModule {}