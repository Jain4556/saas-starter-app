import { Webhook } from "svix";
import { headers } from "next/headers";
import type { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Missing WEBHOOK_SECRET in environment variables");
  }

  // 🔥 1️⃣ Read raw body FIRST (VERY IMPORTANT for Svix)
  const body = await req.text();

  // 🔥 2️⃣ Then read headers
  const headerPayload = await headers();

  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as unknown as WebhookEvent;

    console.log("✅ Signature verified:", evt.type);
  } catch (err: any) {
    console.error("🔥 Signature verification failed:", err?.message);
    return new Response("Invalid signature", { status: 400 });
  }

  // 🔥 3️⃣ Handle Clerk events
  if (evt.type === "user.created") {
    try {
      const { id, email_addresses, primary_email_address_id } = evt.data;

      const primaryEmail = email_addresses.find(
        (email: any) => email.id === primary_email_address_id
      );


      if (!primaryEmail) {
        return new Response("Primary email not found", { status: 400 });
      }

      await prisma.user.upsert({
        where: { id },
        update: {},
        create: {
          id,
          email: primaryEmail.email_address,
          isSubscribed: false,
        },
      });

      console.log("✅ User saved to database");

      console.log("EMAIL ADDRESSES:", evt.data.email_addresses);
console.log("PRIMARY ID:", evt.data.primary_email_address_id);
    } catch (error) {
      console.error("🔥 Database error:", error);
      return new Response("Database error", { status: 500 });
    }
  }

  return new Response("Webhook received successfully", { status: 200 });
}