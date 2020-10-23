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

const { app, BrowserWindow, ipcMain, dialog, remote } = require('electron')
const client = require('discord-rich-presence')('763579990209855559')
const stringSimilarity = require('string-similarity')
const { autoUpdater } = require('electron-updater')
const childProcess = require('child_process')
const anitomy = require('anitomy-js')
const pathModule = require('path')
const fs = require('fs')

const WindowConfig = require('../lib/window-config')
const UserConfig = require('../lib/user-config')
const AnimeList = require('../lib/anime-list')
const FetchData = require('../lib/fetch-data')
const Store = require('../lib/store')
const Utils = require('../lib/utils')

let mainWindow
let pageToShow = '#watching'
let lastUpdate = new Date(Date.now())

const userDataPath = (app || remote.app).getPath('userData')
if (fs.existsSync(pathModule.join(userDataPath, 'anime-folders.json')) || fs.existsSync(pathModule.join(userDataPath, 'anilist-data.json'))) {
  if (fs.existsSync(pathModule.join(userDataPath, 'anime-folders.json'))) {
    fs.unlinkSync(pathModule.join(userDataPath, 'anime-folders.json'))
  }

  if (fs.existsSync(pathModule.join(userDataPath, 'anilist-data.json'))) {
    fs.unlinkSync(pathModule.join(userDataPath, 'anilist-data.json'))
  }

  if (fs.existsSync(pathModule.join(userDataPath, 'user-config.json'))) {
    fs.unlinkSync(pathModule.join(userDataPath, 'user-config.json'))
  }
}

// Load window JSON configurations
const windowConfig = new WindowConfig({
  configName: 'window-config',
  defaults: {
    windowBounds: {
      width: 1600,
      height: 800
    },
    maximize: false
  }
});

// Load user information JSON
const userConfig = new UserConfig({
  configName: 'user-config',
  defaults: {
    userInfo: {
      username: null,
      accessCode: null
    },
    gridSize: 0,
    syncOnStart: false
  }
})

// Load anime folders JSON
var storeAnimeFiles = new Store({
  configName: 'anime-files',
  defaults: {}
})

// Load Anilist media data JSON
const animeList = new AnimeList({
  configName: 'anime-list',
  defaults: {}
})

// Instantiate class to fetch data
const fetchData = new FetchData({
  username: userConfig.getUsername(),
  accessCode: userConfig.getAccessCode()
})

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

if (userConfig.data.animeFolder) {
  setAnimeFolder()
}

if (userConfig.getSyncOnStart()) {
  fetchData.fetchMediaCollection()
    .then(handleResponse)
    .then(handleMediaCollectionData)
    .catch(handleError)
}

// This method will be called once Electron has finished initialization
app.on('ready', function () {
  mainWindow = new BrowserWindow({
    width: windowConfig.getWidth(),
    height: windowConfig.getHeight(),
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      setMenuBarVisibility: false
    }
  })

  if (windowConfig.getMaximize()) {
    mainWindow.maximize()
  }

  mainWindow.on('resize', () => {
    let { width, height } = mainWindow.getBounds()

    windowConfig.setWindowBounds(width, height)
  })

  mainWindow.on('maximize', () => {
    windowConfig.setMaximize(true)
  })

  mainWindow.on('unmaximize', () => {
    windowConfig.setMaximize(false)
  })

  mainWindow.loadFile(pathModule.join(__dirname, 'views/main.html'))

  Utils.delayMs(5000).then(() => {
    autoUpdater.checkForUpdates()
  })

  setInterval(() => {
    lastUpdate = new Date(Date.now())

    autoUpdater.checkForUpdates()
    mainWindow.webContents.send('updateUpdateTime', lastUpdate)
  }, 1000 * 60 * 60)

  autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update_available')
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('update_available')
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update_downloaded')
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.webContents.send('update_downloaded')
    })
  })
})

client.updatePresence({
  state: 'Idling',
  startTimestamp: Date.now(),
  largeImageKey: 'mondo',
  smallImageKey: 'ani',
  instance: true
})

ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall()
})

ipcMain.on('check_for_updates', () => {
  lastUpdate = new Date(Date.now())

  autoUpdater.checkForUpdates()
  mainWindow.webContents.send('updateUpdateTime', lastUpdate)
})

