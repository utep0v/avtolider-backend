import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendActivationEmail(
    email: string,
    activationLink: string,
    firstName: string,
  ) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Активация аккаунта',
      template: 'activation',
      context: {
        firstName,
        activationLink,
      },
    });
  }

  async sendResetPasswordEmail(
    to: string,
    resetLink: string,
    firstName?: string,
  ) {
    await this.mailerService.sendMail({
      to,
      subject: 'Восстановление пароля',
      html: `
      <p>Здравствуйте${firstName ? ', ' + firstName : ''}!</p>
      <p>Для сброса пароля перейдите по <a href="${resetLink}">этой ссылке</a>.</p>
      <p>Если вы не запрашивали сброс, проигнорируйте это письмо.</p>
    `,
    });
  }
}
