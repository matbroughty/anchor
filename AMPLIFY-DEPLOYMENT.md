# AWS Amplify Deployment Guide

## Critical Environment Variables for Amplify

When deploying to AWS Amplify, you **must** configure these environment variables in the Amplify Console. Missing or incorrect variables will cause authentication failures.

### Required Environment Variables

Go to **Amplify Console → App Settings → Environment variables** and add:

```bash
# NextAuth Configuration (CRITICAL)
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
AUTH_URL=https://anchor.band
AUTH_TRUST_HOST=true

# AWS DynamoDB
# IMPORTANT: Cannot use AWS_* prefix in Amplify - use AUTH_DYNAMODB_* instead
AUTH_DYNAMODB_ID=<your-iam-access-key-id>
AUTH_DYNAMODB_SECRET=<your-iam-secret-access-key>
AUTH_DYNAMODB_REGION=eu-west-2

# AWS KMS
KMS_KEY_ID=<your-kms-key-id>

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Resend Email
AUTH_RESEND_KEY=<your-resend-api-key>

# Spotify OAuth
SPOTIFY_CLIENT_ID=<your-spotify-client-id>
SPOTIFY_CLIENT_SECRET=<your-spotify-client-secret>
```

### Common Issues and Solutions

#### 1. MissingSecret Error

**Error**: `[auth][error] MissingSecret: Please define a 'secret'`

**Cause**: AUTH_SECRET or AUTH_URL not properly configured in Amplify environment variables.

**Solution**:
1. Verify AUTH_SECRET is set in Amplify Console → Environment variables
2. Ensure AUTH_URL is set to `https://anchor.band` (NOT localhost)
3. Add AUTH_TRUST_HOST=true
4. After changing variables, trigger a new deployment (not just redeploy)

#### 2. OAuth Redirect URI Mismatch

**Cause**: OAuth providers (Google, Spotify) still configured with localhost URIs.

**Solution**: Update redirect URIs in each provider:

**Google Cloud Console**:
- Go to APIs & Services → Credentials
- Edit your OAuth 2.0 Client ID
- Add authorized redirect URI: `https://anchor.band/api/auth/callback/google`

**Spotify Developer Dashboard**:
- Go to your app settings
- Add redirect URI: `https://anchor.band/api/auth/callback/spotify`

#### 3. Environment Variables Not Loading

**Cause**: Amplify cache or incorrect deployment.

**Solution**:
1. Go to Amplify Console → Your App
2. Click "Redeploy this version"
3. Select "Clear cache and deploy"

### Deployment Checklist

Before deploying:

- [ ] AWS infrastructure deployed (DynamoDB table, KMS key)
- [ ] IAM user created with proper permissions (DynamoDB, KMS, Bedrock)
- [ ] All environment variables configured in Amplify Console
- [ ] AUTH_URL set to `https://anchor.band` (production domain)
- [ ] AUTH_SECRET generated and added
- [ ] Google OAuth redirect URI updated
- [ ] Spotify OAuth redirect URI updated
- [ ] Resend email domain verified

### Verifying Deployment

After deployment:

1. **Check build logs**: Look for environment variable loading
2. **Test authentication**: Try signing in with Google
3. **Check CloudWatch logs**: Look for Lambda errors
4. **Test Spotify connection**: Verify OAuth flow works
5. **Check handle claiming**: Test profile creation flow

### Troubleshooting

If you see authentication errors in production:

1. **Check Amplify logs**:
   - Go to Amplify Console → Monitoring
   - Check Lambda function logs
   - Look for "MissingSecret" or "undefined" errors

2. **Verify environment variables**:
   ```bash
   # SSH into Amplify build (if available) and check:
   echo $AUTH_SECRET
   echo $AUTH_URL
   ```

3. **Force rebuild**:
   - Clear Amplify cache
   - Trigger new deployment
   - Verify latest commit is deployed

4. **Check middleware execution**:
   - NextAuth middleware runs on every request
   - Environment variables must be available in Lambda context
   - Check that `trustHost: true` is set (or use AUTH_TRUST_HOST=true)

### Performance Optimization

Amplify-specific Next.js configuration:

- ✅ Images set to `unoptimized: true` (required for Amplify)
- ✅ ISR revalidation set to 1 hour
- ✅ Database sessions for authentication
- ✅ React cache() for request-level deduplication

### Security Notes

1. **Never commit secrets**: Use .env.local for development, Amplify Console for production
2. **Rotate secrets regularly**: Update AUTH_SECRET, API keys periodically
3. **Use KMS encryption**: Spotify tokens encrypted at rest
4. **IAM least privilege**: Grant only required permissions

### Support

If issues persist after following this guide:
1. Check NextAuth v5 documentation: https://authjs.dev
2. Check Amplify SSR documentation: https://docs.amplify.aws
3. Review application logs in CloudWatch
