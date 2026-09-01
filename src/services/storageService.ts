import { ActiveOrder, ColdStorageUnit, LogisticsVehicle } from '../types';
import { mockDefaultActiveOrder, mockStorageUnits, mockLogisticsVehicles } from '../data/mockData';

const STORAGE_KEY = 'farmdirect_active_order_v1';

export const storageService = {
  getOrder(): ActiveOrder {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch {
      // Fallback
    }
    return mockDefaultActiveOrder;
  },

  saveOrder(order: ActiveOrder): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch (e) {
      console.error('Failed to save order to local storage', e);
    }
  },

  getAvailableStorage(): ColdStorageUnit[] {
    return mockStorageUnits;
  },

  getAvailableLogistics(): LogisticsVehicle[] {
    return mockLogisticsVehicles;
  },

  clearOrder(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};
