/**
 * Seed script to create example anchor profiles for the landing page.
 * Run with: npx tsx scripts/seed-example-anchors.ts
 *
 * Creates 3 example profiles with tasteful music selections and bios.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

// Load environment variables
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const TABLE_NAME = process.env.AUTH_DYNAMODB_TABLE_NAME || "anchor-prod";

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
      images: [{ url: "https://example.com/slowdive.jpg", width: 300, height: 300 }],
      genres: ["shoegaze", "dream pop"],
    },
    {
      id: "phoebe-1",
      name: "Phoebe Bridgers",
      images: [{ url: "https://example.com/phoebe.jpg", width: 300, height: 300 }],
      genres: ["indie folk", "sad"],
    },
    {
      id: "beach-house-1",
      name: "Beach House",
      images: [{ url: "https://example.com/beach.jpg", width: 300, height: 300 }],
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
      images: [{ url: "https://example.com/souvlaki.jpg", width: 300, height: 300 }],
      albumType: "album",
    },
    {
      id: "punisher-1",
      name: "Punisher",
      artists: [{ id: "phoebe-1", name: "Phoebe Bridgers" }],
      images: [{ url: "https://example.com/punisher.jpg", width: 300, height: 300 }],
      albumType: "album",
    },
    {
      id: "teen-dream-1",
      name: "Teen Dream",
      artists: [{ id: "beach-house-1", name: "Beach House" }],
      images: [{ url: "https://example.com/teen.jpg", width: 300, height: 300 }],
      albumType: "album",
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
      images: [{ url: "https://example.com/kendrick.jpg", width: 300, height: 300 }],
      genres: ["hip hop", "conscious hip hop"],
    },
    {
      id: "tyler-1",
      name: "Tyler, The Creator",
      images: [{ url: "https://example.com/tyler.jpg", width: 300, height: 300 }],
      genres: ["hip hop", "alternative"],
    },
    {
      id: "paak-1",
      name: "Anderson .Paak",
      images: [{ url: "https://example.com/paak.jpg", width: 300, height: 300 }],
      genres: ["r&b", "funk", "hip hop"],
    },
    {
      id: "sza-1",
      name: "SZA",
      images: [{ url: "https://example.com/sza.jpg", width: 300, height: 300 }],
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
      images: [{ url: "https://example.com/gkmc.jpg", width: 300, height: 300 }],
      albumType: "album",
    },
    {
      id: "cmiygl-1",
      name: "Call Me If You Get Lost",
      artists: [{ id: "tyler-1", name: "Tyler, The Creator" }],
      images: [{ url: "https://example.com/cmiygl.jpg", width: 300, height: 300 }],
      albumType: "album",
    },
    {
      id: "malibu-1",
      name: "Malibu",
      artists: [{ id: "paak-1", name: "Anderson .Paak" }],
      images: [{ url: "https://example.com/malibu.jpg", width: 300, height: 300 }],
      albumType: "album",
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
      images: [{ url: "https://example.com/floyd.jpg", width: 300, height: 300 }],
      genres: ["psychedelic rock", "progressive rock"],
    },
    {
      id: "tame-1",
      name: "Tame Impala",
      images: [{ url: "https://example.com/tame.jpg", width: 300, height: 300 }],
      genres: ["psychedelic rock", "neo-psychedelia"],
    },
    {
      id: "beatles-1",
      name: "The Beatles",
      images: [{ url: "https://example.com/beatles.jpg", width: 300, height: 300 }],
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
      images: [{ url: "https://example.com/dsotm.jpg", width: 300, height: 300 }],
      albumType: "album",
    },
    {
      id: "currents-1",
      name: "Currents",
      artists: [{ id: "tame-1", name: "Tame Impala" }],
      images: [{ url: "https://example.com/currents.jpg", width: 300, height: 300 }],
      albumType: "album",
    },
    {
      id: "abbey-1",
      name: "Abbey Road",
      artists: [{ id: "beatles-1", name: "The Beatles" }],
      images: [{ url: "https://example.com/abbey.jpg", width: 300, height: 300 }],
      albumType: "album",
    },
  ],
};

async function seedProfile(profile: typeof profile1) {
  const pk = `USER#${profile.userId}`;

  // Create user record
  await dynamoDocumentClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk,
        sk: pk,
        id: profile.userId,
        handle: profile.handle,
        displayName: profile.displayName,
        email: profile.email,
        isPublic: true,
        publishedAt: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000, // Random time in last week
        updatedAt: new Date().toISOString(),
      },
    })
  );

  // Create handle mapping
  await dynamoDocumentClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `HANDLE#${profile.handle.toLowerCase()}`,
        sk: `HANDLE#${profile.handle.toLowerCase()}`,
        userId: profile.userId,
      },
    })
  );

  // Create bio
  await dynamoDocumentClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk,
        sk: "CONTENT#BIO",
        text: profile.bio.text,
        generatedAt: profile.bio.generatedAt,
      },
    })
  );

  // Create featured artists
  await dynamoDocumentClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk,
        sk: "MUSIC#FEATURED_ARTISTS",
        artists: profile.featuredArtists,
        updatedAt: new Date().toISOString(),
      },
    })
  );

  // Create music data (artists)
  await dynamoDocumentClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk,
        sk: "MUSIC#ARTISTS",
        artists: profile.artists,
        updatedAt: new Date().toISOString(),
      },
    })
  );

  // Create music data (albums)
  await dynamoDocumentClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk,
        sk: "MUSIC#ALBUMS",
        albums: profile.albums,
        updatedAt: new Date().toISOString(),
      },
    })
  );

  // Create profile metadata (for caching)
  await dynamoDocumentClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk,
        sk: "PROFILE#METADATA",
        lastRefresh: Date.now(),
      },
    })
  );

  console.log(`✓ Created profile: ${profile.handle} (${profile.displayName})`);
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
