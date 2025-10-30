import { 
    Injectable, 
    NotFoundException, 
    ConflictException
  } from '@nestjs/common';
  import { CreateProjectDto } from './dto/create-project.dto';
  import { UpdateProjectDto } from './dto/update-project.dto';
  import { PrismaService } from '../prisma/prisma.service'; 
  
  @Injectable()
  export class ProjectService {
    constructor(private prisma: PrismaService) {}
  
    async create(createProjectDto: CreateProjectDto) {
      try {
        return await this.prisma.project.create({
          data: createProjectDto,
        });
      } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('project_key')) {
          throw new ConflictException('Project key already exists');
        }
        throw error;
      }
    }
  
    async findAll() {
      return this.prisma.project.findMany();
    }
  
    async findOne(id: number) {
      const project = await this.prisma.project.findUnique({
        where: { id },
      });
      
      if (!project) {
        throw new NotFoundException(`Project with ID ${id} not found`);
      }
  
      return project;
    }
  
    async update(id: number, updateProjectDto: UpdateProjectDto) {
      try {
        return await this.prisma.project.update({
          where: { id },
          data: updateProjectDto,
        });
      } catch (error) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Project with ID ${id} not found for update`);
        }
        if (error.code === 'P2002' && error.meta?.target?.includes('project_key')) {
          throw new ConflictException('Cannot update. Project key already exists');
        }
        throw error;
      }
    }
  
    async remove(id: number) {
      try {
        return await this.prisma.project.delete({
          where: { id },
        });
      } catch (error) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Project with ID ${id} not found for deletion`);
        }
        throw error;
      }
    }
  }