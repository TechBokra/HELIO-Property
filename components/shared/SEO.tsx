import React, { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
}

const SEO: React.FC<SEOProps> = ({ title, description, imageUrl, url }) => {
  useEffect(() => {
    // Set document title
    document.title = title;

    // Function to set or create a meta tag
    const setMetaTag = (attr: 'name' | 'property', value: string, content: string) => {
      let element = document.querySelector(`meta[${attr}='${value}']`) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, value);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMetaTag('name', 'description', description);

    // Open Graph tags
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:type', 'website');
    if (url) {
      setMetaTag('property', 'og:url', url);
    }
    if (imageUrl) {
      setMetaTag('property', 'og:image', imageUrl);
    }

    // Twitter Card tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    if (imageUrl) {
      setMetaTag('name', 'twitter:image', imageUrl);
    }

  }, [title, description, imageUrl, url]);

  return null;
};

export default SEO;
