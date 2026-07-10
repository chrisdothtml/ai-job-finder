import { type ScraperSubclass } from './scraping/Scraper.ts';

export interface Company {
  name: string;
  scraper: string;
  homepage: string;
  summary: string;
}

export const companies: Record<string, Company> = {
  affirm: {
    name: 'Affirm',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.affirm.com',
    summary:
      'Buy-now-pay-later fintech that lets shoppers split purchases into installment payments at checkout.',
  },
  airbnb: {
    name: 'Airbnb',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.airbnb.com',
    summary:
      'Online marketplace for booking short-term stays and experiences from hosts around the world.',
  },
  airtable: {
    name: 'Airtable',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.airtable.com',
    summary:
      'No-code app platform that combines the ease of a spreadsheet with the power of a relational database.',
  },
  andurilindustries: {
    name: 'Anduril',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.anduril.com',
    summary:
      'Defense technology company building AI-powered autonomous systems — drones, sensors, and weapons — for the US and allied militaries. Its products are connected by Lattice, its AI command-and-control software platform.',
  },
  anthropic: {
    name: 'Anthropic',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.anthropic.com',
    summary:
      'AI safety and research company, and maker of the Claude family of large language models.',
  },
  applovin: {
    name: 'AppLovin',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.applovin.com',
    summary:
      'AI-driven marketing and monetization platform that helps mobile app developers grow, monetize, and advertise their apps.',
  },
  asana: {
    name: 'Asana',
    scraper: 'GreenhouseScraper',
    homepage: 'https://asana.com',
    summary:
      'Work management platform teams use to organize, track, and manage projects and tasks.',
  },
  asteralabs: {
    name: 'Astera Labs',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.asteralabs.com',
    summary:
      'Fabless semiconductor company making high-speed connectivity chips (PCIe, CXL, Ethernet) that remove data and memory bottlenecks in AI and cloud data centers.',
  },
  block: {
    name: 'Block',
    scraper: 'GreenhouseScraper',
    homepage: 'https://block.xyz',
    summary:
      'Fintech conglomerate (formerly Square) behind the Square seller platform, Cash App, Afterpay, TIDAL, and Bitkey.',
  },
  brex: {
    name: 'Brex',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.brex.com',
    summary:
      'Corporate cards and AI-powered spend management software for startups and enterprises.',
  },
  browserbase: {
    name: 'Browserbase',
    scraper: 'AshbyScraper',
    homepage: 'https://www.browserbase.com',
    summary:
      'Cloud infrastructure for running headless browsers at scale, powering web automation for AI agents and apps built with Playwright, Puppeteer, or Selenium.',
  },
  buildkite: {
    name: 'Buildkite',
    scraper: 'GreenhouseScraper',
    homepage: 'https://buildkite.com',
    summary:
      'CI/CD platform with a hybrid model: self-hosted build agents run on your own infrastructure, orchestrated by a managed cloud interface.',
  },
  calendly: {
    name: 'Calendly',
    scraper: 'GreenhouseScraper',
    homepage: 'https://calendly.com',
    summary:
      'Scheduling automation platform for booking meetings without the email back-and-forth.',
  },
  checkr: {
    name: 'Checkr',
    scraper: 'GreenhouseScraper',
    homepage: 'https://checkr.com',
    summary:
      'AI-powered background check and workforce screening platform used by companies like Uber, Lyft, and DoorDash.',
  },
  chime: {
    name: 'Chime',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.chime.com',
    summary:
      'Fee-free consumer banking app offering checking, savings, credit building, and early paycheck access through partner banks.',
  },
  clickhouse: {
    name: 'ClickHouse',
    scraper: 'AshbyScraper',
    homepage: 'https://clickhouse.com',
    summary:
      'Company behind ClickHouse, the open-source column-oriented OLAP database for real-time analytics, plus its managed ClickHouse Cloud offering.',
  },
  cloudflare: {
    name: 'Cloudflare',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.cloudflare.com',
    summary:
      'Global cloud network providing CDN, DDoS protection, DNS, zero-trust security, and edge computing (Workers).',
  },
  cockroachlabs: {
    name: 'Cockroach Labs',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.cockroachlabs.com',
    summary:
      'Maker of CockroachDB, a distributed SQL database built to survive failures and scale globally.',
  },
  cohere: {
    name: 'Cohere',
    scraper: 'AshbyScraper',
    homepage: 'https://cohere.com',
    summary:
      'Toronto-based enterprise AI company building large language models and security-first AI products for regulated industries and the public sector.',
  },
  coinbase: {
    name: 'Coinbase',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.coinbase.com',
    summary:
      'The largest US cryptocurrency exchange for buying, selling, and custodying digital assets.',
  },
  coreweave: {
    name: 'CoreWeave',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.coreweave.com',
    summary:
      'AI-focused cloud provider offering large-scale NVIDIA GPU infrastructure for training and inference, used by leading AI labs.',
  },
  coupang: {
    name: 'Coupang',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.coupang.com',
    summary:
      "South Korea's dominant e-commerce company, often called the 'Amazon of Asia', known for its Rocket Delivery logistics network. Also operates Coupang Eats, Coupang Play, and Farfetch.",
  },
  cursor: {
    name: 'Cursor',
    scraper: 'AshbyScraper',
    homepage: 'https://cursor.com',
    summary:
      'Maker of Cursor, the AI code editor and coding agent for building software with natural-language instructions.',
  },
  databricks: {
    name: 'Databricks',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.databricks.com',
    summary:
      'Data and AI platform built on the lakehouse architecture, unifying data engineering, analytics, and machine learning.',
  },
  datadog: {
    name: 'Datadog',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.datadoghq.com',
    summary:
      'Cloud observability and security platform for monitoring infrastructure, applications, and logs.',
  },
  discord: {
    name: 'Discord',
    scraper: 'GreenhouseScraper',
    homepage: 'https://discord.com',
    summary:
      'Voice, video, and text chat platform organized around community-run servers, especially popular with gamers.',
  },
  docker: {
    name: 'Docker',
    scraper: 'AshbyScraper',
    homepage: 'https://www.docker.com',
    summary:
      'Developer tools company behind the Docker container platform, Docker Desktop, and the Docker Hub image registry.',
  },
  doordashusa: {
    name: 'DoorDash',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.doordash.com',
    summary:
      'On-demand delivery marketplace for restaurant food, groceries, and retail goods.',
  },
  dropbox: {
    name: 'Dropbox',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.dropbox.com',
    summary:
      'Cloud file storage and sync service with document collaboration and e-signature tools.',
  },
  duolingo: {
    name: 'Duolingo',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.duolingo.com',
    summary:
      'Gamified learning app offering courses in 40+ languages, plus math, music, and chess.',
  },
  elastic: {
    name: 'Elastic',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.elastic.co',
    summary:
      'Company behind Elasticsearch and the Elastic Stack, providing search, observability, and security products.',
  },
  elevenlabs: {
    name: 'ElevenLabs',
    scraper: 'AshbyScraper',
    homepage: 'https://elevenlabs.io',
    summary:
      'AI audio company known for lifelike text-to-speech, voice cloning, and voice agents in 70+ languages.',
  },
  epicgames: {
    name: 'Epic Games',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.epicgames.com',
    summary:
      'Video game and software developer behind Fortnite, Unreal Engine, and the Epic Games Store.',
  },
  faire: {
    name: 'Faire',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.faire.com',
    summary:
      'Online wholesale marketplace connecting over 100,000 independent brands with local retailers worldwide.',
  },
  figma: {
    name: 'Figma',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.figma.com',
    summary:
      'Collaborative, browser-based design platform for UI/UX design, prototyping, and whiteboarding.',
  },
  flexport: {
    name: 'Flexport',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.flexport.com',
    summary:
      'Digital freight forwarder and logistics platform for managing global supply chains.',
  },
  github: {
    name: 'GitHub',
    scraper: 'GitHubScraper',
    homepage: 'https://github.com',
    summary:
      "The world's largest code hosting and collaboration platform, owned by Microsoft, with products like Actions and Copilot.",
  },
  gitlab: {
    name: 'GitLab',
    scraper: 'GreenhouseScraper',
    homepage: 'https://about.gitlab.com',
    summary:
      'DevSecOps platform delivering source control, CI/CD, and security scanning in a single application.',
  },
  google: {
    name: 'Google',
    scraper: 'GoogleScraper',
    homepage: 'https://www.google.com',
    summary:
      "Alphabet's core subsidiary spanning search, ads, Android, Chrome, YouTube, Google Cloud, and the Gemini AI models.",
  },
  gusto: {
    name: 'Gusto',
    scraper: 'GreenhouseScraper',
    homepage: 'https://gusto.com',
    summary:
      'Payroll, benefits, and HR platform for small and mid-sized businesses.',
  },
  instacart: {
    name: 'Instacart',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.instacart.com',
    summary:
      'Grocery delivery and pickup marketplace that also provides advertising and e-commerce technology to retailers.',
  },
  ionq: {
    name: 'IonQ',
    scraper: 'GreenhouseScraper',
    homepage: 'https://ionq.com',
    summary:
      'Publicly traded quantum computing company building trapped-ion quantum computers, accessible through the major cloud providers.',
  },
  lattice: {
    name: 'Lattice',
    scraper: 'GreenhouseScraper',
    homepage: 'https://lattice.com',
    summary:
      'AI-powered people platform for performance management, employee engagement, compensation, and HRIS.',
  },
  linear: {
    name: 'Linear',
    scraper: 'AshbyScraper',
    homepage: 'https://linear.app',
    summary:
      'Fast, keyboard-driven issue tracking and project management tool built for software teams.',
  },
  lyft: {
    name: 'Lyft',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.lyft.com',
    summary:
      'Rideshare platform offering on-demand rides, plus bike and scooter rentals, across North America.',
  },
  miro: {
    name: 'Miro',
    scraper: 'AshbyScraper',
    homepage: 'https://miro.com',
    summary:
      'Online collaborative whiteboard and innovation workspace for brainstorming, diagramming, and workshops.',
  },
  moderntreasury: {
    name: 'Modern Treasury',
    scraper: 'AshbyScraper',
    homepage: 'https://www.moderntreasury.com',
    summary:
      'Payment operations platform with APIs for money movement, reconciliation, and ledgering across bank rails and stablecoins.',
  },
  mongodb: {
    name: 'MongoDB',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.mongodb.com',
    summary:
      'Maker of the MongoDB document database and the managed MongoDB Atlas cloud service.',
  },
  mozilla: {
    name: 'Mozilla',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.mozilla.org',
    summary:
      'Non-profit-backed maker of the Firefox browser, championing an open and privacy-respecting internet.',
  },
  netease: {
    name: 'NetEase',
    scraper: 'AshbyScraper',
    homepage: 'https://www.neteasegames.com',
    summary:
      'Games division of Chinese internet giant NetEase, developing and publishing titles like Marvel Rivals and Naraka: Bladepoint through studios worldwide.',
  },
  netflix: {
    name: 'Netflix',
    scraper: 'NetflixScraper',
    homepage: 'https://www.netflix.com',
    summary:
      "The world's leading subscription streaming service for TV shows, films, and games.",
  },
  netlify: {
    name: 'Netlify',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.netlify.com',
    summary:
      'Web development platform for building, deploying, and hosting modern websites and web apps.',
  },
  notion: {
    name: 'Notion',
    scraper: 'AshbyScraper',
    homepage: 'https://www.notion.com',
    summary:
      'All-in-one AI workspace combining notes, docs, wikis, project management, and databases.',
  },
  nvidia: {
    name: 'NVIDIA',
    scraper: 'NvidiaScraper',
    homepage: 'https://www.nvidia.com',
    summary:
      'The dominant designer of GPUs and AI computing platforms, spanning data centers, gaming, and robotics.',
  },
  okta: {
    name: 'Okta',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.okta.com',
    summary:
      'Identity and access management platform providing SSO, MFA, and customer identity services.',
  },
  openai: {
    name: 'OpenAI',
    scraper: 'AshbyScraper',
    homepage: 'https://openai.com',
    summary:
      'AI research and product company behind ChatGPT and the GPT model family.',
  },
  pagerduty: {
    name: 'PagerDuty',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.pagerduty.com',
    summary:
      'Digital operations platform for on-call scheduling, alerting, and incident response.',
  },
  peloton: {
    name: 'Peloton',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.onepeloton.com',
    summary:
      'Connected fitness company selling bikes, treadmills, and rowers paired with subscription streaming workout classes.',
  },
  perplexity: {
    name: 'Perplexity',
    scraper: 'AshbyScraper',
    homepage: 'https://www.perplexity.ai',
    summary:
      'AI-powered answer engine that combines live web search with large language models to deliver cited, real-time answers.',
  },
  pinterest: {
    name: 'Pinterest',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.pinterest.com',
    summary:
      'Visual discovery platform where users find and save ideas for recipes, style, home design, and more.',
  },
  planetscale: {
    name: 'PlanetScale',
    scraper: 'GreenhouseScraper',
    homepage: 'https://planetscale.com',
    summary:
      'Managed database company, founded by the co-creators of Vitess, offering fast and scalable cloud hosting for MySQL/Vitess and Postgres.',
  },
  posthog: {
    name: 'PostHog',
    scraper: 'AshbyScraper',
    homepage: 'https://posthog.com',
    summary:
      'Open-source, all-in-one platform for product engineers: analytics, session replay, feature flags, experiments, and error tracking.',
  },
  purestorage: {
    name: 'Pure Storage',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.purestorage.com',
    summary:
      'Enterprise data storage company known for all-flash arrays and its Evergreen storage-as-a-service model.',
  },
  quora: {
    name: 'Quora',
    scraper: 'AshbyScraper',
    homepage: 'https://www.quora.com',
    summary:
      'Q&A knowledge-sharing platform; also builds Poe, a multi-model AI chat product.',
  },
  ramp: {
    name: 'Ramp',
    scraper: 'AshbyScraper',
    homepage: 'https://ramp.com',
    summary:
      'Finance automation platform combining corporate cards, expense management, accounts payable, procurement, and travel.',
  },
  reddit: {
    name: 'Reddit',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.reddit.com',
    summary:
      'Community-driven discussion platform made up of user-run forums (subreddits) covering nearly any topic.',
  },
  replit: {
    name: 'Replit',
    scraper: 'AshbyScraper',
    homepage: 'https://replit.com',
    summary:
      'Browser-based development platform where Replit Agent builds, runs, and deploys full apps from natural-language prompts.',
  },
  robinhood: {
    name: 'Robinhood',
    scraper: 'GreenhouseScraper',
    homepage: 'https://robinhood.com',
    summary:
      'Commission-free trading app for stocks, options, and crypto, plus retirement and banking products.',
  },
  roblox: {
    name: 'Roblox',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.roblox.com',
    summary:
      'Online platform and creation engine where users build, share, and play millions of user-generated 3D experiences.',
  },
  roku: {
    name: 'Roku',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.roku.com',
    summary:
      'TV streaming platform company making streaming players, the Roku TV operating system, and an ad-supported content business.',
  },
  runway: {
    name: 'Runway',
    scraper: 'AshbyScraper',
    homepage: 'https://runwayml.com',
    summary:
      'Generative AI research company building state-of-the-art video generation models (the Gen series) and world models for creative media production.',
  },
  samsara: {
    name: 'Samsara',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.samsara.com',
    summary:
      'IoT company behind the Connected Operations platform, providing fleet telematics, video safety, and equipment monitoring for physical industries.',
  },
  scaleai: {
    name: 'Scale AI',
    scraper: 'GreenhouseScraper',
    homepage: 'https://scale.com',
    summary:
      'AI data foundry providing training-data labeling, evaluation, and full-stack AI solutions for frontier labs, enterprises, and governments.',
  },
  shopify: {
    name: 'Shopify',
    scraper: 'ShopifyScraper',
    homepage: 'https://www.shopify.com',
    summary:
      'Commerce platform powering millions of online stores and retail point-of-sale systems worldwide.',
  },
  sierra: {
    name: 'Sierra',
    scraper: 'AshbyScraper',
    homepage: 'https://sierra.ai',
    summary:
      'AI startup founded by Bret Taylor and Clay Bavor that builds conversational customer-service AI agents for enterprises like SoFi, Discord, and ADT.',
  },
  snowflake: {
    name: 'Snowflake',
    scraper: 'AshbyScraper',
    homepage: 'https://www.snowflake.com',
    summary:
      'Cloud-based AI Data Cloud platform for data warehousing, analytics, applications, and AI, running across AWS, Azure, and GCP.',
  },
  sofi: {
    name: 'SoFi',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.sofi.com',
    summary:
      'Digital personal finance company offering banking, lending, and investing, plus the Galileo fintech infrastructure platform.',
  },
  spotify: {
    name: 'Spotify',
    scraper: 'LeverScraper',
    homepage: 'https://www.spotify.com',
    summary:
      "The world's largest audio streaming service for music, podcasts, and audiobooks.",
  },
  squarespace: {
    name: 'Squarespace',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.squarespace.com',
    summary:
      'Website builder and e-commerce platform for creating professional sites without code.',
  },
  stripe: {
    name: 'Stripe',
    scraper: 'GreenhouseScraper',
    homepage: 'https://stripe.com',
    summary:
      'Payments infrastructure company whose APIs power online commerce for millions of businesses.',
  },
  supabase: {
    name: 'Supabase',
    scraper: 'AshbyScraper',
    homepage: 'https://supabase.com',
    summary:
      'Open-source Firebase alternative: a Postgres development platform with built-in auth, storage, realtime, and edge functions.',
  },
  tailscale: {
    name: 'Tailscale',
    scraper: 'GreenhouseScraper',
    homepage: 'https://tailscale.com',
    summary:
      'Zero-config mesh VPN built on WireGuard for securely connecting devices, servers, and cloud networks.',
  },
  temporaltechnologies: {
    name: 'Temporal',
    scraper: 'GreenhouseScraper',
    homepage: 'https://temporal.io',
    summary:
      'Company behind the open-source Temporal durable-execution platform, which guarantees workflows resume exactly where they left off after any failure.',
  },
  twilio: {
    name: 'Twilio',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.twilio.com',
    summary:
      'Cloud communications platform with APIs for SMS, voice, email (SendGrid), and customer engagement.',
  },
  twitch: {
    name: 'Twitch',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.twitch.tv',
    summary:
      'Amazon-owned live streaming platform centered on video games and interactive content.',
  },
  vanta: {
    name: 'Vanta',
    scraper: 'AshbyScraper',
    homepage: 'https://www.vanta.com',
    summary:
      'Trust management platform that automates security compliance (SOC 2, ISO 27001, HIPAA) with continuous monitoring.',
  },
  vercel: {
    name: 'Vercel',
    scraper: 'GreenhouseScraper',
    homepage: 'https://vercel.com',
    summary:
      'Frontend cloud platform, and creator of Next.js, for building and deploying web applications.',
  },
  waymo: {
    name: 'Waymo',
    scraper: 'GreenhouseScraper',
    homepage: 'https://waymo.com',
    summary:
      "Alphabet's autonomous driving company, operating fully driverless ride-hailing services in US cities.",
  },
  webflow: {
    name: 'Webflow',
    scraper: 'GreenhouseScraper',
    homepage: 'https://webflow.com',
    summary:
      'Visual web development platform for designing, building, and hosting production websites without writing code.',
  },
  xai: {
    name: 'xAI',
    scraper: 'GreenhouseScraper',
    homepage: 'https://x.ai',
    summary:
      'AI company behind the Grok chatbot and model family; rebranded SpaceXAI in 2026 as a subsidiary of SpaceX.',
  },
  zapier: {
    name: 'Zapier',
    scraper: 'AshbyScraper',
    homepage: 'https://zapier.com',
    summary:
      "No-code automation platform connecting 9,000+ apps through automated workflows ('Zaps'), plus AI agents and orchestration tools.",
  },
  zscaler: {
    name: 'Zscaler',
    scraper: 'GreenhouseScraper',
    homepage: 'https://www.zscaler.com',
    summary:
      'Cloud security company providing zero-trust network access and secure web gateway services.',
  },
} as const;

export async function getScraper(name: string): Promise<ScraperSubclass> {
  switch (name) {
    case 'AshbyScraper':
      return import('./scraping/AshbyScraper.ts').then((e) => e.default);
    case 'GitHubScraper':
      return import('./scraping/GitHubScraper.ts').then((e) => e.default);
    case 'GreenhouseScraper':
      return import('./scraping/GreenhouseScraper.ts').then((e) => e.default);
    case 'LeverScraper':
      return import('./scraping/LeverScraper.ts').then((e) => e.default);
    case 'NetflixScraper':
      return import('./scraping/NetflixScraper.ts').then((e) => e.default);
    case 'GoogleScraper':
      return import('./scraping/GoogleScraper.ts').then((e) => e.default);
    case 'NvidiaScraper':
      return import('./scraping/NvidiaScraper.ts').then((e) => e.default);
    case 'ShopifyScraper':
      return import('./scraping/ShopifyScraper.ts').then((e) => e.default);
    default:
      throw new Error(`Unknown scraper: ${name}`);
  }
}
