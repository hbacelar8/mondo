/**
 * This file is part of Mondo.
 * 
 * Mondo is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Mondo is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with Mondo.  If not, see <https://www.gnu.org/licenses/>.
 */

const nodeFetch = require("node-fetch");

const MEDIA_ENTRY_STATUS = {
  CURRENT: 'Watching',
  PLANNING: 'Planning',
  COMPLETED: 'Completed',
  DROPPED: 'Dropped',
  PAUSED: 'Paused',
  REPEATING: 'Repeating',
  NONE: 'Edit',
  Watching: 'CURRENT',
  Planning: 'PLANNING',
  Completed: 'COMPLETED',
  Dropped: 'DROPPED',
  Paused: 'PAUSED',
  Repeating: 'REPEATING'
}

class FetchData {
  constructor(opts) {
    this.username = opts.username
    this.accessCode = opts.accessCode
  }

  setUsername(username) {
    this.username = username
  }

  setAccessCode(accessCode) {
    this.accessCode = accessCode
  }

  fetchMediaCollection() {
    const query = `
          query ($username: String) {
            MediaListCollection (userName: $username, type: ANIME) {
              lists {
                name,
                entries {
                  score,
                  progress,
                  updatedAt,
                  createdAt,
                  media {
                    id,
                    title {
                      english(stylised: false),
                      romaji,
                      native
                    },
                    episodes,
                    coverImage {
                      large
                    }
                  }
                }
                isSplitCompletedList,
                status
              }
            }
          }
          `;

    const variables = {
      username: this.username
    };

    const url = 'https://graphql.anilist.co',
      options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          variables: variables
        })
      };

    return nodeFetch(url, options)
  }

  fetchAnimeData(id) {
    const query = `
          query ($id: Int) {
              Media (id: $id, type: ANIME) {
                  title {
                      english(stylised: false),
                      romaji(stylised: false),
                      native
                  },
                  format,
                  status,
                  startDate {
                      month,
                      year
                  },
                  endDate {
                      month,
                      year
                  },
                  season,
                  seasonYear,
                  episodes,
                  duration,
                  countryOfOrigin,
                  source,
                  averageScore,
                  meanScore,
                  popularity,
                  favourites,
                  studios {
                      nodes {
                          name
                      }
                  },
                  nextAiringEpisode {
                      timeUntilAiring,
                      episode
                  },
                  mediaListEntry {
                      progress,
                      status,
                      score(format: POINT_100)
                  },
                  coverImage {
                      large
                  },
                  bannerImage,
                  description(asHtml: false),
                  relations {
                      edges {
                          relationType,
                          node {
                              id,
                              coverImage {
                                  large
                              }
                          }
                      }
                  }
              }
          }
      `;
  
    const variables = {
      id: id
    };

    const url = 'https://graphql.anilist.co',
      options = this.accessCode ? {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.accessCode,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          variables: variables
        })
      } : {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            query: query,
            variables: variables
          })
        };
  
    return fetch(url, options)
  }

  pushEditToAnilist(id, status, progress, score) {
    if (status == 'Delete') {
      return this.pushAnimeDeletedToAnilist(id)
    }

    const query = `
          mutation ($mediaId: Int, $status: MediaListStatus, $scoreRaw: Int, $progress: Int) {
              SaveMediaListEntry (mediaId: $mediaId, status: $status, scoreRaw: $scoreRaw, progress: $progress) {
                  id
                  status
              }
          }
          `;
  
    const variables = {
      mediaId: id,
      status: MEDIA_ENTRY_STATUS[status],
      scoreRaw: score,
      progress: progress
    };
  
    const url = 'https://graphql.anilist.co',
      options = {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.accessCode,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          variables: variables
        })
      };
  
    return nodeFetch(url, options)
  }

  pushEpisodeToAnilist(id, episode) {
    const query = `
          mutation ($mediaId: Int, $progress: Int) {
              SaveMediaListEntry (mediaId: $mediaId, progress: $progress) {
                  id
                  status
              }
          }
          `;
  
    const variables = {
      mediaId: id,
      progress: episode
    };
  
    const url = 'https://graphql.anilist.co',
      options = {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.accessCode,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          variables: variables
        })
      };
  
    return nodeFetch(url, options)
  }

  pushAnimeFinishedToAnilist(id, episodes) {
    const query = `
          mutation ($mediaId: Int, $progress: Int,  $status: MediaListStatus) {
              SaveMediaListEntry (mediaId: $mediaId, progress: $progress,  status: $status) {
                  id
                  status
              }
          }
          `;
  
    const variables = {
      mediaId: id,
      progress: episodes,
      status: MEDIA_ENTRY_STATUS['Completed']
    };
  
    const url = 'https://graphql.anilist.co',
      options = {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.accessCode,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          variables: variables
        })
      };
  
    return nodeFetch(url, options)
  }

  pushAnimeDeletedToAnilist(id) {
    var query = `
          mutation ($mediaId: Int) {
              SaveMediaListEntry  (mediaId: $mediaId) {
                  id
              }
          }
          `;
  
    var variables = {
      mediaId: id
    };
  
    const url = 'https://graphql.anilist.co',
      options = {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.accessCode,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          variables: variables
        })
      };
  
    return nodeFetch(url, options)
  }
}

module.exports = FetchData