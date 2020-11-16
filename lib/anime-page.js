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

const cheerio = require('cheerio')
const axios = require('axios')
const anitomy = require('anitomy-js')

const FetchData = require('../lib/fetch-data')
const Utils = require('../lib/utils')

class AnimePage {
  constructor() {
    this.data = []
  }

  fetchAnimePage(id, username = null, accessCode = null) {
    const fetchData = new FetchData({
      username: username,
      accessCode: accessCode
    })

    return fetchData.fetchAnimeData(id)
  }

  setAnimeData(data) {
    const index = this.data.findIndex(anime => anime.id == data.id)

    if (index < 0) {
      this.data.push(data)
    }
  }

  getAnimeData(id) {
    const index = this.data.findIndex(anime => anime.id == id)

    if (index >= 0) {
      return this.data[index]
    }

    return null
  }

  getOverviewData(id) {
    const animeData = this.getAnimeData(id)

    const overviewData = {
      timeToNextEpisode: {
        value: animeData.nextAiringEpisode ? `Ep. ${animeData.nextAiringEpisode.episode}: ${Utils.convertSecondsToDHM(animeData.nextAiringEpisode.timeUntilAiring)}` : null,
        name: 'Airing'
      },
      format: {
        value: animeData.format,
        name: 'Format'
      },
      episodes: {
        value: animeData.episodes,
        name: 'Episodes'
      },
      episodeDuration: {
        value: animeData.duration ? animeData.duration + ' mins' : null,
        name: 'Episode Duration'
      },
      status: {
        value: animeData.status,
        name: 'Status'
      },
      startDate: {
        value: animeData.startDate.month ? animeData.startDate.month + ', ' + animeData.startDate.year : null,
        name: 'Start Date'
      },
      endDate: {
        value: animeData.endDate.month ? animeData.endDate.month + ', ' + animeData.endDate.year : null,
        name: 'End Date'
      },
      season: {
        value: animeData.season ? [animeData.season, animeData.seasonYear] : null,
        name: 'Season'
      },
      averageScore: {
        value: animeData.averageScore ? animeData.averageScore + '%' : null,
        name: 'Average Score'
      },
      meanScore: {
        value: animeData.meanScore ? animeData.meanScore + '%' : null,
        name: 'Mean Score'
      },
      popularity: {
        value: animeData.popularity,
        name: 'Popularity'
      },
      favorites: {
        value: animeData.favourites,
        name: 'Favorites'
      },
      studio: {
        value: animeData.studios.nodes.length ? animeData.studios.nodes[0].name : null,
        name: 'Studios'
      },
      source: {
        value: animeData.source,
        name: 'Source'
      }
    }

    return overviewData
  }

  getAnimeTorrents = async (animeTitle) => {
    var torrents = {}

    animeTitle = [animeTitle.romaji, animeTitle.english]

    for (let t = 0; t < 2; t++) {
      if (animeTitle[t]) {
        animeTitle[t] = animeTitle[t].replace(/:/g, ' ').replace(/\dnd|Season/g, '')

        var { data } = await axios.get(
          `https://nyaa.si/?q=${animeTitle[t]}&filter=2&c=1_0&p=${1}`
        )
        var $ = cheerio.load(data)
        const totalPages = Math.floor($('.pagination-page-info').text().match(/\d+/g)[2] / 75 + 1)

        for (let page = 1; page <= totalPages; page++) {
          $('.success').each((_, trElement) => {
            let torrentInfo = {}

            $(trElement).children().each((tdIndex, tdElement) => {
              switch (tdIndex) {
                case 1:
                  let a = $(tdElement).children().last()
                  torrentInfo.fullName = $(a).attr('title')

                  let parsedTorrent = anitomy.parseSync(torrentInfo.fullName)

                  torrentInfo.source = parsedTorrent.release_group
                  torrentInfo.name = parsedTorrent.anime_title
                  torrentInfo.video = `${parsedTorrent.video_resolution ? parsedTorrent.video_resolution : ''} \
                            ${parsedTorrent.video_term ? parsedTorrent.video_term : ''}`

                  if (!parsedTorrent.episode_number && parsedTorrent.release_information) {
                    torrentInfo.episode = 'Batch'
                  } else {
                    torrentInfo.episode = parsedTorrent.episode_number ? parsedTorrent.episode_number : ''
                  }

                  break;

                case 2:
                  let a1 = $(tdElement).children().first()
                  let a2 = $(tdElement).children().last()

                  torrentInfo.downloadLink = 'https://nyaa.si/' + $(a1).attr('href')
                  torrentInfo.magneticLink = $(a2).attr('href')
                  break;

                case 3:
                  torrentInfo.size = $(tdElement).text()
                  break;

                case 5:
                  torrentInfo.seeds = parseInt($(tdElement).text(), 10)
                  break;

                case 6:
                  torrentInfo.leechs = parseInt($(tdElement).text(), 10)
                  break;

                case 7:
                  torrentInfo.downloadNumber = parseInt($(tdElement).text(), 10)
                  break;

                default:
                  break;
              }
            })

            torrents[torrentInfo.fullName] = torrentInfo
          })

          if (page < totalPages) {
            var { data } = await axios.get(
              `https://nyaa.si/?q=${animeTitle[t]}&filter=2&c=1_0&p=${page + 1}`
            )
            $ = cheerio.load(data)
          }
        }
      }
    }

    torrents = Object.values(torrents)

    return torrents.sort(Utils.compareParams('seeds', 'desc'))
  }
}

module.exports = AnimePage