import { companies } from '../analysis/companies.ts';
import type { AnalyzedJob } from '../analysis/manager.ts';
import type { CompanyInfo } from '../ui/Jobs/JobCard.tsx';

/**
 * These are kept in a separate file so that the docs build
 * process can import them (e.g. for pre-fetching company favicons)
 */
export const MOCK_JOBS: MockJob[] = [
  mockJob('netflix', {
    title: 'Senior Software Engineer, UI Foundations',
    location: 'Remote, US',
    fitScore: 0.93,
    pros: 'Fully remote, deep design-systems work that lines up with your frontend background, and comp is listed right in the posting.',
    cons: 'Mentions an on-call rotation for platform services.',
  }),
  mockJob('github', {
    title: 'Software Engineer III, Actions',
    location: 'Hybrid — San Francisco, CA',
    fitScore: 0.9,
    pros: 'A strong match for your developer tooling background.',
    cons: `Doesn't match your remote preference, but you did mention openness to hybrid if it's not too far away (~5 miles away).`,
  }),
  mockJob('shopify', {
    title: 'Staff Frontend Engineer, Checkout',
    location: 'Remote, Americas',
    fitScore: 0.86,
    pros: 'High-ownership role on a product surface you already know well; strong remote culture.',
    cons: 'Wants recent Ruby exposure, which your resume only touches briefly.',
  }),
  mockJob('mozilla', {
    title: 'Senior Platform Engineer',
    location: 'Remote, US',
    fitScore: 0.7,
    pros: 'Mission-driven org, remote-first, and the systems work overlaps with your tooling experience.',
    cons: 'More C++ than you have asked for; team is spread across EU-heavy time zones.',
  }),
];

interface MockJob {
  job: AnalyzedJob;
  company: CompanyInfo;
}

function mockJob(
  companySlug: string,
  job: Omit<AnalyzedJob, 'id' | 'url' | 'companyName'>
): MockJob {
  const company = companies[companySlug];
  if (!company) throw new Error(`unknown company slug: ${companySlug}`);

  return {
    company: {
      ...company,
      slug: companySlug,
      faviconSrc: `./assets/favicons/${companySlug}.png`,
    },
    job: {
      ...job,
      id: companySlug,
      url: '',
      companyName: company.name,
    },
  };
}
