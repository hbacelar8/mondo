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

class Utils {
  constructor() {
    this.MEDIA_STATUS = {
      FINISHED: 'Finished',
      RELEASING: 'Releasing',
      NOT_YET_RELEASED: 'Not Yet Released',
      CANCELLED: 'Cancelled'
    }
  }

  getUrlVars() {
    let vars = []

    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (_, key, value) {
      vars[key] = value
    })

    return vars
  }

  getUrlParam(parameter, defaultvalue) {
    let urlParameter = defaultvalue

    if (window.location.href.indexOf(parameter) > -1) {
      urlParameter = this.getUrlVars()[parameter]
    }

    return urlParameter
  }

  convertSecondsToDHM(seconds) {
    seconds = Number(seconds);

    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);

    var dDisplay = d > 0 ? d + 'd ' : "";
    var hDisplay = h > 0 ? h + 'h ' : "";
    var mDisplay = m > 0 ? m + 'm' : "";

    return dDisplay + hDisplay + mDisplay;
  }

  zeroPad(num, places) {
    return String(num).padStart(places, '0')
  }

  compareParams(key, order = 'asc') {
    key = key.split('.')

    return function innerSort(a, b) {
      var varA, varB

      if (!a.hasOwnProperty(key[0]) || !b.hasOwnProperty(key[0])) {
        return 0;
      }

      varA = a[key[0]]
      varB = b[key[0]]

      if (key.length > 1) {
        for (let i = 1; i < key.length; i++) {
          varA = varA[key[i]]
          varB = varB[key[i]]
        }
      }

      varA = (typeof varA === 'string') ? varA.toUpperCase() : varA;
      varB = (typeof varB === 'string') ? varB.toUpperCase() : varB;
      let comparison = 0;

      if (varA > varB) {
        comparison = 1;
      } else if (varA < varB) {
        comparison = -1;
      }

      return (
        (order === 'desc') ? (comparison * -1) : comparison
      );
    };
  }

  delayMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getTorrents = async (anime) => {
    var torrents = {}

    anime = [anime.romaji, anime.english]

    for (let t = 0; t < 2; t++) {
      if (anime[t]) {
        anime[t] = anime[t].replace(/:/g, ' ').replace(/\dnd|Season/g, '')

        var { data } = await axios.get(
          `https://nyaa.si/?q=${anime[t]}&filter=2&c=1_0&p=${1}`
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
              `https://nyaa.si/?q=${anime[t]}&filter=2&c=1_0&p=${page + 1}`
            )
            $ = cheerio.load(data)
          }
        }
      }
    }

    torrents = Object.values(torrents)

    return torrents.sort(this.compareParams('seeds', 'desc'))
  }
}

module.exports = new Utils