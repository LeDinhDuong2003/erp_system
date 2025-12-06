import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import {
    ProjectRoleAssignment,
    ProjectRole,
} from '../../database/entities/project-module/Permission.entity';
import { Employee } from '../../database/entities/Employee.entity';
import { Project } from '../../database/entities/project-module/Project.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ProjectRoleAssignment,
            ProjectRole,
            Employee,
            Project,
        ]),
    ],
    controllers: [TeamController],
    providers: [TeamService],
    exports: [TeamService],
})
export class TeamModule {}