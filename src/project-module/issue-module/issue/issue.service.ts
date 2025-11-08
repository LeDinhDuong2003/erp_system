import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Issue } from '../../../database/entities/project-module/Issue.entity';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { Employee } from 'src/database/entities/Employee.entity';
import { AssignEmployeeDto } from './dto/assign-employee.dto';

@Injectable()
export class IssueService {
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepository: Repository<Issue>,
    
    @InjectRepository(Employee) // Cần inject Employee Repository để kiểm tra sự tồn tại của nhân viên
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async create(createIssueDto: CreateIssueDto): Promise<Issue> {
    const newIssue = this.issueRepository.create(createIssueDto);
    return await this.issueRepository.save(newIssue);
  }

  async findAll(): Promise<Issue[]> {
    return this.issueRepository.find();
  }

  async findOne(id: number): Promise<Issue> {
    const issue = await this.issueRepository.findOne({ where: { id } });
    if (!issue) {
      throw new NotFoundException(`Issue with ID ${id} not found`);
    }
    return issue;
  }

  async update(id: number, updateIssueDto: UpdateIssueDto): Promise<Issue> {
    await this.issueRepository.update(id, updateIssueDto);
    
    const updatedIssue = await this.issueRepository.findOne({ where: { id } });
    if (!updatedIssue) {
        throw new NotFoundException(`Issue with ID ${id} not found for update`);
    }
    return updatedIssue;
  }

  async remove(id: number): Promise<Issue> {
    const existingIssue = await this.issueRepository.findOne({ where: { id } });
    if (!existingIssue) {
      throw new NotFoundException(`Issue with ID ${id} not found for deletion`);
    }
    await this.issueRepository.delete(id);
    return existingIssue;
  }

  // -------------------- Assignees --------------------

  async getAssignees(issueId: number): Promise<Employee[]> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['assignees'],
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    return issue.assignees;
  }

  async assignEmployee(issueId: number, { employee_id }: AssignEmployeeDto): Promise<Issue> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['assignees'],
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    const employee = await this.employeeRepository.findOne({ where: { id: employee_id } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employee_id} not found`);
    }

    // Kiểm tra đã gán chưa
    if (issue.assignees.some(a => a.id === employee_id)) {
        throw new BadRequestException(`Employee ID ${employee_id} is already assigned to issue ${issueId}`);
    }

    // Thêm nhân viên vào danh sách assignees
    issue.assignees.push(employee);
    return this.issueRepository.save(issue);
  }

  // -------------------- Watchers --------------------

  async getWatchers(issueId: number): Promise<Employee[]> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['watchers'],
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    return issue.watchers;
  }

  async addWatcher(issueId: number, { employee_id }: AssignEmployeeDto): Promise<Issue> {
    const issue = await this.issueRepository.findOne({
      where: { id: issueId },
      relations: ['watchers'],
    });

    if (!issue) {
      throw new NotFoundException(`Issue with ID ${issueId} not found`);
    }

    const employee = await this.employeeRepository.findOne({ where: { id: employee_id } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employee_id} not found`);
    }

    // Kiểm tra đã theo dõi chưa
    if (issue.watchers.some(w => w.id === employee_id)) {
        throw new BadRequestException(`Employee ID ${employee_id} is already watching issue ${issueId}`);
    }

    // Thêm nhân viên vào danh sách watchers
    issue.watchers.push(employee);
    return this.issueRepository.save(issue);
  }
}