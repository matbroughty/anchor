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
