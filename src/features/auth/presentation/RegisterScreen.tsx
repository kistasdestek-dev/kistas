import React from 'react';
import { AuthExperience, AuthExperienceProps } from './AuthExperience';

type RegisterScreenProps = Omit<AuthExperienceProps, 'mode' | 'onSwitch'> & { onLogin: () => void };

export function RegisterScreen({ onLogin, ...props }: RegisterScreenProps) {
  return <AuthExperience {...props} mode="register" onSwitch={onLogin} />;
}
