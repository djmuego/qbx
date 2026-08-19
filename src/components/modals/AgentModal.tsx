import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import {
  Bot,
  RefreshCw,
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  Trash2,
} from '../common/Icons';
import type { AgentInsightSeverity, AgentStatus } from '../../domain/ai/agent.types';
import { LOCAL_EXPERT_VERSION } from '../../application/ai/local-grow-expert';
import { listCropOptions } from '../../application/ai/knowledge/crop-resolver';
import { createCropProfile } from '../../application/ai/crop-profile.store';

const STATUS_LABEL: Record<AgentStatus, string> = {
  ok: 'В норме',
  attention: 'Требует внимания',
  critical: 'Критично',
  waiting: 'Ожидание данных',
};

function InsightIcon({ severity }: { severity: AgentInsightSeverity }) {
  if (severity === 'critical') return <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />;
  if (severity === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  return <Info className="w-4 h-4 text-sky-500 shrink-0" />;
}

export const AgentModal: React.FC = () => {
  const {
    isAgentOpen,
    setIsAgentOpen,
    agentDisplayBriefing,
    agentMessages,
    agentLoading,
    agentError,
    refreshAgentBriefing,
    askAgentQuestion,
    clearAgentConversation,
    aiSettings,
    growAgentAnalysis,
    growContext,
    cropProfile,
    setCropProfile,
    setIsAddAutomationOpen,
    agentQuickPrompts,
    workspaceAiManaged,
  } = useApp();

  const [tab, setTab] = useState<'briefing' | 'chat'>('briefing');
  const [showEvidence, setShowEvidence] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages, chatLoading]);

  const handleClose = () => setIsAgentOpen(false);

  const handleAsk = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatLoading) return;
    setQuestion('');
    setTab('chat');
    setChatLoading(true);
    try {
      await askAgentQuestion(trimmed);
    } finally {
      setChatLoading(false);
    }
  };

  const briefing = agentDisplayBriefing;
  const analysis = growAgentAnalysis;
  const isLocalExpert = analysis.promptVersion === LOCAL_EXPERT_VERSION;
  const isDeepSeek = analysis.evidenceSources.some((s) => s.includes('DEEPSEEK'));
  const cropOptions = listCropOptions();
  const CONFIDENCE_LABEL = { high: 'Высокая', medium: 'Средняя', low: 'Низкая' } as const;

  return (
    <Modal
      isOpen={isAgentOpen}
      onClose={handleClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950/60">
            <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <span>QBX Grow Agent</span>
          {workspaceAiManaged && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
              Platform AI
            </span>
          )}
        </div>
      }
      subtitle="Cultivation intelligence — advisory only"
    >
      <div className="flex flex-col min-h-[420px]">
        {/* Tabs */}
        <div className="flex gap-1 p-1 mx-4 sm:mx-6 mt-2 bg-slate-100 dark:bg-zinc-800 rounded-xl">
          <button
            type="button"
            onClick={() => setTab('briefing')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              tab === 'briefing'
                ? 'bg-white dark:bg-zinc-900 text-violet-600 dark:text-violet-400 shadow-2xs'
                : 'text-slate-500 dark:text-zinc-400'
            }`}
          >
            Сводка
          </button>
          <button
            type="button"
            onClick={() => setTab('chat')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              tab === 'chat'
                ? 'bg-white dark:bg-zinc-900 text-violet-600 dark:text-violet-400 shadow-2xs'
                : 'text-slate-500 dark:text-zinc-400'
            }`}
          >
            Диалог {agentMessages.length > 0 && `(${agentMessages.length})`}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {tab === 'briefing' && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                    {STATUS_LABEL[briefing.status]}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{briefing.headline}</h3>
                  <p className="text-sm text-slate-600 dark:text-zinc-300 mt-1 leading-relaxed">{briefing.summary}</p>
                  <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-2 font-semibold">
                    {isDeepSeek ? 'DeepSeek' : isLocalExpert ? 'Локальный эксперт' : 'Agent'} · Уверенность:{' '}
                    {CONFIDENCE_LABEL[analysis.confidence]}
                    {growContext.meta.dataSource === 'simulator' && ' · DATA SOURCE: SIMULATOR'}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void refreshAgentBriefing()}
                    disabled={agentLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${agentLoading ? 'animate-spin' : ''}`} />
                    Обновить
                  </button>
                  {aiSettings.enabled && (
                    <button
                      type="button"
                      onClick={() => void refreshAgentBriefing({ useGateway: true })}
                      disabled={agentLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white disabled:opacity-50"
                    >
                      DeepSeek
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Культура
                </label>
                <select
                  value={cropProfile?.cropId ?? ''}
                  onChange={(e) => {
                    const opt = cropOptions.find((c) => c.cropId === e.target.value);
                    setCropProfile(opt ? createCropProfile(opt.cropId, opt.commonName) : null);
                  }}
                  className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  <option value="">Не указана</option>
                  {cropOptions.map((c) => (
                    <option key={c.cropId} value={c.cropId}>
                      {c.commonName}
                    </option>
                  ))}
                </select>
                {growContext.crop.commonName && (
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                    в контексте: {growContext.crop.commonName}
                  </span>
                )}
              </div>

              {analysis.healthScore != null && (
                <section className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/20 dark:to-zinc-900 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1">
                    Состояние выращивания
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{analysis.healthScore}</span>
                    <span className="text-sm text-slate-500 dark:text-zinc-400 pb-1">/ 100</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 pb-1 ml-2">
                      {analysis.healthLabel ?? growContext.health.label}
                    </span>
                  </div>
                  <ul className="mt-3 grid grid-cols-2 gap-1.5">
                    {growContext.health.factors.slice(0, 8).map((f) => (
                      <li key={f.id} className="text-[11px] text-slate-600 dark:text-zinc-300 flex items-center gap-1.5">
                        <span>
                          {f.status === 'ok' && '✓'}
                          {f.status === 'warning' && '!'}
                          {f.status === 'critical' && '✕'}
                          {f.status === 'unknown' && '·'}
                        </span>
                        {f.label}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {growContext.intelligentAlerts.length > 0 && (
                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                    Что происходит
                  </h4>
                  <div className="space-y-2">
                    {growContext.intelligentAlerts.slice(0, 5).map((alert) => (
                      <div key={alert.id} className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
                        <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">{alert.title}</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{alert.message}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {agentError && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                  {agentError}
                </div>
              )}

              {!aiSettings.enabled && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 text-xs text-slate-600 dark:text-zinc-300">
                  DeepSeek отключён — работает локальный эксперт по базе знаний QBX и FACT-данным. Включите AI в Настройках для DeepSeek углубления.
                </div>
              )}

              {analysis.observations.length > 0 && (
                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                    Сейчас
                  </h4>
                  <div className="space-y-2">
                    {analysis.observations.map((obs, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
                        <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">{obs.title}</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{obs.detail}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(analysis.warnings.length > 0 || briefing.insights.length > 0) && (
                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                    Проблемы
                  </h4>
                  <div className="space-y-2">
                    {(analysis.warnings.length ? analysis.warnings : briefing.insights.map((ins) => ({
                      severity: ins.severity === 'critical' ? 'critical' as const : ins.severity === 'warning' ? 'warning' as const : 'info' as const,
                      title: ins.title,
                      detail: ins.detail,
                    }))).map((w, i) => (
                      <div key={i} className="flex gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800">
                        <InsightIcon severity={w.severity === 'critical' ? 'critical' : w.severity === 'warning' ? 'warning' : 'info'} />
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">{w.title}</div>
                          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{w.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {analysis.recommendations.length > 0 && (
                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                    Рекомендации
                  </h4>
                  <div className="space-y-2">
                    {analysis.recommendations.map((rec, i) => (
                      <div key={i} className="p-3 rounded-xl border border-violet-100 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-950/20">
                        <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">{rec.title}</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{rec.reason}</div>
                        <div className="text-xs text-violet-700 dark:text-violet-300 mt-1 font-medium">{rec.suggestedAction}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {analysis.proposedAutomations.length > 0 && (
                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                    Предложенные автоматизации
                  </h4>
                  {analysis.proposedAutomations.map((pa, i) => (
                    <div key={i} className="p-3 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 mb-2">
                      <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">{pa.title}</div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">{pa.triggerSummary} → {pa.actionSummary}</div>
                      <button
                        type="button"
                        onClick={() => setIsAddAutomationOpen(true)}
                        className="mt-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        Просмотреть / создать автоматизацию
                      </button>
                    </div>
                  ))}
                </section>
              )}

              {(analysis.missingData?.length ?? analysis.missingSensors.length) > 0 && (
                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                    Не хватает данных
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-300">
                    {(analysis.missingData ?? analysis.missingSensors).slice(0, 6).join(' · ')}
                  </p>
                </section>
              )}

              {briefing.watchItems.length > 0 && (
                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                    Тренды / на контроле
                  </h4>
                  <ul className="space-y-1.5">
                    {briefing.watchItems.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-zinc-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {briefing.nextSteps.length > 0 && (
                <section>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                    Следующие шаги
                  </h4>
                  <ol className="space-y-1.5 list-decimal list-inside">
                    {briefing.nextSteps.map((step, i) => (
                      <li key={i} className="text-xs text-slate-700 dark:text-zinc-200 font-medium">
                        {step}
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <button
                type="button"
                onClick={() => setShowEvidence((v) => !v)}
                className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 hover:text-violet-600 dark:hover:text-violet-400"
              >
                {showEvidence ? 'Скрыть источники данных' : 'На каких данных основан ответ?'}
              </button>
              {showEvidence && (
                <ul className="text-[11px] text-slate-600 dark:text-zinc-300 space-y-1 pl-4 list-disc">
                  {analysis.evidenceSources.map((src, i) => (
                    <li key={i}>{src}</li>
                  ))}
                </ul>
              )}
            </>
          )}

          {tab === 'chat' && (
            <>
              {agentMessages.length === 0 && !chatLoading && (
                <div className="text-center py-8">
                  <Sparkles className="w-8 h-8 text-violet-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Спросите Agent о вашем пространстве</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                    Ответы основаны только на реальных данных QBX — без выдуманных показаний.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {agentQuickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void handleAsk(prompt)}
                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60 hover:bg-violet-100 dark:hover:bg-violet-950/60"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {agentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-violet-600 text-white rounded-br-md'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-slate-100 dark:bg-zinc-800 text-xs text-slate-500 dark:text-zinc-400">
                      Agent думает…
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {agentMessages.length > 0 && (
                <button
                  type="button"
                  onClick={clearAgentConversation}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-rose-500 dark:hover:text-rose-400"
                >
                  <Trash2 className="w-3 h-3" />
                  Очистить диалог
                </button>
              )}
            </>
          )}
        </div>

        {/* Chat input — always visible */}
        <div className="border-t border-slate-100 dark:border-zinc-800 p-4 sm:px-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleAsk(question);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Спросите QBX Agent…"
              className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="submit"
              disabled={!question.trim() || chatLoading}
              className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
            {aiSettings.enabled && (
              <button
                type="button"
                disabled={!question.trim() || chatLoading}
                onClick={() => {
                  const trimmed = question.trim();
                  if (!trimmed || chatLoading) return;
                  setQuestion('');
                  setTab('chat');
                  setChatLoading(true);
                  void askAgentQuestion(trimmed, { useGateway: true }).finally(() => setChatLoading(false));
                }}
                className="px-2.5 rounded-xl text-[10px] font-bold bg-slate-800 hover:bg-slate-900 dark:bg-zinc-700 text-white disabled:opacity-50 shrink-0"
                title="Ответ через DeepSeek"
              >
                DS
              </button>
            )}
          </form>
        </div>
      </div>
    </Modal>
  );
};
