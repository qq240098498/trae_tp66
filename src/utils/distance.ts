import { Customer, DeliveryStaff } from '../types';

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const findNearestDeliveryStaff = (
  customer: Customer,
  staffs: DeliveryStaff[]
): DeliveryStaff | null => {
  const availableStaffs = staffs.filter((s) => s.status === 'idle');

  const staffWithDistance = availableStaffs
    .map((staff) => ({
      staff,
      distance: calculateDistance(
        customer.latitude,
        customer.longitude,
        staff.latitude,
        staff.longitude
      ),
    }))
    .filter((item) => item.distance <= 5);

  if (staffWithDistance.length === 0) return null;

  staffWithDistance.sort((a, b) => a.distance - b.distance);
  return staffWithDistance[0].staff;
};
