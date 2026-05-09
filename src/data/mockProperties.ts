export interface PropertyMedia {
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
}

export interface PropertyRecord {
  id: string;
  title: string;
  area: string;
  latitude: number;
  longitude: number;
  rent: number;
  rooms: number;
  details: string;
  media: PropertyMedia[];
}

const SAMPLE_VIDEO =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
const SAMPLE_VIDEO_THUMB =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg';

const SAMPLE_VIDEO_2 =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
const SAMPLE_VIDEO_2_THUMB =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg';

function unsplash(id: string): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;
}

export const mockProperties: PropertyRecord[] = [
  {
    id: 'prop-001',
    title: 'Sunlit Studio near Metro',
    area: 'HSR Layout',
    latitude: 12.9132,
    longitude: 77.6411,
    rent: 18000,
    rooms: 1,
    details: 'Furnished studio with balcony, power backup, and elevator access.',
    media: [
      { type: 'photo', url: unsplash('photo-1502672260266-1c1ef2d93688') },
      { type: 'photo', url: unsplash('photo-1505691938895-1758d7feb511') },
      { type: 'photo', url: unsplash('photo-1493809842364-78817add7ffb') },
      {
        type: 'video',
        url: SAMPLE_VIDEO,
        thumbnailUrl: SAMPLE_VIDEO_THUMB,
      },
    ],
  },
  {
    id: 'prop-002',
    title: '2BHK Family Home',
    area: 'HSR Layout',
    latitude: 12.9094,
    longitude: 77.6382,
    rent: 28000,
    rooms: 2,
    details: 'Well-ventilated 2BHK with modular kitchen and covered parking.',
    media: [
      { type: 'photo', url: unsplash('photo-1560448204-e02f11c3d0e2') },
      { type: 'photo', url: unsplash('photo-1484154218962-a197022b5858') },
      { type: 'photo', url: unsplash('photo-1522708323590-d24dbb6b0267') },
      {
        type: 'video',
        url: SAMPLE_VIDEO_2,
        thumbnailUrl: SAMPLE_VIDEO_2_THUMB,
      },
    ],
  },
  {
    id: 'prop-003',
    title: '3BHK Corner Apartment',
    area: 'Koramangala',
    latitude: 12.9352,
    longitude: 77.6245,
    rent: 42000,
    rooms: 3,
    details: 'Premium gated apartment with clubhouse, gym, and children play area.',
    media: [
      { type: 'photo', url: unsplash('photo-1545324418-cc1a3fa10c00') },
      { type: 'photo', url: unsplash('photo-1600585154340-be6161a56a0c') },
      { type: 'photo', url: unsplash('photo-1502005229762-cf1b2da7c5d6') },
      {
        type: 'video',
        url: SAMPLE_VIDEO,
        thumbnailUrl: SAMPLE_VIDEO_THUMB,
      },
    ],
  },
  {
    id: 'prop-004',
    title: 'Compact 1RK for Professionals',
    area: 'Indiranagar',
    latitude: 12.9712,
    longitude: 77.6408,
    rent: 14000,
    rooms: 1,
    details: 'Ideal for single occupants with quick access to offices and cafes.',
    media: [
      { type: 'photo', url: unsplash('photo-1556909114-f6e7ad7d3136') },
      { type: 'photo', url: unsplash('photo-1554995207-c18c203602cb') },
    ],
  },
  {
    id: 'prop-005',
    title: '2BHK Near Tech Park',
    area: 'Bellandur',
    latitude: 12.9261,
    longitude: 77.6762,
    rent: 31000,
    rooms: 2,
    details: 'Semi-furnished apartment close to ORR tech corridor.',
    media: [
      { type: 'photo', url: unsplash('photo-1568605114967-8130f3a36994') },
      { type: 'photo', url: unsplash('photo-1493809842364-78817add7ffb') },
      {
        type: 'video',
        url: SAMPLE_VIDEO_2,
        thumbnailUrl: SAMPLE_VIDEO_2_THUMB,
      },
    ],
  },
];
