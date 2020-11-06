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

const FetchData = require('../lib/fetch-data')

// Instantiate class to fetch data
const fetchData = new FetchData({
  username: null,
  accessCode: null
})

const seasons = ['WINTER', 'SPRING', 'SUMMER', 'FALL']

class AnimeSeasons {
  constructor() {
    this.currentSeason = this.getSeason()
    const currentSeasonIndex = seasons.findIndex(season => season == this.currentSeason)
    var lastSeasonIndex = currentSeasonIndex - 1 > 0 ? currentSeasonIndex - 1 : 3

    this.data = {
      '#season1': {
        year: lastSeasonIndex > 3 ? this.getYear() + 1 : this.getYear(),
        name: seasons[lastSeasonIndex++ % 4],
        fetchDone: false,
        list: []
      },
      '#season2': {
        year: lastSeasonIndex > 3 ? this.getYear() + 1 : this.getYear(),
        name: seasons[lastSeasonIndex++ % 4],
        fetchDone: false,
        list: []
      },
      '#season3': {
        year: lastSeasonIndex > 3 ? this.getYear() + 1 : this.getYear(),
        name: seasons[lastSeasonIndex++ % 4],
        fetchDone: false,
        list: []
      },
      '#season4': {
        year: lastSeasonIndex > 3 ? this.getYear() + 1 : this.getYear(),
        name: seasons[lastSeasonIndex++ % 4],
        fetchDone: false,
        list: []
      }
    }
  }

  fetchAllSeasons() {
    this._fetchSeason(this.data['#season1'].name, this.data['#season1'].year, 1, '#season1')
    this._fetchSeason(this.data['#season2'].name, this.data['#season2'].year, 1, '#season2')
    this._fetchSeason(this.data['#season3'].name, this.data['#season3'].year, 1, '#season3')
    this._fetchSeason(this.data['#season4'].name, this.data['#season4'].year, 1, '#season4')
  }

  isFetchDone() {
    return this.data['#season1'].fetchDone && this.data['#season2'].fetchDone && this.data['#season3'].fetchDone && this.data['#season4'].fetchDone
  }

  _fetchSeason(season, year, page, view) {
    fetchData.fetchSeason(season, year, page)
      .then(this.handleResponse)
      .then((data) => {
        this.data[view].list.push(...data.data.Page.media)
        this.data[view].list = this.data[view].list.filter(anime => anime.isAdult == false)

        if (data.data.Page.pageInfo.hasNextPage) {
          this._fetchSeason(season, year, ++page, view)
        } else {
          if (view == '#season1') {
            for (let i = 0; i < this.data[view].list.length; i++) {
              if (this.data[view].list[i].nextAiringEpisode && this.data[view].list[i].format == 'TV') {
                this.data[view].list[i].format = 'LEFTOVER'
                this.data['#season2'].list.push(this.data[view].list[i])
                this.data[view].list.splice(i, 1)
              }
            }
          }

          if (view == '#season1' || view == '#season2') {
            for (let i = 0; i < this.data[view].list.length; i++) {
              if (this.data[view].list[i].nextAiringEpisode) {
                this.data[view].list[i].nextAiringEpisode['airingDate'] = Date.now() + (this.data[view].list[i].nextAiringEpisode.timeUntilAiring * 1000)
              }
            }
          }

          this.data[view].fetchDone = true
        }
      })
  }

  getSeason() {
    const date = new Date(Date.now())

    if (date.getMonth() == 12 || date.getMonth() < 3) {
      return 'WINTER'
    }

    if (date.getMonth() < 6) {
      return 'SPRING'
    }

    if (date.getMonth() < 9) {
      return 'SUMMER'
    }

    return 'FALL'
  }

  getYear() {
    const date = new Date(Date.now())

    return date.getFullYear()
  }

  handleResponse(response) {
    return response.json().then(function (json) {
      return response.ok ? json : Promise.reject(json);
    });
  }
}

module.exports = AnimeSeasons