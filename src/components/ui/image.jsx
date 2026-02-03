import React from 'react';
import { getImageUrl } from '@/lib/imageUtils';

/**
 * Componente Image que automaticamente aplica o getImageUrl para gerar URLs completas
 */
const Image = React.forwardRef(({ src, alt, className, ...props }, ref) => {
  const imageUrl = getImageUrl(src);
  
  return (
    <img
      ref={ref}
      src={imageUrl}
      alt={alt}
      className={className}
      {...props}
    />
  );
});

Image.displayName = 'Image';

export { Image }; 