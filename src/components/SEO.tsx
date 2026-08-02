import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  /** Falls back to the site-wide description (same text as index.html). */
  description?: string;
  type?: 'article' | 'website';
  image?: string;
  url?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  /** When true, ask crawlers not to index this page (admin/utility surfaces). */
  noindex?: boolean;
}

const SITE_NAME = "Dika Gustiana";
const DEFAULT_IMAGE = '/logo.png';

export function SEO({
  title,
  description = 'Finance, accounting, and green transition economics. Research and analysis by Dika Gustiana.',
  type = 'website',
  image = DEFAULT_IMAGE,
  url,
  author,
  publishedTime,
  modifiedTime,
  noindex = false,
}: SEOProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const truncatedDescription = description.length > 160
    ? description.substring(0, 157) + '...'
    : description;
  // Canonicalise to origin + path (no query/hash) when no explicit url is given.
  const canonicalUrl =
    url ?? (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : undefined);

  const jsonLd = type === 'article' ? {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: truncatedDescription,
    image,
    author: author ? {
      '@type': 'Person',
      name: author,
    } : undefined,
    datePublished: publishedTime,
    dateModified: modifiedTime || publishedTime,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
  } : {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    description: truncatedDescription,
  };

  return (
    <Helmet>
      {/* Basic */}
      <title>{fullTitle}</title>
      <meta name="description" content={truncatedDescription} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={truncatedDescription} />
      <meta property="og:image" content={image} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={truncatedDescription} />
      <meta name="twitter:image" content={image} />

      {/* Article specific */}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}
      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}

      {/* JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </Helmet>
  );
}
