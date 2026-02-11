import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const GUEST_PROMPT_DISMISSED_KEY = 'guest_prompt_dismissed_at';
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h

export const useGuestPrompt = () => {
  const [isGuest, setIsGuest] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [triggerSource, setTriggerSource] = useState<'scroll' | 'interaction'>('scroll');
  const hasShownScroll = useRef(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsGuest(!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsGuest(!session);
      if (session) setShowPrompt(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Scroll/time trigger
  useEffect(() => {
    if (!isGuest || hasShownScroll.current) return;

    const dismissed = localStorage.getItem(GUEST_PROMPT_DISMISSED_KEY);
    if (dismissed && Date.now() - parseInt(dismissed) < DISMISS_COOLDOWN_MS) return;

    const timer = setTimeout(() => {
      if (!hasShownScroll.current && isGuest) {
        hasShownScroll.current = true;
        setTriggerSource('scroll');
        setShowPrompt(true);
      }
    }, 30_000); // 30s

    const handleScroll = () => {
      const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      if (scrollPercent > 0.4 && !hasShownScroll.current && isGuest) {
        hasShownScroll.current = true;
        setTriggerSource('scroll');
        setShowPrompt(true);
      }
    };

    const scrollTarget = document.querySelector('[data-app-scroll]');
    (scrollTarget || window).addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      (scrollTarget || window).removeEventListener('scroll', handleScroll);
    };
  }, [isGuest]);

  // Called when guest clicks an interactive action (like, comment, share, chat)
  const promptForInteraction = useCallback(() => {
    if (!isGuest) return false;
    setTriggerSource('interaction');
    setShowPrompt(true);
    return true; // blocked
  }, [isGuest]);

  const dismissPrompt = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(GUEST_PROMPT_DISMISSED_KEY, Date.now().toString());
  }, []);

  return { isGuest, showPrompt, triggerSource, promptForInteraction, dismissPrompt, setShowPrompt };
};
