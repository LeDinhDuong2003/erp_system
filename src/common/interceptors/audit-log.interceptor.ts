import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditLogService } from '../services/audit-log.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body, query, params, ip, headers } = request;

    // Lấy thông tin user từ request (nếu có JWT guard)
    const user = (request as any).user;
    const employeeId = user?.id || null;

    // Lấy IP address (xử lý proxy/load balancer)
    const clientIp = this.getClientIp(request);

    // Lấy user agent
    const userAgent = headers['user-agent'] || null;

    // Xác định resource type và resource id từ URL
    const { resourceType, resourceId } = this.extractResourceInfo(url, params);

    // Tạo action string: METHOD /path
    const action = `${method} ${url}`;

    // Tạo metadata với thông tin request (loại bỏ password và sensitive data)
    const metadata: Record<string, any> = {
      method,
      url,
      query: this.sanitizeData(query),
      params: this.sanitizeData(params),
      body: this.sanitizeData(body),
      timestamp: new Date().toISOString(),
    };

    // Ghi log trước khi xử lý request
    const startTime = Date.now();

    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      tap({
        next: (data) => {
          // Tính thời gian xử lý
          const duration = Date.now() - startTime;

          // Lấy status code từ response
          const statusCode = response.statusCode || 200;

          // Thêm thông tin response vào metadata
          metadata.response_status = statusCode;
          metadata.duration_ms = duration;
          metadata.success = true;

          // Ghi audit log bất đồng bộ (không chờ kết quả)
          this.auditLogService.logAsync({
            employee_id: employeeId,
            action,
            resource_type: resourceType,
            resource_id: resourceId,
            ip: clientIp,
            user_agent: userAgent,
            metadata,
          });
        },
        error: (error) => {
          // Tính thời gian xử lý
          const duration = Date.now() - startTime;

          // Thêm thông tin lỗi vào metadata
          metadata.response_status = error.status || 500;
          metadata.duration_ms = duration;
          metadata.success = false;
          metadata.error = {
            message: error.message,
            name: error.name,
            // Không log stack trace để tránh log quá dài
          };

          // Ghi audit log bất đồng bộ (không chờ kết quả)
          this.auditLogService.logAsync({
            employee_id: employeeId,
            action,
            resource_type: resourceType,
            resource_id: resourceId,
            ip: clientIp,
            user_agent: userAgent,
            metadata,
          });
        },
      }),
    );
  }

  /**
   * Lấy IP address của client (xử lý proxy/load balancer)
   */
  private getClientIp(request: Request): string {
    // 1. Kiểm tra x-forwarded-for header (proxy/load balancer)
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      // x-forwarded-for có thể chứa nhiều IP, lấy IP đầu tiên (client IP thực)
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      const firstIp = ips.split(',')[0].trim();
      if (firstIp && firstIp !== '::1') {
        return firstIp;
      }
    }

    // 2. Kiểm tra x-real-ip header
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      const ip = Array.isArray(realIp) ? realIp[0] : realIp;
      if (ip && ip !== '::1') {
        return ip;
      }
    }

    // 3. Kiểm tra cf-connecting-ip (Cloudflare)
    const cfIp = request.headers['cf-connecting-ip'];
    if (cfIp) {
      const ip = Array.isArray(cfIp) ? cfIp[0] : cfIp;
      if (ip && ip !== '::1') {
        return ip;
      }
    }

    // 4. Lấy từ request.ip (sau khi trust proxy được bật)
    if (request.ip && request.ip !== '::1' && request.ip !== '::ffff:127.0.0.1') {
      return request.ip;
    }

    // 5. Lấy từ socket.remoteAddress
    const socketIp = request.socket?.remoteAddress;
    if (socketIp && socketIp !== '::1' && socketIp !== '::ffff:127.0.0.1') {
      // Chuyển IPv6 localhost sang IPv4
      if (socketIp === '::1' || socketIp === '::ffff:127.0.0.1') {
        return '127.0.0.1';
      }
      return socketIp;
    }

    // 6. Xử lý trường hợp localhost (::1 hoặc 127.0.0.1)
    // Nếu tất cả đều là localhost, trả về 127.0.0.1 thay vì ::1
    if (socketIp === '::1' || request.ip === '::1') {
      return '127.0.0.1';
    }

    // 7. Fallback
    return socketIp || request.ip || 'unknown';
  }

  /**
   * Trích xuất resource type và resource id từ URL và params
   */
  private extractResourceInfo(
    url: string,
    params: Record<string, any>,
  ): { resourceType: string | null; resourceId: string | null } {
    // Loại bỏ query string
    const path = url.split('?')[0];
    const segments = path.split('/').filter(Boolean);

    // Tìm resource id trong params (thường là :id)
    let resourceId: string | null = null;
    if (params.id) {
      resourceId = String(params.id);
    } else if (params['0']) {
      // Nếu có dynamic route
      resourceId = String(params['0']);
    }

    // Xác định resource type từ URL
    // Ví dụ: /employees/123 -> resource_type = 'employees', resource_id = '123'
    // Ví dụ: /hr-requests/456 -> resource_type = 'hr-requests', resource_id = '456'
    let resourceType: string | null = null;

    // Tìm segment cuối cùng trước resource id
    if (segments.length >= 2) {
      // Lấy segment thứ 2 từ cuối (trước id)
      resourceType = segments[segments.length - 2];
    } else if (segments.length === 1) {
      // Nếu chỉ có 1 segment, đó là resource type
      resourceType = segments[0];
    }

    return { resourceType, resourceId };
  }

  /**
   * Loại bỏ thông tin nhạy cảm khỏi data (password, token, etc.)
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    const sensitiveFields = [
      'password',
      'password_hash',
      'token',
      'access_token',
      'refresh_token',
      'authorization',
      'secret',
      'api_key',
      'apikey',
    ];

    const sanitized: Record<string, any> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some((field) => lowerKey.includes(field))) {
          sanitized[key] = '***REDACTED***';
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          sanitized[key] = this.sanitizeData(data[key]);
        } else {
          sanitized[key] = data[key];
        }
      }
    }

    return sanitized;
  }
}

