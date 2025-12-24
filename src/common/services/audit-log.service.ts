import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/AuditLog.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Ghi audit log
   */
  async log(data: {
    employee_id?: number | null;
    action: string;
    resource_type?: string | null;
    resource_id?: string | null;
    ip?: string | null;
    user_agent?: string | null;
    metadata?: Record<string, any> | null;
  }): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepository.create({
        employee_id: data.employee_id || null,
        action: data.action,
        resource_type: data.resource_type || null,
        resource_id: data.resource_id || null,
        ip: data.ip || null,
        user_agent: data.user_agent || null,
        metadata: data.metadata || null,
      });

      return await this.auditLogRepository.save(auditLog);
    } catch (error) {
      // Không throw error để không làm gián đoạn request chính
      // Chỉ log ra console để debug
      console.error('Failed to save audit log:', error);
      // Trả về một object rỗng để không làm crash ứng dụng
      return {} as AuditLog;
    }
  }

  /**
   * Ghi audit log bất đồng bộ (không chờ kết quả)
   */
  logAsync(data: {
    employee_id?: number | null;
    action: string;
    resource_type?: string | null;
    resource_id?: string | null;
    ip?: string | null;
    user_agent?: string | null;
    metadata?: Record<string, any> | null;
  }): void {
    // Gọi log() nhưng không await để không block request
    this.log(data).catch((error) => {
      console.error('Async audit log failed:', error);
    });
  }
}

