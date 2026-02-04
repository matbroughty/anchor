import {
  KMSClient,
  EncryptCommand,
  DecryptCommand,
} from "@aws-sdk/client-kms";

// Create KMS client with region from environment
const kmsClient = new KMSClient({
  region: process.env.AUTH_DYNAMODB_REGION!,
  credentials: {
    accessKeyId: process.env.AUTH_DYNAMODB_ID!,
    secretAccessKey: process.env.AUTH_DYNAMODB_SECRET!,
  },
});

// Encryption context constants - MUST match exactly between encrypt and decrypt
const ENCRYPTION_CONTEXT = {
  purpose: "spotify-token",
  app: "anchor",
} as const;

/**
 * Encrypts a plaintext token using AWS KMS
 *
 * @param plaintext - The token to encrypt (must be under 4KB)
 * @returns Base64-encoded ciphertext
 * @throws Error if encryption fails
 */
export async function encryptToken(plaintext: string): Promise<string> {
  try {
    const command = new EncryptCommand({
      KeyId: process.env.KMS_KEY_ID!,
      Plaintext: Buffer.from(plaintext, "utf-8"),
      EncryptionContext: ENCRYPTION_CONTEXT,
    });

    const response = await kmsClient.send(command);

    if (!response.CiphertextBlob) {
      throw new Error("KMS encryption failed: no ciphertext returned");
    }

    // Return base64-encoded ciphertext for storage
    return Buffer.from(response.CiphertextBlob).toString("base64");
  } catch (error) {
    console.error("KMS encryption error:", error);
    throw new Error(
      `Failed to encrypt token: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Decrypts a ciphertext token using AWS KMS
 *
 * @param ciphertext - Base64-encoded ciphertext from encryptToken
 * @returns Decrypted plaintext token
 * @throws Error if decryption fails
 */
export async function decryptToken(ciphertext: string): Promise<string> {
  try {
    const command = new DecryptCommand({
      KeyId: process.env.KMS_KEY_ID!,
      CiphertextBlob: Buffer.from(ciphertext, "base64"),
      EncryptionContext: ENCRYPTION_CONTEXT,
    });

    const response = await kmsClient.send(command);

    if (!response.Plaintext) {
      throw new Error("KMS decryption failed: no plaintext returned");
    }

    // Return decrypted plaintext as string
    return Buffer.from(response.Plaintext).toString("utf-8");
  } catch (error) {
    console.error("KMS decryption error:", error);
    throw new Error(
      `Failed to decrypt token: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
