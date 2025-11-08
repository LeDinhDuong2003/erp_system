import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Position } from '../database/entities/Position.entity';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionService {
  constructor(
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
  ) {}

  async create(createPositionDto: CreatePositionDto) {
    const existing = await this.positionRepository.findOne({
      where: { title: createPositionDto.title },
    });

    if (existing) {
      throw new ConflictException('Position with this title already exists');
    }

    const position = this.positionRepository.create(createPositionDto);
    return await this.positionRepository.save(position);
  }

  async findAll(skip = 0, take = 10, search?: string) {
    const where = search
      ? [{ title: ILike(`%${search}%`) }, { description: ILike(`%${search}%`) }]
      : {};

    const [positions, total] = await Promise.all([
      this.positionRepository.find({
        where: where as any,
        skip,
        take,
        order: { created_at: 'DESC' },
      }),
      this.positionRepository.count({ where: where as any }),
    ]);

    return {
      data: positions,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  async findOne(id: number) {
    const position = await this.positionRepository.findOne({
      where: { id },
    });

    if (!position) {
      throw new NotFoundException(`Position with ID ${id} not found`);
    }

    return position;
  }

  async update(id: number, updatePositionDto: UpdatePositionDto) {
    const position = await this.positionRepository.findOne({
      where: { id },
    });

    if (!position) {
      throw new NotFoundException(`Position with ID ${id} not found`);
    }

    if (updatePositionDto.title && updatePositionDto.title !== position.title) {
      const existing = await this.positionRepository.findOne({
        where: { title: updatePositionDto.title },
      });

      if (existing) {
        throw new ConflictException('Position with this title already exists');
      }
    }

    await this.positionRepository.update({ id }, updatePositionDto);
    const updated = await this.positionRepository.findOne({
      where: { id },
    });

    return updated!;
  }

  async remove(id: number) {
    const position = await this.positionRepository.findOne({
      where: { id },
    });

    if (!position) {
      throw new NotFoundException(`Position with ID ${id} not found`);
    }

    await this.positionRepository.delete({ id });

    return { message: 'Position deleted successfully' };
  }
}

