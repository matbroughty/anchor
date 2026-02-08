# Scripts

## seed-example-anchors.ts

Seeds the database with 3 example anchor profiles for the landing page.

### Profiles Created

1. **indievibes** (Alex Rivers) - Indie/Alternative enthusiast
   - Featured: Slowdive, Phoebe Bridgers, Beach House
   - Bio focuses on introspective indie and atmospheric production

2. **beatsandrhymes** (Jordan Cole) - Hip-hop/R&B connoisseur
   - Featured: Kendrick Lamar, Tyler The Creator, Anderson .Paak, SZA
   - Bio emphasizes craft, wordplay, and innovative production

3. **cosmicjams** (Morgan Wells) - Classic rock/psychedelic fan
   - Featured: Pink Floyd, Tame Impala, The Beatles
   - Bio highlights psychedelic soundscapes and timeless grooves

### Usage

```bash
# Run from project root
npx tsx scripts/seed-example-anchors.ts
```

**Note:** If you've already run this script with the old version, you'll need to run it again to fix the data structure. The script will overwrite existing profiles with the correct schema.

### Environment

Requires the following environment variables (from `.env.local`):
- `AUTH_DYNAMODB_TABLE_NAME`
- `AUTH_DYNAMODB_REGION`
- `AUTH_DYNAMODB_ID`
- `AUTH_DYNAMODB_SECRET`

### Notes

- Creates fully functional public profiles with bios and featured artists
- Sets random publishedAt timestamps within the last week
- Profiles will appear in the "Dropped Anchors" section on the landing page
- Safe to run multiple times (will create new UUIDs each time)

### Troubleshooting

#### AccessDeniedException: Not authorized to perform dynamodb:PutItem

If you see this error, your IAM user needs PutItem permission. Follow these steps:

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Navigate to **Users** → **anchor-app** (or your IAM user name)
3. Click the **Permissions** tab
4. Find and edit the policy attached to this user
5. Add `dynamodb:PutItem` to the allowed actions

Your policy should include these actions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": "arn:aws:dynamodb:eu-west-2:343893643132:table/anchor-prod"
    }
  ]
}
```

**Note:** The application normally uses `UpdateCommand` which doesn't require PutItem. This seed script uses `PutCommand` for simplicity when creating example data.
