import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SprintController } from './sprint.controller';
import { SprintService } from './sprint.service';
import { Sprint, SprintIssue } from '../../database/entities/project-module/Sprint.entity';
import { Issue } from '../../database/entities/project-module/Issue.entity';
import { Project } from '../../database/entities/project-module/Project.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Sprint, SprintIssue, Issue, Project])],
    controllers: [SprintController],
    providers: [SprintService],
    exports: [SprintService],
})
export class SprintModule {}