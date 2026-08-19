import { UnsupportedMediaTypeException } from '@nestjs/common';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { I18nService } from 'nestjs-i18n';
import { RoomsLogger } from '../rooms.logger';
import { RoomImageValidationPipe } from './room-image-validation.pipe';

describe('RoomImageValidationPipe', () => {
  let directory: string;
  let pipe: RoomImageValidationPipe;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'room-image-test-'));
    pipe = new RoomImageValidationPipe(
      { t: jest.fn((key: string) => key) } as unknown as I18nService,
      { error: jest.fn() } as unknown as RoomsLogger,
    );
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('accepts a file whose content matches its MIME type', async () => {
    const path = join(directory, 'room.png');
    await writeFile(
      path,
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    const file = {
      path,
      size: (await readFile(path)).length,
      mimetype: 'image/png',
    } as Express.Multer.File;

    await expect(pipe.transform(file)).resolves.toBe(file);
  });

  it('deletes a spoofed image file and rejects it', async () => {
    const path = join(directory, 'spoofed.png');
    await writeFile(path, 'not an image');
    const file = {
      path,
      size: (await readFile(path)).length,
      mimetype: 'image/png',
    } as Express.Multer.File;

    await expect(pipe.transform(file)).rejects.toBeInstanceOf(
      UnsupportedMediaTypeException,
    );
    await expect(readFile(path)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
