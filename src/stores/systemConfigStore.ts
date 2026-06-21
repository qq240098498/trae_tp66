import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SystemConfig } from '../types';
import { DEFAULT_UNIT_PRICE, DEFAULT_FLOOR_FEE_RATE, FREE_FLOOR_THRESHOLD } from '../utils/pricing';

interface SystemConfigState {
  config: SystemConfig;
  updateConfig: (config: Partial<SystemConfig>) => void;
  resetConfig: () => void;
}

export const useSystemConfigStore = create<SystemConfigState>()(
  persist(
    (set) => ({
      config: {
        unitPrice: DEFAULT_UNIT_PRICE,
        floorFeeRate: DEFAULT_FLOOR_FEE_RATE,
        freeFloorThreshold: FREE_FLOOR_THRESHOLD,
      },
      updateConfig: (updates) => {
        set((state) => ({
          config: { ...state.config, ...updates },
        }));
      },
      resetConfig: () => {
        set({
          config: {
            unitPrice: DEFAULT_UNIT_PRICE,
            floorFeeRate: DEFAULT_FLOOR_FEE_RATE,
            freeFloorThreshold: FREE_FLOOR_THRESHOLD,
          },
        });
      },
    }),
    { name: 'system-config-storage' }
  )
);
