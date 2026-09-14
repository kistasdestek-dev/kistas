import React from 'react';
import { AuthExperience, AuthExperienceProps } from './AuthExperience';

type LoginScreenProps = Omit<AuthExperienceProps, 'mode' | 'onSwitch'> & { onRegister: () => void };

export function LoginScreen({ onRegister, ...props }: LoginScreenProps) {
  return <AuthExperience {...props} mode="login" onSwitch={onRegister} />;
}
