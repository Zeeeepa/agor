import { useMemo } from 'react';

/**
 * Emoji shortcode data for autocomplete
 * Based on common emoji shortcodes used in Slack, Discord, GitHub, etc.
 */
export interface EmojiOption {
  shortcode: string;
  emoji: string;
  keywords?: string[];
}

/**
 * Curated list of commonly used emojis with their shortcodes
 * Organized by category for easier maintenance
 */
const EMOJI_DATA: EmojiOption[] = [
  // Smileys & Emotion
  { shortcode: 'smile', emoji: '😄', keywords: ['happy', 'joy'] },
  { shortcode: 'grin', emoji: '😁', keywords: ['happy', 'teeth'] },
  { shortcode: 'joy', emoji: '😂', keywords: ['tears', 'laugh'] },
  { shortcode: 'rofl', emoji: '🤣', keywords: ['rolling', 'laugh'] },
  { shortcode: 'laughing', emoji: '😆', keywords: ['satisfied', 'laugh'] },
  { shortcode: 'sweat_smile', emoji: '😅', keywords: ['hot'] },
  { shortcode: 'wink', emoji: '😉', keywords: ['flirt'] },
  { shortcode: 'blush', emoji: '😊', keywords: ['proud', 'happy'] },
  { shortcode: 'innocent', emoji: '😇', keywords: ['angel'] },
  { shortcode: 'heart_eyes', emoji: '😍', keywords: ['love', 'crush'] },
  { shortcode: 'star_struck', emoji: '🤩', keywords: ['eyes', 'star'] },
  { shortcode: 'kissing_heart', emoji: '😘', keywords: ['flirt'] },
  { shortcode: 'thinking', emoji: '🤔', keywords: ['hmm'] },
  { shortcode: 'neutral_face', emoji: '😐', keywords: ['meh'] },
  { shortcode: 'expressionless', emoji: '😑', keywords: ['blank'] },
  { shortcode: 'no_mouth', emoji: '😶', keywords: ['silent'] },
  { shortcode: 'smirk', emoji: '😏', keywords: ['smug'] },
  { shortcode: 'unamused', emoji: '😒', keywords: ['unhappy'] },
  { shortcode: 'grimacing', emoji: '😬', keywords: ['awkward'] },
  { shortcode: 'lying_face', emoji: '🤥', keywords: ['pinocchio'] },
  { shortcode: 'relieved', emoji: '😌', keywords: ['whew'] },
  { shortcode: 'pensive', emoji: '😔', keywords: ['sad'] },
  { shortcode: 'sleepy', emoji: '😪', keywords: ['tired'] },
  { shortcode: 'drooling_face', emoji: '🤤', keywords: ['hungry'] },
  { shortcode: 'sleeping', emoji: '😴', keywords: ['zzz'] },
  { shortcode: 'mask', emoji: '😷', keywords: ['sick', 'covid'] },
  { shortcode: 'face_with_thermometer', emoji: '🤒', keywords: ['sick', 'ill'] },
  { shortcode: 'nerd_face', emoji: '🤓', keywords: ['geek'] },
  { shortcode: 'sunglasses', emoji: '😎', keywords: ['cool'] },
  { shortcode: 'stuck_out_tongue', emoji: '😛', keywords: ['playful'] },
  { shortcode: 'stuck_out_tongue_winking_eye', emoji: '😜', keywords: ['joke'] },
  { shortcode: 'zany_face', emoji: '🤪', keywords: ['crazy'] },
  { shortcode: 'zipper_mouth_face', emoji: '🤐', keywords: ['secret'] },
  { shortcode: 'money_mouth_face', emoji: '🤑', keywords: ['rich'] },
  { shortcode: 'hugs', emoji: '🤗', keywords: ['hug'] },
  { shortcode: 'shushing_face', emoji: '🤫', keywords: ['quiet'] },
  { shortcode: 'hand_over_mouth', emoji: '🤭', keywords: ['oops'] },
  { shortcode: 'yum', emoji: '😋', keywords: ['delicious', 'food'] },
  { shortcode: 'sweat', emoji: '😓', keywords: ['nervous'] },
  { shortcode: 'cold_sweat', emoji: '😰', keywords: ['nervous'] },
  { shortcode: 'cry', emoji: '😢', keywords: ['sad', 'tear'] },
  { shortcode: 'sob', emoji: '😭', keywords: ['cry', 'sad'] },
  { shortcode: 'scream', emoji: '😱', keywords: ['fear', 'shocked'] },
  { shortcode: 'confounded', emoji: '😖', keywords: ['confused'] },
  { shortcode: 'disappointed', emoji: '😞', keywords: ['sad'] },
  { shortcode: 'weary', emoji: '😩', keywords: ['tired'] },
  { shortcode: 'tired_face', emoji: '😫', keywords: ['exhausted'] },
  { shortcode: 'triumph', emoji: '😤', keywords: ['smug', 'proud'] },
  { shortcode: 'rage', emoji: '😡', keywords: ['angry', 'mad'] },
  { shortcode: 'angry', emoji: '😠', keywords: ['mad'] },
  { shortcode: 'exploding_head', emoji: '🤯', keywords: ['mind_blown'] },
  { shortcode: 'flushed', emoji: '😳', keywords: ['embarrassed'] },
  { shortcode: 'hot_face', emoji: '🥵', keywords: ['heat', 'sweating'] },
  { shortcode: 'cold_face', emoji: '🥶', keywords: ['freezing'] },
  { shortcode: 'dizzy_face', emoji: '😵', keywords: ['confused'] },
  { shortcode: 'pleading_face', emoji: '🥺', keywords: ['puppy_eyes'] },
  { shortcode: 'partying_face', emoji: '🥳', keywords: ['celebrate', 'party'] },

  // Gestures & Body Parts
  { shortcode: 'wave', emoji: '👋', keywords: ['hello', 'hi', 'bye'] },
  { shortcode: 'raised_hand', emoji: '✋', keywords: ['stop'] },
  { shortcode: 'vulcan_salute', emoji: '🖖', keywords: ['spock'] },
  { shortcode: 'ok_hand', emoji: '👌', keywords: ['perfect'] },
  { shortcode: 'v', emoji: '✌️', keywords: ['peace', 'victory'] },
  { shortcode: 'crossed_fingers', emoji: '🤞', keywords: ['luck'] },
  { shortcode: 'metal', emoji: '🤘', keywords: ['rock'] },
  { shortcode: 'call_me_hand', emoji: '🤙', keywords: ['shaka'] },
  { shortcode: 'point_left', emoji: '👈', keywords: ['left'] },
  { shortcode: 'point_right', emoji: '👉', keywords: ['right'] },
  { shortcode: 'point_up', emoji: '☝️', keywords: ['up'] },
  { shortcode: 'point_down', emoji: '👇', keywords: ['down'] },
  { shortcode: '+1', emoji: '👍', keywords: ['thumbsup', 'yes', 'approve'] },
  { shortcode: 'thumbsup', emoji: '👍', keywords: ['+1', 'yes', 'approve'] },
  { shortcode: '-1', emoji: '👎', keywords: ['thumbsdown', 'no', 'disapprove'] },
  { shortcode: 'thumbsdown', emoji: '👎', keywords: ['-1', 'no', 'disapprove'] },
  { shortcode: 'fist', emoji: '✊', keywords: ['power'] },
  { shortcode: 'facepunch', emoji: '👊', keywords: ['punch'] },
  { shortcode: 'clap', emoji: '👏', keywords: ['applause', 'congrats'] },
  { shortcode: 'raised_hands', emoji: '🙌', keywords: ['celebrate', 'yay'] },
  { shortcode: 'pray', emoji: '🙏', keywords: ['please', 'thanks'] },
  { shortcode: 'handshake', emoji: '🤝', keywords: ['deal', 'agreement'] },
  { shortcode: 'muscle', emoji: '💪', keywords: ['strong', 'bicep'] },
  { shortcode: 'eyes', emoji: '👀', keywords: ['look', 'watch'] },
  { shortcode: 'brain', emoji: '🧠', keywords: ['smart', 'think'] },

  // Hearts & Symbols
  { shortcode: 'heart', emoji: '❤️', keywords: ['love'] },
  { shortcode: 'orange_heart', emoji: '🧡', keywords: ['love'] },
  { shortcode: 'yellow_heart', emoji: '💛', keywords: ['love'] },
  { shortcode: 'green_heart', emoji: '💚', keywords: ['love'] },
  { shortcode: 'blue_heart', emoji: '💙', keywords: ['love'] },
  { shortcode: 'purple_heart', emoji: '💜', keywords: ['love'] },
  { shortcode: 'black_heart', emoji: '🖤', keywords: ['love'] },
  { shortcode: 'white_heart', emoji: '🤍', keywords: ['love'] },
  { shortcode: 'brown_heart', emoji: '🤎', keywords: ['love'] },
  { shortcode: 'broken_heart', emoji: '💔', keywords: ['sad'] },
  { shortcode: 'sparkling_heart', emoji: '💖', keywords: ['love'] },
  { shortcode: 'fire', emoji: '🔥', keywords: ['hot', 'lit'] },
  { shortcode: 'sparkles', emoji: '✨', keywords: ['shiny', 'new'] },
  { shortcode: 'star', emoji: '⭐', keywords: ['favorite'] },
  { shortcode: 'boom', emoji: '💥', keywords: ['explosion', 'bang'] },
  { shortcode: 'zap', emoji: '⚡', keywords: ['lightning', 'fast'] },
  { shortcode: 'rocket', emoji: '🚀', keywords: ['launch', 'space'] },

  // Common Symbols
  { shortcode: 'white_check_mark', emoji: '✅', keywords: ['done', 'check'] },
  { shortcode: 'x', emoji: '❌', keywords: ['no', 'cross', 'wrong'] },
  { shortcode: 'warning', emoji: '⚠️', keywords: ['alert', 'caution'] },
  { shortcode: 'bangbang', emoji: '‼️', keywords: ['exclamation'] },
  { shortcode: 'question', emoji: '❓', keywords: ['confused'] },
  { shortcode: 'exclamation', emoji: '❗', keywords: ['bang'] },
  { shortcode: 'heavy_plus_sign', emoji: '➕', keywords: ['add', 'plus'] },
  { shortcode: 'heavy_minus_sign', emoji: '➖', keywords: ['subtract', 'minus'] },
  { shortcode: 'arrow_right', emoji: '➡️', keywords: ['right'] },
  { shortcode: 'arrow_left', emoji: '⬅️', keywords: ['left'] },
  { shortcode: 'arrow_up', emoji: '⬆️', keywords: ['up'] },
  { shortcode: 'arrow_down', emoji: '⬇️', keywords: ['down'] },

  // Animals & Nature
  { shortcode: 'dog', emoji: '🐶', keywords: ['puppy', 'pet'] },
  { shortcode: 'cat', emoji: '🐱', keywords: ['kitty', 'pet'] },
  { shortcode: 'mouse', emoji: '🐭', keywords: ['animal'] },
  { shortcode: 'hamster', emoji: '🐹', keywords: ['pet'] },
  { shortcode: 'rabbit', emoji: '🐰', keywords: ['bunny'] },
  { shortcode: 'bear', emoji: '🐻', keywords: ['animal'] },
  { shortcode: 'panda_face', emoji: '🐼', keywords: ['panda'] },
  { shortcode: 'monkey_face', emoji: '🐵', keywords: ['monkey'] },
  { shortcode: 'see_no_evil', emoji: '🙈', keywords: ['monkey'] },
  { shortcode: 'hear_no_evil', emoji: '🙉', keywords: ['monkey'] },
  { shortcode: 'speak_no_evil', emoji: '🙊', keywords: ['monkey'] },
  { shortcode: 'unicorn', emoji: '🦄', keywords: ['magic'] },
  { shortcode: 'bee', emoji: '🐝', keywords: ['insect'] },
  { shortcode: 'bug', emoji: '🐛', keywords: ['insect', 'caterpillar'] },
  { shortcode: 'turtle', emoji: '🐢', keywords: ['slow'] },
  { shortcode: 'snake', emoji: '🐍', keywords: ['python'] },
  { shortcode: 'duck', emoji: '🦆', keywords: ['bird'] },
  { shortcode: 'owl', emoji: '🦉', keywords: ['bird', 'night'] },
  { shortcode: 'frog', emoji: '🐸', keywords: ['pepe'] },
  { shortcode: 'dragon', emoji: '🐉', keywords: ['chinese'] },
  { shortcode: 'cactus', emoji: '🌵', keywords: ['desert'] },
  { shortcode: 'christmas_tree', emoji: '🎄', keywords: ['holiday'] },
  { shortcode: 'evergreen_tree', emoji: '🌲', keywords: ['tree'] },
  { shortcode: 'palm_tree', emoji: '🌴', keywords: ['tropical'] },
  { shortcode: 'seedling', emoji: '🌱', keywords: ['plant', 'new'] },
  { shortcode: 'herb', emoji: '🌿', keywords: ['plant'] },
  { shortcode: 'four_leaf_clover', emoji: '🍀', keywords: ['luck'] },
  { shortcode: 'mushroom', emoji: '🍄', keywords: ['fungus'] },
  { shortcode: 'earth_americas', emoji: '🌎', keywords: ['world', 'globe'] },
  { shortcode: 'earth_africa', emoji: '🌍', keywords: ['world', 'globe'] },
  { shortcode: 'earth_asia', emoji: '🌏', keywords: ['world', 'globe'] },
  { shortcode: 'full_moon', emoji: '🌕', keywords: ['moon'] },
  { shortcode: 'sun', emoji: '☀️', keywords: ['sunny', 'day'] },
  { shortcode: 'partly_sunny', emoji: '⛅', keywords: ['cloud', 'weather'] },
  { shortcode: 'cloud', emoji: '☁️', keywords: ['weather'] },
  { shortcode: 'snowflake', emoji: '❄️', keywords: ['cold', 'winter'] },
  { shortcode: 'rainbow', emoji: '🌈', keywords: ['colorful'] },

  // Food & Drink
  { shortcode: 'coffee', emoji: '☕', keywords: ['cafe', 'caffeine'] },
  { shortcode: 'tea', emoji: '🍵', keywords: ['drink'] },
  { shortcode: 'beer', emoji: '🍺', keywords: ['drink', 'alcohol'] },
  { shortcode: 'wine_glass', emoji: '🍷', keywords: ['drink'] },
  { shortcode: 'pizza', emoji: '🍕', keywords: ['food'] },
  { shortcode: 'hamburger', emoji: '🍔', keywords: ['food', 'burger'] },
  { shortcode: 'fries', emoji: '🍟', keywords: ['food'] },
  { shortcode: 'popcorn', emoji: '🍿', keywords: ['movies'] },
  { shortcode: 'doughnut', emoji: '🍩', keywords: ['donut', 'food'] },
  { shortcode: 'cookie', emoji: '🍪', keywords: ['food'] },
  { shortcode: 'birthday', emoji: '🎂', keywords: ['cake', 'party'] },
  { shortcode: 'cake', emoji: '🍰', keywords: ['dessert'] },
  { shortcode: 'apple', emoji: '🍎', keywords: ['fruit'] },
  { shortcode: 'banana', emoji: '🍌', keywords: ['fruit'] },
  { shortcode: 'watermelon', emoji: '🍉', keywords: ['fruit'] },
  { shortcode: 'strawberry', emoji: '🍓', keywords: ['fruit'] },
  { shortcode: 'peach', emoji: '🍑', keywords: ['fruit'] },
  { shortcode: 'cherries', emoji: '🍒', keywords: ['fruit'] },
  { shortcode: 'avocado', emoji: '🥑', keywords: ['fruit', 'guacamole'] },
  { shortcode: 'taco', emoji: '🌮', keywords: ['food', 'mexican'] },
  { shortcode: 'burrito', emoji: '🌯', keywords: ['food', 'mexican'] },

  // Activities & Objects
  { shortcode: 'soccer', emoji: '⚽', keywords: ['football', 'sport'] },
  { shortcode: 'basketball', emoji: '🏀', keywords: ['sport'] },
  { shortcode: 'football', emoji: '🏈', keywords: ['sport'] },
  { shortcode: 'baseball', emoji: '⚾', keywords: ['sport'] },
  { shortcode: '8ball', emoji: '🎱', keywords: ['pool', 'billiards'] },
  { shortcode: 'trophy', emoji: '🏆', keywords: ['win', 'award'] },
  { shortcode: 'medal', emoji: '🏅', keywords: ['win', 'award'] },
  { shortcode: 'dart', emoji: '🎯', keywords: ['target', 'bullseye'] },
  { shortcode: 'video_game', emoji: '🎮', keywords: ['game', 'controller'] },
  { shortcode: 'musical_note', emoji: '🎵', keywords: ['music'] },
  { shortcode: 'headphones', emoji: '🎧', keywords: ['music'] },
  { shortcode: 'microphone', emoji: '🎤', keywords: ['sing'] },
  { shortcode: 'art', emoji: '🎨', keywords: ['paint', 'palette'] },
  { shortcode: 'book', emoji: '📖', keywords: ['read'] },
  { shortcode: 'books', emoji: '📚', keywords: ['library'] },
  { shortcode: 'memo', emoji: '📝', keywords: ['note', 'write'] },
  { shortcode: 'pencil', emoji: '✏️', keywords: ['write'] },
  { shortcode: 'pen', emoji: '🖊️', keywords: ['write'] },
  { shortcode: 'paintbrush', emoji: '🖌️', keywords: ['art'] },
  { shortcode: 'mag', emoji: '🔍', keywords: ['search', 'find'] },
  { shortcode: 'lock', emoji: '🔒', keywords: ['secure', 'private'] },
  { shortcode: 'unlock', emoji: '🔓', keywords: ['open'] },
  { shortcode: 'key', emoji: '🔑', keywords: ['password'] },
  { shortcode: 'hammer', emoji: '🔨', keywords: ['tool', 'build'] },
  { shortcode: 'wrench', emoji: '🔧', keywords: ['tool', 'fix'] },
  { shortcode: 'gear', emoji: '⚙️', keywords: ['settings', 'cog'] },
  { shortcode: 'link', emoji: '🔗', keywords: ['chain', 'url'] },
  { shortcode: 'hourglass', emoji: '⏳', keywords: ['time', 'wait'] },
  { shortcode: 'alarm_clock', emoji: '⏰', keywords: ['time'] },
  { shortcode: 'watch', emoji: '⌚', keywords: ['time'] },
  { shortcode: 'stopwatch', emoji: '⏱️', keywords: ['timer'] },
  { shortcode: 'package', emoji: '📦', keywords: ['box', 'parcel'] },
  { shortcode: 'mailbox', emoji: '📫', keywords: ['mail', 'post'] },
  { shortcode: 'envelope', emoji: '✉️', keywords: ['email', 'letter'] },
  { shortcode: 'bulb', emoji: '💡', keywords: ['idea', 'light'] },
  { shortcode: 'battery', emoji: '🔋', keywords: ['power'] },
  { shortcode: 'computer', emoji: '💻', keywords: ['laptop', 'code'] },
  { shortcode: 'keyboard', emoji: '⌨️', keywords: ['type'] },
  { shortcode: 'desktop_computer', emoji: '🖥️', keywords: ['pc'] },
  { shortcode: 'printer', emoji: '🖨️', keywords: ['print'] },
  { shortcode: 'iphone', emoji: '📱', keywords: ['phone', 'mobile'] },
  { shortcode: 'camera', emoji: '📷', keywords: ['photo'] },

  // Developer-specific
  { shortcode: 'construction', emoji: '🚧', keywords: ['wip', 'progress'] },
  { shortcode: 'recycle', emoji: '♻️', keywords: ['refactor'] },
  { shortcode: 'test_tube', emoji: '🧪', keywords: ['test', 'experiment'] },
  { shortcode: 'microscope', emoji: '🔬', keywords: ['science', 'test'] },
  { shortcode: 'chart_with_upwards_trend', emoji: '📈', keywords: ['growth', 'performance'] },
  { shortcode: 'chart_with_downwards_trend', emoji: '📉', keywords: ['decline'] },
];

