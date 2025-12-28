import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Supplier } from '../database/assetrequest/supplier.entity';
import { Asset } from '../database/assetmanagement/asset.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async findAll() {
    return this.supplierRepository.find({
      order: { supplier_name: 'ASC' },
    });
  }

  async findOne(id: number) {
    const supplier = await this.supplierRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Supplier with id ${id} not found`);
    }
    return supplier;
  }

  async create(dto: CreateSupplierDto) {
    // Check unique supplier_code if provided
    if (dto.supplier_code) {
      const existCode = await this.supplierRepository.findOne({
        where: { supplier_code: dto.supplier_code },
      });
      if (existCode) {
        throw new ConflictException('Supplier code already exists');
      }
    }

    // Check unique supplier_name
    const existName = await this.supplierRepository.findOne({
      where: { supplier_name: dto.supplier_name },
    });
    if (existName) {
      throw new ConflictException('Supplier name already exists');
    }

    const code =
      dto.supplier_code ?? `SUP-${Date.now().toString().slice(-6)}`;

    const entity = this.supplierRepository.create({
      supplier_code: code,
      supplier_name: dto.supplier_name,
      address: dto.address,
      phone: dto.phone,
    });

    return this.supplierRepository.save(entity);
  }

  async update(id: number, dto: UpdateSupplierDto) {
    const supplier = await this.findOne(id);

    if (
      dto.supplier_name &&
      dto.supplier_name !== supplier.supplier_name
    ) {
      const existName = await this.supplierRepository.findOne({
        where: { supplier_name: dto.supplier_name },
      });
      if (existName) {
        throw new ConflictException('Supplier name already exists');
      }
    }

    await this.supplierRepository.update({ id }, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    // Check assets referencing this supplier
    const count = await this.assetRepository.count({
      where: { supplier: { id } } as any,
    });

    if (count > 0) {
      throw new BadRequestException(
        'Không thể xóa nhà cung cấp đang được sử dụng!',
      );
    }

    await this.supplierRepository.delete({ id });
    return { message: 'Supplier deleted' };
  }
}
