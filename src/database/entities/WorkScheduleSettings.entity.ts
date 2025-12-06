import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'work_schedule_settings' })
export class WorkScheduleSettings {
  @PrimaryGeneratedColumn()
  id!: number;

  // Giờ check-in/check-out chuẩn
  @Column({ type: 'time', comment: 'Giờ check-in chuẩn (HH:mm:ss)' })
  standard_check_in_time!: string; // Format: '08:00:00'

  @Column({ type: 'time', comment: 'Giờ check-out chuẩn (HH:mm:ss)' })
  standard_check_out_time!: string; // Format: '17:00:00'

  // Ngày làm việc trong tuần (0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7)
  @Column({ type: 'boolean', default: true, comment: 'Thứ 2' })
  monday!: boolean;

  @Column({ type: 'boolean', default: true, comment: 'Thứ 3' })
  tuesday!: boolean;

  @Column({ type: 'boolean', default: true, comment: 'Thứ 4' })
  wednesday!: boolean;

  @Column({ type: 'boolean', default: true, comment: 'Thứ 5' })
  thursday!: boolean;

  @Column({ type: 'boolean', default: true, comment: 'Thứ 6' })
  friday!: boolean;

  @Column({ type: 'boolean', default: false, comment: 'Thứ 7' })
  saturday!: boolean;

  @Column({ type: 'boolean', default: false, comment: 'Chủ nhật' })
  sunday!: boolean;

  // Số giờ làm việc chuẩn mỗi ngày
  @Column({ type: 'numeric', precision: 4, scale: 2, default: 8.0, comment: 'Số giờ làm việc chuẩn mỗi ngày' })
  standard_work_hours_per_day!: number;

  // Thời gian cho phép đi muộn (phút) trước khi bị tính là muộn
  @Column({ type: 'int', default: 15, comment: 'Thời gian cho phép đi muộn (phút)' })
  late_tolerance_minutes!: number;

  // Thời gian cho phép về sớm (phút) trước khi bị tính là về sớm
  @Column({ type: 'int', default: 15, comment: 'Thời gian cho phép về sớm (phút)' })
  early_leave_tolerance_minutes!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}

