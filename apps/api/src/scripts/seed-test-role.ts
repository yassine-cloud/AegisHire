/**
 * Seed script: creates a test Software Engineer role + role-match for gap report testing.
 *
 * Usage (from apps/api root):
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-test-role.ts <candidateId>
 *
 * Or add a script entry in package.json:
 *   "seed:test-role": "ts-node -r tsconfig-paths/register src/scripts/seed-test-role.ts"
 *
 * The candidateId must match a valid Supabase user UUID.
 */
import { prisma } from '@aegishire/db';
import type { Prisma } from '@aegishire/db';

const ROLE_SLUG = 'software-engineer';
const ROLE_TITLE = 'Software Engineer';

const REQUIRED_SKILLS: Array<{ skill: string; importance: 'high' | 'medium' | 'low' }> = [
  { skill: 'TypeScript', importance: 'high' },
  { skill: 'Docker', importance: 'high' },
  { skill: 'System Design', importance: 'high' },
  { skill: 'CI/CD', importance: 'medium' },
  { skill: 'PostgreSQL', importance: 'medium' },
];

async function main() {
  const candidateId = process.argv[2];

  if (!candidateId) {
    console.error('Usage: ts-node seed-test-role.ts <candidateId>');
    process.exit(1);
  }

  console.log(`Seeding test role for candidate: ${candidateId}`);

  const role = await prisma.role.upsert({
    where: { slug: ROLE_SLUG },
    create: {
      slug: ROLE_SLUG,
      title: ROLE_TITLE,
      description: 'A general software engineering position requiring full-stack capabilities.',
      requiredSkills: REQUIRED_SKILLS as unknown as Prisma.InputJsonValue,
      preferredSkills: [] as unknown as Prisma.InputJsonValue,
    },
    update: {
      title: ROLE_TITLE,
      requiredSkills: REQUIRED_SKILLS as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(`Role upserted: ${role.id} (${role.slug})`);

  const missingSkillsPayload = REQUIRED_SKILLS.map((s) => ({
    skill: s.skill,
    importance: s.importance,
  }));

  const roleMatch = await prisma.roleMatch.upsert({
    where: { candidateId_roleId: { candidateId, roleId: role.id } },
    create: {
      candidateId,
      roleId: role.id,
      compatibilityScore: 40,
      matchedSkills: [] as unknown as Prisma.InputJsonValue,
      missingSkills: missingSkillsPayload as unknown as Prisma.InputJsonValue,
    },
    update: {
      compatibilityScore: 40,
      missingSkills: missingSkillsPayload as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(`RoleMatch upserted: ${roleMatch.id}`);
  console.log('\nDone! You can now test the gap report endpoint:');
  console.log(`  GET /api/v1/roles/${ROLE_SLUG}/gap-report`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
