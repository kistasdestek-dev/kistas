import React from 'react';

export interface GoogleIdentityButtonProps {
  disabled: boolean;
  onCredential: (credential: string, nonce: string) => void;
  onError: (message: string) => void;
}

export function GoogleIdentityButton(_props: GoogleIdentityButtonProps) {
  return null;
}
