
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, CheckCircle, Trash2, ShieldAlert } from 'lucide-react';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  updateDocumentNonBlocking,
  useUser,
  useDoc,
} from '@/firebase';
import { collection, doc, query, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'canteen-incharge' | 'admin';
  status: 'pending' | 'approved';
  department: string;
  designation: string;
};

const statusStyles: { [key: string]: string } = {
  pending:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  approved:
    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
};

const roleStyles: { [key: string]: string } = {
    customer: 'bg-blue-100 text-blue-800',
    'canteen-incharge': 'bg-purple-100 text-purple-800',
    admin: 'bg-red-100 text-red-800',
}

export default function AccountsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<{role: string}>(userDocRef);

  useEffect(() => {
    if (!isProfileLoading && userProfile?.role !== 'admin') {
      router.push('/admin/dashboard'); // Redirect non-admins
    }
  }, [userProfile, isProfileLoading, router]);

  const usersQuery = useMemoFirebase(
    () => (userProfile?.role === 'admin' ? query(collection(firestore, 'users')) : null),
    [firestore, userProfile]
  );
  const { data: users, isLoading } = useCollection<UserProfile>(usersQuery);

  const handleApprove = (userId: string) => {
    const userDoc = doc(firestore, 'users', userId);
    updateDocumentNonBlocking(userDoc, { status: 'approved' });
    toast({
      title: 'User Approved',
      description: 'The user account has been successfully approved.',
    });
  };

  const handleDelete = async (userId: string) => {
    // Note: This only deletes the Firestore user document, not the Auth user.
    // For a production app, you'd want a Cloud Function to handle this.
    try {
      await deleteDoc(doc(firestore, 'users', userId));
      toast({
        variant: 'destructive',
        title: 'User Deleted',
        description: 'The user profile has been removed.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete the user profile.',
      });
    }
  };
  
  if (isProfileLoading) {
      return <div>Loading...</div>
  }

  if (userProfile?.role !== 'admin') {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
            <Button onClick={() => router.push('/admin/dashboard')} className="mt-6">Go to Dashboard</Button>
        </div>
      );
  }

  return (
    <div className="py-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline">Account Management</h1>
        <p className="text-muted-foreground">
          Approve, manage, and delete user accounts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>
            A list of all registered users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Department</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading users...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge className={roleStyles[u.role]} variant="outline">{u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusStyles[u.status]}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {u.department}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {u.status === 'pending' && (
                            <DropdownMenuItem onClick={() => handleApprove(u.id)}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(u.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
