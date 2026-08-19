import React, { useState } from 'react';
import { Bot, Plus } from '../common/Icons';

interface MapSetupAssistantProps {
  onManual: () => void;
  onAgent: () => void;
  onTemplate?: () => void;
}

export const MapSetupAssistant: React.FC<MapSetupAssistantProps> = ({ onManual, onAgent, onTemplate }) => {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 max-w-lg mx-auto text-center">
      <h2 className="text-sm font-bold">Создать карту</h2>
      <p className="text-xs text-slate-500 mt-1">Нарисуйте сами или опишите помещение QBX Agent.</p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onManual}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white"
        >
          <Plus className="w-4 h-4" />
          Вручную
        </button>
        {onTemplate && (
          <button type="button" onClick={onTemplate} className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-white">
            Шаблон
          </button>
        )}
        <button
          type="button"
          onClick={onAgent}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 text-white"
        >
          <Bot className="w-4 h-4" />
          С помощью QBX Agent
        </button>
      </div>
    </div>
  );
};

const STEPS = [
  { key: 'room', label: 'Что за помещение?', hint: 'Например: теплица 6×4×2.5 м' },
  { key: 'crop', label: 'Что выращиваем?', hint: '48 томатов cherry' },
  { key: 'age', label: 'Какой возраст растений?', hint: 'Например: взрослые, 45 дней, 2 месяца вегетации' },
  { key: 'layout', label: 'Как расположены растения?', hint: 'Два стеллажа по 4 м' },
  { key: 'gear', label: 'Какие приборы уже есть?', hint: '4 светильника, вытяжка справа, резервуар у входа' },
  { key: 'sensors', label: 'Какие датчики?', hint: 'Два климатических датчика' },
];

interface MapAgentWizardProps {
  onCancel: () => void;
  onGenerate: (description: string) => void;
  busy?: boolean;
}

export const MapAgentWizard: React.FC<MapAgentWizardProps> = ({ onCancel, onGenerate, busy }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(STEPS.map(() => ''));
  const [freeform, setFreeform] = useState('');

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else onGenerate([...answers, freeform].filter(Boolean).join('. '));
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 max-w-lg mx-auto space-y-3">
      <p className="text-[11px] font-bold text-violet-600">Шаг {step + 1} из {STEPS.length}</p>
      <h3 className="text-sm font-bold">{STEPS[step]!.label}</h3>
      <textarea
        value={answers[step]}
        onChange={(e) => setAnswers((prev) => prev.map((v, i) => (i === step ? e.target.value : v)))}
        placeholder={STEPS[step]!.hint}
        className="w-full min-h-[72px] px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
      />
      {step === STEPS.length - 1 && (
        <textarea
          value={freeform}
          onChange={(e) => setFreeform(e.target.value)}
          placeholder="Или вставьте описание целиком"
          className="w-full min-h-[64px] px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
        />
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-zinc-800">
          Отмена
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={next}
          className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl bg-violet-600 text-white"
        >
          {step < STEPS.length - 1 ? 'Далее' : busy ? 'Собираю предложение…' : 'Предпросмотр'}
        </button>
      </div>
    </div>
  );
};
