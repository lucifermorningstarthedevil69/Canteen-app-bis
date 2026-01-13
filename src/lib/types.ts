export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  imageHint: string;
  canteenInchargeId: string;
};

export type OrderItem = {
  menuItem: MenuItem;
  quantity: number;
};

export type Order = {
  id: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  totalAmount: number;
  status: 'Pending' | 'Ready' | 'Completed';
  paymentStatus: 'pending' | 'completed';
  items: OrderItem[];
};
