import { SetMetadata } from '@nestjs/common';

/**
 * Decorator để define required permission cho endpoint
 * 
 * @example
 * @Post()
 * @RequirePermission('create_issue')
 * async createIssue(@Body() dto: CreateIssueDto) {
 *   // ...
 * }
 */
export const RequirePermission = (permission: string) =>
    SetMetadata('permission', permission);

/**
 * Decorator để bypass permission check
 * Useful cho public endpoints hoặc system endpoints
 */
export const PublicEndpoint = () => SetMetadata('permission', null);