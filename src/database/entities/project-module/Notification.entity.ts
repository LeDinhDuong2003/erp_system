import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './Project.entity';


// -------------------- Notification Scheme Entity --------------------
@Entity({ name: 'notification_schemes' })
export class NotificationScheme {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  scheme_name!: string;

  @Column({ type: 'varchar', nullable: true })
  scheme_description!: string | null;

  @OneToMany(() => ProjectNotification, (notification) => notification.notification_scheme)
  notifications!: ProjectNotification[];

  @OneToMany(() => Project, (project) => project.notification_scheme)
  projects!: Project[];
}

// -------------------- Notification Entity --------------------
@Entity({ name: 'project_notifications' })
export class ProjectNotification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  notification_scheme_id!: number;

  @Column()
  event_name!: string;

  @Column()
  recipient_type!: string;

  @Column({ type: 'varchar', nullable: true })
  recipient_value!: string | null;

  @ManyToOne(() => NotificationScheme, (scheme) => scheme.notifications)
  @JoinColumn({ name: 'notification_scheme_id' })
  notification_scheme!: NotificationScheme;
}

