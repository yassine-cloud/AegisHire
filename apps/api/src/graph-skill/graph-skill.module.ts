import { Module } from '@nestjs/common';
import { GraphSkillController } from './graph-skill.controller';
import { GraphSkillService } from './graph-skill.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [GraphSkillController],
  providers: [GraphSkillService],
  exports: [GraphSkillService],
})
export class GraphSkillModule {}
