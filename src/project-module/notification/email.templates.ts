/**
 * Email templates for issue notifications
 */

export interface IssueEmailData {
    issueCode: string;
    issueId: number;
    summary: string;
    description?: string;
    reporter: {
      name: string;
      email: string;
    };
    assignees?: Array<{
      name: string;
      email: string;
    }>;
    status: string;
    priority?: string;
    projectKey: string;
    projectName: string;
    frontendUrl: string;
  }
  
  export class EmailTemplates {
    /**
     * Issue Created Email Template
     */
    static issueCreated(data: IssueEmailData): { subject: string; html: string } {
      const issueUrl = `${data.frontendUrl}/projects/${data.projectKey}/issues/${data.issueCode}`;
      
      return {
        subject: `[${data.projectKey}] ${data.issueCode}: ${data.summary}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #0052cc; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
              .content { background-color: #f4f5f7; padding: 20px; }
              .issue-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #0052cc; }
              .field { margin: 10px 0; }
              .label { font-weight: bold; color: #5e6c84; }
              .value { color: #172b4d; }
              .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: #0052cc; 
                color: white; 
                text-decoration: none; 
                border-radius: 3px;
                margin: 15px 0;
              }
              .footer { text-align: center; color: #5e6c84; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">New Issue Created</h2>
              </div>
              
              <div class="content">
                <div class="issue-details">
                  <div class="field">
                    <span class="label">Issue:</span>
                    <span class="value">${data.issueCode} - ${data.summary}</span>
                  </div>
                  
                  <div class="field">
                    <span class="label">Project:</span>
                    <span class="value">${data.projectName} (${data.projectKey})</span>
                  </div>
                  
                  <div class="field">
                    <span class="label">Reporter:</span>
                    <span class="value">${data.reporter.name}</span>
                  </div>
                  
                  <div class="field">
                    <span class="label">Status:</span>
                    <span class="value">${data.status}</span>
                  </div>
                  
                  ${data.assignees && data.assignees.length > 0 ? `
                    <div class="field">
                      <span class="label">Assignees:</span>
                      <span class="value">${data.assignees.map(a => a.name).join(', ')}</span>
                    </div>
                  ` : ''}
                  
                  ${data.description ? `
                    <div class="field" style="margin-top: 15px;">
                      <span class="label">Description:</span>
                      <div style="margin-top: 5px; padding: 10px; background-color: #f4f5f7; border-radius: 3px;">
                        ${data.description}
                      </div>
                    </div>
                  ` : ''}
                </div>
                
                <a href="${issueUrl}" class="button">View Issue</a>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from ERP System</p>
                <p>Do not reply to this email</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };
    }
  
    /**
     * Issue Assigned Email Template
     */
    static issueAssigned(data: IssueEmailData & { assignedBy: string }): { subject: string; html: string } {
      const issueUrl = `${data.frontendUrl}/projects/${data.projectKey}/issues/${data.issueCode}`;
      
      return {
        subject: `[${data.projectKey}] You have been assigned to ${data.issueCode}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #00875a; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
              .content { background-color: #f4f5f7; padding: 20px; }
              .issue-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #00875a; }
              .field { margin: 10px 0; }
              .label { font-weight: bold; color: #5e6c84; }
              .value { color: #172b4d; }
              .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: #00875a; 
                color: white; 
                text-decoration: none; 
                border-radius: 3px;
                margin: 15px 0;
              }
              .footer { text-align: center; color: #5e6c84; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">You Have Been Assigned</h2>
              </div>
              
              <div class="content">
                <p>${data.assignedBy} has assigned you to this issue:</p>
                
                <div class="issue-details">
                  <div class="field">
                    <span class="label">Issue:</span>
                    <span class="value">${data.issueCode} - ${data.summary}</span>
                  </div>
                  
                  <div class="field">
                    <span class="label">Project:</span>
                    <span class="value">${data.projectName} (${data.projectKey})</span>
                  </div>
                  
                  <div class="field">
                    <span class="label">Reporter:</span>
                    <span class="value">${data.reporter.name}</span>
                  </div>
                  
                  <div class="field">
                    <span class="label">Status:</span>
                    <span class="value">${data.status}</span>
                  </div>
                </div>
                
                <a href="${issueUrl}" class="button">View Issue</a>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from ERP System</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };
    }
  
    /**
     * Issue Status Changed Email Template
     */
    static issueStatusChanged(
      data: IssueEmailData & { oldStatus: string; newStatus: string; changedBy: string }
    ): { subject: string; html: string } {
      const issueUrl = `${data.frontendUrl}/projects/${data.projectKey}/issues/${data.issueCode}`;
      
      return {
        subject: `[${data.projectKey}] ${data.issueCode} status changed: ${data.oldStatus} → ${data.newStatus}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #6554c0; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
              .content { background-color: #f4f5f7; padding: 20px; }
              .issue-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #6554c0; }
              .status-change { 
                background-color: #deebff; 
                padding: 15px; 
                border-radius: 3px; 
                margin: 15px 0;
                text-align: center;
              }
              .status { 
                display: inline-block; 
                padding: 5px 10px; 
                border-radius: 3px; 
                font-weight: bold;
              }
              .status-old { background-color: #ffebe6; color: #bf2600; }
              .status-new { background-color: #e3fcef; color: #006644; }
              .arrow { margin: 0 10px; font-size: 20px; }
              .field { margin: 10px 0; }
              .label { font-weight: bold; color: #5e6c84; }
              .value { color: #172b4d; }
              .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: #6554c0; 
                color: white; 
                text-decoration: none; 
                border-radius: 3px;
                margin: 15px 0;
              }
              .footer { text-align: center; color: #5e6c84; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">Issue Status Changed</h2>
              </div>
              
              <div class="content">
                <div class="status-change">
                  <span class="status status-old">${data.oldStatus}</span>
                  <span class="arrow">→</span>
                  <span class="status status-new">${data.newStatus}</span>
                </div>
                
                <p>${data.changedBy} changed the status of this issue:</p>
                
                <div class="issue-details">
                  <div class="field">
                    <span class="label">Issue:</span>
                    <span class="value">${data.issueCode} - ${data.summary}</span>
                  </div>
                  
                  <div class="field">
                    <span class="label">Project:</span>
                    <span class="value">${data.projectName} (${data.projectKey})</span>
                  </div>
                </div>
                
                <a href="${issueUrl}" class="button">View Issue</a>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from ERP System</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };
    }
  
    /**
     * Issue Commented Email Template
     */
    static issueCommented(
      data: IssueEmailData & { commenter: string; comment: string }
    ): { subject: string; html: string } {
      const issueUrl = `${data.frontendUrl}/projects/${data.projectKey}/issues/${data.issueCode}`;
      
      return {
        subject: `[${data.projectKey}] ${data.commenter} commented on ${data.issueCode}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #ff991f; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
              .content { background-color: #f4f5f7; padding: 20px; }
              .issue-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #ff991f; }
              .comment-box {
                background-color: white;
                padding: 15px;
                margin: 15px 0;
                border: 1px solid #dfe1e6;
                border-radius: 3px;
              }
              .field { margin: 10px 0; }
              .label { font-weight: bold; color: #5e6c84; }
              .value { color: #172b4d; }
              .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: #ff991f; 
                color: white; 
                text-decoration: none; 
                border-radius: 3px;
                margin: 15px 0;
              }
              .footer { text-align: center; color: #5e6c84; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">New Comment</h2>
              </div>
              
              <div class="content">
                <p><strong>${data.commenter}</strong> commented on:</p>
                
                <div class="issue-details">
                  <div class="field">
                    <span class="label">Issue:</span>
                    <span class="value">${data.issueCode} - ${data.summary}</span>
                  </div>
                  
                  <div class="field">
                    <span class="label">Project:</span>
                    <span class="value">${data.projectName} (${data.projectKey})</span>
                  </div>
                </div>
                
                <div class="comment-box">
                  <strong>Comment:</strong>
                  <p>${data.comment}</p>
                </div>
                
                <a href="${issueUrl}" class="button">View Issue</a>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from ERP System</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };
    }
  
    /**
     * Issue Updated Email Template
     */
    static issueUpdated(
      data: IssueEmailData & { updatedBy: string; changes: Array<{ field: string; oldValue: string; newValue: string }> }
    ): { subject: string; html: string } {
      const issueUrl = `${data.frontendUrl}/projects/${data.projectKey}/issues/${data.issueCode}`;
      
      const changesHtml = data.changes.map(change => `
        <tr>
          <td style="padding: 8px; border: 1px solid #dfe1e6;">${change.field}</td>
          <td style="padding: 8px; border: 1px solid #dfe1e6; background-color: #ffebe6;">${change.oldValue || '-'}</td>
          <td style="padding: 8px; border: 1px solid #dfe1e6; background-color: #e3fcef;">${change.newValue || '-'}</td>
        </tr>
      `).join('');
      
      return {
        subject: `[${data.projectKey}] ${data.issueCode} has been updated`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #0052cc; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
              .content { background-color: #f4f5f7; padding: 20px; }
              .issue-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #0052cc; }
              .changes-table { width: 100%; border-collapse: collapse; margin: 15px 0; background-color: white; }
              .field { margin: 10px 0; }
              .label { font-weight: bold; color: #5e6c84; }
              .value { color: #172b4d; }
              .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background-color: #0052cc; 
                color: white; 
                text-decoration: none; 
                border-radius: 3px;
                margin: 15px 0;
              }
              .footer { text-align: center; color: #5e6c84; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">Issue Updated</h2>
              </div>
              
              <div class="content">
                <p><strong>${data.updatedBy}</strong> updated this issue:</p>
                
                <div class="issue-details">
                  <div class="field">
                    <span class="label">Issue:</span>
                    <span class="value">${data.issueCode} - ${data.summary}</span>
                  </div>
                  
                  <div class="field">
                    <span class="label">Project:</span>
                    <span class="value">${data.projectName} (${data.projectKey})</span>
                  </div>
                </div>
                
                <table class="changes-table">
                  <thead>
                    <tr style="background-color: #f4f5f7;">
                      <th style="padding: 10px; border: 1px solid #dfe1e6; text-align: left;">Field</th>
                      <th style="padding: 10px; border: 1px solid #dfe1e6; text-align: left;">Old Value</th>
                      <th style="padding: 10px; border: 1px solid #dfe1e6; text-align: left;">New Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${changesHtml}
                  </tbody>
                </table>
                
                <a href="${issueUrl}" class="button">View Issue</a>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from ERP System</p>
              </div>
            </div>
          </body>
          </html>
        `,
      };
    }
  }