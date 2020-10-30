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

  setNewFolder(folderPath, animeId = null) {
    if (!fs.existsSync(folderPath)) {
      return
    }

    var subFolders = this._scanSubFolders(folderPath)
    var files = this._scanFiles(folderPath)

    if (subFolders.length) {
      subFolders = this._matchFoldersWithWatching(subFolders)
    }

    if (animeId) {
      var ids = [parseInt(animeId, 10)]
    } else {
      if (files.length) {
        var ids = this._matchRootFilesWithWatchingAnime(files)
      }
    }

    this.data.rootFolders.push({
      path: folderPath,
      subFolders: subFolders,
      files: files,
      ids: ids
    })

    this._writeToFile()
  }

  setUniqueAnimeFolder(folderPath, animeId) {
    if (!fs.existsSync(folderPath)) {
      return
    }

    const folderName = folderPath.split('\\').pop()
    const rootFoldersLength = this.data.rootFolders.length

    this.removeFolderFromId(animeId)

    if (!rootFoldersLength) {
      this.setNewFolder(folderPath, animeId)

      return
    }

    for (let i = 0; i < rootFoldersLength; i++) {
      const folder = this.data.rootFolders[i]

      if (fs.existsSync(path.join(folder.path, folderName))) {
        const index = this.data.rootFolders[i].subFolders.findIndex(subFolder => subFolder.name == folderName)

        if (index != -1) {
          this.data.rootFolders[i].subFolders[index].id = parseInt(animeId, 10)
        } else {
          this.data.rootFolders[i].subFolders.push({
            path: path.join(this.data.rootFolders[i].path, folderName),
            name: folderName,
            id: parseInt(animeId, 10)
          })
        }

        this._writeToFile()

        return
      }
    }

    this.setNewFolder(folderPath, animeId)
  }

  removeFolderFromId(animeId) {
    const rootFoldersLength = this.data.rootFolders.length

    for (let i = 0; i < rootFoldersLength; i++) {
      const folder = this.data.rootFolders[i]
      const index = folder.subFolders.findIndex(subFolder => subFolder.id == animeId)

      if (index != -1) {
        this.data.rootFolders[i].subFolders.splice(index, 1)
        this._writeToFile()

        return
      }

      if (this.data.rootFolders[i].ids) {
        if (this.data.rootFolders[i].ids.includes(parseInt(animeId, 10))) {
          this.removeFolder(this.data.rootFolders[i].path)
          this._writeToFile()
  
          return
        }
      }
    }
  }

  removeFolder(path) {
    const folderIndex = this.data.rootFolders.findIndex(folder => folder.path == path)

    this.data.rootFolders.splice(folderIndex, 1)
    this._writeToFile()
  }

  getFolderById(animeId) {
    const allFolders = this._getAllFolders()

    const folder = allFolders.find(folder => {
      if (folder.id == animeId) {
        return true
      }

      if (folder.ids) {
        if (folder.ids.includes(parseInt(animeId, 10))) {
          return true
        }
      }

    })

    if (folder) {
      return folder.path
    }

    return null
  }

  getEpisodePath(animeId, episode) {
    const animeFolder = this.getFolderById(animeId)

    if (animeFolder) {
      const files = this._scanFiles(animeFolder)
      const episodeFiles = files.filter(file => file.episode_number == episode || file.animeTitle == episode)
      var matches = []

      if (episodeFiles.length > 1) {
        for (let episodeFile of episodeFiles) {
          if (episodeFile.animeTitle) {
            matches.push(...[stringSimilarity.findBestMatch(episodeFile.animeTitle.toUpperCase(), animeList.getAnimeTitlesAndSynonyms(animeId).map(title =>
              title.toUpperCase()))].map(m => ({
                rating: m.bestMatch.rating,
                episodePath: episodeFile.path,
                episodeName: episodeFile.name
              }))
            )
          }
        }

        if (matches.length) {
          const bestMatch = matches.sort(Utils.compareParams('rating', 'desc'))[0]

          return path.join(bestMatch.episodePath, bestMatch.episodeName)
        }
      } else if (episodeFiles.length == 1) {
        return path.join(episodeFiles[0].path, episodeFiles[0].name)
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

  _getAllFolders() {
    var allFolders = []

    for (let rootFolder of this.data.rootFolders) {
      allFolders.push(rootFolder)
      allFolders.push(...rootFolder.subFolders)
    }

    return allFolders
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

  _matchRootFilesWithWatchingAnime(files) {
    animeList.resyncFile()

    const watchingAnime = animeList.getWatchingAnime()
    var ids = []

    for (let anime of watchingAnime) {
      const animeTitlesAndSynonyms = animeList.getAnimeTitlesAndSynonyms(anime.media.id)
      var matches = []

      for (let title of animeTitlesAndSynonyms) {
        matches.push(...[stringSimilarity.findBestMatch(title.toUpperCase(), files.map(file => file.animeTitle.toUpperCase()))])
      }

      const bestMatch = matches.sort(Utils.compareParams('bestMatch.rating', 'desc'))[0]

      if (bestMatch.bestMatch.rating > 0.5) {
        ids.push(anime.media.id)
      }
    }

    return ids
  }

  _matchFoldersWithWatching(subFolders) {
    animeList.resyncFile()

    const watchingAnime = animeList.getWatchingAnime()

    for (let anime of watchingAnime) {
      const animeTitlesAndSynonyms = animeList.getAnimeTitlesAndSynonyms(anime.media.id)
      var matches = []

      for (let title of animeTitlesAndSynonyms) {
        matches.push(...[stringSimilarity.findBestMatch(title.toUpperCase(), subFolders.map(folder => folder.name.toUpperCase()))].map(m => ({
          targetIndex: m.bestMatchIndex,
          rating: m.bestMatch.rating
        })))
      }

      const bestMatch = matches.sort(Utils.compareParams('rating', 'desc'))[0]

      if (bestMatch.rating > 0.5) {
        subFolders[bestMatch.targetIndex].id = anime.media.id
      }
    }

    return subFolders
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