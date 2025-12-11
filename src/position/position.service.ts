import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, IsNull } from 'typeorm';
import { Position } from '../database/entities/Position.entity';
import { Department } from '../database/entities/Department.entity';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class PositionService {
  constructor(
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async create(createPositionDto: CreatePositionDto) {
    // Check if department exists if provided
    if (createPositionDto.department_id) {
      const department = await this.departmentRepository.findOne({
        where: { id: createPositionDto.department_id },
      });

      if (!department) {
        throw new NotFoundException('Department not found');
      }
    }

    // Check for duplicate title in the same department (or no department)
    const whereCondition: any = {
      title: createPositionDto.title,
    };
    if (createPositionDto.department_id) {
      whereCondition.department_id = createPositionDto.department_id;
    } else {
      whereCondition.department_id = IsNull();
    }
    
    const existing = await this.positionRepository.findOne({
      where: whereCondition,
    });

    if (existing) {
      throw new ConflictException('Position with this title already exists in this department');
    }

    const position = this.positionRepository.create(createPositionDto);
    return await this.positionRepository.save(position);
  }

  async findAll(skip = 0, take = 10, search?: string, departmentId?: number) {
    const where: any = {};
    
    if (search) {
      where.title = ILike(`%${search}%`);
    }
    
    if (departmentId !== undefined) {
      if (departmentId === null) {
        where.department_id = IsNull();
      } else {
        where.department_id = departmentId;
      }
    }

    const [positions, total] = await Promise.all([
      this.positionRepository.find({
        where,
        skip,
        take,
        relations: ['department'],
        order: { department_id: 'ASC', created_at: 'DESC' },
      }),
      this.positionRepository.count({ where }),
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
      relations: ['department'],
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

    // Check if department exists if provided
    if (updatePositionDto.department_id !== undefined) {
      if (updatePositionDto.department_id !== null) {
        const department = await this.departmentRepository.findOne({
          where: { id: updatePositionDto.department_id },
        });

        if (!department) {
          throw new NotFoundException('Department not found');
        }
      }
    }

    if (updatePositionDto.title && updatePositionDto.title !== position.title) {
      const departmentId = updatePositionDto.department_id !== undefined 
        ? updatePositionDto.department_id 
        : position.department_id;
      
      const whereCondition: any = {
        title: updatePositionDto.title,
      };
      if (departmentId !== null && departmentId !== undefined) {
        whereCondition.department_id = departmentId;
      } else {
        whereCondition.department_id = IsNull();
      }
      
      const existing = await this.positionRepository.findOne({
        where: whereCondition,
      });

      if (existing) {
        throw new ConflictException('Position with this title already exists in this department');
      }
    }

    await this.positionRepository.update({ id }, updatePositionDto);
    const updated = await this.positionRepository.findOne({
      where: { id },
      relations: ['department'],
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

