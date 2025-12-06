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
import { SchemeCloneService } from './scheme-clone.service';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly schemeCloneService: SchemeCloneService,
  ) {}

  /**
   * Tạo project mới với clone schemes và gán admin role cho creator
   */
  async create(createProjectDto: CreateProjectDto, creatorId: number) {
    // 1. Check duplicate project key
    const exists = await this.projectRepository.findOne({ 
      where: { project_key: createProjectDto.project_key } 
    });
    
    if (exists) {
      throw new ConflictException('Project key already exists');
    }

    // 2. Clone all schemes
    const clonedSchemes = await this.schemeCloneService.cloneAllSchemes(
      createProjectDto.permission_scheme_id,
      createProjectDto.notification_scheme_id,
      createProjectDto.workflow_scheme_id,
      createProjectDto.project_key,
    );

    // 3. Create project with cloned scheme IDs
    const project = this.projectRepository.create({
      ...createProjectDto,
      permission_scheme_id: clonedSchemes.permissionScheme.id,
      notification_scheme_id: clonedSchemes.notificationScheme.id,
      workflow_scheme_id: clonedSchemes.workflowScheme.id,
    });

    const savedProject = await this.projectRepository.save(project);

    // 4. Assign Admin role to project creator
    await this.schemeCloneService.assignCreatorToAdminRole(
      savedProject.id,
      clonedSchemes.permissionScheme.id,
      creatorId,
    );

    // 5. Return project with scheme details
    return {
      ...savedProject,
      cloned_schemes: {
        permission_scheme: {
          id: clonedSchemes.permissionScheme.id,
          name: clonedSchemes.permissionScheme.scheme_name,
        },
        notification_scheme: {
          id: clonedSchemes.notificationScheme.id,
          name: clonedSchemes.notificationScheme.scheme_name,
        },
        workflow_scheme: {
          id: clonedSchemes.workflowScheme.id,
          name: clonedSchemes.workflowScheme.scheme_name,
        },
      },
      creator_assignment: {
        employee_id: creatorId,
        role: 'Admin',
        message: 'Project creator has been assigned Admin role',
      },
    };
  }

  async findAll() {
    return this.projectRepository.find({
      relations: ['lead_employee'],
    });
  }

  async findOne(id: number) {
    const project = await this.projectRepository.findOne({ 
      where: { id },
      relations: ['lead_employee'],
    });
    
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: number, updateProjectDto: UpdateProjectDto) {
    // Check duplicate project key if updating
    const duplicate = updateProjectDto.project_key
      ? await this.projectRepository.findOne({ 
          where: { project_key: updateProjectDto.project_key } 
        })
      : null;
      
    if (duplicate && duplicate.id !== id) {
      throw new ConflictException('Cannot update. Project key already exists');
    }

    await this.projectRepository.update({ id }, updateProjectDto);
    
    const updated = await this.projectRepository.findOne({ 
      where: { id },
      relations: ['lead_employee'],
    });
    
    if (!updated) {
      throw new NotFoundException(`Project with ID ${id} not found for update`);
    }
    
    return updated;
  }

  async remove(id: number) {
    const existing = await this.projectRepository.findOne({ where: { id } });
    
    if (!existing) {
      throw new NotFoundException(`Project with ID ${id} not found for deletion`);
    }
    
    await this.projectRepository.delete({ id });
    return existing;
  }
}