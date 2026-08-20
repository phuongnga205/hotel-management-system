import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinaryClient,
  UploadApiOptions,
  UploadApiResponse,
} from 'cloudinary';
import { ENVIRONMENT_KEYS } from '../config/environment.constants';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinaryClient.config({
      cloud_name: this.configService.get<string>(
        ENVIRONMENT_KEYS.CLOUDINARY_CLOUD_NAME,
      ),
      api_key: this.configService.get<string>(
        ENVIRONMENT_KEYS.CLOUDINARY_API_KEY,
      ),
      api_secret: this.configService.get<string>(
        ENVIRONMENT_KEYS.CLOUDINARY_API_SECRET,
      ),
    });
  }

  uploadBuffer(
    buffer: Buffer,
    options: UploadApiOptions,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinaryClient.uploader.upload_stream(
        options,
        (error, result) => {
          if (error || !result) {
            reject(
              error instanceof Error
                ? error
                : new Error('Cloudinary upload failed'),
            );
            return;
          }
          resolve(result);
        },
      );

      uploadStream.end(buffer);
    });
  }

  async destroy(publicId: string): Promise<void> {
    await cloudinaryClient.uploader.destroy(publicId);
  }
}
