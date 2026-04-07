import { Injectable } from '@nestjs/common';
import { prisma, Prisma } from '@aegishire/db';
import type { Profile } from '@aegishire/db';

@Injectable()
export class ProfileService {
  create(createProfileDto: Prisma.ProfileCreateInput): Promise<Profile> {
    return prisma.profile.create({
      data: createProfileDto,
    });
  }

  findAll(): Promise<Profile[]> {
    return prisma.profile.findMany();
  }

  findOne(id: string): Promise<Profile | null> {
    return prisma.profile.findUnique({
      where: { id },
    });
  }

  update(id: string, updateProfileDto: Prisma.ProfileUpdateInput): Promise<Profile> {
    return prisma.profile.update({
      where: { id },
      data: updateProfileDto,
    });
  }

  remove(id: string): Promise<Profile> {
    return prisma.profile.delete({
      where: { id },
    });
  }
}
