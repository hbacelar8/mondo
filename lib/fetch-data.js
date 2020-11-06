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
                  status,
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
                    synonyms,
                    episodes,
                    coverImage {
                      large
                    }
                  }
                }
                isSplitCompletedList,
                status
              },
              user {
                avatar {
                  large
                }
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
                  synonyms,
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
                      score(format: POINT_100),
                      id
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

  fetchSearch(searchString) {
    const query = `
          query ($perPage: Int, $search: String) {
              Page (perPage: $perPage) {
                  pageInfo {
                      total,
                      currentPage,
                      lastPage,
                      hasNextPage,
                      perPage
                  }
                  media (search: $search, type: ANIME) {
                      id,
                      title {
                          english(stylised: false),
                          romaji,
                          native
                      },
                      coverImage {
                          large
                      }
                  }
              }
          }
      `;

    const variables = {
      search: searchString,
      perPage: 50
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

  fetchSeason(season, year, page) {
    const query = `
          query ($perPage: Int, $page: Int, $season: MediaSeason, $seasonYear: Int) {
              Page (perPage: $perPage, page: $page) {
                  pageInfo {
                      total,
                      currentPage,
                      lastPage,
                      hasNextPage,
                      perPage
                  }
                  media (season: $season, seasonYear: $seasonYear, type: ANIME) {
                      id,
                      title {
                          english(stylised: false),
                          romaji,
                          native
                      },
                      format,
                      coverImage {
                          large,
                          color
                      },
                      description(asHtml: false),
                      startDate {
                        year,
                        month,
                        day
                      }
                      episodes,
                      source,
                      genres,
                      meanScore,
                      studios(isMain: true) {
                        nodes {
                          name
                        }
                      },
                      isAdult,
                      nextAiringEpisode {
                        airingAt,
                        timeUntilAiring,
                        episode
                      }
                  }
              }
          }
      `;

    const variables = {
      season: season,
      seasonYear: year,
      perPage: 50,
      page: page
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
      status: status,
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
      status: 'COMPLETED'
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
            DeleteMediaListEntry (id: $mediaId) {
              deleted
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