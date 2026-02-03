import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  type?: 'article' | 'website';
  image?: string;
  url?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

const SITE_NAME = "Dika's Digital Studio";
const DEFAULT_IMAGE = '/logo.png';

export function SEO({
  title,
  description,
  type = 'website',
  image = DEFAULT_IMAGE,
  url,
  author,
  publishedTime,
  modifiedTime,
}: SEOProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const truncatedDescription = description.length > 160 
    ? description.substring(0, 157) + '...' 
    : description;

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

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={truncatedDescription} />
      <meta property="og:image" content={image} />
      {url && <meta property="og:url" content={url} />}
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
