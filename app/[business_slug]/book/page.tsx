// Redirect /[business_slug]/book → /[business_slug]
// The main booking page is now at the root slug URL
import { redirect } from "next/navigation";

export default async function BookPageRedirect({
  params,
}: {
  params: Promise<{ business_slug: string }>;
}) {
  const { business_slug } = await params;
  redirect(`/${business_slug}`);
}
