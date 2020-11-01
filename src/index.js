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
const { autoUpdater } = require('electron-updater')
const childProcess = require('child_process')
const pathModule = require('path')
const fs = require('fs')

const WindowConfig = require('../lib/window-config')
const UserConfig = require('../lib/user-config')
const AnimeFiles = require('../lib/anime-files')
const AnimeList = require('../lib/anime-list')
const FetchData = require('../lib/fetch-data')
const Utils = require('../lib/utils')

let mainWindow
let pageToShow = '#watching'
let lastUpdate = new Date(Date.now())

const userDataPath = (app || remote.app).getPath('userData')
if (fs.existsSync(pathModule.join(userDataPath, 'anime-files.json')) || fs.existsSync(pathModule.join(userDataPath, 'anilist-data.json'))) {
  if (fs.existsSync(pathModule.join(userDataPath, 'anime-files.json'))) {
    fs.unlinkSync(pathModule.join(userDataPath, 'anime-files.json'))
  }

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
    syncOnStart: false,
    updateDiscord: true
  }
})

// Load anime files data JSON
const animeFiles = new AnimeFiles({
  configName: 'anime-files-v2',
  defaults: { rootFolders: [] }
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

if (userConfig.getSyncOnStart()) {
  fetchData.fetchMediaCollection()
    .then(handleResponse)
    .then(handleMediaCollectionData)
    .catch(handleError)
}

if (userConfig.getUpdateDiscord()) {
  client.updatePresence({
    state: 'Idling',
    startTimestamp: Date.now(),
    largeImageKey: 'mondo',
    smallImageKey: 'ani',
    instance: true
  })
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
  if (args) {
    animeFiles.setNewFolder(args)
  } else {
    animeFiles.resetData()
  }
})

ipcMain.on('setUniqueAnimeFolder', (_, args) => {
  if (args) {
    animeFiles.setUniqueAnimeFolder(args.folderPath, args.animeId)
  }
})

ipcMain.on('removeAnimeFolder', (_, args) => {
  animeFiles.removeFolder(args)
})

ipcMain.on('playAnime', (event, args) => {
  const episodePath = animeFiles.getEpisodePath(args.animeId, args.nextEpisode)

  if (episodePath) {
    const player = childProcess.spawn(`"${episodePath}"`, { shell: true })

    if (userConfig.getUpdateDiscord()) {
      updateDiscord(args.updateDiscord)
    }

    player.on('close', () => {
      if (args.nextEpisode - 1 >= animeList.getAnimeProgress(args.animeId)) {
        const opts = {
          type: 'question',
          buttons: ['No', 'Yes'],
          defaultId: 0,
          title: args.updateDiscord.details,
          message: `Mark episode ${args.nextEpisode} as watched?`
        }
  
        if (userConfig.getUpdateDiscord()) {
          updateDiscord({ details: '', state: 'Idling' })
        }
  
        if (dialog.showMessageBoxSync(null, opts)) {
          fetchData.pushEpisodeToAnilist(args.animeId, args.nextEpisode)
          animeList.setAnimeProgress(args.animeId, args.nextEpisode)
          event.reply('updateAnimeView')
        }
      }
    })
  } else {
    const opts = {
      type: 'info',
      title: 'Play Anime',
      message: `Couldn't find episode ${args.nextEpisode} of ${args.updateDiscord.details}.`
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

ipcMain.on('pushEditAnimeToAnilist', (event, args) => {
  fetchData.pushEditToAnilist(
    args.animeId,
    args.newStatus,
    args.newProgress,
    args.newScore
  ).then(handleResponse)
    .then(() => {
      animeList.editAnime(
        args.animeId,
        args.newStatus,
        args.newProgress,
        args.newScore
      )

      event.reply('updateAnimeView')
    })
})

ipcMain.on('createAnimeEntry', (_, args) => {
  animeList.createAnimeEntry(args)
})

ipcMain.on('deleteAnimeEntry', (_, args) => {
  console.log(args)
  animeList.deleteAnimeEntry(args.animeId)
  fetchData.pushAnimeDeletedToAnilist(args.entryId)
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

ipcMain.on('disableDiscord', () => {
  client.disconnect()
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