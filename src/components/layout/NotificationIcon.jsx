import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Componente de ícone de notificação para a barra superior
 */
const NotificationIcon = ({
  icon: Icon,
  count = 0,
  onClick,
  title,
  badgeColor = 'bg-red-500',
  className,
  showBadge = true
}) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn("relative", className)}
      title={title}
    >
      <Icon className="h-5 w-5" />
      {showBadge && count > 0 && (
        <span
          className={cn(
            "absolute -top-1 -right-1 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium",
            badgeColor
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  );
};

export default NotificationIcon;
