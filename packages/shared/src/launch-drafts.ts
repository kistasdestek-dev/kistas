import { z } from 'zod';

const image = z.string().max(2048).refine(value => value === '' || /^https:\/\//.test(value) || /^draft-asset:[0-9a-f-]{36}$/.test(value));
export const launchDraftPayloadSchema = z.object({
  title: z.string().max(150), tagline: z.string().max(160), description: z.string().max(6000),
  categoryId: z.string().uuid().or(z.literal('')), pricingModel: z.enum(['free', 'freemium', 'subscription', 'paid']),
  platforms: z.array(z.enum(['iOS', 'Android', 'Web', 'macOS', 'SaaS'])).min(1).max(5),
  logoUrl: image, coverUrl: image, screenshots: z.array(image).max(6),
  appStoreUrl: z.string().max(2048), playStoreUrl: z.string().max(2048), webUrl: z.string().max(2048),
}).strict();
export type LaunchDraftPayload = z.infer<typeof launchDraftPayloadSchema>;
export interface LaunchDraft {
  id: string; userId: string; sourceListingId: string | null; payload: LaunchDraftPayload;
  revision: number; listingRevision: number | null; updatedAt: string; dirty: boolean;
}
