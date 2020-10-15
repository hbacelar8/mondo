const client = require('discord-rich-presence')('763579990209855559')
const { app, BrowserWindow, ipcMain, dialog, ipcRenderer } = require('electron')
const { autoUpdater } = require('electron-updater')
const childProcess = require('child_process')
const FetchData = require('./js/fetchData')
const anitomy = require('anitomy-js')
const Store = require('./js/store')
const Utils = require('./js/utils')
const path = require('path')
const fs = require('fs')
let mainWindow
var lastUpdate = null

// Load window JSON configurations
const storeWindowConfig = new Store({
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
const storeUserConfig = new Store({
  configName: 'user-config',
  defaults: {
    userInfo: {
      username: null,
      accessCode: null
    },
    gridSize: 0
  }
})

// Load anime folders JSON
const storeAnimeFiles = new Store({
  configName: 'anime-folders',
  defaults: {
    allFolders: {},
    idFolders: {}
  }
})

// Load Anilist media data JSON
const storeAnilistMediaData = new Store({
  configName: 'anilist-data',
  defaults: {}
})

// Instantiate class to fetch data
const fetchData = new FetchData({
  username: storeUserConfig.data.userInfo.username,
  accessCode: storeUserConfig.data.userInfo.accessCode
})

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

if (storeUserConfig.animeFolder && Object.keys(storeAnimeFiles.data) == 0) {
  setAnimeFolder()
}

// This method will be called once Electron has finished initialization
app.on('ready', function () {
  mainWindow = new BrowserWindow({
    width: storeWindowConfig.data.windowBounds.width,
    height: storeWindowConfig.data.windowBounds.height,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      setMenuBarVisibility: false
    }
  })

  if (storeWindowConfig.data.maximize) {
    mainWindow.maximize()
  }

  if (storeUserConfig.data.syncOnStart) {
    storeAnilistMediaData.removeFile()
  }

  mainWindow.on('resize', () => {
    let { width, height } = mainWindow.getBounds()

    storeWindowConfig.set('windowBounds', { width, height })
  })

  mainWindow.on('maximize', () => {
    storeWindowConfig.data.maximize = true
    storeWindowConfig.writeToFile()
  })

  mainWindow.on('unmaximize', () => {
    storeWindowConfig.data.maximize = false
    storeWindowConfig.writeToFile()
  })

  mainWindow.loadFile(path.join(__dirname, 'views/watching.html'))

  Utils.delayMs(5000).then(() => {
    autoUpdater.checkForUpdates()
    lastUpdate = Date.now()
  })

  setInterval(() => {
    autoUpdater.checkForUpdates()
    lastUpdate = Date.now()
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
  autoUpdater.checkForUpdates()
  lastUpdate = Date.now()
})

ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: app.getVersion(), lastUpdate: lastUpdate })
})

ipcMain.on('setAnimeFolder', (_, args) => {
  if (args) {
    storeUserConfig.set('animeFolder', args)
    setAnimeFolder()
  } else {
    storeUserConfig.delete('animeFolder')
    storeAnimeFiles.removeFile()
  }
})

ipcMain.on('setIdFolder', (_, args) => {
  storeAnimeFiles.setSubKey('idFolders', args.animeId, args.episodesPath)
})

ipcMain.on('playAnime', (_, args) => {
  if (storeAnimeFiles.data.idFolders[args.animeId]) {
    updateDiscord(args.updateDiscord)

    const player = childProcess.spawn(`"${storeAnimeFiles.data.idFolders[args.animeId][args.nextEpisode]}"`, { shell: true })

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
})

ipcMain.on('updateAnimeData', () => {
  updateAnimeData()
})

ipcMain.on('fetchMediaCollection', (_, args) => {
  let username = args.username
  let accessCode = args.accessCode

  storeUserConfig.set('userInfo', { username, accessCode })
  fetchData.setUsername(storeUserConfig.data.userInfo.username)
  fetchData.setAccessCode(storeUserConfig.data.userInfo.accessCode)

  fetchData.fetchMediaCollection()
    .then(handleResponse)
    .then(handleMediaCollectionData)
    .then(handleError)
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
  storeAnilistMediaData.removeFile()
  fetchData.fetchMediaCollection()
    .then(handleResponse)
    .then(handleMediaCollectionData)
    .then(handleError)
}

function setAnimeFolder() {
  const animeFolders = fs.readdirSync(storeUserConfig.data.animeFolder)

  animeFolders.forEach((animeFolder) => {
    const folderPath = storeUserConfig.data.animeFolder + '/' + animeFolder
    const animes = fs.readdirSync(folderPath)
    const parsedFile = anitomy.parseSync(animes[0])

    storeAnimeFiles.setSubKey('allFolders', parsedFile.anime_title, { folderPath, animes })
  })
}

function handleResponse(response) {
  return response.json().then(function (json) {
    return response.ok ? json : Promise.reject(json);
  });
}

function handleError(error) {
  if (error) {
    if (error.errors[0].status == 404) {
      alert(`Looks like the Anilist username "${storeUserConfig.data.userInfo.username}" doesn't exist. Try logging in again.`)
      storeUserConfig.removeFile()
      storeAnilistMediaData.removeFile()
    }
  }
}

function handleMediaCollectionData(data) {
  var completedListEntries = []

  data.data.MediaListCollection.lists.forEach((list) => {
    storeAnilistMediaData.set(list.name.toLowerCase().replace(' ', ''), list)

    if (list.name.includes('Completed')) {
      completedListEntries = completedListEntries.concat(list.entries)
    }
  })

  if (completedListEntries.length) {
    storeAnilistMediaData.set('completed', {
      name: 'Completed',
      status: 'COMPLETED',
      entries: completedListEntries
    })
  }
}