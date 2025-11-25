import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Request } from '../database/assetrequest/request.entity';
import { Notification } from '../database/assetrequest/notification.entity';
import { Supplier } from '../database/assetrequest/supplier.entity';
import { Employee } from '../database/entities/Employee.entity';
import { Asset } from '../database/assetmanagement/asset.entity';
import { Category } from '../database/assetmanagement/category.entity';
import { AssetRequestController, NotificationController } from './asset-request.controller';
import { AssetRequestService } from './asset-request.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Request, Notification, Supplier, Employee, Asset, Category]),
  ],
  controllers: [AssetRequestController, NotificationController],
  providers: [AssetRequestService],
  exports: [AssetRequestService],
})
export class AssetRequestModule {}