import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { FileEntity } from './entity/file.entity';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
  ) {}

  async saveFile(filename: string, path: string): Promise<FileEntity> {
    const file = this.fileRepository.create({ filename, path });
    return this.fileRepository.save(file);
  }

  async getFileById(id: string): Promise<FileEntity> {
    const file = await this.fileRepository.findOne({ where: { id } });
    if (!file) throw new NotFoundException('Файл не найден');
    return file;
  }

  async deleteFile(id: string): Promise<void> {
    const file = await this.getFileById(id);
    await unlink(file.path);
    await this.fileRepository.remove(file);
  }
}
