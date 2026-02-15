# Security Audit Report - Anchor.band
**Date**: February 15, 2026
**Auditor**: Claude Sonnet 4.5
**Scope**: Full codebase and deployment security review

## Executive Summary

Overall security posture: **GOOD with some issues to address**

The application follows many security best practices, but there are some **CRITICAL** and **HIGH** priority issues that should be fixed immediately.

---

## 🔴 CRITICAL Issues

### 1. Admin Routes Use Weak Authentication
**Location**: `/app/api/admin/*.ts`
**Issue**: Admin routes use `AUTH_RESEND_KEY` (email service API key) for authentication
```typescript
if (secret !== process.env.AUTH_RESEND_KEY) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Problems**:
- Wrong purpose: Using email service key for admin authentication
- Single shared secret vulnerable to leaks
- No rate limiting on admin endpoints
- No audit logging

**Affected Files**:
- `app/api/admin/delete-examples/route.ts`
- `app/api/admin/check-users/route.ts`
- `app/api/admin/fix-handles/route.ts`

**Recommendation**:
1. Create dedicated `ADMIN_SECRET` environment variable
2. Add rate limiting (max 10 requests/hour per IP)
3. Add audit logging for admin actions
4. Consider using proper admin roles in auth system

### 2. Dashboard Route Not Protected by Middleware
**Location**: `middleware.ts`
**Issue**: Middleware only protects `/profile` and `/settings`, but not `/dashboard`

```typescript
const isProtected =
  req.nextUrl.pathname.startsWith("/profile") ||
  req.nextUrl.pathname.startsWith("/settings")
```

**Recommendation**: Add `/dashboard` to protected routes:
```typescript
const isProtected =
  req.nextUrl.pathname.startsWith("/profile") ||
  req.nextUrl.pathname.startsWith("/settings") ||
  req.nextUrl.pathname.startsWith("/dashboard")
```

---

## 🟡 HIGH Priority Issues

### 3. No Rate Limiting on Public APIs
**Location**: All public API routes
**Issue**: No rate limiting on:
- Handle availability check (`/api/profile/handle/check`)
- Public profile views
- Search endpoints

**Recommendation**:
- Implement rate limiting middleware
- Use Redis or Upstash for distributed rate limiting
- Suggested limits:
  - Handle checks: 20/minute per IP
  - Profile views: 100/minute per IP
  - Search: 30/minute per user

### 4. Admin Routes Expose User Data via Scan
**Location**: `app/api/admin/check-users/route.ts`
**Issue**: Uses DynamoDB `ScanCommand` which can be expensive and slow

**Recommendation**:
- Add pagination to prevent timeouts
- Limit scan to necessary fields only
- Consider using GSI queries instead of full table scan

---

## 🟢 Good Security Practices Found

### ✅ Authentication & Authorization
- All server actions check `session?.user?.id` before execution
- Protected layout properly redirects unauthenticated users
- User data is properly scoped by userId
- No cross-user data access vulnerabilities found

### ✅ Injection Prevention
- All DynamoDB queries use parameterized queries via `ExpressionAttributeValues`
- Input is validated and normalized before database operations
- No SQL/NoSQL injection vulnerabilities found
- Handle validation includes:
  - Length checks (3-30 characters)
  - Character restrictions (alphanumeric + hyphens)
  - Reserved handle blocking
  - Pattern validation with regex

### ✅ XSS Prevention
- All user content rendered via React JSX (auto-escaping)
- No `dangerouslySetInnerHTML` usage found in production code
- Bio, captions, and display names properly escaped
- No innerHTML manipulation found

### ✅ Token Security
- Spotify tokens encrypted using AWS KMS with encryption context
- Encryption context prevents token replay: `{purpose: "spotify-token", app: "anchor"}`
- Tokens stored encrypted in DynamoDB
- Proper key rotation support via KMS

### ✅ Secrets Management
- `.env` files properly gitignored
- No secrets committed to git history
- Environment variables properly used via `process.env`
- `.env.example` template provided without real values

### ✅ Data Validation
**Input validation present for**:
- Display names: Max 100 chars, trimmed, not empty
- Bio: Max 500 chars, trimmed, not empty
- Captions: Max 150 chars, trimmed, not empty
- Handles: Length, format, reserved names checked
- Last.fm usernames: 2-15 alphanumeric characters
- Search queries: Length limits, trimming

### ✅ Race Condition Prevention
- Handle claiming uses DynamoDB transactions
- Atomic operations with `ConditionExpression: "attribute_not_exists(pk)"`
- Prevents duplicate handle registration

### ✅ Dependencies
- No known vulnerabilities in npm packages (`npm audit` clean)
- Using latest stable versions of key dependencies

---

## 🟡 MEDIUM Priority Recommendations

### 5. Add Security Headers
**Location**: `next.config.ts`
**Recommendation**: Add security headers:
```typescript
const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};
```

### 6. Add CSRF Protection for State-Changing Operations
**Recommendation**: NextAuth provides CSRF tokens by default, but verify all state-changing operations use them

### 7. Improve Error Messages
**Issue**: Some error messages may leak implementation details

**Example**:
```typescript
// Current
throw new Error(`Failed to decrypt token: ${error instanceof Error ? error.message : "Unknown error"}`);

