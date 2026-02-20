import { MetadataRoute } from 'next';

const BASE_URL = 'https://abiturcheck.de';

export default function sitemap(): MetadataRoute.Sitemap {
    const locales = ['en', 'de'];
    const pages = ['', '/setup', '/auth/login'];

    const entries: MetadataRoute.Sitemap = [];

    for (const locale of locales) {
        for (const page of pages) {
            entries.push({
                url: `${BASE_URL}/${locale}${page}`,
                lastModified: new Date(),
                changeFrequency: page === '' ? 'weekly' : 'monthly',
                priority: page === '' ? 1.0 : 0.7,
            });
        }
    }

    return entries;
}
