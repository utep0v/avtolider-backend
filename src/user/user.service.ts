import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { v4 as uuidv4 } from 'uuid';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const activationToken = uuidv4();
    const user = this.userRepository.create({
      ...createUserDto,
      activationToken,
    });
    return this.userRepository.save(user);
  }

  async findAll(
    page = 1,
    size = 10,
    search?: string,
    city?: string,
    role?: string,
  ): Promise<{ data: User[]; total: number }> {
    const where: any = {};

    if (search) {
      where.firstName = ILike(`%${search}%`);
    }

    if (city) {
      where.city = ILike(`%${city}%`);
    }

    if (role) {
      where.role = role;
    }

    const [users, total] = await this.userRepository.findAndCount({
      where,
      skip: (page - 1) * size,
      take: size,
      order: { createdAt: 'DESC' },
    });

    return { data: users, total };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'email',
        'password',
        'role',
        'isActive',
        'firstName',
        'lastName',
      ],
    });
  }

  async activateUser(token: string, passwordHash: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { activationToken: token },
    });

    if (!user) {
      throw new NotFoundException('Неверный или истекший токен активации');
    }

    user.password = passwordHash;
    user.activationToken = '';
    user.isActive = true;

    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
    return { message: 'Пользователь успешно удалён' };
  }
}
