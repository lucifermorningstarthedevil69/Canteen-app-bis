
"use client";

import Image from "next/image";
import React, { useState, useMemo, useContext } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MenuItem, type OrderItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Minus, Plus, ShoppingCart, Utensils, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAuth, useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { collection } from 'firebase/firestore';

// A custom hook to provide cart state and actions to all components
// This avoids prop drilling for cart functionality.
const CartContext = React.createContext<{
  cart: OrderItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (item: MenuItem) => void;
  clearCart: () => void;
} | null>(null);

function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<OrderItem[]>([]);

  const addToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.menuItem.id === item.id);
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.menuItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevCart, { menuItem: item, quantity: 1 }];
    });
  };

  const removeFromCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.menuItem.id === item.id);
      if (existingItem && existingItem.quantity > 1) {
        return prevCart.map((cartItem) =>
          cartItem.menuItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        );
      }
      return prevCart.filter((cartItem) => cartItem.menuItem.id !== item.id);
    });
  };
  
  const clearCart = () => {
    setCart([]);
  };

  const value = { cart, addToCart, removeFromCart, clearCart };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function Header({ cartItemCount }: { cartItemCount: number }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    signOut(auth).then(() => {
      router.push('/login');
    });
  };

  const getFirstName = (displayName: string | null | undefined) => {
    if (!displayName) return '';
    return displayName.split(' ')[0];
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight font-headline">
            CanteenConnect
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                <span className="sr-only">Open Cart</span>
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {cartItemCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <CartSheetContent />
          </Sheet>

          {isUserLoading ? null : user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Welcome, {getFirstName(user.displayName)}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="overflow-hidden rounded-full"
                  >
                    <Avatar>
                      <AvatarImage src={user.photoURL ?? ""} alt={user.displayName ?? ""} />
                      <AvatarFallback>{user.displayName?.charAt(0) ?? user.email?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/order-history">Order History</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
                <Button variant="outline" asChild>
                    <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                    <Link href="/signup">Sign Up</Link>
                </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function CartSheetContent() {
  const { cart, addToCart, removeFromCart, clearCart } = useCart();
  const { toast } = useToast();
  const { user } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const orderTotal = useMemo(
    () =>
      cart.reduce((total, item) => total + item.menuItem.price * item.quantity, 0),
    [cart]
  );
  
  const handlePlaceOrder = () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in or sign up to place an order.",
      });
      router.push('/login');
      return;
    }

    if (cart.length === 0) {
      toast({
        variant: "destructive",
        title: "Your cart is empty",
        description: "Please add items to your cart before placing an order.",
      });
      return;
    }
    
    const newOrder = {
      customerId: user.uid,
      customerName: user.displayName || "Anonymous",
      orderDate: new Date().toISOString(),
      totalAmount: orderTotal,
      status: 'Pending',
      paymentStatus: 'pending',
      items: cart,
    };

    const ordersCollection = collection(firestore, 'orders');
    addDocumentNonBlocking(ordersCollection, newOrder);

    toast({
      title: "Order Placed!",
      description: "Your order has been sent to the canteen.",
    });
    
    clearCart();
    // The Sheet will close because of SheetClose, or you could programmatically close it.
  };

  return (
    <SheetContent className="flex flex-col">
      <SheetHeader>
        <SheetTitle>Your Order</SheetTitle>
        <SheetDescription>
          Review your items below.
        </SheetDescription>
      </SheetHeader>
      <ScrollArea className="flex-grow pr-4 -mr-6">
        {cart.length > 0 ? (
          <div className="flex flex-col gap-4 py-4">
            {cart.map((item) => (
              <div key={item.menuItem.id} className="flex items-center gap-4">
                <Image
                  src={item.menuItem.image}
                  alt={item.menuItem.name}
                  width={64}
                  height={64}
                  className="rounded-md object-cover"
                />
                <div className="flex-grow">
                  <p className="font-semibold">{item.menuItem.name}</p>
                  <p className="text-sm text-muted-foreground">
                    ${item.menuItem.price.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeFromCart(item.menuItem)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => addToCart(item.menuItem)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
          </div>
        )}
      </ScrollArea>
      {cart.length > 0 && (
        <SheetFooter className="mt-auto pt-4 border-t">
          <div className="w-full space-y-4">
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>${orderTotal.toFixed(2)}</span>
            </div>
            <SheetClose asChild>
              <Button className="w-full" onClick={handlePlaceOrder}>Place Order</Button>
            </SheetClose>
          </div>
        </SheetFooter>
      )}
    </SheetContent>
  );
}

function MenuItemCard({ item }: { item: MenuItem }) {
  const { addToCart } = useCart();
  const { toast } = useToast();

  const handleAddToCart = () => {
    addToCart(item);
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your order.`,
    });
  };
  
  return (
    <Card className="flex flex-col overflow-hidden shadow-md transition-shadow hover:shadow-xl">
      <CardHeader className="p-0">
        <Image
          src={item.image}
          alt={item.name}
          width={400}
          height={300}
          className="w-full h-48 object-cover"
          data-ai-hint={item.imageHint}
        />
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg font-headline">{item.name}</CardTitle>
        <CardDescription className="mt-1 text-sm">
          {item.description}
        </CardDescription>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <p className="font-bold text-lg text-primary">${item.price.toFixed(2)}</p>
        <Button onClick={handleAddToCart}>
          <Plus className="mr-2 h-4 w-4" /> Add to Order
        </Button>
      </CardFooter>
    </Card>
  );
}


export default function Home() {
  return (
    <CartProvider>
      <PageContent />
    </CartProvider>
  );
}

function PageContent() {
  const { cart } = useCart();
  const firestore = useFirestore();
  const menuItemsCollection = useMemoFirebase(() => collection(firestore, 'menuItems'), [firestore]);
  const { data: menuItems } = useCollection<MenuItem>(menuItemsCollection);
  const cartItemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header cartItemCount={cartItemCount} />
      <main className="container py-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight font-headline sm:text-4xl">
            Today's Menu
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Freshly prepared and ready to order.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {menuItems?.map((item) => (
            <MenuItemCard key={item.id} item={item} />
          ))}
        </div>
      </main>
      <footer className="py-6 mt-12 border-t">
        <div className="container text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CanteenConnect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
