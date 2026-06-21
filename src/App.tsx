import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/Layout/MainLayout';
import { Dashboard } from '@/pages/Dashboard';
import { CustomerList, CustomerDetail } from '@/pages/Customer';
import { OrderList, OrderDetail, OrderForm } from '@/pages/Order';
import { DeliveryList, DeliveryDispatch } from '@/pages/Delivery';
import { BucketReturnList, BucketReturnRecord } from '@/pages/Bucket';
import { InventoryList, InventoryStock, InventoryCheck } from '@/pages/Inventory';
import { ReconciliationList, ReconciliationHistory } from '@/pages/Reconciliation';
import {
  DepositList,
  CirculationList,
  DamageList,
  DailyReconciliation,
} from '@/pages/BucketAsset';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customer" element={<CustomerList />} />
          <Route path="/customer/:id" element={<CustomerDetail />} />
          <Route path="/order" element={<OrderList />} />
          <Route path="/order/new" element={<OrderForm />} />
          <Route path="/order/:id" element={<OrderDetail />} />
          <Route path="/delivery" element={<DeliveryList />} />
          <Route path="/delivery/dispatch" element={<DeliveryDispatch />} />
          <Route path="/bucket" element={<BucketReturnList />} />
          <Route path="/bucket/record" element={<BucketReturnRecord />} />
          <Route path="/bucket-asset/deposit" element={<DepositList />} />
          <Route path="/bucket-asset/circulation" element={<CirculationList />} />
          <Route path="/bucket-asset/damage" element={<DamageList />} />
          <Route path="/bucket-asset/reconciliation" element={<DailyReconciliation />} />
          <Route path="/inventory" element={<InventoryList />} />
          <Route path="/inventory/stock" element={<InventoryStock />} />
          <Route path="/inventory/check" element={<InventoryCheck />} />
          <Route path="/reconciliation" element={<ReconciliationList />} />
          <Route path="/reconciliation/history" element={<ReconciliationHistory />} />
        </Route>
      </Routes>
    </Router>
  );
}
