import { Module } from '@nestjs/common';
import { AIGenerationService } from './ai-generation.service';
import { AIGenerationController } from './ai-generation.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AIGenerationController],
  providers: [AIGenerationService],
  exports: [AIGenerationService],
})
export class AIGenerationModule {}
