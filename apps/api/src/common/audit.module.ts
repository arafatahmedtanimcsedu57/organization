import { Module } from '@nestjs/common';
import { AuditSubscriber } from './audit.subscriber.ts';

/** Registers the `change-history` audit subscriber (design.md §4: "common/ # audit interceptor..."). */
@Module({
  providers: [AuditSubscriber],
})
export class AuditModule {}
