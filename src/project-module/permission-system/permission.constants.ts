/**
 * Permission Action Constants
 * Tất cả các actions có thể có trong hệ thống
 */

// ==================== PROJECT ADMINISTRATION ====================
export const ADMINISTER_PROJECT = 'administer_project';

// ==================== ISSUE OPERATIONS ====================
export const CREATE_ISSUE = 'create_issue';
export const EDIT_ISSUE = 'edit_issue';
export const DELETE_ISSUE = 'delete_issue';
export const ASSIGN_ISSUE = 'assign_issue';
export const TRANSITION_ISSUE = 'transition_issue';

// ==================== ISSUE DETAILS ====================
export const EDIT_ISSUE_DESCRIPTION = 'edit_issue_description';
export const EDIT_ISSUE_SUMMARY = 'edit_issue_summary';
export const EDIT_ISSUE_PRIORITY = 'edit_issue_priority';
export const EDIT_ISSUE_LABELS = 'edit_issue_labels';

// ==================== COMMENTS ====================
export const ADD_COMMENTS = 'add_comments';
export const EDIT_ALL_COMMENTS = 'edit_all_comments';
export const EDIT_OWN_COMMENTS = 'edit_own_comments';
export const DELETE_ALL_COMMENTS = 'delete_all_comments';
export const DELETE_OWN_COMMENTS = 'delete_own_comments';

// ==================== ATTACHMENTS ====================
export const CREATE_ATTACHMENTS = 'create_attachments';
export const DELETE_ALL_ATTACHMENTS = 'delete_all_attachments';
export const DELETE_OWN_ATTACHMENTS = 'delete_own_attachments';

// ==================== WORK LOGS ====================
export const WORK_ON_ISSUES = 'work_on_issues';
export const EDIT_ALL_WORKLOGS = 'edit_all_worklogs';
export const EDIT_OWN_WORKLOGS = 'edit_own_worklogs';
export const DELETE_ALL_WORKLOGS = 'delete_all_worklogs';
export const DELETE_OWN_WORKLOGS = 'delete_own_worklogs';

// ==================== ISSUE LINKS ====================
export const LINK_ISSUES = 'link_issues';

// ==================== SPRINT MANAGEMENT ====================
export const MANAGE_SPRINTS = 'manage_sprints';

// ==================== EPIC MANAGEMENT ====================
export const MANAGE_EPICS = 'manage_epics';

// ==================== PROJECT CONFIGURATION ====================
export const VIEW_PROJECT = 'view_project';
export const BROWSE_PROJECT = 'browse_project';
export const VIEW_DEV_TOOLS = 'view_dev_tools';
export const VIEW_VOTERS_WATCHERS = 'view_voters_watchers';
export const MANAGE_WATCHERS = 'manage_watchers';

// ==================== WORKFLOW ====================
export const VIEW_WORKFLOW = 'view_workflow';
export const EDIT_WORKFLOW = 'edit_workflow';

/**
 * Helper function để get readable name của permission
 */
export function getPermissionName(action: string): string {
    const names: Record<string, string> = {
        [ADMINISTER_PROJECT]: 'Administer Project',
        [CREATE_ISSUE]: 'Create Issues',
        [EDIT_ISSUE]: 'Edit Issues',
        [DELETE_ISSUE]: 'Delete Issues',
        [ASSIGN_ISSUE]: 'Assign Issues',
        [TRANSITION_ISSUE]: 'Transition Issues',
        [EDIT_ISSUE_DESCRIPTION]: 'Edit Issue Description',
        [EDIT_ISSUE_SUMMARY]: 'Edit Issue Summary',
        [EDIT_ISSUE_PRIORITY]: 'Edit Issue Priority',
        [EDIT_ISSUE_LABELS]: 'Edit Issue Labels',
        [ADD_COMMENTS]: 'Add Comments',
        [EDIT_ALL_COMMENTS]: 'Edit All Comments',
        [EDIT_OWN_COMMENTS]: 'Edit Own Comments',
        [DELETE_ALL_COMMENTS]: 'Delete All Comments',
        [DELETE_OWN_COMMENTS]: 'Delete Own Comments',
        [CREATE_ATTACHMENTS]: 'Create Attachments',
        [DELETE_ALL_ATTACHMENTS]: 'Delete All Attachments',
        [DELETE_OWN_ATTACHMENTS]: 'Delete Own Attachments',
        [WORK_ON_ISSUES]: 'Work on Issues',
        [EDIT_ALL_WORKLOGS]: 'Edit All Worklogs',
        [EDIT_OWN_WORKLOGS]: 'Edit Own Worklogs',
        [DELETE_ALL_WORKLOGS]: 'Delete All Worklogs',
        [DELETE_OWN_WORKLOGS]: 'Delete Own Worklogs',
        [LINK_ISSUES]: 'Link Issues',
        [MANAGE_SPRINTS]: 'Manage Sprints',
        [MANAGE_EPICS]: 'Manage Epics',
        [VIEW_PROJECT]: 'View Project',
        [BROWSE_PROJECT]: 'Browse Project',
        [VIEW_DEV_TOOLS]: 'View Development Tools',
        [VIEW_VOTERS_WATCHERS]: 'View Voters and Watchers',
        [MANAGE_WATCHERS]: 'Manage Watchers',
        [VIEW_WORKFLOW]: 'View Workflow',
        [EDIT_WORKFLOW]: 'Edit Workflow',
    };
    return names[action] || action;
}

/**
 * Permission groups for UI display
 */
export const PERMISSION_GROUPS = {
    'Project Administration': [ADMINISTER_PROJECT],
    'Issue Operations': [
        CREATE_ISSUE,
        EDIT_ISSUE,
        DELETE_ISSUE,
        ASSIGN_ISSUE,
        TRANSITION_ISSUE,
    ],
    'Issue Details': [
        EDIT_ISSUE_DESCRIPTION,
        EDIT_ISSUE_SUMMARY,
        EDIT_ISSUE_PRIORITY,
        EDIT_ISSUE_LABELS,
    ],
    'Comments': [
        ADD_COMMENTS,
        EDIT_ALL_COMMENTS,
        EDIT_OWN_COMMENTS,
        DELETE_ALL_COMMENTS,
        DELETE_OWN_COMMENTS,
    ],
    'Attachments': [
        CREATE_ATTACHMENTS,
        DELETE_ALL_ATTACHMENTS,
        DELETE_OWN_ATTACHMENTS,
    ],
    'Work Logs': [
        WORK_ON_ISSUES,
        EDIT_ALL_WORKLOGS,
        EDIT_OWN_WORKLOGS,
        DELETE_ALL_WORKLOGS,
        DELETE_OWN_WORKLOGS,
    ],
    'Issue Links': [LINK_ISSUES],
    'Sprint & Epic': [MANAGE_SPRINTS, MANAGE_EPICS],
    'Project View': [
        VIEW_PROJECT,
        BROWSE_PROJECT,
        VIEW_DEV_TOOLS,
        VIEW_VOTERS_WATCHERS,
        MANAGE_WATCHERS,
    ],
    'Workflow': [VIEW_WORKFLOW, EDIT_WORKFLOW],
};