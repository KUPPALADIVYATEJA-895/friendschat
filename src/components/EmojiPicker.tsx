import React, { useState } from 'react';
import { Search, X, Flame, Bot, Smile, Sparkles } from 'lucide-react';
import { sounds } from '../utils/soundEffects.ts';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'popular',
    name: 'Top Reactions',
    icon: <Flame className="w-3 h-3" />,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
      '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
      '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
      '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳',
      '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️',
      '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😮',
      '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣',
      '🤫', '🫡', '🤐', '🤨', '😐', '😑', '😶', '💀',
    ],
  },
  {
    id: 'cyber',
    name: 'Cyber & Matrix',
    icon: <Bot className="w-3 h-3" />,
    emojis: [
      '👾', '🤖', '🛸', '🛰️', '💻', '📱', '🔋', '🔌',
      '💾', '💿', '📀', '🖥️', '🖨️', '⌨️', '🖱️', '🕹️',
      '🔒', '🔓', '🔑', '🗝️', '🛡️', '⚔️', '💣', '🧨',
      '🧬', '🧪', '🧫', '🔬', '📡', '🔭', '📡', '🕹️',
      '🌐', '👁️', '⚡', '🔮', '🕹️', '🧭', '⚙️', '🧲',
      '🚀', '🛸', '🚁', '🛰️', '💽', '🎥', '💡', '🔦',
      '🪙', '💎', '⌛', '⏳', '📟', '📠', '📻', '🎙️',
      '🪐', '🌌', '⚡', '☄️', '🔥', '💥', '✨', '☣️',
    ],
  },
  {
    id: 'expressions',
    name: 'Hands & Vibes',
    icon: <Smile className="w-3 h-3" />,
    emojis: [
      '👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌',
      '👐', '🤲', '🤝', '🙏', '✌️', '🤞', '🫰', '🤟',
      '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏',
      '✍️', '🤳', '💅', '💪', '🦾', '🦿', '🦵', '🦶',
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓',
      '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☯️',
    ],
  },
  {
    id: 'vibes',
    name: 'Activity & Food',
    icon: <Sparkles className="w-3 h-3" />,
    emojis: [
      '🔥', '⚡', '✨', '💯', '💢', '💨', '💫', '🌟',
      '🎯', '🎲', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️',
      '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹',
      '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎮', '🎳',
      '☕', '🍵', '🧃', '🥤', '🧋', '🍺', '🍻', '🥂',
      '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊', '🍕',
      '🍔', '🍟', '🌭', '🍿', '🧈', '🥞', '🧇', '🥓',
      '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬', '🍭',
    ],
  },
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('popular');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const currentCategory = EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0];

  const allEmojis = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
  const displayedEmojis = searchQuery.trim()
    ? Array.from(new Set(allEmojis))
    : currentCategory.emojis;

  return (
    <div 
      id="emoji-picker-popover"
      className="absolute bottom-full mb-3 left-0 sm:left-auto right-0 sm:right-auto w-full sm:w-[352px] bg-[#0c0d12] border border-white/20 rounded-sm shadow-2xl z-50 overflow-hidden font-mono backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {/* Header Bar */}
      <div className="p-2.5 border-b border-white/10 flex items-center justify-between bg-black/60">
        <div className="flex items-center gap-1.5 text-white/80 text-[10px] uppercase font-bold tracking-wider">
          <Smile className="w-3.5 h-3.5 text-cyan-400" />
          <span>Emoji Matrix (8 × 8)</span>
        </div>
        <button
          type="button"
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="text-white/40 hover:text-white p-1 rounded-sm transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center border-b border-white/10 bg-black/40 p-1 gap-1 overflow-x-auto">
        {EMOJI_CATEGORIES.map((category) => {
          const isActive = activeCategory === category.id && !searchQuery.trim();
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                sounds.playClick();
                setSearchQuery('');
                setActiveCategory(category.id);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-sm text-[9px] uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {category.icon}
              <span className="hidden xs:inline">{category.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-white/10 bg-black/50">
        <div className="relative">
          <Search className="w-3 h-3 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter emojis..."
            className="w-full bg-black/60 border border-white/10 focus:border-cyan-400 text-white placeholder-white/30 text-[10px] pl-7 pr-2.5 py-1 rounded-sm outline-none font-mono"
          />
        </div>
      </div>

      {/* Emoji Grid (8 columns format) */}
      <div className="p-2 max-h-56 overflow-y-auto grid grid-cols-8 gap-1 bg-black/40 select-none">
        {displayedEmojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            type="button"
            onClick={() => {
              sounds.playClick();
              onSelectEmoji(emoji);
            }}
            className="w-8 h-8 flex items-center justify-center text-base hover:bg-white/15 rounded-sm transition-all transform active:scale-90 hover:scale-110 cursor-pointer border border-transparent hover:border-white/20"
            title={`Insert ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Quick Reaction Footer Bar */}
      <div className="p-2 border-t border-white/10 bg-black/60 flex items-center justify-between text-[9px] text-white/40">
        <span className="text-[8px] uppercase tracking-widest text-cyan-400/70 font-mono">
          Click to Insert
        </span>
        <div className="flex items-center gap-1.5">
          {['🔥', '👍', '❤️', '⚡'].map((quickEmoji) => (
            <button
              key={quickEmoji}
              type="button"
              onClick={() => {
                sounds.playClick();
                onSelectEmoji(quickEmoji);
              }}
              className="text-xs hover:scale-125 transition-transform cursor-pointer px-1 py-0.5 hover:bg-white/10 rounded-sm"
            >
              {quickEmoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

