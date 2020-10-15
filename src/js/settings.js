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

/********************************************************************
 *                                                                  *
 *                              Main                                *
 *                                                                  *
 * ******************************************************************
 */

const path = require('path')
const { remote, ipcRenderer } = require('electron')
const Store = require(path.resolve('./src/js/store'))

const root = document.documentElement

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

// Load Anilist media data JSON
const storeAnilistMediaData = new Store({
  configName: 'anilist-data',
  defaults: {}
})

// Decide which connection view to use
if (storeUserConfig.data.userInfo.username) {
  const disconnectView = document.querySelector('.disconnect-view')
  const connectedUser = document.querySelector('.connected-user')

  disconnectView.classList.remove('hidden')
  connectedUser.innerHTML = `Connected as ${storeUserConfig.data.userInfo.username}`
} else {
  const connectView = document.querySelector('.connect-view')

  connectView.classList.remove('hidden')
}

if (storeUserConfig.data.syncOnStart) {
  const syncOnStartBtn = document.querySelector('.sync-checkbox')

  syncOnStartBtn.checked = storeUserConfig.data.syncOnStart
}

if (storeUserConfig.data.animeFolder) {
  const setAnimeFolderInpt = document.querySelector('.anime-folder-input')

  setAnimeFolderInpt.value = storeUserConfig.data.animeFolder
}

addAnimeListCounters()
setIpcCallbacks()
setEventListeners()
setWindowButtonsEvents()

ipcRenderer.send('app_version')

/********************************************************************
 *                                                                  *
 *                            Functions                             *
 *                                                                  *
 * ******************************************************************
 */

function addAnimeListCounters() {
  if (storeAnilistMediaData.data) {
    const counters = document.querySelector('.anime-lists-menu').getElementsByTagName('P')

    for (let i = 0; i < counters.length; i++) {
      let listLinkName = counters[i].previousSibling.nodeValue

      switch (listLinkName) {
        case 'Watching':
          counters[i].innerHTML = storeAnilistMediaData.data.watching ? storeAnilistMediaData.data.watching.entries.length : 0
          break;

        case 'Completed':
          counters[i].innerHTML = storeAnilistMediaData.data.completed ? storeAnilistMediaData.data.completed.entries.length : 0
          break;

        case 'Planning':
          counters[i].innerHTML = storeAnilistMediaData.data.planning ? storeAnilistMediaData.data.planning.entries.length : 0
          break;

        case 'Paused':
          counters[i].innerHTML = storeAnilistMediaData.data.paused ? storeAnilistMediaData.data.paused.entries.length : 0
          break;

        case 'Dropped':
          counters[i].innerHTML = storeAnilistMediaData.data.dropped ? storeAnilistMediaData.data.dropped.entries.length : 0
          break;

        default:
          break;
      }
    }
  }
}

