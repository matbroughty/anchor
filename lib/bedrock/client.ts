import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

/**
 * Uses the same IAM credentials as DynamoDB (AUTH_DYNAMODB_ID / SECRET / REGION)
 * because the project runs a single IAM user for all AWS services.
 */
export const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AUTH_DYNAMODB_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AUTH_DYNAMODB_ID!,
    secretAccessKey: process.env.AUTH_DYNAMODB_SECRET!,
  },
});
