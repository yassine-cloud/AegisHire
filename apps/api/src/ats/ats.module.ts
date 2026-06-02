import { Module } from '@nestjs/common';
import { AtsController } from './ats.controller';
import { AtsService } from './ats.service';
import { RedisModule } from '../shared/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [AtsController],
  providers: [AtsService],
})
export class AtsModule {}
