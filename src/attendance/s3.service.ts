import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  expiresIn: number;
}

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'ap-southeast-1';
    this.bucketName = process.env.AWS_S3_BUCKET || 'erp-attendance-photos';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /**
   * Generate a pre-signed URL for uploading avatar
   * @param employeeId - Employee ID
   * @param contentType - MIME type (image/jpeg, image/png)
   */
  async generateAvatarUploadUrl(
    employeeId: number,
    contentType: string = 'image/jpeg',
  ): Promise<PresignedUrlResponse> {
    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      throw new BadRequestException(
        `Invalid content type. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const uniqueId = uuidv4().substring(0, 8);
    const extension = contentType.split('/')[1] || 'jpg';

    // Key format: avatars/{employee_id}/avatar_{timestamp}_{uuid}.{ext}
    const key = `avatars/${employeeId}/avatar_${timestamp}_${uniqueId}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      Metadata: {
        'employee-id': employeeId.toString(),
        'upload-type': 'avatar',
        'upload-timestamp': timestamp.toString(),
      },
    });

    // URL expires in 5 minutes
    const expiresIn = 300;
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    // The final URL where the file will be accessible
    const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

    return {
      uploadUrl,
      fileUrl,
      key,
      expiresIn,
    };
  }

  /**
   * Generate a pre-signed URL for uploading attendance photo
   * @param employeeId - Employee ID
   * @param type - 'check_in' or 'check_out'
   * @param contentType - MIME type (image/jpeg, image/png)
   */
  async generateUploadUrl(
    employeeId: number,
    type: 'check_in' | 'check_out',
    contentType: string = 'image/jpeg',
  ): Promise<PresignedUrlResponse> {
    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      throw new BadRequestException(
        `Invalid content type. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    // Generate unique filename
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timestamp = date.getTime();
    const uniqueId = uuidv4().substring(0, 8);
    const extension = contentType.split('/')[1] || 'jpg';

    // Key format: attendance/{date}/{employee_id}/{type}_{timestamp}_{uuid}.{ext}
    const key = `attendance/${dateStr}/${employeeId}/${type}_${timestamp}_${uniqueId}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      // Add metadata for tracking
      Metadata: {
        'employee-id': employeeId.toString(),
        'attendance-type': type,
        'upload-timestamp': timestamp.toString(),
      },
    });

    // URL expires in 5 minutes - enough time to capture and upload
    const expiresIn = 300;
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    // The final URL where the file will be accessible
    const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

    return {
      uploadUrl,
      fileUrl,
      key,
      expiresIn,
    };
  }

  /**
   * Generate a pre-signed URL for viewing attendance photo (if bucket is private)
   * @param key - S3 object key
   */
  async generateViewUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    // View URL expires in 1 hour
    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  /**
   * Extract key from full S3 URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Remove leading slash
      return urlObj.pathname.substring(1);
    } catch {
      return null;
    }
  }
}


