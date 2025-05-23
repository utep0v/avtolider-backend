import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from '../user/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const activationToken = uuidv4();

    const user = await this.usersService.create({
      ...createUserDto,
      activationToken,
    });

    const activationLink = `${this.configService.get<string>(
      'FRONTEND_URL',
    )}/activate/${activationToken}`;

    await this.mailService.sendActivationEmail(
      user.email,
      activationLink,
      user.firstName,
    );

    return {
      message:
        'Пользователь успешно зарегистрирован. Проверьте вашу почту для активации.',
    };
  }

  async activateAccount(
    token: string,
    password: string,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByActivationToken(token);

    if (!user) {
      throw new NotFoundException('Неверный или истекший токен активации');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    user.isActive = true;
    user.activationToken = '';
    await this.usersService.save(user);
    return { message: 'Аккаунт успешно активирован!' };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(loginDto.password, user.password))
    ) {
      throw new UnauthorizedException('Неверные учетные данные');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
    });

    user.refreshToken = refreshToken;
    await this.usersService.save(user);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findOne(payload.sub);

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Неверный refresh token');
      }

      const newAccessToken = await this.jwtService.signAsync(
        { sub: user.id, email: user.email, role: user.role },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
        },
      );

      return {
        access_token: newAccessToken,
        refresh_token: refreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Недействительный refresh token');
    }
  }

  async resendActivationEmail(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new Error('Пользователь с таким email не найден.');
    }

    if (user.isActive) {
      throw new Error('Аккаунт уже активирован.');
    }

    const activationLink = `${this.configService.get<string>(
      'FRONTEND_URL',
    )}/verify-password/${user.activationToken}`;

    await this.mailService.sendActivationEmail(
      user.email,
      activationLink,
      user.firstName,
    );

    return {
      message: 'Ссылка активации отправлена повторно.',
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'Письмо отправлено (если такой email существует).' };
    }

    const resetToken = this.jwtService.sign(
      { userId: user.id },
      { secret: process.env.RESET_PASSWORD_SECRET, expiresIn: '15m' },
    );

    const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/auth/reset-password/${resetToken}`;

    await this.mailService.sendResetPasswordEmail(
      user.email,
      resetLink,
      user.firstName,
    );

    return { message: 'Письмо отправлено (если такой email существует).' };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload;
    try {
      payload = this.jwtService.verify(token, { secret: process.env.RESET_PASSWORD_SECRET });
    } catch (e) {
      throw new UnauthorizedException('Ссылка устарела или неверна');
    }
    const user = await this.usersService.findOne(payload.userId);

    if (!user) throw new UnauthorizedException('Пользователь не найден');

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await this.usersService.save(user);

    return { message: 'Пароль успешно изменен!' };
  }
}
