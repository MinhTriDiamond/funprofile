import React, { memo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'pill' | 'icon' | 'full';
}

const LanguageSwitcher = memo(({ className, variant = 'pill' }: LanguageSwitcherProps) => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'vi' : 'en');
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleLanguage}
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full",
          "bg-card hover:bg-primary/10 border border-border",
          "transition-all duration-300",
          "hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]",
          className
        )}
        aria-label={`Switch to ${language === 'en' ? 'Vietnamese' : 'English'}`}
        title={language === 'en' ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
      >
        <Globe className="w-5 h-5 text-primary" />
        <span className="absolute -bottom-1 -right-1 text-xs font-bold text-primary">
          {language.toUpperCase()}
        </span>
      </button>
    );
  }

  if (variant === 'full') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Globe className="w-4 h-4 text-muted-foreground" />
        <button
          onClick={() => setLanguage('en')}
          className={cn(
            "px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300",
            language === 'en' 
              ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          EN
        </button>
        <button
          onClick={() => setLanguage('vi')}
          className={cn(
            "px-3 py-1 rounded-lg text-sm font-medium transition-all duration-300",
            language === 'vi' 
              ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          VI
        </button>
      </div>
    );
  }

  // Default: pill variant
  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-card hover:bg-primary/10 border-2 border-yellow-400/50",
        "transition-all duration-300",
        "hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(250,204,21,0.4)]",
        "text-sm font-semibold",
        className
      )}
      aria-label={`Switch to ${language === 'en' ? 'Vietnamese' : 'English'}`}
      title={language === 'en' ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
    >
      <Globe className="w-4 h-4 text-primary" />
      <span className={cn(
        "transition-all duration-300",
        language === 'en' ? "text-primary" : "text-muted-foreground"
      )}>
        EN
      </span>
      <span className="text-muted-foreground">/</span>
      <span className={cn(
        "transition-all duration-300",
        language === 'vi' ? "text-primary" : "text-muted-foreground"
      )}>
        VI
      </span>
    </button>
  );
});

LanguageSwitcher.displayName = 'LanguageSwitcher';

export default LanguageSwitcher;
