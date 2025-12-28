import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';

import { Asset, AssetStatus } from '../database/assetmanagement/asset.entity';
import { Category } from '../database/assetmanagement/category.entity';
import { Supplier } from '../database/assetrequest/supplier.entity';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
  ) {}

  async findAll(
    page = 1,
    pageSize = 10,
    search?: string,
    categoryId?: number,
    supplierId?: number,
    status?: AssetStatus,
    sortBy = 'created_at',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const skip = (page - 1) * pageSize;

    // search giống cũ, chỉ join thêm supplier
    if (search) {
      const qb = this.assetRepository
        .createQueryBuilder('asset')
        .leftJoinAndSelect('asset.category', 'category')
        .leftJoinAndSelect('asset.supplier', 'supplier');

      qb.where(
        '(asset.asset_name ILIKE :s OR asset.asset_code ILIKE :s)',
        { s: `%${search}%` },
      );

      if (categoryId)
        qb.andWhere('category.id = :categoryId', { categoryId });
      if (supplierId)
        qb.andWhere('supplier.id = :supplierId', { supplierId });
      if (status) qb.andWhere('asset.status = :status', { status });

      qb.orderBy(`asset.${sortBy}`, sortOrder);
      qb.skip(skip).take(pageSize);

      const [data, total] = await qb.getManyAndCount();

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }

    // no search
    const qb = this.assetRepository
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.supplier', 'supplier');

    if (categoryId)
      qb.where('category.id = :categoryId', { categoryId });
    if (supplierId)
      qb.andWhere('supplier.id = :supplierId', { supplierId });
    if (status) qb.andWhere('asset.status = :status', { status });

    qb.orderBy(`asset.${sortBy}`, sortOrder);
    qb.skip(skip).take(pageSize);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number) {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: ['category', 'supplier'],
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async create(dto: CreateAssetDto) {
    // check unique asset_code
    const exist = await this.assetRepository.findOne({
      where: { asset_code: dto.asset_code },
    });
    if (exist) throw new ConflictException('Asset code already exists');

    // category – giữ nguyên logic cũ
    const category = await this.categoryRepository.findOne({
      where: { id: dto.category_id },
    });
    if (!category) throw new BadRequestException('Category not found');

    // supplier – Y HỆT category
    const supplier = await this.supplierRepository.findOne({
      where: { id: dto.supplier_id },
    });
    if (!supplier) throw new BadRequestException('Supplier not found');

    const entity = this.assetRepository.create({
      asset_code: dto.asset_code,
      asset_name: dto.asset_name,
      category,
      supplier,
      price: dto.price != null ? dto.price.toString() : null,
      purchase_date: dto.purchase_date ?? null,
      status: dto.status ?? AssetStatus.NEW,
      description: dto.description,
      image_url: dto.image_url,
      current_holder_id: dto.current_holder_id ?? null,
    } as DeepPartial<Asset>);

    return this.assetRepository.save(entity);
  }

  async update(id: number, dto: UpdateAssetDto) {
    const asset = await this.assetRepository.findOne({
      where: { id },
      relations: ['category', 'supplier'],
    });
    if (!asset) throw new NotFoundException('Asset not found');

    if (dto.asset_code && dto.asset_code !== asset.asset_code) {
      const exist = await this.assetRepository.findOne({
        where: { asset_code: dto.asset_code },
      });
      if (exist) throw new ConflictException('Asset code already exists');
      asset.asset_code = dto.asset_code;
    }

    if (dto.category_id) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.category_id },
      });
      if (!category) throw new BadRequestException('Category not found');
      asset.category = category;
    }

    // supplier – Y HỆT category
    if (dto.supplier_id) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: dto.supplier_id },
      });
      if (!supplier) throw new BadRequestException('Supplier not found');
      asset.supplier = supplier;
    }

    if (dto.asset_name !== undefined) asset.asset_name = dto.asset_name;
    if (dto.price !== undefined) asset.price = dto.price as any;
    if (dto.purchase_date !== undefined)
      asset.purchase_date = dto.purchase_date;
    if (dto.status !== undefined) asset.status = dto.status;
    if (dto.description !== undefined) asset.description = dto.description;
    if (dto.image_url !== undefined) asset.image_url = dto.image_url;
    if (dto.current_holder_id !== undefined)
      asset.current_holder_id = dto.current_holder_id;

    return this.assetRepository.save(asset);
  }

  async remove(id: number) {
    const asset = await this.assetRepository.findOne({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');

    if (asset.status === AssetStatus.IN_USE) {
      throw new BadRequestException(
        'Không thể xóa tài sản đang được sử dụng',
      );
    }

    await this.assetRepository.delete({ id });
    return { message: 'Asset deleted' };
  }

  async updateStatus(id: number, status: AssetStatus) {
    const asset = await this.findOne(id);
    asset.status = status;
    return this.assetRepository.save(asset);
  }
}
