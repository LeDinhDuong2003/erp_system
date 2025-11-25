import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../database/assetmanagement/asset.entity';
import { Category } from '../database/assetmanagement/category.entity';
import { AssetService } from './asset.service';
import { AssetController } from './asset.controller';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, Category])],
  controllers: [AssetController, CategoryController],
  providers: [AssetService, CategoryService],
  exports: [AssetService, CategoryService],
})
export class AssetManagementModule {}