import React from 'react';
import { useTranslation, languageNames, Language } from '@/contexts/TranslationContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function LanguageSelector() {
  const { language, setLanguage, translationEnabled, toggleTranslation } = useTranslation();

  const handleLanguageChange = (value: string) => {
    setLanguage(value as Language);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="translation-toggle" className="text-sm">Enable Translation</Label>
        <Switch
          id="translation-toggle"
          checked={translationEnabled}
          onCheckedChange={toggleTranslation}
        />
      </div>
      
      {translationEnabled && (
        <div className="mt-2">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(languageNames).map(([code, name]) => (
                <SelectItem key={code} value={code}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export function LanguageSelectorMinimal() {
  const { language, setLanguage, translationEnabled, toggleTranslation } = useTranslation();

  const handleLanguageChange = (value: string) => {
    setLanguage(value as Language);
  };

  return (
    <div className="flex items-center gap-2">
      <Switch
        id="translation-toggle-minimal"
        checked={translationEnabled}
        onCheckedChange={toggleTranslation}
        className="h-4 w-7"
      />
      
      {translationEnabled && (
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger className="h-7 text-xs w-28 bg-blue-50">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(languageNames).map(([code, name]) => (
              <SelectItem key={code} value={code} className="text-xs">
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}