export type ApplicationStatus = 'PENDING' | 'REVIEW' | 'ACCEPTED' | 'REJECTED';

export type Candidate = {
  id: string;
  name: string;
  jobTitle: string;
  jobId: string;
  skills: string[];
  matchScore: number;
  resumeSummary: string;
  generatedEmail?: string | null;
  generatedLetter?: string | null;
  status: ApplicationStatus;
  appliedAt: string;
};

export const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 'c1',
    name: 'Alex Chen',
    jobTitle: 'Senior Frontend Engineer',
    jobId: 'j1',
    skills: ['React', 'TypeScript', 'Next.js', 'GraphQL'],
    matchScore: 87,
    resumeSummary:
      '5 years building production React applications at scale. Led the frontend migration from Angular to React at TechCorp, improving bundle size by 40%.',
    generatedEmail:
      'Dear Hiring Team,\n\nI am writing to express my strong interest in the Senior Frontend Engineer position. With 5 years of experience building React applications at scale...',
    generatedLetter:
      'I am incredibly excited about the opportunity to join TechCorp as a Senior Frontend Engineer. Having followed your work in the developer tools space...',
    status: 'PENDING',
    appliedAt: '2026-05-28',
  },
  {
    id: 'c2',
    name: 'Maria Santos',
    jobTitle: 'Backend Engineer',
    jobId: 'j2',
    skills: ['Node.js', 'PostgreSQL', 'Docker', 'AWS'],
    matchScore: 74,
    resumeSummary:
      'Backend engineer with focus on distributed systems and data pipelines. Built and maintained microservices handling 1M+ daily requests.',
    status: 'PENDING',
    appliedAt: '2026-05-29',
  },
  {
    id: 'c3',
    name: 'James Wilson',
    jobTitle: 'Full Stack Developer',
    jobId: 'j1',
    skills: ['React', 'Python', 'FastAPI', 'Redis'],
    matchScore: 62,
    resumeSummary:
      'Full-stack developer with 3 years experience building SaaS products. Proficient in Python backends and React frontends.',
    status: 'REVIEW',
    appliedAt: '2026-05-27',
  },
  {
    id: 'c4',
    name: 'Priya Sharma',
    jobTitle: 'ML Engineer',
    jobId: 'j3',
    skills: ['Python', 'PyTorch', 'MLOps', 'Kubernetes'],
    matchScore: 91,
    resumeSummary:
      'ML engineer specialising in NLP and recommendation systems. Deployed models serving 500 K users daily at previous company.',
    status: 'REVIEW',
    appliedAt: '2026-05-30',
  },
  {
    id: 'c5',
    name: 'Omar Khalil',
    jobTitle: 'DevOps Engineer',
    jobId: 'j2',
    skills: ['Kubernetes', 'Terraform', 'CI/CD', 'GCP'],
    matchScore: 83,
    resumeSummary:
      'DevOps engineer with deep expertise in cloud infrastructure and GitOps workflows. Reduced deployment time by 60% at previous role.',
    status: 'ACCEPTED',
    appliedAt: '2026-05-25',
  },
  {
    id: 'c6',
    name: 'Sofia Lee',
    jobTitle: 'Product Designer',
    jobId: 'j4',
    skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping'],
    matchScore: 79,
    resumeSummary:
      'Product designer with 4 years of B2B SaaS experience. Built and maintained a design system used across 5 product teams.',
    status: 'ACCEPTED',
    appliedAt: '2026-05-24',
  },
  {
    id: 'c7',
    name: 'David Kim',
    jobTitle: 'Android Developer',
    jobId: 'j5',
    skills: ['Kotlin', 'Jetpack Compose', 'Android', 'CI/CD'],
    matchScore: 55,
    resumeSummary:
      '2 years of Android development experience. Familiar with modern Android architecture patterns but limited team leadership experience.',
    status: 'REJECTED',
    appliedAt: '2026-05-26',
  },
  {
    id: 'c8',
    name: 'Nina Petrov',
    jobTitle: 'QA Engineer',
    jobId: 'j3',
    skills: ['Selenium', 'Cypress', 'Jest', 'Playwright'],
    matchScore: 68,
    resumeSummary:
      'QA engineer focused on test automation. Built end-to-end test suites for 3 enterprise applications, achieving 90% coverage.',
    status: 'REJECTED',
    appliedAt: '2026-05-28',
  },
];

export const STATUS_META: Record<
  ApplicationStatus,
  { label: string; color: string; dot: string }
> = {
  PENDING: {
    label: 'Pending',
    color: 'border-zinc-700 bg-zinc-800/60',
    dot: 'bg-zinc-400',
  },
  REVIEW: {
    label: 'In Review',
    color: 'border-blue-700/50 bg-blue-900/20',
    dot: 'bg-blue-400',
  },
  ACCEPTED: {
    label: 'Accepted',
    color: 'border-emerald-700/50 bg-emerald-900/20',
    dot: 'bg-emerald-400',
  },
  REJECTED: {
    label: 'Rejected',
    color: 'border-red-700/50 bg-red-900/20',
    dot: 'bg-red-400',
  },
};
