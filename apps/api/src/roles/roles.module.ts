import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../shared/redis/redis.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [AuthModule, HttpModule, RedisModule],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
