import { Webhook } from "svix";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Missing WEBHOOK_SECRET");
  }

  const body = await req.text();
  const headerPayload = await headers();

  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.log("Missing headers");
    return new Response("Missing headers", { status: 400 });
  }

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });

    console.log("✅ Signature verified:", evt.type);
  } catch (err: any) {
    console.error("Verification failed:", err.message);
    return new Response("Invalid signature", { status: 400 });
  }

  if (evt.type === "user.created") {
    console.log("Processing user.created");

    const id = evt.data.id;
    const email = evt.data.email_addresses?.[0]?.email_address;

    if (!email) {
      console.log("No email found");
      return new Response("No email", { status: 200 });
    }

    await prisma.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        email,
        isSubscribed: false,
      },
    });

    console.log("User saved");
  }

  console.log("Returning 200");
  return new Response("OK", { status: 200 });
}