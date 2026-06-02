import { prisma } from './client';
import type {
  Profile,
  Company,
  Job,
  JobApplication,
  Role,
  RoleMatch,
  GapReport,
  InterviewSession,
  InterviewQuestion,
} from './generated/prisma/client';

/**
 * PrismaService - A wrapper around the singleton prisma instance
 * Used for dependency injection in NestJS applications
 */
export class PrismaService {
  get profile() {
    return prisma.profile;
  }

  get company() {
    return prisma.company;
  }

  get job() {
    return prisma.job;
  }

  get jobApplication() {
    return prisma.jobApplication;
  }

  get role() {
    return prisma.role;
  }

  get roleMatch() {
    return prisma.roleMatch;
  }

  get gapReport() {
    return prisma.gapReport;
  }

  get interviewSession() {
    return prisma.interviewSession;
  }

  get interviewQuestion() {
    return prisma.interviewQuestion;
  }

  constructor() {
    // Return a proxy that delegates all operations to the prisma singleton
    // This allows access to any Prisma client methods like $connect, $disconnect, etc.
    return new Proxy(this, {
      get: (target, prop: string | symbol) => {
        // If the property is explicitly defined, use it
        if (prop in target) {
          return target[prop as keyof PrismaService];
        }
        // Otherwise, delegate to the prisma singleton
        return (prisma as any)[prop];
      },
    }) as any;
  }
}





