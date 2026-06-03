import { Module } from '@nestjs/common';
import { AtsController } from './ats.controller';
import { AtsService } from './ats.service';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../shared/redis/redis.module';
import { AIGenerationModule } from '../ai-generation/ai-generation.module';

@Module({
  imports: [AuthModule, RedisModule, AIGenerationModule],
  controllers: [AtsController],
  providers: [AtsService],
})
export class AtsModule {}
