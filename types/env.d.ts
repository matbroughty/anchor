declare namespace NodeJS {
  interface ProcessEnv {
    // Auth.js
    AUTH_SECRET: string;
    AUTH_URL: string;

    // AWS DynamoDB
    AUTH_DYNAMODB_ID: string;
    AUTH_DYNAMODB_SECRET: string;
    AUTH_DYNAMODB_REGION: string;

    // AWS KMS
    KMS_KEY_ID: string;

    // Google OAuth
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;

    // Resend
    AUTH_RESEND_KEY?: string;

    // Spotify
    SPOTIFY_CLIENT_ID?: string;
    SPOTIFY_CLIENT_SECRET?: string;

    // Node environment
    NODE_ENV: "development" | "production" | "test";
  }
}
