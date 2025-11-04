import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'project' })
export class Project {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  project_key!: string;

  @Column()
  project_name!: string;
}


