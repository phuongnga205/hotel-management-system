import { Injectable } from '@nestjs/common';
import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';

@Injectable()
export class ImagesService {
  create(createImageDto: CreateImageDto) {
    void createImageDto;
    return 'This action adds a new image';
  }

  findAll() {
    return `This action returns all images`;
  }

  findOne(id: string) {
    return `This action returns a #${id} image`;
  }

  update(id: string, updateImageDto: UpdateImageDto) {
    void updateImageDto;
    return `This action updates a #${id} image`;
  }

  remove(id: string) {
    return `This action removes a #${id} image`;
  }
}
