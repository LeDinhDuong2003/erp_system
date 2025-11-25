import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AssetStatus } from '../../database/assetmanagement/asset.entity';

export class UpdateAssetStatusDto {
  @ApiProperty({ enum: AssetStatus })
  @IsEnum(AssetStatus)
  status: AssetStatus;
}