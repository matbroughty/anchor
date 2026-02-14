/**
 * Types for Tim's Twitter Listening Party integration
 */

/**
 * Raw CSV row from time-slot-data.csv (NO HEADERS, 13 columns)
 * Columns by index:
 * 0: partyDateTime (e.g. "2020-03-23T22:00")
 * 1: artist
 * 2: album
 * 3: tweetLink
 * 4: replayLink (KEY - this is what we open)
 * 5: twitterHandles (colon-separated)
 * 6: timelineLink
 * 7: spotifyAlbumLink
 * 8: artworkSmall (Spotify image URL)
 * 9: artworkMedium (Spotify image URL)
 * 10: albumReleaseDate (YYYY-MM-DD)
 * 11: partyId (numeric)
 * 12: artworkLarge (Spotify image URL)
 */
export interface ListeningPartyRow {
  partyDateTime: string;
  artist: string;
  album: string;
  tweetLink: string;
  replayLink: string;
  twitterHandles: string;
  timelineLink: string;
  spotifyAlbumLink: string;
  artworkSmall: string;
  artworkMedium: string;
  albumReleaseDate: string;
  partyId: string;
  artworkLarge: string;
}

/**
 * Minimal payload for UI display
 */
export interface ListeningParty {
  partyId: string;
  partyDateTime: string;
  artist: string;
  album: string;
  replayLink: string;
  spotifyAlbumLink: string;
  artworkSmall: string;
  artworkMedium: string;
  artworkLarge: string;
  albumReleaseDate: string;
  tweetLink: string;
  timelineLink: string;
}

/**
 * User's favourite listening party (stored in DynamoDB)
 */
export interface FavouriteListeningParty {
  partyId: string;
  partyDateTime: string;
  artist: string;
  album: string;
  replayLink: string;
  spotifyAlbumLink: string;
  artworkSmall: string;
  artworkMedium: string;
  artworkLarge: string;
  albumReleaseDate: string;
  tweetLink: string;
  timelineLink: string;
}
