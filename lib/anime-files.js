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

const stringSimilarity = require('string-similarity')
const anitomy = require('anitomy-js')
const electron = require('electron')
const path = require('path')
const fs = require('fs')

const AnimeList = require('../lib/anime-list')
const Utils = require('../lib/utils')

// Load Anilist media data JSON
const animeList = new AnimeList({
  configName: 'anime-list',
  defaults: {}
})

class AnimeFiles {
  constructor(opts) {
    const userDataPath = (electron.app || electron.remote.app).getPath('userData')
    this.path = path.join(userDataPath, opts.configName + '.json')
    this.data = _parseDataFile(this.path, opts.defaults)
  }

  setNewFolder(folderPath) {
    const subFolders = this._scanSubFolders(folderPath)
    const files = this._scanFiles(folderPath)

    this.data.rootFolders.push({
      path: folderPath,
      subFolders: subFolders,
      files: files
    })

    const matchedFolders = this._matchFoldersWithWatching()
    const folderIndex = this.data.rootFolders.findIndex(folder => folder.path == folderPath)

    this.data.rootFolders[folderIndex]['matchedFolders'] = matchedFolders
    this._writeToFile()
  }

  removeFolder(path) {
    const folderIndex = this.data.rootFolders.findIndex(folder => folder.path == path)

    this.data.rootFolders.splice(folderIndex, 1)
    this._writeToFile()
  }

  getFolderById(animeId) {
    for (let folder of this.data.rootFolders) {
      if (folder.matchedFolders[animeId]) {
        return folder.matchedFolders[animeId].folderPath
      }
    }

    return null
  }

  resyncFile() {
    this.data = _parseDataFile(this.path, { rootFolders: [] })
  }

  resetData() {
    this.data = { rootFolders: [] }
    this._writeToFile()
  }

  _getAllSubFolders() {
    var allSubFolders = []

    for (let rootFolder of this.data.rootFolders) {
      allSubFolders.push(...rootFolder.subFolders)
    }
  
    return allSubFolders
  }

  _scanSubFolders(folderPath) {
    const folders = fs.readdirSync(folderPath, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(folder => {
      return {
        path: path.join(folderPath, folder.name),
        name: folder.name
      }
    })
  
    for (let folder of folders) {
      folders.push(...this._scanSubFolders(folder.path))
    }
  
    return folders
  }

  _scanFiles(folderPath) {
    const files = fs.readdirSync(folderPath, { withFileTypes: true }).filter(entry => {
      if (entry.isFile()) {
        const fileExtension = entry.name.split('.').pop()
  
        return fileExtension == 'mkv' || fileExtension == 'mp4' || fileExtension == 'avi'
      }
    }).map(file => {
      const parsedFile = anitomy.parseSync(file.name)
  
      return {
        path: folderPath,
        name: file.name,
        animeTitle: parsedFile.anime_title,
        episode_number: parsedFile.episode_number ? parseInt(parsedFile.episode_number, 10) : null
      }
    })
  
    return files
  }

  _matchFoldersWithWatching() {
    const subFolders = this._getAllSubFolders()
    const watchingAnime = animeList.getWatchingAnime()
    var matchedFolders = {}
  
    for (let anime of watchingAnime) {
      const animeTitlesAndSynonyms = [...new Set(animeList.getAnimeTitlesAndSynonyms(anime.media.id))]
      var matches = []
  
      animeTitlesAndSynonyms.forEach(title => {
        matches.push(...[stringSimilarity.findBestMatch(title.toUpperCase(), subFolders.map(folder => folder.name.toUpperCase()))].map(m => ({
          target: subFolders[m.bestMatchIndex],
          rating: m.bestMatch.rating
        })))
      })
  
      const bestMatch = matches.sort(Utils.compareParams('rating', 'desc'))[0]

      if (bestMatch.rating > 0.5) {
        matchedFolders[anime.media.id] = {
          folderPath: bestMatch.target.path
        }
      }
    }

    return matchedFolders
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

module.exports = AnimeFiles