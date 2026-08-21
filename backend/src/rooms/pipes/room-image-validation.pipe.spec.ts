import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { RoomImageValidationPipe } from './room-image-validation.pipe';

describe('RoomImageValidationPipe', () => {
  let pipe: RoomImageValidationPipe;

  beforeEach(() => {
    pipe = new RoomImageValidationPipe({
      t: jest.fn((key: string) => key),
    } as unknown as I18nService);
  });

  function buildFile(buffer: Buffer, mimetype: string): Express.Multer.File {
    return { buffer, size: buffer.length, mimetype } as Express.Multer.File;
  }

  it('rejects a missing file', () => {
    expect(() => pipe.transform(undefined)).toThrow(BadRequestException);
  });

  it('rejects a file over the size limit', () => {
    const file = buildFile(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      'image/png',
    );
    file.size = 6 * 1024 * 1024;

    expect(() => pipe.transform(file)).toThrow(PayloadTooLargeException);
  });

  it('rejects an unsupported mime type', () => {
    const file = buildFile(Buffer.from('gif89a'), 'image/gif');

    expect(() => pipe.transform(file)).toThrow(UnsupportedMediaTypeException);
  });

  it('accepts a file whose content matches its MIME type', () => {
    const file = buildFile(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      'image/png',
    );

    expect(pipe.transform(file)).toBe(file);
  });

  it('rejects a spoofed file (extension/mimetype says image, content does not)', () => {
    const file = buildFile(Buffer.from('not an image'), 'image/png');

    expect(() => pipe.transform(file)).toThrow(UnsupportedMediaTypeException);
  });
});
