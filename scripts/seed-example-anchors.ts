/**
 * Seed script to create example anchor profiles for the landing page.
 * Run with: npx tsx scripts/seed-example-anchors.ts
 *
 * Creates 3 example profiles with tasteful music selections and bios.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

// Load environment variables
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const TABLE_NAME = process.env.AUTH_DYNAMODB_TABLE_NAME || "anchor-auth";

const client = new DynamoDBClient({
  region: process.env.AUTH_DYNAMODB_REGION!,
  credentials: {
    accessKeyId: process.env.AUTH_DYNAMODB_ID!,
    secretAccessKey: process.env.AUTH_DYNAMODB_SECRET!,
  },
});

const dynamoDocumentClient = DynamoDBDocumentClient.from(client);

// Example profile 1: Indie/Alternative enthusiast
const profile1 = {
  userId: `example-${randomUUID()}`,
  handle: "indievibes",
  displayName: "Alex Rivers",
  email: "alex@example.com",
  bio: {
    text: "My taste gravitates toward introspective indie and alternative sounds. I'm drawn to artists who blend atmospheric production with honest storytelling. Whether it's the shoegaze textures of Slowdive or the intimate folk of Phoebe Bridgers, I'm always searching for music that creates its own world.",
    generatedAt: Date.now(),
  },
  featuredArtists: [
    {
      id: "slowdive-1",
      name: "Slowdive",
      images: [],
      genres: ["shoegaze", "dream pop"],
    },
    {
      id: "phoebe-1",
      name: "Phoebe Bridgers",
      images: [],
      genres: ["indie folk", "sad"],
    },
    {
      id: "beach-house-1",
      name: "Beach House",
      images: [],
      genres: ["dream pop", "indie"],
    },
  ],
  artists: [
    { id: "slowdive-1", name: "Slowdive", images: [], genres: ["shoegaze", "dream pop"] },
    { id: "phoebe-1", name: "Phoebe Bridgers", images: [], genres: ["indie folk"] },
    { id: "beach-house-1", name: "Beach House", images: [], genres: ["dream pop"] },
    { id: "mazzy-1", name: "Mazzy Star", images: [], genres: ["dream pop"] },
    { id: "alvvays-1", name: "Alvvays", images: [], genres: ["indie pop"] },
    { id: "big-thief-1", name: "Big Thief", images: [], genres: ["indie folk"] },
  ],
  albums: [
    {
      id: "souvlaki-1",
      name: "Souvlaki",
      artists: [{ id: "slowdive-1", name: "Slowdive" }],
      images: [],
      albumType: "album",
    },
    {
      id: "punisher-1",
      name: "Punisher",
      artists: [{ id: "phoebe-1", name: "Phoebe Bridgers" }],
      images: [],
      albumType: "album",
    },
    {
      id: "teen-dream-1",
      name: "Teen Dream",
      artists: [{ id: "beach-house-1", name: "Beach House" }],
      images: [],
      albumType: "album",
    },
  ],
  tracks: [
    {
      id: "alison-1",
      name: "Alison",
      artists: [{ id: "slowdive-1", name: "Slowdive" }],
      album: { id: "souvlaki-1", name: "Souvlaki", images: [], album_type: "album" },
      popularity: 75,
    },
    {
      id: "kyoto-1",
      name: "Kyoto",
      artists: [{ id: "phoebe-1", name: "Phoebe Bridgers" }],
      album: { id: "punisher-1", name: "Punisher", images: [], album_type: "album" },
      popularity: 80,
    },
    {
      id: "silver-soul-1",
      name: "Silver Soul",
      artists: [{ id: "beach-house-1", name: "Beach House" }],
      album: { id: "teen-dream-1", name: "Teen Dream", images: [], album_type: "album" },
      popularity: 70,
    },
  ],
};

// Example profile 2: Hip-hop/R&B connoisseur
const profile2 = {
  userId: `example-${randomUUID()}`,
  handle: "beatsandrhymes",
  displayName: "Jordan Cole",
  email: "jordan@example.com",
  bio: {
    text: "Hip-hop is my language, from boom-bap to trap. I appreciate the craft—intricate wordplay, innovative production, and artists who push boundaries. Kendrick's conceptual depth, Tyler's genre-blending creativity, and Anderson .Paak's groove all speak to different parts of my musical soul.",
    generatedAt: Date.now(),
  },
  featuredArtists: [
    {
      id: "kendrick-1",
      name: "Kendrick Lamar",
      images: [],
      genres: ["hip hop", "conscious hip hop"],
    },
    {
      id: "tyler-1",
      name: "Tyler, The Creator",
      images: [],
      genres: ["hip hop", "alternative"],
    },
    {
      id: "paak-1",
      name: "Anderson .Paak",
      images: [],
      genres: ["r&b", "funk", "hip hop"],
    },
    {
      id: "sza-1",
      name: "SZA",
      images: [],
      genres: ["r&b", "alternative r&b"],
    },
  ],
  artists: [
    { id: "kendrick-1", name: "Kendrick Lamar", images: [], genres: ["hip hop"] },
    { id: "tyler-1", name: "Tyler, The Creator", images: [], genres: ["hip hop"] },
    { id: "paak-1", name: "Anderson .Paak", images: [], genres: ["r&b", "funk"] },
    { id: "sza-1", name: "SZA", images: [], genres: ["r&b"] },
    { id: "frank-1", name: "Frank Ocean", images: [], genres: ["r&b"] },
    { id: "earl-1", name: "Earl Sweatshirt", images: [], genres: ["hip hop"] },
  ],
  albums: [
    {
      id: "gkmc-1",
      name: "good kid, m.A.A.d city",
      artists: [{ id: "kendrick-1", name: "Kendrick Lamar" }],
      images: [],
      albumType: "album",
    },
    {
      id: "cmiygl-1",
      name: "Call Me If You Get Lost",
      artists: [{ id: "tyler-1", name: "Tyler, The Creator" }],
      images: [],
      albumType: "album",
    },
    {
      id: "malibu-1",
      name: "Malibu",
      artists: [{ id: "paak-1", name: "Anderson .Paak" }],
      images: [],
      albumType: "album",
    },
  ],
  tracks: [
    {
      id: "maad-city-1",
      name: "m.A.A.d city",
      artists: [{ id: "kendrick-1", name: "Kendrick Lamar" }],
      album: { id: "gkmc-1", name: "good kid, m.A.A.d city", images: [], album_type: "album" },
      popularity: 85,
    },
    {
      id: "earfquake-1",
      name: "EARFQUAKE",
      artists: [{ id: "tyler-1", name: "Tyler, The Creator" }],
      album: { id: "cmiygl-1", name: "Call Me If You Get Lost", images: [], album_type: "album" },
      popularity: 88,
    },
    {
      id: "come-down-1",
      name: "Come Down",
      artists: [{ id: "paak-1", name: "Anderson .Paak" }],
      album: { id: "malibu-1", name: "Malibu", images: [], album_type: "album" },
      popularity: 75,
    },
  ],
};

// Example profile 3: Classic rock/psychedelic fan
const profile3 = {
  userId: `example-${randomUUID()}`,
  handle: "cosmicjams",
  displayName: "Morgan Wells",
  email: "morgan@example.com",
  bio: {
    text: "Give me psychedelic soundscapes and timeless rock grooves. I'm equally at home with Pink Floyd's expansive experiments and Tame Impala's modern take on psychedelia. Music that transports you to another dimension—that's what I'm after. The more layers to unpack, the better.",
    generatedAt: Date.now(),
  },
  featuredArtists: [
    {
      id: "floyd-1",
      name: "Pink Floyd",
      images: [],
      genres: ["psychedelic rock", "progressive rock"],
    },
    {
      id: "tame-1",
      name: "Tame Impala",
      images: [],
      genres: ["psychedelic rock", "neo-psychedelia"],
    },
    {
      id: "beatles-1",
      name: "The Beatles",
      images: [],
      genres: ["rock", "psychedelic rock"],
    },
  ],
  artists: [
    { id: "floyd-1", name: "Pink Floyd", images: [], genres: ["psychedelic rock"] },
    { id: "tame-1", name: "Tame Impala", images: [], genres: ["psychedelic rock"] },
    { id: "beatles-1", name: "The Beatles", images: [], genres: ["rock"] },
    { id: "zeppelin-1", name: "Led Zeppelin", images: [], genres: ["rock"] },
    { id: "doors-1", name: "The Doors", images: [], genres: ["psychedelic rock"] },
    { id: "hendrix-1", name: "Jimi Hendrix", images: [], genres: ["rock", "blues"] },
  ],
  albums: [
    {
      id: "dsotm-1",
      name: "The Dark Side of the Moon",
      artists: [{ id: "floyd-1", name: "Pink Floyd" }],
      images: [],
      albumType: "album",
    },
    {
      id: "currents-1",
      name: "Currents",
      artists: [{ id: "tame-1", name: "Tame Impala" }],
      images: [],
      albumType: "album",
    },
    {
      id: "abbey-1",
      name: "Abbey Road",
      artists: [{ id: "beatles-1", name: "The Beatles" }],
      images: [],
      albumType: "album",
    },
  ],
  tracks: [
    {
      id: "time-1",
      name: "Time",
      artists: [{ id: "floyd-1", name: "Pink Floyd" }],
      album: { id: "dsotm-1", name: "The Dark Side of the Moon", images: [], album_type: "album" },
      popularity: 82,
    },
    {
      id: "let-it-happen-1",
      name: "Let It Happen",
      artists: [{ id: "tame-1", name: "Tame Impala" }],
      album: { id: "currents-1", name: "Currents", images: [], album_type: "album" },
      popularity: 85,
    },
    {
      id: "come-together-1",
      name: "Come Together",
      artists: [{ id: "beatles-1", name: "The Beatles" }],
      album: { id: "abbey-1", name: "Abbey Road", images: [], album_type: "album" },
      popularity: 90,
    },
  ],
};

async function seedProfile(profile: typeof profile1) {
  // Check if handle already exists
  const handleKey = `HANDLE#${profile.handle.toLowerCase()}`;
  const existingHandle = await dynamoDocumentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: handleKey, sk: handleKey },
    })
  );

  let userId: string;
  if (existingHandle.Item) {
    // Handle exists - use existing userId and update profile
    userId = existingHandle.Item.userId as string;
    console.log(`Profile ${profile.handle} already exists, updating...`);
  } else {
    // New profile - use the generated userId
    userId = profile.userId;
    console.log(`Creating new profile: ${profile.handle}`);
  }

  const pk = `USER#${userId}`;
  const publishedAt = Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000; // Random time in last week

  // Create/update user record using UpdateCommand
  await dynamoDocumentClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk: pk },
      UpdateExpression:
        "SET id = :id, handle = :handle, displayName = :displayName, email = :email, isPublic = :isPublic, publishedAt = if_not_exists(publishedAt, :publishedAt), updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":id": userId,
        ":handle": profile.handle,
        ":displayName": profile.displayName,
        ":email": profile.email,
        ":isPublic": true,
        ":publishedAt": publishedAt,
        ":updatedAt": new Date().toISOString(),
      },
    })
  );

  // Create handle mapping with all required fields
  const handleLower = profile.handle.toLowerCase();
  await dynamoDocumentClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `HANDLE#${handleLower}`,
        sk: `HANDLE#${handleLower}`,
      },
      UpdateExpression:
        "SET userId = :userId, handle = :handle, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk, claimedAt = if_not_exists(claimedAt, :claimedAt)",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":handle": handleLower,
        ":gsi1pk": "HANDLE",
        ":gsi1sk": handleLower,
        ":claimedAt": new Date().toISOString(),
      },
    })
  );

  // Create bio
  await dynamoDocumentClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk: "CONTENT#BIO" },
      UpdateExpression: "SET #text = :text, generatedAt = :generatedAt",
      ExpressionAttributeNames: {
        "#text": "text",
      },
      ExpressionAttributeValues: {
        ":text": profile.bio.text,
        ":generatedAt": profile.bio.generatedAt,
      },
    })
  );

  // Create featured artists (stored in 'data' field)
  await dynamoDocumentClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk: "MUSIC#FEATURED_ARTISTS" },
      UpdateExpression: "SET #data = :data, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#data": "data",
      },
      ExpressionAttributeValues: {
        ":data": profile.featuredArtists,
        ":updatedAt": Date.now(),
      },
    })
  );

  // Create music data (artists) - stored in 'data' field with cachedAt
  await dynamoDocumentClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk: "MUSIC#ARTISTS" },
      UpdateExpression: "SET #data = :data, cachedAt = :cachedAt",
      ExpressionAttributeNames: {
        "#data": "data",
      },
      ExpressionAttributeValues: {
        ":data": profile.artists,
        ":cachedAt": Date.now(),
      },
    })
  );

  // Create music data (albums) - stored in 'data' field with cachedAt
  await dynamoDocumentClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk: "MUSIC#ALBUMS" },
      UpdateExpression: "SET #data = :data, cachedAt = :cachedAt",
      ExpressionAttributeNames: {
        "#data": "data",
      },
      ExpressionAttributeValues: {
        ":data": profile.albums,
        ":cachedAt": Date.now(),
      },
    })
  );

  // Create music data (tracks) - stored in 'data' field with cachedAt
  await dynamoDocumentClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk: "MUSIC#TRACKS" },
      UpdateExpression: "SET #data = :data, cachedAt = :cachedAt",
      ExpressionAttributeNames: {
        "#data": "data",
      },
      ExpressionAttributeValues: {
        ":data": profile.tracks,
        ":cachedAt": Date.now(),
      },
    })
  );

  // Create profile metadata (for caching)
  await dynamoDocumentClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk: "PROFILE#METADATA" },
      UpdateExpression: "SET lastRefresh = :lastRefresh",
      ExpressionAttributeValues: {
        ":lastRefresh": Date.now(),
      },
    })
  );

  console.log(`✓ Seeded profile: ${profile.handle} (${profile.displayName})`);
  console.log(`  - User ID: ${userId}`);
  console.log(`  - Published: true`);
  console.log(`  - Artists: ${profile.artists.length}`);
  console.log(`  - Albums: ${profile.albums.length}`);
  console.log(`  - Tracks: ${profile.tracks.length}`);
  console.log(`  - Featured: ${profile.featuredArtists.length}`);
}

async function main() {
  console.log("Seeding example anchor profiles...\n");

  try {
    await seedProfile(profile1);
    await seedProfile(profile2);
    await seedProfile(profile3);

    console.log("\n✓ Successfully seeded 3 example profiles!");
    console.log("\nProfiles created:");
    console.log(`- https://anchor.band/${profile1.handle} (${profile1.displayName})`);
    console.log(`- https://anchor.band/${profile2.handle} (${profile2.displayName})`);
    console.log(`- https://anchor.band/${profile3.handle} (${profile3.displayName})`);
  } catch (error) {
    console.error("Error seeding profiles:", error);
    process.exit(1);
  }
}

main();
