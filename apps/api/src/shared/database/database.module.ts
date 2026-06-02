import { Module } from '@nestjs/common';
import { PrismaService } from '@aegishire/db';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
