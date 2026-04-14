import { Injectable } from '@nestjs/common';
import { prisma } from '@aegishire/db';
import type { Profile } from '@aegishire/db';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  getProfile(userId: string): Promise<Profile | null> {
    return prisma.profile.findUnique({
      where: { userId },
    });
  }

  updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<Profile> {
    return prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        githubUsername: updateProfileDto.githubUsername,
        resumeFileUrl: updateProfileDto.resumeFileUrl,
      },
      update: {
        githubUsername: updateProfileDto.githubUsername,
        resumeFileUrl: updateProfileDto.resumeFileUrl,
      },
    });
  }

  async deleteProfile(userId: string): Promise<void> {
    await prisma.profile.deleteMany({
      where: { userId },
    });
  }
}
