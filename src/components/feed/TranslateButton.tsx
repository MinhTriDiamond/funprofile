import { useState, useCallback } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { linkifyText } from '@/utils/linkifyText';

interface TranslateButtonProps {
  content: string;
  className?: string;
}

type DetectedLang = 'vi' | 'en' | 'zh' | 'ja' | 'ko' | 'ru' | 'ar' | 'th' | 'hi' | 'unknown';

function detectLanguage(text: string): DetectedLang {
  // Remove URLs, mentions, hashtags for cleaner detection
  const clean = text.replace(/https?:\/\/\S+/g, '').replace(/[@#]\w+/g, '').trim();
  if (!clean) return 'unknown';

  const totalChars = clean.replace(/[\s\d\p{P}\p{S}]/gu, '').length;
  if (totalChars < 3) return 'unknown';

  // Vietnamese diacritics
  const viChars = (clean.match(/[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/gi) || []).length;
  if (viChars / totalChars > 0.05) return 'vi';

  // CJK
  const cjk = (clean.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  if (cjk / totalChars > 0.2) return 'zh';

  // Japanese (Hiragana/Katakana)
  const jp = (clean.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  if (jp / totalChars > 0.1) return 'ja';

  // Korean
  const kr = (clean.match(/[\uac00-\ud7af\u1100-\u11ff]/g) || []).length;
  if (kr / totalChars > 0.2) return 'ko';

  // Cyrillic
  const ru = (clean.match(/[\u0400-\u04ff]/g) || []).length;
  if (ru / totalChars > 0.3) return 'ru';

  // Arabic
  const ar = (clean.match(/[\u0600-\u06ff]/g) || []).length;
  if (ar / totalChars > 0.3) return 'ar';

  // Thai
  const th = (clean.match(/[\u0e00-\u0e7f]/g) || []).length;
  if (th / totalChars > 0.3) return 'th';

  // Devanagari (Hindi)
  const hi = (clean.match(/[\u0900-\u097f]/g) || []).length;
  if (hi / totalChars > 0.3) return 'hi';

  // Default Latin = English
  return 'en';
}

export const TranslateButton = ({ content, className }: TranslateButtonProps) => {
  const { language, t } = useLanguage();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [error, setError] = useState(false);

  const detectedLang = detectLanguage(content);

  // Don't show button if same language or can't detect
  const shouldShow = detectedLang !== 'unknown' && detectedLang !== language;
  
  const handleTranslate = useCallback(async () => {
    if (translatedText) {
      setShowTranslation(prev => !prev);
      return;
    }

    setIsTranslating(true);
    setError(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('translate-post', {
        body: { text: content, targetLanguage: language },
      });

      if (fnError) throw fnError;
      if (data?.translatedText) {
        setTranslatedText(data.translatedText);
        setShowTranslation(true);
      } else {
        throw new Error('No translation returned');
      }
    } catch (e) {
      console.error('Translation error:', e);
      setError(true);
    } finally {
      setIsTranslating(false);
    }
  }, [content, language, translatedText]);

  if (!shouldShow) return null;

  return (
    <div className={cn("mt-1", className)}>
      <button
        onClick={handleTranslate}
        disabled={isTranslating}
        className={cn(
          "inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors",
          "text-muted-foreground hover:text-foreground",
          "disabled:opacity-50 select-none touch-manipulation min-h-[32px]"
        )}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {isTranslating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Globe className="w-3.5 h-3.5" />
        )}
        {isTranslating
          ? t('translating')
          : error
            ? t('translationError')
            : showTranslation
              ? t('hideTranslation')
              : t('seeTranslation')
        }
      </button>

      {showTranslation && translatedText && (
        <div className="mt-2 pl-3 border-l-2 border-primary/30 bg-muted/30 rounded-r-md py-2 pr-3">
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground/90">
            {linkifyText(translatedText)}
          </p>
        </div>
      )}
    </div>
  );
};