/**
 * Hook that provides emoji autocomplete functionality
 * Returns filtered emoji options based on search query
 */
export const useEmojiAutocomplete = () => {
  /**
   * Search emojis by shortcode or keywords
   * @param query - Search string (without the leading ':')
   * @returns Filtered emoji options
   */
  const searchEmojis = useMemo(
    () => (query: string): EmojiOption[] => {
      if (!query) {
        // Return popular emojis when no query
        return EMOJI_DATA.slice(0, 20);
      }

      const lowerQuery = query.toLowerCase();

      // Filter by shortcode or keywords
      const matches = EMOJI_DATA.filter((option) => {
        // Match shortcode
        if (option.shortcode.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        // Match keywords
        if (option.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery))) {
          return true;
        }
        return false;
      });

      // Sort by relevance (exact match first, then starts-with, then contains)
      return matches
        .sort((a, b) => {
          const aShortcode = a.shortcode.toLowerCase();
          const bShortcode = b.shortcode.toLowerCase();

          // Exact match
          if (aShortcode === lowerQuery) return -1;
          if (bShortcode === lowerQuery) return 1;

          // Starts with
          const aStarts = aShortcode.startsWith(lowerQuery);
          const bStarts = bShortcode.startsWith(lowerQuery);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;

          // Alphabetical
          return aShortcode.localeCompare(bShortcode);
        })
        .slice(0, 20); // Limit results
    },
    []
  );

  return {
    searchEmojis,
    allEmojis: EMOJI_DATA,
  };
};