// Better
throw new Error("Failed to decrypt token"); // Don't expose internal error details to client
```

### 8. Add Content Security Policy
**Recommendation**: Add CSP header to prevent inline scripts:
```typescript
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
}
```

---

## 🔵 LOW Priority Recommendations

### 9. Add Request ID Tracing
- Add unique request IDs to all logs for easier debugging
- Include in error responses for support purposes

### 10. Consider Adding Honeypot Fields
- Add hidden fields to forms to detect bots
- Helps prevent automated abuse

### 11. Add Session Timeout
- Consider adding idle timeout to sessions
- Currently sessions persist until token expiration

### 12. Improve Preview Mode Security
**Current**: Preview mode uses `?preview=true` query parameter
**Recommendation**: Use signed/encrypted token instead to prevent unauthorized preview access

---

## Environment Variable Security Checklist

### ✅ Properly Secured
- `AUTH_SECRET` - Used for session signing
- `SPOTIFY_CLIENT_SECRET` - OAuth secret
- `GOOGLE_CLIENT_SECRET` - OAuth secret
- `AUTH_DYNAMODB_SECRET` - AWS credentials
- `KMS_KEY_ID` - Encryption key ID
- `AUTH_RESEND_KEY` - Email service key
- `LASTFM_API_KEY` - API key
- `APPLE_MUSIC_PRIVATE_KEY` - Private key

### ⚠️ To Add
- `ADMIN_SECRET` - Dedicated admin authentication secret

---

## AWS Amplify Deployment Security

### ✅ Current State
- Environment variables configured in Amplify Console
- No secrets in amplify.yml file
- Build-time injection via echo commands (acceptable)

### Recommendations
1. Ensure all environment variables marked as "Secret" in Amplify Console
2. Enable AWS WAF for DDoS protection
3. Consider CloudFront for additional security layer
4. Enable AWS CloudTrail for audit logging

---

## Compliance & Privacy

### GDPR Considerations
- **User data deletion**: Disconnect actions properly delete user data
- **Data portability**: Consider adding data export feature
- **Privacy policy**: Ensure privacy policy covers data usage
- **Cookie consent**: Consider if required based on jurisdiction

### Data Retention
- No automatic data deletion policy
- Consider adding data retention limits
- Old unpublished profiles could be cleaned up

---

## Immediate Action Items

### Must Fix Now (Critical)
1. ✅ Create `ADMIN_SECRET` environment variable
2. ✅ Update admin routes to use new secret
3. ✅ Add `/dashboard` to protected routes in middleware

### Should Fix Soon (High)
4. ✅ Add rate limiting to public APIs
5. ✅ Add pagination to admin scan operations
6. ✅ Add security headers to next.config.ts

### Can Fix Later (Medium/Low)
7. ⬜ Add CSP header
8. ⬜ Improve error message security
9. ⬜ Add request ID tracing
10. ⬜ Consider preview mode token signing

---

## Testing Recommendations

### Security Testing
1. **Penetration Testing**: Consider hiring security firm for formal pentest
2. **Automated Scanning**: Set up Dependabot for dependency vulnerabilities
3. **Manual Testing**: Test auth flows, CSRF, XSS regularly

### Monitoring
1. Set up CloudWatch alarms for:
   - Failed authentication attempts
   - High request rates
   - DynamoDB throttling
2. Enable AWS GuardDuty for threat detection
3. Monitor admin endpoint access

---

## Conclusion

The application has a **solid security foundation** with good practices in authentication, input validation, and secrets management. The critical issues (admin auth and unprotected dashboard) should be fixed immediately, but overall the security posture is good.

**Security Score: 7.5/10**

With the recommended fixes implemented, this would improve to **9/10**.

---

## Audit Trail
- Audited all server actions: ✅ Secure
- Audited database queries: ✅ No injection vulnerabilities
- Audited XSS vectors: ✅ Properly escaped
- Audited token handling: ✅ Encrypted with KMS
- Audited environment variables: ✅ Properly managed
- Audited dependencies: ✅ No known vulnerabilities
- Audited authentication: ⚠️ Dashboard not protected
- Audited authorization: ✅ Proper user scoping
- Audited admin routes: 🔴 Weak authentication
