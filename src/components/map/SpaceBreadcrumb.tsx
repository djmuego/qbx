import React from 'react';
import type { Space } from '../../domain/space/space.types';
import { spaceAncestry } from '../../domain/map/spatial-hierarchy';

interface SpaceBreadcrumbProps {
  spaces: Space[];
  currentSpaceId: string;
  onNavigate: (spaceId: string) => void;
  className?: string;
}

export const SpaceBreadcrumb: React.FC<SpaceBreadcrumbProps> = ({
  spaces,
  currentSpaceId,
  onNavigate,
  className = '',
}) => {
  const chain = spaceAncestry(spaces, currentSpaceId);
  if (chain.length <= 1) return null;

  return (
    <nav className={`flex flex-wrap items-center gap-1 text-xs text-stone-600 dark:text-stone-400 ${className}`} aria-label="Навигация по пространствам">
      {chain.map((space, i) => (
        <React.Fragment key={space.id}>
          {i > 0 && <span className="opacity-50">›</span>}
          {i < chain.length - 1 ? (
            <button
              type="button"
              className="hover:text-emerald-600 dark:hover:text-emerald-400 underline-offset-2 hover:underline"
              onClick={() => onNavigate(space.id)}
            >
              {space.name}
            </button>
          ) : (
            <span className="font-medium text-stone-800 dark:text-stone-200">{space.name}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
