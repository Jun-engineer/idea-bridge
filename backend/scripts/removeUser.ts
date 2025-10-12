#!/usr/bin/env ts-node
import "dotenv/config";
import { exit } from "process";
import {
  getUserByEmail,
  destroyAllSessionsForUser,
  softDeleteUser,
} from "../src/data/userStore";
import { clearVerificationForUser } from "../src/data/verificationStore";

async function main() {
  const [, , ...args] = process.argv;
  const emailArgIndex = args.findIndex((arg) => arg === "--email" || arg === "-e");

  if (emailArgIndex === -1 || emailArgIndex === args.length - 1) {
    console.error("Usage: ts-node scripts/removeUser.ts --email user@example.com");
    exit(1);
  }

  const email = args[emailArgIndex + 1].toLowerCase();

  const user = await getUserByEmail(email);
  if (!user) {
    console.error(`No user found for ${email}`);
    exit(1);
  }

  await destroyAllSessionsForUser(user.id);
  await clearVerificationForUser(user.id, "phone");
  await softDeleteUser(user.id);

  console.log(`Removed user ${email}. You can now re-register this address.`);
}

main().catch((err) => {
  console.error("Failed to remove user:", err);
  exit(1);
});
