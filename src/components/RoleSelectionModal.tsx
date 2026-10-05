import React from 'react';
import { Profile, Language } from '../types';
import { AuthModal } from './AuthModal';

export interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: Profile | null;
  onLoginSuccess: (profile: Profile) => void;
  language: Language;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  isOpen,
  onClose,
  currentProfile,
  onLoginSuccess,
  language,
}) => {
  return (
    <AuthModal
      isOpen={isOpen}
      onClose={onClose}
      currentProfile={currentProfile}
      onAuthSuccess={(prof) => onLoginSuccess(prof)}
      language={language}
      initialMode="auth"
    />
  );
};

export default RoleSelectionModal;
