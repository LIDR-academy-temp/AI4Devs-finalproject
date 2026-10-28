import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as exempt from ClerkAuthGuard (used only by GET /health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
