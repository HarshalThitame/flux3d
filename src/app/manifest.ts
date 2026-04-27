import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Flux3D',
    short_name: 'Flux3D',
    description:
      '3D printing, rapid prototyping, resin printing, and custom CAD support across India.',
    start_url: '/',
    display: 'standalone',
    background_color: '#050810',
    theme_color: '#050810',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
