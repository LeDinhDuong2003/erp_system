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
import { Issue, IssueType } from './Issue.entity';

// -------------------- Workflow Entity --------------------
@Entity({ name: 'workflows' })
export class Workflow {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  workflow_name!: string;

  @Column({ default: true })
  is_active!: boolean;

  @OneToMany(() => WorkflowStatus, (status) => status.workflow)
  statuses!: WorkflowStatus[];

  @OneToMany(() => WorkflowSchemeMapping, (mapping) => mapping.workflow)
  workflow_mappings!: WorkflowSchemeMapping[];
}


// -------------------- Workflow Scheme Entity --------------------
@Entity({ name: 'workflow_schemes' })
export class WorkflowScheme {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  scheme_name!: string;

  @Column({ type: 'varchar', nullable: true })
  scheme_description!: string | null;

  @OneToMany(() => WorkflowSchemeMapping, (mapping) => mapping.workflow_scheme)
  mappings!: WorkflowSchemeMapping[];

  @OneToMany(() => Project, (project) => project.workflow_scheme)
  projects!: Project[];
}

// -------------------- Workflow Status Entity --------------------
@Entity({ name: 'workflow_statuses' })
@Index(['workflow_id', 'status_name'], { unique: true })
export class WorkflowStatus {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  workflow_id!: number;

  @Column({ type: 'integer', default: 0 })
  order_index!: number;

  @Column()
  status_name!: string;

  @Column({ type: 'varchar', nullable: true })
  status_category!: string | null;

  @Column({ default: false })
  is_initial_status!: boolean;

  @ManyToOne(() => Workflow, (workflow) => workflow.statuses)
  @JoinColumn({ name: 'workflow_id' })
  workflow!: Workflow;

  @OneToMany(() => Issue, (issue) => issue.current_status)
  issues!: Issue[];
}

// -------------------- Workflow Scheme Mapping Entity --------------------
@Entity({ name: 'workflow_scheme_mappings' })
@Index(['workflow_scheme_id', 'issue_type_id'], { unique: true })
export class WorkflowSchemeMapping {
  @Column({ primary: true })
  workflow_scheme_id!: number;

  @Column({ primary: true })
  issue_type_id!: number;

  @Column()
  workflow_id!: number;

  // @ManyToOne(() => WorkflowScheme, (scheme) => scheme.mappings)
  // @JoinColumn({ name: 'workflow_scheme_id' })
  workflow_scheme!: WorkflowScheme;

  @ManyToOne(() => IssueType, (type) => type.workflow_mappings)
  @JoinColumn({ name: 'issue_type_id' })
  issue_type!: IssueType;

  // @ManyToOne(() => Workflow, (workflow) => workflow.workflow_mappings)
  // @JoinColumn({ name: 'workflow_id' })
  workflow!: Workflow;
}

