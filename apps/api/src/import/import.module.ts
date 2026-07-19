import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration.ts';
import { ReadMastersService } from './read-masters.service.ts';

/** `data-import` capability: reads the provided masters at seed time (SheetJS, no request path). */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
  ],
  providers: [ReadMastersService],
  exports: [ReadMastersService],
})
export class ImportModule {}
