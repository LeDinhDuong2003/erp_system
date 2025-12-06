import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkScheduleSettings } from '../database/entities/WorkScheduleSettings.entity';

@Injectable()
export class WorkScheduleService {
  constructor(
    @InjectRepository(WorkScheduleSettings)
    private readonly workScheduleRepository: Repository<WorkScheduleSettings>,
  ) {}

  async getSettings(): Promise<WorkScheduleSettings> {
    let settings = await this.workScheduleRepository.findOne({
      where: {},
      order: { created_at: 'DESC' },
    });

    if (!settings) {
      // Create default settings
      settings = this.workScheduleRepository.create({
        standard_check_in_time: '08:00:00',
        standard_check_out_time: '17:00:00',
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
        standard_work_hours_per_day: 8.0,
        late_tolerance_minutes: 15,
        early_leave_tolerance_minutes: 15,
      });
      settings = await this.workScheduleRepository.save(settings);
    }

    return settings;
  }

  async updateSettings(updateData: Partial<WorkScheduleSettings>): Promise<WorkScheduleSettings> {
    let settings = await this.workScheduleRepository.findOne({
      where: {},
      order: { created_at: 'DESC' },
    });

    if (!settings) {
      // Create new settings, exclude timestamp fields
      const { created_at, updated_at, ...dataToCreate } = updateData as any;
      const newSettings = this.workScheduleRepository.create({
        ...dataToCreate,
        standard_check_in_time: updateData.standard_check_in_time || '08:00:00',
        standard_check_out_time: updateData.standard_check_out_time || '17:00:00',
      });
      const saved = await this.workScheduleRepository.save(newSettings);
      return Array.isArray(saved) ? saved[0] : saved;
    } else {
      // Update existing settings, exclude timestamp fields
      const { created_at, updated_at, ...dataToUpdate } = updateData as any;
      Object.assign(settings, dataToUpdate);
      const saved = await this.workScheduleRepository.save(settings);
      return Array.isArray(saved) ? saved[0] : saved;
    }
  }

  /**
   * Check if a date is a working day
   */
  isWorkingDay(date: Date, settings: WorkScheduleSettings): boolean {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    switch (dayOfWeek) {
      case 0:
        return settings.sunday;
      case 1:
        return settings.monday;
      case 2:
        return settings.tuesday;
      case 3:
        return settings.wednesday;
      case 4:
        return settings.thursday;
      case 5:
        return settings.friday;
      case 6:
        return settings.saturday;
      default:
        return false;
    }
  }
}

