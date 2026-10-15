import Link from "next/link";
import { Eyebrow, Heading } from "@/components/ui/Section";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-24 text-center">
      <Eyebrow className="mb-4">404</Eyebrow>
      <Heading lead="No receipt" accent="for that." />
      <p className="mt-4 text-fg2">The page you wanted isn&apos;t on the tape.</p>
      <Link href="/" className="btn btn-primary mt-8">Back home</Link>
    </div>
  );
}
