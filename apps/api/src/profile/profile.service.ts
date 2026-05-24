import { Injectable, Logger } from '@nestjs/common';
import { prisma, Prisma } from '@aegishire/db';
import type { Profile } from '@aegishire/db';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { RedisService } from '../shared/redis/redis.service';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(private readonly redisService: RedisService) {}

  private skillsPayloadHasEntries(skills: Record<string, string[]>): boolean {
    return Object.values(skills).some((items) => Array.isArray(items) && items.length > 0);
  }

  getProfile(userId: string): Promise<Profile | null> {
    return prisma.profile.findUnique({
      where: { userId },
    });
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<Profile> {
    const skillsJson = updateProfileDto.skills
      ? (updateProfileDto.skills as unknown as Prisma.InputJsonValue)
      : undefined;
    const graphBuiltAt =
      updateProfileDto.skills !== undefined
        ? updateProfileDto.skills && this.skillsPayloadHasEntries(updateProfileDto.skills)
          ? new Date()
          : null
        : undefined;

    const profile = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        githubUsername: updateProfileDto.githubUsername,
        resumeFileUrl: updateProfileDto.resumeFileUrl,
        // @ts-ignore
        skills: skillsJson,
        graphBuiltAt: graphBuiltAt === undefined ? undefined : graphBuiltAt,
      },
      update: {
        githubUsername: updateProfileDto.githubUsername,
        resumeFileUrl: updateProfileDto.resumeFileUrl,
        // @ts-ignore
        ...(skillsJson !== undefined ? { skills: skillsJson } : {}),
        ...(graphBuiltAt !== undefined ? { graphBuiltAt } : {}),
      },
    });

    try {
      await this.redisService.delByPattern(`gap_report:${userId}:*`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Failed to invalidate gap-report cache for candidate ${userId}: ${errorMessage}`);
    }

    return profile;
  }

  async deleteProfile(userId: string): Promise<void> {
    await prisma.profile.deleteMany({
      where: { userId },
    });
  }
}
