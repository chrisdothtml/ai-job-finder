interface TechCompany {
  name: string;
  board: 'lever' | 'greenhouse' | 'unknown';
  slug: string;
}

export const companies: TechCompany[] = [
  { name: 'Airbnb', board: 'greenhouse', slug: 'airbnb' },
  { name: 'AppLovin', board: 'greenhouse', slug: 'applovin' },
  { name: 'Astera Labs', board: 'greenhouse', slug: 'asteralabs' },
  { name: 'Block', board: 'greenhouse', slug: 'block' },
  { name: 'Cloudflare', board: 'greenhouse', slug: 'cloudflare' },
  { name: 'Coinbase', board: 'greenhouse', slug: 'coinbase' },
  { name: 'CoreWeave', board: 'greenhouse', slug: 'coreweave' },
  { name: 'Coupang', board: 'greenhouse', slug: 'coupang' },
  { name: 'Datadog', board: 'greenhouse', slug: 'datadog' },
  { name: 'IonQ', board: 'greenhouse', slug: 'ionq' },
  { name: 'MongoDB', board: 'greenhouse', slug: 'mongodb' },
  { name: 'Palantir', board: 'lever', slug: 'palantir' },
  { name: 'Pure Storage', board: 'greenhouse', slug: 'purestorage' },
  { name: 'Reddit', board: 'greenhouse', slug: 'reddit' },
  { name: 'Robinhood', board: 'greenhouse', slug: 'robinhood' },
  { name: 'Roku', board: 'greenhouse', slug: 'roku' },
  { name: 'Samsara', board: 'greenhouse', slug: 'samsara' },
  { name: 'SoFi', board: 'greenhouse', slug: 'sofi' },
  { name: 'Spotify', board: 'lever', slug: 'spotify' },
  { name: 'Twilio', board: 'greenhouse', slug: 'twilio' },
  { name: 'Zscaler', board: 'greenhouse', slug: 'zscaler' },
];
