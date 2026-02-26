/**
 * Curated sticker collection using Emoji Kitchen (Google) and Fluentemoji.
 * Organized by categories. All URLs are public CDN links.
 */

export interface CuratedSticker {
  url: string;
  alt: string;
}

export interface StickerCategory {
  name: string;
  icon: string;
  stickers: CuratedSticker[];
}

// Using Fluent Emoji (Microsoft) CDN — high quality, always available
const FLUENT_BASE = 'https://raw.githubusercontent.com/nicedoc/fluent-emoji/main/pngs/128';

export const STICKER_CATEGORIES: StickerCategory[] = [
  {
    name: 'Smileys',
    icon: '😊',
    stickers: [
      { url: `${FLUENT_BASE}/grinning-face.png`, alt: '😀' },
      { url: `${FLUENT_BASE}/grinning-face-with-big-eyes.png`, alt: '😃' },
      { url: `${FLUENT_BASE}/grinning-face-with-smiling-eyes.png`, alt: '😄' },
      { url: `${FLUENT_BASE}/beaming-face-with-smiling-eyes.png`, alt: '😁' },
      { url: `${FLUENT_BASE}/face-with-tears-of-joy.png`, alt: '😂' },
      { url: `${FLUENT_BASE}/rolling-on-the-floor-laughing.png`, alt: '🤣' },
      { url: `${FLUENT_BASE}/smiling-face-with-heart-eyes.png`, alt: '😍' },
      { url: `${FLUENT_BASE}/star-struck.png`, alt: '🤩' },
      { url: `${FLUENT_BASE}/winking-face.png`, alt: '😉' },
      { url: `${FLUENT_BASE}/smiling-face-with-smiling-eyes.png`, alt: '😊' },
      { url: `${FLUENT_BASE}/face-blowing-a-kiss.png`, alt: '😘' },
      { url: `${FLUENT_BASE}/face-savoring-food.png`, alt: '😋' },
      { url: `${FLUENT_BASE}/zany-face.png`, alt: '🤪' },
    ],
  },
  {
    name: 'Emotions',
    icon: '🥺',
    stickers: [
      { url: `${FLUENT_BASE}/pleading-face.png`, alt: '🥺' },
      { url: `${FLUENT_BASE}/crying-face.png`, alt: '😢' },
      { url: `${FLUENT_BASE}/loudly-crying-face.png`, alt: '😭' },
      { url: `${FLUENT_BASE}/angry-face.png`, alt: '😠' },
      { url: `${FLUENT_BASE}/pouting-face.png`, alt: '😡' },
      { url: `${FLUENT_BASE}/face-with-steam-from-nose.png`, alt: '😤' },
      { url: `${FLUENT_BASE}/fearful-face.png`, alt: '😨' },
      { url: `${FLUENT_BASE}/anxious-face-with-sweat.png`, alt: '😰' },
      { url: `${FLUENT_BASE}/disappointed-face.png`, alt: '😞' },
      { url: `${FLUENT_BASE}/pensive-face.png`, alt: '😔' },
      { url: `${FLUENT_BASE}/confused-face.png`, alt: '😕' },
      { url: `${FLUENT_BASE}/face-with-open-mouth.png`, alt: '😮' },
    ],
  },
  {
    name: 'Gestures',
    icon: '👍',
    stickers: [
      { url: `${FLUENT_BASE}/thumbs-up.png`, alt: '👍' },
      { url: `${FLUENT_BASE}/thumbs-down.png`, alt: '👎' },
      { url: `${FLUENT_BASE}/clapping-hands.png`, alt: '👏' },
      { url: `${FLUENT_BASE}/raising-hands.png`, alt: '🙌' },
      { url: `${FLUENT_BASE}/folded-hands.png`, alt: '🙏' },
      { url: `${FLUENT_BASE}/handshake.png`, alt: '🤝' },
      { url: `${FLUENT_BASE}/flexed-biceps.png`, alt: '💪' },
      { url: `${FLUENT_BASE}/victory-hand.png`, alt: '✌️' },
      { url: `${FLUENT_BASE}/waving-hand.png`, alt: '👋' },
      { url: `${FLUENT_BASE}/ok-hand.png`, alt: '👌' },
      { url: `${FLUENT_BASE}/crossed-fingers.png`, alt: '🤞' },
      { url: `${FLUENT_BASE}/love-you-gesture.png`, alt: '🤟' },
    ],
  },
  {
    name: 'Hearts',
    icon: '❤️',
    stickers: [
      { url: `${FLUENT_BASE}/red-heart.png`, alt: '❤️' },
      { url: `${FLUENT_BASE}/orange-heart.png`, alt: '🧡' },
      { url: `${FLUENT_BASE}/yellow-heart.png`, alt: '💛' },
      { url: `${FLUENT_BASE}/green-heart.png`, alt: '💚' },
      { url: `${FLUENT_BASE}/blue-heart.png`, alt: '💙' },
      { url: `${FLUENT_BASE}/purple-heart.png`, alt: '💜' },
      { url: `${FLUENT_BASE}/sparkling-heart.png`, alt: '💖' },
      { url: `${FLUENT_BASE}/growing-heart.png`, alt: '💗' },
      { url: `${FLUENT_BASE}/beating-heart.png`, alt: '💓' },
      { url: `${FLUENT_BASE}/revolving-hearts.png`, alt: '💞' },
      { url: `${FLUENT_BASE}/heart-with-arrow.png`, alt: '💘' },
      { url: `${FLUENT_BASE}/broken-heart.png`, alt: '💔' },
      { url: `${FLUENT_BASE}/fire.png`, alt: '🔥' },
    ],
  },
  {
    name: 'Animals',
    icon: '🐱',
    stickers: [
      { url: `${FLUENT_BASE}/cat-face.png`, alt: '🐱' },
      { url: `${FLUENT_BASE}/dog-face.png`, alt: '🐶' },
      { url: `${FLUENT_BASE}/bear.png`, alt: '🐻' },
      { url: `${FLUENT_BASE}/panda.png`, alt: '🐼' },
      { url: `${FLUENT_BASE}/unicorn.png`, alt: '🦄' },
      { url: `${FLUENT_BASE}/butterfly.png`, alt: '🦋' },
      { url: `${FLUENT_BASE}/monkey-face.png`, alt: '🐵' },
      { url: `${FLUENT_BASE}/fox.png`, alt: '🦊' },
      { url: `${FLUENT_BASE}/rabbit-face.png`, alt: '🐰' },
      { url: `${FLUENT_BASE}/penguin.png`, alt: '🐧' },
      { url: `${FLUENT_BASE}/owl.png`, alt: '🦉' },
      { url: `${FLUENT_BASE}/dolphin.png`, alt: '🐬' },
    ],
  },
  {
    name: 'Food',
    icon: '🍕',
    stickers: [
      { url: `${FLUENT_BASE}/pizza.png`, alt: '🍕' },
      { url: `${FLUENT_BASE}/hamburger.png`, alt: '🍔' },
      { url: `${FLUENT_BASE}/french-fries.png`, alt: '🍟' },
      { url: `${FLUENT_BASE}/hot-dog.png`, alt: '🌭' },
      { url: `${FLUENT_BASE}/taco.png`, alt: '🌮' },
      { url: `${FLUENT_BASE}/ice-cream.png`, alt: '🍦' },
      { url: `${FLUENT_BASE}/birthday-cake.png`, alt: '🎂' },
      { url: `${FLUENT_BASE}/doughnut.png`, alt: '🍩' },
      { url: `${FLUENT_BASE}/cookie.png`, alt: '🍪' },
      { url: `${FLUENT_BASE}/hot-beverage.png`, alt: '☕' },
      { url: `${FLUENT_BASE}/tropical-drink.png`, alt: '🍹' },
      { url: `${FLUENT_BASE}/bubble-tea.png`, alt: '🧋' },
    ],
  },
  {
    name: 'Celebrate',
    icon: '🎉',
    stickers: [
      { url: `${FLUENT_BASE}/party-popper.png`, alt: '🎉' },
      { url: `${FLUENT_BASE}/confetti-ball.png`, alt: '🎊' },
      { url: `${FLUENT_BASE}/trophy.png`, alt: '🏆' },
      { url: `${FLUENT_BASE}/1st-place-medal.png`, alt: '🥇' },
      { url: `${FLUENT_BASE}/crown.png`, alt: '👑' },
      { url: `${FLUENT_BASE}/star.png`, alt: '⭐' },
      { url: `${FLUENT_BASE}/glowing-star.png`, alt: '🌟' },
      { url: `${FLUENT_BASE}/sparkles.png`, alt: '✨' },
      { url: `${FLUENT_BASE}/balloon.png`, alt: '🎈' },
      { url: `${FLUENT_BASE}/wrapped-gift.png`, alt: '🎁' },
      { url: `${FLUENT_BASE}/rocket.png`, alt: '🚀' },
      { url: `${FLUENT_BASE}/rainbow.png`, alt: '🌈' },
      { url: `${FLUENT_BASE}/hundred-points.png`, alt: '💯' },
    ],
  },
];
