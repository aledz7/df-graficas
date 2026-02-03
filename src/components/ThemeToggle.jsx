import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sun, Moon, Monitor, Droplet, Leaf, Zap, Sparkles, Sunrise, Paintbrush, Palette as PaletteIcon, Star, Wind, Flower2, CloudRain, Candy, Rocket, Coffee, Music, Feather, Gem } from 'lucide-react';

const ThemeToggle = ({ theme, setTheme }) => {
  const themes = [
    { value: 'light', label: 'Claro (Neutro)', icon: Sun },
    { value: 'dark', label: 'Escuro (Neutro)', icon: Moon },
  ];

  const currentThemeDetails = themes.find(t => t.value === theme) || themes.find(t => t.value === 'light');
  const CurrentIcon = currentThemeDetails.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="border-border/70">
          <motion.div
            key={theme}
            initial={{ scale: 0.8, opacity: 0, rotate: -90 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
          >
            <CurrentIcon className="h-4 w-4" />
          </motion.div>
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-border/70 max-h-96 overflow-y-auto">
        {themes.map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.value}
            onClick={() => setTheme(themeOption.value)}
            className={`flex items-center space-x-2 cursor-pointer ${theme === themeOption.value ? 'bg-accent text-accent-foreground' : ''}`}
          >
            <themeOption.icon className="h-4 w-4" />
            <span>{themeOption.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;