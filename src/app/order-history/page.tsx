'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import Image from 'next/image';
import { type Order, type OrderItem as OrderItemType } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Utensils } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const statusStyles: { [key: string]: string } = {
  Pending:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  Ready: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  Completed:
    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
};

function OrderItem({ item }: { item: OrderItemType }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Image
          src={item.menuItem.image}
          alt={item.menuItem.name}
          width={40}
          height={40}
          className="rounded-md"
        />
        <div>
          <p className="font-medium">{item.menuItem.name}</p>
          <p className="text-sm text-muted-foreground">
            Quantity: {item.quantity}
          </p>
        </div>
      </div>
      <p className="font-mono text-sm text-muted-foreground">
        ${(item.menuItem.price * item.quantity).toFixed(2)}
      </p>
    </div>
  );
}

function OrderHistoryCard({ order }: { order: Order }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="font-headline text-lg">
            Order #{order.id.substring(0, 7)}
          </CardTitle>
          <CardDescription>
            {format(new Date(order.orderDate), 'PPpp')}
          </CardDescription>
        </div>
        <Badge className={statusStyles[order.status]}>{order.status}</Badge>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>View Items</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <OrderItem key={index} item={item} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
      <CardFooter className="bg-muted/50 p-4">
        <div className="flex w-full justify-between text-md font-bold">
          <span>Total</span>
          <span>${order.totalAmount.toFixed(2)}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

function OrderHistorySkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                    <CardFooter>
                         <Skeleton className="h-6 w-1/4 ml-auto" />
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}

export default function OrderHistoryPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const ordersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('orderDate', 'desc')
    );
  }, [firestore, user]);

  const { data: orders, isLoading } = useCollection<Order>(ordersQuery);

  if (isUserLoading) {
      return <OrderHistorySkeleton />;
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 text-center">
        <Utensils className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Login to View Your Orders</h2>
        <p className="text-muted-foreground">
          You need to be logged in to see your order history.
        </p>
        <Button asChild>
          <Link href="/login">Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Your Order History</h1>
        <p className="text-muted-foreground">
          A list of all your past orders from CanteenConnect.
        </p>
      </div>

      {isLoading && <OrderHistorySkeleton />}

      {!isLoading && orders && orders.length > 0 && (
        <div className="space-y-6">
          {orders.map((order) => (
            <OrderHistoryCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {!isLoading && (!orders || orders.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
            <Utensils className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold">No Orders Found</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            You haven't placed any orders yet.
          </p>
          <Button asChild>
            <Link href="/">Start Ordering</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
