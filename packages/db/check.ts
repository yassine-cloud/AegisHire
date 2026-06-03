import { prisma } from './client';
async function run() {
  const apps = await prisma.jobApplication.findMany();
  console.log('Apps:', JSON.stringify(apps, null, 2));
  const profiles = await prisma.profile.findMany();
  console.log('Profiles:', JSON.stringify(profiles, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
