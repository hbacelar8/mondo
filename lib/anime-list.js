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

const electron = require('electron')
const path = require('path')
const fs = require('fs')

class AnimeList {
  constructor(opts) {
    const userDataPath = (electron.app || electron.remote.app).getPath('userData')
    this.path = path.join(userDataPath, opts.configName + '.json')
    this.data = _parseDataFile(this.path, opts.defaults)
  }

  setAnimeList(list) {
    this.data.animeList = list
    this._writeToFile()
  }

  getAnimeList() {
    return this.data.animeList
  }

  createAnimeEntry(args) {
    this.data.animeList.push(args)
    this._writeToFile()
  }

  deleteAnimeEntry(animeId) {
    const animeIndex = this.data.animeList.findIndex(anime => anime.media.id == animeId)
    this.data.animeList.splice(animeIndex, 1)
    this._writeToFile()
  }

  setAnimeStatus(animeId, newStatus) {
    const animeIndex = this.data.animeList.findIndex(anime => anime.media.id == animeId)
    this.data.animeList[animeIndex].status = newStatus
    this.data.animeList[animeIndex].updatedAt = Date.now()
    this._writeToFile()
  }

  getAnimeStatus(animeId) {
    const animeIndex = this.data.animeList.findIndex(anime => anime.media.id == animeId)
    
    return animeIndex == -1 ? 'NONE' : this.data.animeList[animeIndex].status
  }

  setAnimeProgress(animeId, newProgress) {
    const animeIndex = this.data.animeList.findIndex(anime => anime.media.id == animeId)
    this.data.animeList[animeIndex].progress = newProgress
    this.data.animeList[animeIndex].updatedAt = Date.now()
    this._writeToFile()
  }

  getAnimeProgress(animeId) {
    const animeIndex = this.data.animeList.findIndex(anime => anime.media.id == animeId)
    
    return animeIndex == -1 ? 0 : parseInt(this.data.animeList[animeIndex].progress, 10)
  }

  setAnimeScore(animeId, newScore) {
    const animeIndex = this.data.animeList.findIndex(anime => anime.media.id == animeId)
    this.data.animeList[animeIndex].score = newScore
    this.data.animeList[animeIndex].updatedAt = Date.now()
    this._writeToFile()
  }

  getAnimeScore(animeId) {
    const animeIndex = this.data.animeList.findIndex(anime => anime.media.id == animeId)
    
    return animeIndex == -1 ? 0 : parseInt(this.data.animeList[animeIndex].score, 10)
  }

  getWatchingAnime() {
    return this.data.animeList.filter(anime => anime.status == 'CURRENT')
  }

  getCompletedAnime() {
    return this.data.animeList.filter(anime => anime.status == 'COMPLETED')
  }

  getPlanningAnime() {
    return this.data.animeList.filter(anime => anime.status == 'PLANNING')
  }

  getPausedAnime() {
    return this.data.animeList.filter(anime => anime.status == 'PAUSED')
  }

  getDroppedAnime() {
    return this.data.animeList.filter(anime => anime.status == 'DROPPED')
  }

  getAnimeTitlesAndSynonyms(animeId) {
    const animeIndex = this.data.animeList.findIndex(anime => anime.media.id == animeId)
    var titles = []

    titles.push(...Object.values(this.data.animeList[animeIndex].media.title))
    titles.push(...this.data.animeList[animeIndex].media.synonyms)

    return [...new Set(titles)]
  }

  editAnime(animeId, newStatus, newProgress, newScore) {
    this.setAnimeStatus(animeId, newStatus)
    this.setAnimeProgress(animeId, newProgress)
    this.setAnimeScore(animeId, newScore)
  }

  resyncFile() {
    this.data = _parseDataFile(this.path, {})
  }

  resetData() {
    this.data.animeList = null
    this._writeToFile()
  }

  _writeToFile() {
    fs.writeFileSync(this.path, JSON.stringify(this.data))
  }
}

function _parseDataFile(filePath, defaults) {
  try {
    return JSON.parse(fs.readFileSync(filePath))
  } catch (error) {
    return defaults
  }
}

module.exports = AnimeList