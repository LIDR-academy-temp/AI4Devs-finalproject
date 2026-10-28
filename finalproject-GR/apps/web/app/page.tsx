import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { decideLanding } from '../lib/landing';

export default async function RootPage() {
  const { userId } = await auth();
  redirect(decideLanding(Boolean(userId)));
}
