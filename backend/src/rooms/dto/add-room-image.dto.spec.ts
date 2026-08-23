import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AddRoomImageDto } from './add-room-image.dto';

describe('AddRoomImageDto', () => {
  it.each([
    ['true', true],
    ['false', false],
  ])('transforms multipart value %s to %s', async (value, expected) => {
    const dto = plainToInstance(AddRoomImageDto, { isThumbnail: value });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.isThumbnail).toBe(expected);
  });
});
