import type { Customer, SystemConfig } from '../types';

export const DEFAULT_UNIT_PRICE = 20;
export const DEFAULT_FLOOR_FEE_RATE = 2;
export const FREE_FLOOR_THRESHOLD = 3;

export interface PricingResult {
  unitPrice: number;
  floorFeeRate: number;
  floorFee: number;
  totalAmount: number;
}

export interface CalculatePricingParams {
  customer: Customer;
  quantity: number;
  unitPrice?: number;
  floorFeeRate?: number;
  freeFloorThreshold?: number;
  disableFloorFee?: boolean;
}

export const parseFloor = (floorStr: string): number => {
  const match = floorStr.match(/(\d+)/);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  if (num >= 100) {
    return Math.floor(num / 100);
  }
  return num;
};

export const shouldAddFloorFee = (
  customer: Customer,
  freeFloorThreshold: number = FREE_FLOOR_THRESHOLD
): boolean => {
  const floor = parseFloor(customer.floor);
  return floor > freeFloorThreshold && !customer.hasElevator;
};

export const calculateFloorFee = (
  customer: Customer,
  quantity: number,
  floorFeeRate: number = DEFAULT_FLOOR_FEE_RATE,
  freeFloorThreshold: number = FREE_FLOOR_THRESHOLD,
  disableFloorFee: boolean = false
): number => {
  if (disableFloorFee || !shouldAddFloorFee(customer, freeFloorThreshold)) {
    return 0;
  }
  const floor = parseFloor(customer.floor);
  const extraFloors = floor - freeFloorThreshold;
  return extraFloors * floorFeeRate * quantity;
};

export const calculatePricing = (params: CalculatePricingParams): PricingResult => {
  const {
    customer,
    quantity,
    unitPrice = DEFAULT_UNIT_PRICE,
    floorFeeRate = DEFAULT_FLOOR_FEE_RATE,
    freeFloorThreshold = FREE_FLOOR_THRESHOLD,
    disableFloorFee = false,
  } = params;

  const productAmount = unitPrice * quantity;
  const floorFee = calculateFloorFee(customer, quantity, floorFeeRate, freeFloorThreshold, disableFloorFee);
  const totalAmount = productAmount + floorFee;

  return {
    unitPrice,
    floorFeeRate,
    floorFee,
    totalAmount,
  };
};

export const calculatePricingWithConfig = (
  params: Omit<CalculatePricingParams, 'unitPrice' | 'floorFeeRate' | 'freeFloorThreshold'>,
  config: SystemConfig
): PricingResult => {
  return calculatePricing({
    ...params,
    unitPrice: config.unitPrice,
    floorFeeRate: config.floorFeeRate,
    freeFloorThreshold: config.freeFloorThreshold,
  });
};
