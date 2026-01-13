import { PlaceHolderImages } from './placeholder-images';
import { MenuItem } from './types';

const findImage = (id: string) => {
  const image = PlaceHolderImages.find(img => img.id === id);
  return image ? { url: image.imageUrl, hint: image.imageHint } : { url: `https://picsum.photos/seed/${id}/400/300`, hint: 'food placeholder' };
};

// This static data is no longer needed as we are fetching from Firestore.
// Keeping this file for the findImage utility function if needed elsewhere,
// but the menuItems export is removed.
