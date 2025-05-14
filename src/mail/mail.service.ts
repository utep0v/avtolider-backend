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
}
