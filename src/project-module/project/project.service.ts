import { 
    Injectable, 
    NotFoundException, 
    ConflictException
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../database/entities/project-module/Project.entity';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async create(createProjectDto: CreateProjectDto) {
    const exists = await this.projectRepository.findOne({ where: { project_key: createProjectDto.project_key } });
    if (exists) throw new ConflictException('Project key already exists');
    return await this.projectRepository.save(this.projectRepository.create(createProjectDto));
  }

  async findAll() {
    return this.projectRepository.find();
  }

  async findOne(id: number) {
    const project = await this.projectRepository.findOne({ where: { id } });
    
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: number, updateProjectDto: UpdateProjectDto) {
    const duplicate = updateProjectDto.project_key
      ? await this.projectRepository.findOne({ where: { project_key: updateProjectDto.project_key } })
      : null;
    if (duplicate && duplicate.id !== id) {
      throw new ConflictException('Cannot update. Project key already exists');
    }
    await this.projectRepository.update({ id }, updateProjectDto);
    const updated = await this.projectRepository.findOne({ where: { id } });
    if (!updated) throw new NotFoundException(`Project with ID ${id} not found for update`);
    return updated;
  }

  async remove(id: number) {
    const existing = await this.projectRepository.findOne({ where: { id } });
    if (!existing) throw new NotFoundException(`Project with ID ${id} not found for deletion`);
    await this.projectRepository.delete({ id });
    return existing;
  }
}