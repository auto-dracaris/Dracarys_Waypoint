import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { buildSmsRmqOptions } from './rmq.options';
import { SMS_CLIENT } from './sms.constants';
import { SmsConsumer } from './sms.consumer';
import { SmsGatewayService } from './sms-gateway.service';
import { SmsService } from './sms.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SMS_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: buildSmsRmqOptions,
      },
    ]),
  ],
  controllers: [SmsConsumer],
  providers: [SmsService, SmsGatewayService],
  exports: [SmsService],
})
export class SmsModule {}
