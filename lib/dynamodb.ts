import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

// Table name for authentication data
export const TABLE_NAME = process.env.AUTH_DYNAMODB_TABLE_NAME || "anchor-auth";

// Create DynamoDB client with credentials from environment variables
const dynamoConfig = {
  credentials: {
    accessKeyId: process.env.AUTH_DYNAMODB_ID!,
    secretAccessKey: process.env.AUTH_DYNAMODB_SECRET!,
  },
  region: process.env.AUTH_DYNAMODB_REGION!.trim(), // Trim any whitespace from region
};

// Create raw DynamoDB client
export const dynamoClient = new DynamoDB(dynamoConfig);

// Create DynamoDB Document client with marshalling options
// These options are required by the Auth.js DynamoDB adapter
export const dynamoDocumentClient = DynamoDBDocument.from(dynamoClient, {
  marshallOptions: {
    // Convert empty strings, blobs, and sets to null
    convertEmptyValues: true,
    // Remove undefined values from objects
    removeUndefinedValues: true,
    // Convert class instances to maps
    convertClassInstanceToMap: true,
  },
});
