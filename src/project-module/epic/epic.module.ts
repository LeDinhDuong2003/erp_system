import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EpicController } from './epic.controller';
import { EpicService } from './epic.service';
import { Epic, Issue } from '../../database/entities/project-module/Issue.entity';
import { Project } from '../../database/entities/project-module/Project.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Epic, Issue, Project])],
    controllers: [EpicController],
    providers: [EpicService],
    exports: [EpicService],
})
export class EpicModule {}