ipcMain.on('app_version', (event) => {
  const appVersion = app.getVersion()

  event.sender.send('app_version', { appVersion, lastUpdate })
})

ipcMain.on('setAnimeFolder', (_, args) => {
  // if (args) {
  //   userConfig.set('animeFolder', args)
  //   setAnimeFolder()
  // } else {
  //   userConfig.delete('animeFolder')
  //   storeAnimeFiles.removeFile()
  //   storeAnimeFiles = new Store({
  //     configName: 'anime-files',
  //     defaults: {}
  //   })
  // }
})

ipcMain.on('playAnime', (_, args) => {
  if (Object.keys(storeAnimeFiles.data) != 0) {
    if (args.animeTitle.english == args.animeTitle.romaji) {
      var bestMatch = stringSimilarity.findBestMatch(args.animeTitle.english, storeAnimeFiles.data.animeNames)
    } else {
      var matchEnglishTitle = stringSimilarity.findBestMatch(args.animeTitle.english, storeAnimeFiles.data.animeNames)
      var matchRomajiTitle = stringSimilarity.findBestMatch(args.animeTitle.romaji, storeAnimeFiles.data.animeNames)

      if (matchEnglishTitle.bestMatch.rating > matchRomajiTitle.bestMatch.rating) {
        var bestMatch = matchEnglishTitle
      } else {
        var bestMatch = matchRomajiTitle
      }
    }

    if (bestMatch.bestMatch.rating > 0.5) {
      const targetFile = storeAnimeFiles.data.allFiles.filter(
        entry => entry.animeTitle == bestMatch.bestMatch.target && entry.episodeNumber == args.nextEpisode
      )

      if (targetFile.length) {
        updateDiscord(args.updateDiscord)

        const player = childProcess.spawn(`"${targetFile[0].path}"`, { shell: true })

        player.on('close', () => {
          const opts = {
            type: 'question',
            buttons: ['No', 'Yes'],
            defaultId: 0,
            title: args.updateDiscord.details,
            message: `Mark episode ${args.nextEpisode} as watched?`
          }

          updateDiscord({ details: '', state: 'Idling' })

          if (dialog.showMessageBoxSync(null, opts)) {
            if (args.nextEpisode < args.totalEpisodes) {
              fetchData.pushEpisodeToAnilist(args.animeId, args.nextEpisode)
                .then(handleResponse)
                .then((_) => {
                  console.log(1)
                  mainWindow.webContents.send('episodeWatched', {
                    animeId: args.animeId,
                    episodeWatched: args.nextEpisode
                  })

                  updateAnimeData()
                })
            } else {
              fetchData.pushAnimeFinishedToAnilist(args.animeId, args.totalEpisodes)
                .then(handleResponse)
                .then((_) => {
                  mainWindow.webContents.send('animeFinished', {
                    animeId: args.animeId
                  })

                  updateAnimeData()
                })
            }
          }
        })
      } else {
        const opts = {
          type: 'info',
          title: 'Play Anime',
          message: `No episodes found for ${args.updateDiscord.details}`
        }

        dialog.showMessageBoxSync(null, opts)
      }
    } else {
      const opts = {
        type: 'info',
        title: 'Play Anime',
        message: `No episodes found for ${args.updateDiscord.details}`
      }

      dialog.showMessageBoxSync(null, opts)
    }
  } else {
    const opts = {
      type: 'info',
      title: 'Play Anime',
      message: 'No anime folder configured. You must point to a folder containing your anime files on Settings.'
    }

    dialog.showMessageBoxSync(null, opts)
  }
})

ipcMain.on('updateAnimeData', () => {
  updateAnimeData()
})

ipcMain.on('fetchMediaCollection', (_, args) => {
  let username = args.username
  let accessCode = args.accessCode

  userConfig.setUsername(username)
  userConfig.setAccessCode(accessCode)
  fetchData.setUsername(username)
  fetchData.setAccessCode(accessCode)

  fetchData.fetchMediaCollection()
    .then(handleResponse)
    .then(handleMediaCollectionData)
    .catch(handleError)
})

