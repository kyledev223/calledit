import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile/ProfileView";
import { getCurrentUser } from "@/lib/auth/session";
import { getCallsBackedBy, getCallsByAuthor, getProfile } from "@/lib/queries";
import { displayNameOf } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ wallet: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { wallet } = await params;
  const profile = await getProfile(wallet);
  return { title: profile ? displayNameOf(profile.user) : "Profile" };
}

export default async function UserPage({ params }: Props) {
  const { wallet } = await params;
  const me = await getCurrentUser();
  const profile = await getProfile(wallet, me?.id);
  if (!profile) notFound();
  const [calls, backed] = await Promise.all([getCallsByAuthor(profile.user.id, me?.id), getCallsBackedBy(profile.user.id, me?.id)]);
  return <ProfileView profile={profile} calls={calls} backed={backed} />;
}
