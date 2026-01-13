
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ClipboardList, Pizza, Utensils, LogOut, ShieldAlert, Users } from "lucide-react";
import { useAuth, useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc } from "firebase/firestore";
import { useEffect } from "react";

function AdminHeader() {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const handleLogout = () => {
    signOut(auth).then(() => {
      router.push('/login');
    });
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
       <div className="flex items-center gap-2 md:hidden">
          <Utensils className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight font-headline">
            CanteenConnect
          </h1>
        </div>
      <SidebarTrigger className="md:hidden" />
      <div className="relative ml-auto flex-1 md:grow-0">
        {/* Can add a search bar here later */}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full"
          >
            <Avatar>
              <AvatarImage src={user?.photoURL ?? "https://i.pravatar.cc/150?u=admin"} alt={user?.displayName ?? "Admin"} />
              <AvatarFallback>{user?.displayName?.charAt(0) ?? 'A'}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem>Support</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<{role: string}>(userDocRef);

  useEffect(() => {
    const isLoading = isUserLoading || isProfileLoading;
    if (!isLoading && !userProfile) {
        // If there's no user or no profile, redirect to login
        router.push("/login");
        return;
    }

    if (!isLoading && userProfile) {
        const role = userProfile.role;
        if (role !== 'admin' && role !== 'canteen-incharge') {
            router.push("/"); // Redirect non-admins to homepage
        }
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  const handleLogout = () => {
    signOut(auth).then(() => {
      router.push('/login');
    });
  };
  
  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Utensils className="h-12 w-12 animate-spin text-primary"/>
        </div>
    );
  }

  if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'canteen-incharge')) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
            <Button onClick={() => router.push('/')} className="mt-6">Go to Homepage</Button>
        </div>
      );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Utensils className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold font-headline text-foreground">
              CanteenConnect
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/admin/dashboard" legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={isActive("/admin/dashboard")}
                  tooltip="Dashboard"
                >
                  <ClipboardList />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Link href="/admin/menu" legacyBehavior passHref>
                <SidebarMenuButton isActive={isActive("/admin/menu")} tooltip="Menu">
                  <Pizza />
                  <span>Menu</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
             {userProfile?.role === 'admin' && (
                <SidebarMenuItem>
                <Link href="/admin/accounts" legacyBehavior passHref>
                    <SidebarMenuButton isActive={isActive("/admin/accounts")} tooltip="Accounts">
                    <Users />
                    <span>Accounts</span>
                    </SidebarMenuButton>
                </Link>
                </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="justify-start w-full gap-2 px-2">
                         <Avatar className="w-8 h-8">
                            <AvatarImage src={user?.photoURL ?? "https://i.pravatar.cc/150?u=admin"} alt={user?.displayName ?? "Admin"} />
                            <AvatarFallback>{user?.displayName?.charAt(0) ?? 'A'}</AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                            <p className="font-medium text-sm text-foreground">{user?.displayName ?? "Admin User"}</p>
                            <p className="text-xs text-muted-foreground">{user?.email ?? "admin@example.com"}</p>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-muted/40">
        <div className="flex min-h-screen w-full flex-col">
          <AdminHeader />
          <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
