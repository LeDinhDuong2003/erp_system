import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../database/assetmanagement/asset.entity';
import { Category } from '../database/assetmanagement/category.entity';
import { Supplier } from 'src/database/assetrequest/supplier.entity';
import { AssetService } from './asset.service';
import { AssetController } from './asset.controller';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { SupplierService } from './supplier.service';
import { SupplierController } from './supplier.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, Category, Supplier])],
  controllers: [AssetController, CategoryController, SupplierController],
  providers: [AssetService, CategoryService, SupplierService],
  exports: [AssetService, CategoryService, SupplierService],
})
export class AssetManagementModule {}