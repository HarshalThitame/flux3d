import type {MetadataRoute} from 'next'
import {getSettings} from '@/lib/settings'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const settings = await getSettings()
    return {
        name: settings.businessName || 'Flux3D',
        short_name: settings.brandName || settings.businessName || 'Flux3D',
        description: settings.businessDescription || '3D printing, rapid prototyping, resin printing, and custom CAD support across India.',
        start_url: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#7C5CFF',
        icons: [
            {
                src: settings.faviconUrl,
                sizes: 'any',
                type: 'image/x-icon',
            },
        ],
    }
}
