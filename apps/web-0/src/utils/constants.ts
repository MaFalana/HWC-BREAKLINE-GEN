export const GRID_SPACING_OPTIONS = [
  { label: '25 feet', value: 25 as const },
  { label: '50 feet', value: 50 as const },
  // Add more options here in the future if needed
];

export const OUTPUT_FORMATS = [
  { label: 'DXF', value: 'dxf', selected: true },
  { label: 'CSV', value: 'csv', selected: false },
] as const;

export const INDIANA_LIDAR_INFO = {
  title: 'Indiana Statewide LiDAR Reference',
  references: [
    { name: 'NAD83(HARN) / Indiana East (ftUS)', epsg: 'EPSG:2967' },
    { name: 'NAD83(HARN) / Indiana West (ftUS)', epsg: 'EPSG:2968' },
  ],
};

export const LIDAR_SOURCE_INFO = {
  title: 'LiDAR Data Source',
  description: 'LiDAR Data hosted by iDiF @ Purdue',
  url: 'https://lidar.digitalforestry.org',
};

export const FILE_EXTENSIONS = {
  allowed: ['.las', '.laz'],
  mimeTypes: ['application/octet-stream', 'application/las', 'application/laz'],
};