
import React, { useState, useEffect } from 'react';
import { ArrowUpIcon } from './Icons';
import { Button } from './Button';

const BackToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <>
      {isVisible && (
        <Button
          onClick={scrollToTop}
          variant="primary"
          size="icon"
          className="fixed bottom-6 left-6 md:bottom-8 md:left-8 z-[900] rounded-full shadow-xl transform hover:scale-110 transition-all duration-300 border-2 border-white dark:border-gray-800"
          aria-label="Go to top"
        >
          <ArrowUpIcon className="h-6 w-6" />
        </Button>
      )}
    </>
  );
};

export default BackToTopButton;
