import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserService } from '../user/user.service';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('activate')
  activateAccount(@Body() body: { token: string; password: string }) {
    return this.authService.activateAccount(body.token, body.password);
  }

  @Post('refresh-token')
  refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  @Post('resend-activation/:email')
  resendActivationEmail(@Param('email') email: string) {
    return this.authService.resendActivationEmail(email);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    const user = await this.userService.findOne(req.user.sub);

    if (!user) {
      throw new Error('Пользователь не найден.');
    }

    return {
      id: user.id,
      firstName: `${user.firstName}`,
      lastName: `${user.lastName}`,
      email: user.email,
      role: user.role,
    };
  }
}
