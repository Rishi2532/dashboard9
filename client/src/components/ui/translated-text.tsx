import React, { ReactNode } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';

interface TranslatedTextProps {
  children: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function TranslatedText({ 
  children, 
  className, 
  as: Component = 'span' 
}: TranslatedTextProps) {
  const { translate, translationEnabled } = useTranslation();
  
  // If translation is disabled, just render the children
  if (!translationEnabled) {
    return <Component className={className}>{children}</Component>;
  }
  
  // Translate the text
  const translatedText = translate(children);
  
  return (
    <Component className={className}>
      {translatedText}
    </Component>
  );
}

// Function wrapper for convenient use in places where JSX is not ideal
export function t(text: string): string {
  const { translate, translationEnabled } = useTranslation();
  if (!translationEnabled) return text;
  return translate(text);
}