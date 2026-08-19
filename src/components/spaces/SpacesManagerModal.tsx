import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useLocale } from '../../i18n/LocaleContext';
import { SpacesManagerPanel } from './SpacesManagerPanel';
import { CreateSpaceModal } from '../modals/CreateSpaceModal';

interface SpacesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SpacesManagerModal: React.FC<SpacesManagerModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLocale();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('spaces.title', 'Пространства')}
        subtitle={t('spaces.subtitle', 'Гроубоксы, комнаты, дачи — каждое в своём workspace')}
        maxWidth="lg"
      >
        <SpacesManagerPanel onCreateRequest={() => setCreateOpen(true)} />
      </Modal>
      <CreateSpaceModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
};
