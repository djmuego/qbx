import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { ShieldAlert, Power } from '../common/Icons';

export const EmergencyOffModal: React.FC = () => {
  const {
    isEmergencyModalOpen,
    setIsEmergencyModalOpen,
    turnOffAllInSpace,
    currentSpace,
  } = useApp();

  const handleConfirm = () => {
    turnOffAllInSpace();
    setIsEmergencyModalOpen(false);
  };

  return (
    <Modal
      isOpen={isEmergencyModalOpen}
      onClose={() => setIsEmergencyModalOpen(false)}
      title="Экстренное отключение"
      maxWidth="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200">
          <ShieldAlert className="w-6 h-6 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold">Выключить всё оборудование?</p>
            <p className="mt-1 text-rose-700/90 dark:text-rose-300">
              Все силовые выходы, помпы, освещение и вентиляторы в пространстве «
              <b>{currentSpace?.name}</b>» будут немедленно отключены. Автоматика будет заблокирована
              до нажатия «Возобновить автоматику» на главной странице.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setIsEmergencyModalOpen(false)}
            className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Выключить всё</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
