import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useLocale } from '../../i18n/LocaleContext';
import { DEVICE_MODELS } from '../../domain/catalog/device-catalog';
import { consumerProductModelIds, stripLineStoreUrl } from '../../domain/catalog/product-catalog';
import { Zap, ChevronRight, Cpu } from '../common/Icons';

interface ProductStorefrontProps {
  onAddModel?: (modelId: string) => void;
}

export const ProductStorefront: React.FC<ProductStorefrontProps> = ({ onAddModel }) => {
  const { catalog } = useApp();
  const { t, tv } = useLocale();

  const consumerModels = useMemo(() => {
    const ids = consumerProductModelIds();
    return ids
      .map((id) => catalog.deviceModels.find((m) => m.id === id) ?? DEVICE_MODELS.find((m) => m.id === id))
      .filter(Boolean)
      .map((m) => m!);
  }, [catalog.deviceModels]);

  const strip = consumerModels.find((m) => m.id === 'qbx-strip-4');

  if (!consumerModels.length) return null;

  return (
    <section className="rounded-2xl border border-violet-200/70 dark:border-violet-900/50 bg-gradient-to-br from-violet-50/80 to-white dark:from-violet-950/30 dark:to-zinc-900 p-4 sm:p-5 space-y-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
            {t('devices.product.stripLine', 'Удлинители QBX')}
          </p>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            {t('devices.store.title', 'Устройства QBX')}
          </h2>
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 max-w-xl">
            {t('devices.store.subtitle', 'Умные удлинители со встроенными датчиками')}
          </p>
        </div>
        <a
          href={stripLineStoreUrl()}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline"
        >
          {t('devices.store.viewAll', 'Вся линейка')} →
        </a>
      </div>

      {strip && (
        <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-white/90 dark:bg-zinc-900/80 p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            <Zap className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{strip.name}</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{strip.description}</p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-2">
              {tv('devices.store.sensorsBuiltIn', { count: strip.inputCount }, '{{count}} встроенных датчика')}
              {' · '}
              {tv('devices.store.outlets', { count: strip.outputCount }, '{{count}} розеток')}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {strip.product?.purchaseUrl && (
                <a
                  href={strip.product.purchaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white"
                >
                  {t('devices.product.buy', 'Купить')}
                </a>
              )}
              {onAddModel && (
                <button
                  type="button"
                  onClick={() => onAddModel(strip.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                >
                  {t('devices.list.add', 'Добавить устройство')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {consumerModels
          .filter((m) => m.id !== 'qbx-strip-4')
          .map((model) => (
            <div
              key={model.id}
              className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{model.name}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2">{model.category}</p>
              <div className="flex gap-2 mt-auto pt-1">
                {model.product?.purchaseUrl && (
                  <a
                    href={model.product.purchaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-semibold text-emerald-600 hover:underline"
                  >
                    {t('devices.product.buy', 'Купить')}
                  </a>
                )}
                {onAddModel && (
                  <button
                    type="button"
                    onClick={() => onAddModel(model.id)}
                    className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400 hover:text-emerald-600"
                  >
                    {t('common.add', 'Добавить')}
                    <ChevronRight className="w-3 h-3 inline" />
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </section>
  );
};