ipcMain.on('searchMedia', (event, args) => {
  fetchData.fetchSearch(args)
    .then(handleResponse)
    .then((data) => {
      event.reply('searchResult', data)
    })
})

ipcMain.on('pushEditAnimeToAnilist', (_, args) => {
  fetchData.pushEditToAnilist(
    args.animeId,
    args.newStatus,
    args.newProgress,
    args.newScore
  ).then(handleResponse)
    .then((_) => {
      fetchData.fetchMediaCollection()
        .then(handleResponse)
        .then(handleMediaCollectionData)
        .then(handleError)
    })
})

ipcMain.on('setPage', (_, page) => {
  pageToShow = page
})

ipcMain.on('getPage', (event) => {
  event.sender.send('showPage', pageToShow)
})

ipcMain.on('tokenError', () => {
  const opts = {
    type: 'info',
    message: `Looks like your Anilist token is not correct. Make sure to copy it right after logging in on the settings page.`
  }

  dialog.showMessageBox(opts)
  userConfig.resetData()
  animeList.resetData()
})

function updateDiscord(opts) {
  if (opts.state == 'Idling') {
    client.updatePresence({
      state: opts.state,
      startTimestamp: Date.now(),
      largeImageKey: 'mondo',
      smallImageKey: 'ani',
      instance: true
    })
  } else {
    client.updatePresence({
      details: opts.details,
      state: opts.state,
      startTimestamp: Date.now(),
      largeImageKey: 'mondo',
      smallImageKey: 'ani',
      instance: true
    })
  }
}

function updateAnimeData() {
  fetchData.fetchMediaCollection()
    .then(handleResponse)
    .then(handleMediaCollectionData)
    .then(handleError)
}

function setAnimeFolder() {
  // if (fs.existsSync(userConfig.data.animeFolder)) {
  //   const allFiles = getFiles(userConfig.data.animeFolder)
  //   const animeNames = [...new Set(allFiles.map(file => (file.animeTitle)))]

  //   storeAnimeFiles.set('allFiles', allFiles)
  //   storeAnimeFiles.set('animeNames', animeNames)

  //   fs.watch(userConfig.data.animeFolder, () => {
  //     setAnimeFolder()
  //   })
  // } else {
  //   const opts = {
  //     type: 'error',
  //     message: `The folder ${userConfig.data.animeFolder} doesn't exist.`
  //   }

  //   mainWindow.webContents.send('clearSelFolderInpt')
  //   dialog.showMessageBox(opts)
  //   userConfig.delete('animeFolder')
  // }
}

function getFiles(path) {
  const entries = fs.readdirSync(path, { withFileTypes: true });

  // Get files within the current directory and add a path key to the file objects
  const files = entries
    .filter(file => !file.isDirectory() && (file.name.split('.').pop() == 'mkv' ||
      file.name.split('.').pop() == 'mp4' ||
      file.name.split('.').pop() == 'avi'))
    .map(file => ({
      ...file, path: pathModule.join(path, file.name), animeTitle: anitomy.parseSync(file.name).anime_title,
      episodeNumber: parseInt(anitomy.parseSync(file.name).episode_number, 10)
    }));

  // Get folders within the current directory
  const folders = entries.filter(folder => folder.isDirectory());

  for (const folder of folders)
    /*
      Add the found files within the subdirectory to the files array by calling the
      current function itself
    */
    files.push(...getFiles(`${path}/${folder.name}/`));

  return files;
}

function handleResponse(response) {
  return response.json().then(function (json) {
    return response.ok ? json : Promise.reject(json);
  });
}

function handleError(error) {
  if (error) {
    if (error.errors[0].message == 'User not found') {
      const opts = {
        type: 'info',
        message: `Looks like the Anilist username "${userConfig.getUsername()}" doesn't exist. Try logging in again.`
      }

      dialog.showMessageBox(opts)
      userConfig.resetData()
    }
  }
}

function handleMediaCollectionData(data) {
  var animeLists = []

  userConfig.setUserAvatar(data.data.MediaListCollection.user.avatar.large)

  data.data.MediaListCollection.lists.forEach((list) => {
    animeLists = animeLists.concat(list.entries)
  })

  animeList.setAnimeList(animeLists)

  mainWindow.webContents.send('reload')
}