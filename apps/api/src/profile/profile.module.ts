import { Module } from '@nestjs/common';
import { ProfilesService } from './profile.service';
import { ProfilesController } from './profile.controller';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../shared/redis/redis.module';

@Module({
  imports: [AuthModule, RedisModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
