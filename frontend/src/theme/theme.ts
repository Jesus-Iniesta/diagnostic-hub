import { createTheme } from '@mantine/core';

export const dashboardColors = {
  sidebar: '#1C1954',
  sidebarActive: '#4F46E5',

  background: '#F7F8FC',
  card: '#FFFFFF',

  textPrimary: '#17153B',
  textSecondary: '#667085',

  blue: '#2563EB',
  blueLight: '#E8F1FF',

  green: '#2E9B62',
  greenLight: '#E7F7EF',

  orange: '#F59E0B',
  orangeLight: '#FFF3D8',

  purple: '#7C3AED',
  purpleLight: '#F1E8FF',

  red: '#EF3E55',
  redLight: '#FFE8EC',

  border: '#E8EAF0',
} as const;

export const theme = createTheme({
  primaryColor: 'brand',
  fontFamily: 'Inter, sans-serif',
  defaultRadius: 'md',
  colors: {
    brand: [
      '#E8F5EF',
      '#D3ECDF',
      '#B6DFC9',
      '#97D1B2',
      '#76C29A',
      '#53B282',
      '#2FA16A',
      '#118F55',
      '#006B49',
      '#00563B',
    ],
    professor: [
      '#EAF4FB',
      '#D2E8F6',
      '#B7DAF0',
      '#98C9E7',
      '#76B6DE',
      '#50A2D3',
      '#248EC8',
      '#0D7CBB',
      '#0066A8',
      '#00548A',
    ],
  },
});