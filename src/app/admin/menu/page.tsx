
"use client";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCollection, useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useMemoFirebase, useDoc } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { MenuItem } from "@/lib/types";

function MenuForm({
  menuItem,
  onSave,
  onClose,
}: {
  menuItem?: MenuItem | null;
  onSave: (item: Omit<MenuItem, "id" | "imageHint" | "canteenInchargeId"> & { id?: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(menuItem?.name || "");
  const [description, setDescription] = useState(menuItem?.description || "");
  const [price, setPrice] = useState(menuItem?.price || 0);
  const [image, setImage] = useState(menuItem?.image || "");

  const handleSubmit = () => {
    onSave({ id: menuItem?.id, name, description, price, image });
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{menuItem ? "Edit Menu Item" : "Add New Item"}</DialogTitle>
        <DialogDescription>
          {menuItem ? "Update the details for this item." : "Add a new item to the daily menu."}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">
            Description
          </Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="price" className="text-right">
            Price
          </Label>
          <Input id="price" type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="image" className="text-right">
            Image URL
          </Label>
          <Input id="image" value={image} onChange={(e) => setImage(e.target.value)} className="col-span-3" placeholder="https://example.com/image.jpg"/>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Save Changes</Button>
      </DialogFooter>
    </DialogContent>
  );
}


export default function MenuPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid) : null, [user, firestore]);
  const { data: userProfile } = useDoc<{role: string}>(userDocRef);

  const menuItemsCollection = useMemoFirebase(() => collection(firestore, 'menuItems'), [firestore]);
  const { data: menuItems, isLoading } = useCollection<MenuItem>(menuItemsCollection);

  const canManageMenu = userProfile?.role === 'admin' || userProfile?.role === 'canteen-incharge';

  const handleSave = (item: Omit<MenuItem, "id" | "imageHint"| "canteenInchargeId"> & { id?: string }) => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in to manage the menu." });
        return;
    }
    
    const image = item.image || `https://picsum.photos/seed/${encodeURIComponent(item.name)}/400/300`;

    if (item.id) {
      // Edit
      const menuItemDoc = doc(firestore, "menuItems", item.id);
      updateDocumentNonBlocking(menuItemDoc, { ...item, image });
      toast({ title: "Item Updated", description: `${item.name} has been updated.` });
    } else {
      // Add
      const newItem: Omit<MenuItem, "id"> = {
        name: item.name,
        description: item.description,
        price: item.price,
        image: image,
        imageHint: "food",
        canteenInchargeId: user.uid
      };
      addDocumentNonBlocking(collection(firestore, 'menuItems'), newItem);
      toast({ title: "Item Added", description: `${item.name} has been added to the menu.` });
    }
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleDelete = (id: string) => {
    deleteDocumentNonBlocking(doc(firestore, "menuItems", id));
    toast({ variant: "destructive", title: "Item Deleted", description: "The item has been removed from the menu." });
  };

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Menu Management</h1>
          <p className="text-muted-foreground">
            Add, edit, or remove items from the canteen menu.
          </p>
        </div>
        {canManageMenu && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={openNewDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Item
                </Button>
            </DialogTrigger>
            <MenuForm 
                menuItem={editingItem} 
                onSave={handleSave} 
                onClose={() => setIsDialogOpen(false)}
            />
            </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
           <CardTitle>Current Menu</CardTitle>
           <CardDescription>A list of all items currently available for order.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden w-[100px] sm:table-cell">
                    Image
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  {canManageMenu && (
                    <TableHead>
                        <span className="sr-only">Actions</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                    <TableRow>
                        <TableCell colSpan={canManageMenu ? 5 : 4} className="text-center">Loading menu...</TableCell>
                    </TableRow>
                )}
                {!isLoading && menuItems?.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="hidden sm:table-cell">
                      <Image
                        alt={item.name}
                        className="aspect-square rounded-md object-cover"
                        height="64"
                        src={item.image}
                        width="64"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>${item.price.toFixed(2)}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs truncate">
                      {item.description}
                    </TableCell>
                    {canManageMenu && (
                        <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(item)}>
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(item.id)}
                            >
                                Delete
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}
