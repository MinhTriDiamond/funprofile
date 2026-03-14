/**
 * Cross-browser clipboard copy with fallback for mobile / iframe contexts
 * where navigator.clipboard.writeText may be blocked.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. Try modern Clipboard API first
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Blocked by permissions policy – fall through to fallback
    }
  }

  // 2. Fallback: hidden textarea + execCommand
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    // Prevent scrolling on iOS
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    // iOS Safari requires setSelectionRange
    textarea.setSelectionRange(0, text.length);

    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
