import {
    Column,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    Index,
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

  @OneToMany(() => SprintIssue, (si) => si.sprint)
  sprint_issues!: SprintIssue[];
}

// -------------------- Sprint Issue Entity --------------------
@Entity({ name: 'sprint_issues' })
@Index(['sprint_id', 'issue_id'], { unique: true })
export class SprintIssue {
  @Column({ primary: true })
  sprint_id!: number;

  @Column({ primary: true })
  issue_id!: number;

  @Column({ type: 'integer', nullable: true })
  rank_order!: number | null;

  @ManyToOne(() => Sprint, (sprint) => sprint.sprint_issues)
  @JoinColumn({ name: 'sprint_id' })
  sprint!: Sprint;

  @ManyToOne(() => Issue, (issue) => issue.sprint_issues)
  @JoinColumn({ name: 'issue_id' })
  issue!: Issue;
}