import { prisma } from './client';
async function run() {
  const apps = await prisma.jobApplication.findMany();
  
  const candidateIds = [...new Set(apps.map(a => a.candidateId))];
  const profiles = await prisma.profile.findMany({
    where: { userId: { in: candidateIds } },
    select: { userId: true, githubUsername: true, skills: true },
  });
  
  const profileMap = new Map(profiles.map(p => [p.userId, p]));
  
  function parseSkills(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(s => typeof s === 'string');
    if (typeof value === 'object') {
      return Object.values(value).flat().filter(s => typeof s === 'string');
    }
    return [];
  }

  const result = apps.map(app => {
    const profile = profileMap.get(app.candidateId);
    return {
      id: app.id,
      skills: parseSkills(profile?.skills),
      matchScore: app.matchScore ?? 0,
      resumeSummary: app.resumeSummary ?? '',
      motivationLetter: app.generatedLetter
    };
  });
  console.log(JSON.stringify(result, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
