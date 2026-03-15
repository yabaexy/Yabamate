import { Creator } from './types';

export const MOCK_CREATORS: Creator[] = [
  {
    id: '1',
    address: '0x1234567890123456789012345678901234567890',
    name: 'Crypto Artist X',
    bio: 'Creating unique digital art and NFTs for the decentralized world.',
    avatarUrl: 'https://picsum.photos/seed/artist1/200/200',
    coverUrl: 'https://picsum.photos/seed/cover1/1200/400',
    category: 'Art',
    condition: 'Verified',
    tiers: [
      {
        id: 't1',
        name: 'Supporter',
        price: 10,
        period: 'Monthly',
        description: 'Basic support for my creative journey.',
        benefits: ['Discord access', 'Early previews'],
      },
      {
        id: 't2',
        name: 'Collector',
        price: 50,
        period: 'Monthly',
        description: 'For serious art lovers.',
        benefits: ['Monthly NFT drop', 'High-res downloads', 'Discord access'],
      },
    ],
  },
  {
    id: '2',
    address: '0x0987654321098765432109876543210987654321',
    name: 'DeFi Educator',
    bio: 'Simplifying complex DeFi concepts for everyone.',
    avatarUrl: 'https://picsum.photos/seed/educator/200/200',
    coverUrl: 'https://picsum.photos/seed/cover2/1200/400',
    category: 'Education',
    condition: 'Trending',
    tiers: [
      {
        id: 't3',
        name: 'Student',
        price: 5,
        period: 'Monthly',
        description: 'Access to basic tutorials.',
        benefits: ['Weekly newsletter', 'Q&A access'],
      },
      {
        id: 't4',
        name: 'Master',
        price: 25,
        period: 'Monthly',
        description: 'Advanced DeFi strategies.',
        benefits: ['Private webinars', 'Strategy sheets', 'Weekly newsletter'],
      },
    ],
  },
];
