import { Button, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import type { CSSProperties, ReactNode } from 'react';

import classes from './RoleCard.module.css';

export interface RoleCardProps {
  title: string;
  description: string;
  buttonText: string;
  color: string;
  lightColor: string;
  icon: ReactNode;
  footerText: string;
  footerIcon: ReactNode;
  iconColor?: string;
  buttonColor?: string;
  buttonHover?: string;
  onClick?: () => void;
}

export default function RoleCard({
  title,
  description,
  buttonText,
  color,
  lightColor,
  icon,
  footerText,
  footerIcon,
  iconColor,
  buttonColor,
  buttonHover,
  onClick,
}: RoleCardProps) {
  const roleColor = buttonColor ?? color;
  const style = {
    '--role-color': color,
    '--role-icon': iconColor ?? roleColor,
    '--role-light': lightColor,
    '--role-button': roleColor,
    '--role-button-hover': buttonHover ?? roleColor,
  } as CSSProperties;

  return (
    <div className={classes.card} style={style}>
      <ThemeIcon size={64} radius="50%" className={classes.iconCircle} aria-hidden="true">
        {icon}
      </ThemeIcon>

      <Stack align="center" gap={6}>
        <Text className={classes.title} ta="center">
          {title}
        </Text>
        <Text className={classes.description} ta="center">
          {description}
        </Text>
      </Stack>

      <Button
        className={classes.button}
        fullWidth
        rightSection={<IconArrowRight size={18} aria-hidden="true" />}
        onClick={onClick}
      >
        {buttonText}
      </Button>

      <div className={classes.footer}>
        <span className={classes.footerIcon} aria-hidden="true">
          {footerIcon}
        </span>
        <Text size="sm" className={classes.footerText}>
          {footerText}
        </Text>
      </div>
    </div>
  );
}