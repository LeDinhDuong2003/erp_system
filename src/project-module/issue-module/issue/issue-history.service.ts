import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IssueChangeHistory } from '../../../database/entities/project-module/Issue.entity';

@Injectable()
export class IssueHistoryService {
  constructor(
    @InjectRepository(IssueChangeHistory)
    private readonly historyRepository: Repository<IssueChangeHistory>,
  ) {}

  /**
   * Ghi lại một thay đổi vào bảng issue_change_histories
   */
  async logChange(
    issueId: number,
    changerEmployeeId: number,
    fieldName: string,
    oldValue: any,
    newValue: any,
  ): Promise<void> {
    const history = this.historyRepository.create({
      issue_id: issueId,
      changer_employee_id: changerEmployeeId,
      change_date: new Date(),
      field_name: fieldName,
      old_value: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
      new_value: newValue !== null && newValue !== undefined ? String(newValue) : null,
    });

    await this.historyRepository.save(history);
  }

  /**
   * Ghi lại nhiều thay đổi cùng lúc
   */
  async logMultipleChanges(
    issueId: number,
    changerEmployeeId: number,
    changes: Array<{ fieldName: string; oldValue: any; newValue: any }>,
  ): Promise<void> {
    const histories = changes.map(change =>
      this.historyRepository.create({
        issue_id: issueId,
        changer_employee_id: changerEmployeeId,
        change_date: new Date(),
        field_name: change.fieldName,
        old_value: change.oldValue !== null && change.oldValue !== undefined ? String(change.oldValue) : null,
        new_value: change.newValue !== null && change.newValue !== undefined ? String(change.newValue) : null,
      }),
    );

    await this.historyRepository.save(histories);
  }

  /**
   * Lấy lịch sử thay đổi của một issue
   */
  async getIssueHistory(issueId: number): Promise<IssueChangeHistory[]> {
    return this.historyRepository.find({
      where: { issue_id: issueId },
      relations: ['changer_employee'],
      order: { change_date: 'DESC' },
    });
  }
}