function setEventListeners() {
  const updateCloseBtn = document.querySelector('.close-update-btn')
  const updateRestartBtn = document.querySelector('.restart-update-btn')
  const checkUpdateBtn = document.querySelector('.update-btn')
  const searchBar = document.querySelector('.anime-search')
  const loginBtn = document.querySelector('.anilist-login-btn')
  const loginInputs = document.getElementsByClassName('login-input')
  const disconnectBtn = document.querySelector('.disconnect-btn')
  const resyncBtn = document.querySelector('.resync-btn')
  const syncOnStartBtn = document.querySelector('.sync-checkbox')
  const setAnimeFolderBtn = document.querySelector('.set-folder-btn')
  const setAnimeFolderInpt = document.querySelector('.anime-folder-input')
  const colorsBtn = document.querySelectorAll('.colors')

  updateCloseBtn.addEventListener('click', () => {
    const updateNotification = document.querySelector('.update-frame')

    updateNotification.classList.add('hidden')
  })

  updateRestartBtn.addEventListener('click', () => {
    ipcRenderer.send('restart-app')
  })

  checkUpdateBtn.addEventListener('click', () => {
    ipcRenderer.send('check_for_updates')
    document.location.reload()
  })

  searchBar.addEventListener('keydown', (event) => {
    if (event.key == 'Enter') {
      window.location.href = `search.html?str=${searchBar.value}`
    }
  })

  loginBtn.addEventListener('click', () => {
    const connectView = document.querySelector('.connect-view')
    const disconnectView = document.querySelector('.disconnect-view')
    const connectedUser = document.querySelector('.connected-user')
    const accessCode = loginInputs[0].value
    const username = loginInputs[1].value

    if (username && accessCode) {
      ipcRenderer.send('fetchMediaCollection', { username, accessCode })

      connectView.classList.add('hidden')
      disconnectView.classList.remove('hidden')

      connectedUser.innerHTML = `Connected as ${username}`
    }
  })

  disconnectBtn.addEventListener('click', () => {
    const connectView = document.querySelector('.connect-view')
    const disconnectView = document.querySelector('.disconnect-view')

    storeUserConfig.removeFile()
    storeAnilistMediaData.removeFile()

    connectView.classList.remove('hidden')
    disconnectView.classList.add('hidden')
  })

  loginInputs[1].addEventListener('keydown', (event) => {
    if (event.key == 'Enter') {
      const connectView = document.querySelector('.connect-view')
      const disconnectView = document.querySelector('.disconnect-view')
      const connectedUser = document.querySelector('.connected-user')
      const accessCode = loginInputs[0].value
      const username = loginInputs[1].value

      if (username && accessCode) {
        ipcRenderer.send('fetchMediaCollection', { username, accessCode })

        connectView.classList.add('hidden')
        disconnectView.classList.remove('hidden')

        connectedUser.innerHTML = `Connected as ${username}`
      }
    }
  })

  resyncBtn.addEventListener('click', () => {
    ipcRenderer.send('updateAnimeData')
  })

  setAnimeFolderBtn.addEventListener('click', () => {
    const path = remote.dialog.showOpenDialogSync({
      properties: ['openDirectory']
    })[0].replace(/\\/g, '/')

    if (path) {
      setAnimeFolderInpt.value = path
      ipcRenderer.send('setAnimeFolder', path)
    }
  })

  setAnimeFolderInpt.addEventListener('focusout', () => {
    ipcRenderer.send('setAnimeFolder', setAnimeFolderInpt.value)
  })

  for (let i = 0; i < colorsBtn.length; i++) {
    colorsBtn[i].addEventListener('click', () => {
      localStorage.setItem('lineColor', colorsBtn[i].id)

      document.location.reload()
    })
  }

  syncOnStartBtn.addEventListener('input', () => {
    storeUserConfig.set('syncOnStart', syncOnStartBtn.checked)
  })
}

function setWindowButtonsEvents() {
  document.querySelector('.min').addEventListener('click', () => {
    let window = remote.getCurrentWindow()
    window.minimize()
  })

  document.querySelector('.max').addEventListener('click', () => {
    let window = remote.getCurrentWindow()

    if (!window.isMaximized()) {
      window.maximize()
    } else {
      window.unmaximize()
    }
  })

  document.querySelector('.close').addEventListener('click', () => {
    let window = remote.getCurrentWindow()
    window.close()
  })
}

function setIpcCallbacks() {
  // Update callbacks
  ipcRenderer.on('update_available', () => {
    const updateNotification = document.querySelector('.update-frame')

    ipcRenderer.removeAllListeners('update-available')
    updateNotification.classList.remove('hidden')
  })

  ipcRenderer.on('update_downloaded', () => {
    const updateMessage = document.querySelector('.update-msg')
    const updateCloseBtn = document.querySelector('.close-update-btn')
    const updateRestartBtn = document.querySelector('.restart-update-btn')

    ipcRenderer.removeAllListeners('update_downloaded')
    updateMessage.innerText = 'Update downloaded. It will be installed on restart. Restart now?'
    updateCloseBtn.classList.add('hidden')
    updateRestartBtn.classList.remove('hidden')
  })

  // Get app version callback
  ipcRenderer.on('app_version', (_, arg) => {
    const versionTag = document.querySelector('.version-tag')
    const lastUpdateP = document.querySelector('.last-update-time')
    const lastUpdate = arg.lastUpdate ? new Date(arg.lastUpdate) : '-'

    versionTag.innerText = 'v' + arg.version
    lastUpdateP.innerText = `${lastUpdate.getHours()}:${lastUpdate.getMinutes()}h`
  })
}