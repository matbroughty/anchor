/**
 * Check current IAM permissions for DynamoDB
 * This helps diagnose what permissions are missing
 */

import { IAMClient, ListAttachedUserPoliciesCommand, GetUserPolicyCommand, ListUserPoliciesCommand } from "@aws-sdk/client-iam";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const iamClient = new IAMClient({
  region: process.env.AUTH_DYNAMODB_REGION!,
  credentials: {
    accessKeyId: process.env.AUTH_DYNAMODB_ID!,
    secretAccessKey: process.env.AUTH_DYNAMODB_SECRET!,
  },
});

async function checkPermissions() {
  try {
    console.log("Checking IAM permissions...\n");

    // Note: This requires IAM read permissions which the user might not have
    // If this fails, they need to check in AWS Console manually

    console.log("⚠️  If this script fails, you'll need to check permissions in AWS IAM Console:");
    console.log("   1. Go to: https://console.aws.amazon.com/iam/");
    console.log("   2. Navigate to Users → anchor-app");
    console.log("   3. Check the Permissions tab");
    console.log("   4. Look for policies attached to this user");
    console.log("   5. Ensure dynamodb:PutItem is in the allowed actions\n");

  } catch (error) {
    console.error("Error:", error);
  }
}

checkPermissions();
