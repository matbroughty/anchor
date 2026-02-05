import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb"
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb"
import { userPK } from "@/lib/dynamodb/schema"
import type { Bio, Caption, ContentData } from "@/types/content"

// ---------------------------------------------------------------------------
// Sort-key constants
// ---------------------------------------------------------------------------

export const CONTENT_SK = {
  BIO: "CONTENT#BIO",
  CAPTION_PREFIX: "CONTENT#CAPTION#", // Append albumId to form the full SK
} as const

// ---------------------------------------------------------------------------
// Bio operations
// ---------------------------------------------------------------------------

/**
 * Returns the user's AI-generated bio, or null if none exists yet.
 */
export async function getBio(userId: string): Promise<Bio | null> {
  const result = await dynamoDocumentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: userPK(userId),
        sk: CONTENT_SK.BIO,
      },
    })
  )

  if (!result.Item) return null

  return {
    text: result.Item.text as string,
    generatedAt: result.Item.generatedAt as number,
    editedAt: result.Item.editedAt as number | undefined,
  }
}

/**
 * Writes (or overwrites) the user's bio item.
 */
export async function putBio(userId: string, bio: Bio): Promise<void> {
  await dynamoDocumentClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: userPK(userId),
        sk: CONTENT_SK.BIO,
        text: bio.text,
        generatedAt: bio.generatedAt,
        ...(bio.editedAt !== undefined && { editedAt: bio.editedAt }),
      },
    })
  )
}

// ---------------------------------------------------------------------------
// Caption operations
// ---------------------------------------------------------------------------

/**
 * Returns the caption for a specific album, or null if none exists.
 */
export async function getCaption(
  userId: string,
  albumId: string
): Promise<Caption | null> {
  const result = await dynamoDocumentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: userPK(userId),
        sk: `${CONTENT_SK.CAPTION_PREFIX}${albumId}`,
      },
    })
  )

  if (!result.Item) return null

  return {
    albumId: result.Item.albumId as string,
    text: result.Item.text as string,
    generatedAt: result.Item.generatedAt as number,
    editedAt: result.Item.editedAt as number | undefined,
  }
}

/**
 * Writes (or overwrites) a single album caption.
 */
export async function putCaption(
  userId: string,
  caption: Caption
): Promise<void> {
  await dynamoDocumentClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: userPK(userId),
        sk: `${CONTENT_SK.CAPTION_PREFIX}${caption.albumId}`,
        albumId: caption.albumId,
        text: caption.text,
        generatedAt: caption.generatedAt,
        ...(caption.editedAt !== undefined && { editedAt: caption.editedAt }),
      },
    })
  )
}

/**
 * Returns all captions for the user via a begins_with query on the caption prefix.
 */
export async function getAllCaptions(userId: string): Promise<Caption[]> {
  const result = await dynamoDocumentClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: {
        ":pk": userPK(userId),
        ":prefix": CONTENT_SK.CAPTION_PREFIX,
      },
    })
  )

  return (result.Items ?? []).map((item) => ({
    albumId: item.albumId as string,
    text: item.text as string,
    generatedAt: item.generatedAt as number,
    editedAt: item.editedAt as number | undefined,
  }))
}

// ---------------------------------------------------------------------------
// Combined read
// ---------------------------------------------------------------------------

/**
 * Fetches both bio and all captions in parallel and returns them as ContentData.
 */
export async function getContent(userId: string): Promise<ContentData> {
  const [bio, captions] = await Promise.all([
    getBio(userId),
    getAllCaptions(userId),
  ])

  return { bio, captions }
}
