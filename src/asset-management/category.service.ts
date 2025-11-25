import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../database/assetmanagement/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Asset } from '../database/assetmanagement/asset.entity';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async findAll() {
    return this.categoryRepository.find({ order: { category_name: 'ASC' } });
  }

  async findOne(id: number) {
    const cat = await this.categoryRepository.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Category with id ${id} not found`);
    return cat;
  }

  async create(dto: CreateCategoryDto) {
    // If code provided, check unique
    if (dto.category_code) {
      const existing = await this.categoryRepository.findOne({ where: { category_code: dto.category_code } });
      if (existing) throw new ConflictException('Category code already exists');
    }
    // Optionally ensure category_name uniqueness
    const existName = await this.categoryRepository.findOne({ where: { category_name: dto.category_name } });
    if (existName) throw new ConflictException('Category name already exists');

    const code = dto.category_code ?? `CAT-${Date.now().toString().slice(-6)}`;
    const entity = this.categoryRepository.create({
      category_code: code,
      category_name: dto.category_name,
      description: dto.description,
    });
    return this.categoryRepository.save(entity);
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const cat = await this.findOne(id);
    if (dto.category_name && dto.category_name !== cat.category_name) {
      const existName = await this.categoryRepository.findOne({ where: { category_name: dto.category_name } });
      if (existName) throw new ConflictException('Category name already exists');
    }
    await this.categoryRepository.update({ id }, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    // Check assets referencing this category
    const count = await this.assetRepository.count({ where: { category: { id } } as any });
    if (count > 0) {
      throw new BadRequestException('Không thể xóa loại tài sản đang được sử dụng!');
    }
    await this.categoryRepository.delete({ id });
    return { message: 'Category deleted' };
  }
}