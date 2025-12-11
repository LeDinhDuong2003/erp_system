# ✅ Kiểm tra Entities trong data-source.ts

## 📋 Danh sách Entities

### ✅ Core Entities (Auth & Employee)
- [x] Employee
- [x] Role
- [x] Permission
- [x] EmployeeRoleAssignment
- [x] RolePermission
- [x] RefreshToken
- [x] AuditLog

### ✅ HR Entities
- [x] Position
- [x] Department
- [x] EmployeePosition
- [x] Attendance
- [x] EmployeeSalary
- [x] LeaveRequest
- [x] EmployeeDevice
- [x] AttendanceChallenge
- [x] WorkScheduleSettings
- [x] SalarySettings
- [x] OvertimeRequest
- [x] LateEarlyRequest

### ✅ Project Module Entities
- [x] Project
- [x] IssueType
- [x] Epic
- [x] Issue
- [x] IssueLink
- [x] IssueComment
- [x] IssueChangeHistory
- [x] Workflow
- [x] WorkflowStatus
- [x] WorkflowSchemeMapping
- [x] WorkflowScheme
- [x] Sprint
- [x] SprintIssue
- [x] NotificationScheme
- [x] ProjectNotification
- [x] PermissionScheme
- [x] ProjectRole
- [x] ProjectPermission
- [x] ProjectRoleAssignment

### ✅ Asset Management Entities
- [x] Asset
- [x] Category

### ✅ Asset Handover Entities
- [x] Assignment

### ✅ Asset Request Entities
- [x] Request
- [x] Notification (Asset Request)
- [x] Supplier

### ✅ Other Entities
- [x] File
- [x] Report

## 📊 Tổng kết

- **Tổng số entities:** 40
- **Đã import:** 40 ✅
- **Thiếu:** 0 ✅

## 🔍 Lưu ý

1. **Notification entity:** Có 2 entities với tên `Notification`:
   - `ProjectNotification` (từ project-module)
   - `Notification` (từ asset-request)
   - Cả 2 đều đã được import ✅

2. **Tất cả entities đã được thêm vào `data-source.ts`** ✅

3. **Có thể chạy TypeORM generate migration để tạo migration cho tất cả entities**

