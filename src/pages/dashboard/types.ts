import type { Product } from '../website/data/products';
import type { SessionUser } from '@/types/auth';

export const sections = ['overview', 'profile', 'security', 'catalog', 'users'] as const;
export type Section = typeof sections[number];
export const adminSections: Section[] = ['catalog', 'users'];
export const animalOptions = { dogs: 'Perros', cats: 'Gatos', birds: 'Aves', 'small-pets': 'Pequeñas mascotas' };
export const productImages = ['ruff-wheels.jpg', 'eco-collar-sage.jpg', 'eco-collar-pink.jpg', 'petpet-pantry.jpg', 'plaid-fetch-ball.jpg', 'blue-bone-chew.jpg', 'bordeaux-ball.jpg', 'knit-sweater.jpg', 'crunch-treats.jpg', 'feather-wand.jpg'];
export type CatalogRecord = Product & { active: boolean; isDemo: boolean; version: number; updatedAt: string };
export type CatalogInput = Omit<Product, 'price'> & { active: boolean; version?: number };
export type Profile = SessionUser & { createdAt: string; emailVerified: boolean; hasPassword: boolean; googleLinked: boolean };
export type OwnSession = { createdAt: string; expiresAt: string; current: boolean };
export type AccountRecord = SessionUser & { createdAt: string; googleLinked: boolean };
export type Stats = { products: number; visible: number; accounts: number };
export type DashboardProps = {
  user: SessionUser; section: Section; forbidden: boolean; profile: Profile;
  sessions: OwnSession[]; googleEnabled: boolean; stats: Stats | null;
  catalog: CatalogRecord[]; categories: { id: string; name: string }[]; accounts: AccountRecord[];
};
