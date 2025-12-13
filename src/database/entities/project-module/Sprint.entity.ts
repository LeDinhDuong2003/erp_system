import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Project } from './Project.entity';
import { Issue } from './Issue.entity';


// -------------------- Sprint Entity --------------------
@Entity({ name: 'sprints' })
export class Sprint {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  project_id!: number;

  @Column()
  sprint_name!: string;

  @Column({ type: 'text', nullable: true })
  goal!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  start_date!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  end_date!: Date | null;

  @Column({ type: 'integer', nullable: true })
  duration_days!: number | null;

  @Column()
  status!: string;

  @ManyToOne(() => Project, (project) => project.sprints)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @OneToMany(() => Issue, (issue) => issue.sprint)
  issues!: Issue[];
}