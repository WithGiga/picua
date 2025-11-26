'use client';
import { useEffect, useState } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';

export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true);
  const [animationError, setAnimationError] = useState(false);

  useEffect(() => {
    // Hide preloader after page fully loads with minimum display time
    const minDisplayTime = 3000; // 3.5 seconds minimum
    const startTime = Date.now();

    const handleLoad = () => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      
      setTimeout(() => {
        setIsLoading(false);
      }, remainingTime);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-[9999] transition-opacity duration-700">
      <div className="flex flex-col items-center">
        {!animationError ? (
          <Player
            autoplay
            loop
            src="/Picua V2.json"
            style={{ 
              height: '800px', 
              width: '800px',
              maxWidth: '90vw',
              maxHeight: '50vh'
            }}
            onEvent={(event) => {
              console.log('Lottie event:', event);
            }}
            onError={() => {
              console.error('Lottie animation failed to load');
              setAnimationError(true);
            }}
          />
        ) : (
          // Fallback spinner if Lottie fails
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
        

      </div>
    </div>
  );
}
