import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/report'],
        },
        sitemap: 'https://abiturcheck.de/sitemap.xml',
    };
}
