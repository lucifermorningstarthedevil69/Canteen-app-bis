"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Truck } from "lucide-react";
import Image from "next/image";
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import { Order, OrderItem } from "@/lib/types";

const statusStyles = {
  Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  Ready: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  Completed: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
};

function OrderCard({ order, onStatusChange }: { order: Order, onStatusChange: (id: string, status: Order['status']) => void }) {
  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4" />;
      case "Ready":
        return <Truck className="h-4 w-4" />;
      case "Completed":
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-lg">Order #{order.id.substring(0, 7)}</CardTitle>
            <CardDescription>
              For {order.customerName} - {format(new Date(order.orderDate), "PPpp")}
            </CardDescription>
          </div>
          <Badge className={`flex items-center gap-1 ${statusStyles[order.status]}`}>
            {getStatusIcon(order.status)}
            {order.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {order.items.map((item, index) => (
            <li key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src={item.menuItem.image} alt={item.menuItem.name} width={40} height={40} className="rounded-md"/>
                <div>
                  <span className="font-medium">{item.menuItem.name}</span>
                  <span className="text-muted-foreground"> x {item.quantity}</span>
                </div>
              </div>
              <span className="font-mono text-muted-foreground">
                ${(item.menuItem.price * item.quantity).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <Separator className="my-4" />
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>${order.totalAmount.toFixed(2)}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {order.status === "Pending" && (
          <Button variant="outline" onClick={() => onStatusChange(order.id, 'Ready')}>
            Mark as Ready
          </Button>
        )}
        {order.status === "Ready" && (
          <Button onClick={() => onStatusChange(order.id, 'Completed')}>Mark as Completed</Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default function DashboardPage() {
    const firestore = useFirestore();

    const ordersQuery = useMemoFirebase(
        () => query(collection(firestore, 'orders')),
        [firestore]
    );

    const { data: orders } = useCollection<Order>(ordersQuery);

  const handleStatusChange = (id: string, status: Order['status']) => {
    const orderDocRef = doc(firestore, "orders", id);
    updateDocumentNonBlocking(orderDocRef, { status });
  };
  
  const pendingOrders = orders?.filter(o => o.status === 'Pending') || [];
  const readyOrders = orders?.filter(o => o.status === 'Ready') || [];
  const completedOrders = orders?.filter(o => o.status === 'Completed') || [];

  return (
    <div className="py-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Order Dashboard</h1>
        <p className="text-muted-foreground">
          Manage and track all incoming canteen orders.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="space-y-6">
          <h2 className="text-xl font-semibold font-headline flex items-center gap-2"><Clock className="text-yellow-500"/> Pending Orders</h2>
          {pendingOrders.length > 0 ? pendingOrders.map((order) => (
            <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
          )) : <p className="text-muted-foreground text-sm">No pending orders.</p>}
        </div>
        <div className="space-y-6">
          <h2 className="text-xl font-semibold font-headline flex items-center gap-2"><Truck className="text-blue-500"/> Orders Ready</h2>
          {readyOrders.length > 0 ? readyOrders.map((order) => (
            <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
          )) : <p className="text-muted-foreground text-sm">No orders are ready for pickup.</p>}
        </div>
        <div className="space-y-6">
          <h2 className="text-xl font-semibold font-headline flex items-center gap-2"><CheckCircle className="text-green-500"/> Completed Orders</h2>
          {completedOrders.length > 0 ? completedOrders.map((order) => (
            <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
          )) : <p className="text-muted-foreground text-sm">No orders have been completed yet.</p>}
        </div>
      </div>
    </div>
  );
}
