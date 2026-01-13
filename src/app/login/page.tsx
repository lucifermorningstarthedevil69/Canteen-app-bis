
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { useState, useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!isUserLoading && user) {
      // If user is already logged in, redirect them.
      // We can add logic here to redirect based on role if needed.
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      if (loggedInUser) {
        const userDocRef = doc(firestore, "users", loggedInUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          toast({
            title: "Login Successful",
            description: `Welcome back, ${userData.name.split(' ')[0]}!`,
          });
          if (userData.role === 'admin' || userData.role === 'canteen-incharge') {
            router.push("/admin/dashboard");
          } else {
            router.push("/");
          }
        } else {
           // if no user doc, just go to the homepage
           router.push("/");
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "An unexpected error occurred.",
      });
    }
  };

  if (isUserLoading || user) {
    return null; // Render nothing while loading or redirecting
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-xl">
        <form onSubmit={handleLogin}>
          <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 mb-2">
              <Utensils className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight font-headline">
                CanteenConnect
              </h1>
            </div>
            <CardTitle className="text-xl">Login</CardTitle>
            <CardDescription>
              Enter your email and password to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button className="w-full" type="submit">
              Sign In
            </Button>
            <p className="text-xs text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/signup" className="underline underline-offset-2 hover:text-primary">
                Sign Up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
