import React, { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
  canonicalUrl?: string;
  structuredData?: Record<string, any>;
}

const SEO: React.FC<SEOProps> = ({ 
  title, 
  description, 
  imageUrl, 
  url, 
  canonicalUrl, 
  structuredData 
}) => {
  useEffect(() => {
    // Set document title
    document.title = title;

    // Helper to set or create meta tag
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
    const effectiveUrl = url || canonicalUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (effectiveUrl) {
      setMetaTag('property', 'og:url', effectiveUrl);
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

    // Canonical link tag
    if (effectiveUrl) {
      let linkElement = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
      if (!linkElement) {
        linkElement = document.createElement('link');
        linkElement.setAttribute('rel', 'canonical');
        document.head.appendChild(linkElement);
      }
      linkElement.setAttribute('href', effectiveUrl);
    }

    // JSON-LD Structured Data script
    let scriptElement = document.getElementById('seo-structured-data') as HTMLScriptElement;
    if (structuredData) {
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.id = 'seo-structured-data';
        scriptElement.type = 'application/ld+json';
        document.head.appendChild(scriptElement);
      }
      scriptElement.textContent = JSON.stringify(structuredData);
    } else if (scriptElement) {
      scriptElement.remove();
    }

  }, [title, description, imageUrl, url, canonicalUrl, structuredData]);

  return null;
};

export default SEO;
