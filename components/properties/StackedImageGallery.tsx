
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getOptimizedImageUrl } from '../../utils/imageUtils';

interface StackedImageGalleryProps {
  images: string[];
  onImageClick: (index: number) => void;
  alt: string;
}

const StackedImageGallery: React.FC<StackedImageGalleryProps> = ({ images, onImageClick, alt }) => {
  if (!images || images.length === 0) {
    return null;
  }
  
  // The last image in the array will be on top by default
  const [activeIndex, setActiveIndex] = useState(images.length - 1);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Clean up RAF on unmount
  useEffect(() => {
      return () => {
          if (rafRef.current) {
              cancelAnimationFrame(rafRef.current);
          }
      };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const clientX = e.clientX;

    if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const width = rect.width;
        // Divide the container width into segments, one for each image
        const segmentWidth = width / images.length;
        const index = Math.floor(x / segmentWidth);
        
        if (index >= 0 && index < images.length) {
          setActiveIndex(index);
        }
    });
  }, [images.length]);

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
    }
    // Reset to the top-most image when the mouse leaves
    setActiveIndex(images.length - 1);
  }, [images.length]);

  // Generate a consistent random rotation for each image on mount
  const rotations = useRef(images.map(() => Math.random() * 4 - 2)).current;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-auto aspect-[4/3] cursor-pointer group watermarked"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => onImageClick(activeIndex)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onImageClick(activeIndex)}
      aria-label="Image gallery, click to open full view"
    >
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none z-20">
        <span className="text-white text-xl font-bold text-shadow">View Gallery</span>
      </div>
      {images.map((src, index) => {
        const isActive = index === activeIndex;
        // The further back the image, the more it is translated up
        const stackOffset = (images.length - 1 - index) * -8;

        return (
          <div
            key={src + index}
            className="absolute inset-0 w-full h-full transition-all duration-300 ease-out"
            style={{
              zIndex: isActive ? 10 : index,
              transform: `
                rotate(${isActive ? rotations[index] : 0}deg) 
                scale(${isActive ? 1.05 : 1}) 
                translateY(${isActive ? 0 : stackOffset}px)
              `,
              filter: isActive ? 'brightness(1)' : 'brightness(0.7)',
              clipPath: 'inset(0 0 0 0 round 0.75rem)', // for rounded corners on absolute children
            }}
          >
            <img
              src={getOptimizedImageUrl(src, 1200, 80)}
              alt={`${alt} - image ${index + 1}`}
              className="w-full h-full object-cover rounded-lg shadow-2xl"
              loading={index === images.length - 1 ? 'eager' : 'lazy'}
            />
          </div>
        );
      })}
    </div>
  );
};

export default StackedImageGallery;
