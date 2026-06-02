import "dotenv/config";
import { prisma } from "../client";
import { AccountType } from "../generated/prisma/client";

// Fixed UUIDs so the seed is idempotent
const COMPANY_OWNER_ID = "00000000-0000-0000-0000-000000000001";
const DEV1_ID = "00000000-0000-0000-0000-000000000002";
const DEV2_ID = "00000000-0000-0000-0000-000000000003";

async function main() {
  console.log("Seeding…");

  // 1. Company owner profile (admin user)
  const companyProfile = await prisma.profile.upsert({
    where: { userId: COMPANY_OWNER_ID },
    update: {},
    create: {
      userId: COMPANY_OWNER_ID,
      accountType: AccountType.company,
      githubUsername: "aegishire-co",
    },
  });
  console.log("Company owner profile:", companyProfile.id);

  // 2. Company with 2 published jobs
  const company = await prisma.company.upsert({
    where: { ownerUserId: COMPANY_OWNER_ID },
    update: {},
    create: {
      ownerUserId: COMPANY_OWNER_ID,
      name: "AcmeCorp",
      industry: "Software",
      size: "11-50",
      description: "A demo company for AegisHire seed data.",
      contactEmail: "jobs@acmecorp.example",
    },
  });
  console.log("Company:", company.id);

  const job1 = await prisma.job.upsert({
    where: { id: "10000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "10000000-0000-0000-0000-000000000001",
      companyId: company.id,
      title: "Senior Frontend Engineer",
      location: "Remote",
      employmentType: "Full-time",
      description:
        "Build and maintain our React-based web application. You will work closely with product and design to ship high-quality features.",
      responsibilities: ["Build UI components", "Write tests", "Code review"],
      requirements: ["3+ years React", "TypeScript", "REST APIs"],
      salaryRange: "$90k – $130k",
      status: "published",
    },
  });

  const job2 = await prisma.job.upsert({
    where: { id: "10000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "10000000-0000-0000-0000-000000000002",
      companyId: company.id,
      title: "Backend Engineer (Node.js)",
      location: "Berlin, Germany",
      employmentType: "Full-time",
      description:
        "Join our backend team building scalable NestJS microservices. Own features end-to-end from DB schema to REST API.",
      responsibilities: [
        "Design REST APIs",
        "Write migrations",
        "On-call rotation",
      ],
      requirements: ["Node.js", "PostgreSQL", "Docker"],
      salaryRange: "€70k – €100k",
      status: "published",
    },
  });
  console.log("Jobs:", job1.id, job2.id);

  // 3. Developer profiles
  const dev1Profile = await prisma.profile.upsert({
    where: { userId: DEV1_ID },
    update: {},
    create: {
      userId: DEV1_ID,
      accountType: AccountType.developer,
      githubUsername: "alex-chen-dev",
      skills: { Languages: ["TypeScript", "JavaScript"], Frameworks: ["React", "Next.js"] },
    },
  });

  const dev2Profile = await prisma.profile.upsert({
    where: { userId: DEV2_ID },
    update: {},
    create: {
      userId: DEV2_ID,
      accountType: AccountType.developer,
      githubUsername: "maria-santos-dev",
      skills: { Languages: ["JavaScript", "Python"], Frameworks: ["Node.js", "Express"] },
    },
  });
  console.log("Dev profiles:", dev1Profile.id, dev2Profile.id);

  // 4. Job applications in different statuses
  // dev1 → job1: PENDING (just applied)
  await prisma.jobApplication.upsert({
    where: { jobId_candidateId: { jobId: job1.id, candidateId: DEV1_ID } },
    update: {},
    create: {
      jobId: job1.id,
      candidateId: DEV1_ID,
      status: "applied",
      customNotes: "Very excited about this role!",
    },
  });

  // dev2 → job1: shortlisted (REVIEW)
  await prisma.jobApplication.upsert({
    where: { jobId_candidateId: { jobId: job1.id, candidateId: DEV2_ID } },
    update: {},
    create: {
      jobId: job1.id,
      candidateId: DEV2_ID,
      status: "shortlisted",
    },
  });

  // dev1 → job2: accepted
  await prisma.jobApplication.upsert({
    where: { jobId_candidateId: { jobId: job2.id, candidateId: DEV1_ID } },
    update: {},
    create: {
      jobId: job2.id,
      candidateId: DEV1_ID,
      status: "accepted",
      customNotes: "Strong Node.js background.",
    },
  });

  console.log("Job applications created.");

  // Summary
  const counts = await Promise.all([
    prisma.company.count(),
    prisma.job.count(),
    prisma.profile.count(),
    prisma.jobApplication.count(),
  ]);
  console.log(
    `\nDB state → companies: ${counts[0]}, jobs: ${counts[1]}, profiles: ${counts[2]}, applications: ${counts[3]}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
