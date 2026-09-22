import React from 'react';
import { Tier2FilterChips } from '../ui/Tier2FilterChips';

export interface AreaFilterProps {
  areas: string[];
  activeArea: string;
  areaCounts?: Record<string, number>;
  onSelectArea: (area: string) => void;
}

export const AreaFilter: React.FC<AreaFilterProps> = ({
  areas,
  activeArea,
  areaCounts,
  onSelectArea,
}) => {
  return (
    <Tier2FilterChips
      chips={areas}
      activeChip={activeArea}
      counts={areaCounts}
      onChipChange={onSelectArea}
      activeColor="accent"
    />
  );
};
