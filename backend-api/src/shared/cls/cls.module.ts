import { Module } from '@nestjs/common';
import { ClsModule as NestClsModule } from 'nestjs-cls';

@Module({
  imports: [
    NestClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
      },
    }),
  ],
})
export class ClsConfigModule {}
