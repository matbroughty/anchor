import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "./dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

// Reserved handles that cannot be claimed
const RESERVED_HANDLES = [
  "admin",
  "api",
  "auth",
  "signin",
  "signout",
  "profile",
  "settings",
  "verify-email",
  "anchor",
  "www",
  "mail",
  "help",
  "support",
];

/**
 * Validates a handle format
 * Rules:
 * - Length: 3-30 characters
 * - Characters: lowercase alphanumeric and hyphens only
 * - No leading or trailing hyphens
 * - No consecutive hyphens
 * - Not a reserved handle
 */
export function validateHandle(handle: string): {
  valid: boolean;
  error?: string;
} {
  // Normalize to lowercase
  const normalized = handle.toLowerCase();

  // Check length
  if (normalized.length < 3) {
    return { valid: false, error: "Handle must be at least 3 characters" };
  }
  if (normalized.length > 30) {
    return { valid: false, error: "Handle must be 30 characters or less" };
  }

  // Check reserved handles
  if (RESERVED_HANDLES.includes(normalized)) {
    return { valid: false, error: "This handle is reserved" };
  }

  // Check leading/trailing hyphens
  if (normalized.startsWith("-")) {
    return { valid: false, error: "Handle cannot start with a hyphen" };
  }
  if (normalized.endsWith("-")) {
    return { valid: false, error: "Handle cannot end with a hyphen" };
  }

  // Check for consecutive hyphens
  if (normalized.includes("--")) {
    return { valid: false, error: "Handle cannot contain consecutive hyphens" };
  }

  // Check character set (lowercase alphanumeric and hyphens only)
  const validPattern = /^[a-z0-9-]+$/;
  if (!validPattern.test(normalized)) {
    return {
      valid: false,
      error: "Handle can only contain lowercase letters, numbers, and hyphens",
    };
  }

  return { valid: true };
}

/**
 * Check if a handle is available (not already claimed)
 */
export async function isHandleAvailable(handle: string): Promise<boolean> {
  const normalized = handle.toLowerCase();
  const handleKey = `HANDLE#${normalized}`;

  try {
    const result = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: handleKey,
          sk: handleKey,
        },
      })
    );

    // If Item exists, handle is taken
    return !result.Item;
  } catch (error) {
    console.error("Error checking handle availability:", error);
    throw error;
  }
}

/**
 * Claim a handle for a user using DynamoDB transaction
 * This prevents race conditions where two users try to claim the same handle
 */
export async function claimHandle(
  userId: string,
  handle: string
): Promise<{ success: boolean; error?: string }> {
  // Normalize handle
  const normalized = handle.toLowerCase();

  // Validate format first
  const validation = validateHandle(normalized);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const handleKey = `HANDLE#${normalized}`;
  const userKey = `USER#${userId}`;

  try {
    // Use transaction to atomically:
    // 1. Reserve the handle (fails if already exists)
    // 2. Update user record with handle
    await dynamoDocumentClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            // Reserve the handle - fails if pk already exists
            Put: {
              TableName: TABLE_NAME,
              Item: {
                pk: handleKey,
                sk: handleKey,
                userId: userId,
                claimedAt: new Date().toISOString(),
              },
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
          {
            // Update user with handle
            Update: {
              TableName: TABLE_NAME,
              Key: { pk: userKey, sk: userKey },
              UpdateExpression: "SET handle = :handle, updatedAt = :time",
              ExpressionAttributeValues: {
                ":handle": normalized,
                ":time": new Date().toISOString(),
              },
            },
          },
        ],
      })
    );

    return { success: true };
  } catch (error: any) {
    // Transaction cancelled means the handle already exists
    if (error.name === "TransactionCanceledException") {
      return { success: false, error: "Handle already taken" };
    }
    console.error("Error claiming handle:", error);
    throw error;
  }
}
