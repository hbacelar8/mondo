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

const { remote, ipcRenderer } = require('electron')

const AnimeFiles = require('../../lib/anime-files')
const UserConfig = require('../../lib/user-config')
const AnimeList = require('../../lib/anime-list')
const Utils = require('../../lib/utils')

// Load user information JSON
const userConfig = new UserConfig({
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
const animeList = new AnimeList({
  configName: 'anime-list',
  defaults: {}
})

// Load anime files data JSON
const animeFiles = new AnimeFiles({
  configName: 'anime-files',
  defaults: { rootFolders: [] }
})

if (userConfig.getUserAvatar()) {
  const userAvatar = document.querySelector('.user-avatar-img')

  userAvatar.src = userConfig.getUserAvatar()
  userAvatar.classList.remove('hidden')
}

if (userConfig.getSyncOnStart()) {
  const syncOnStartBtn = document.querySelector('.sync-checkbox')

  syncOnStartBtn.checked = userConfig.getSyncOnStart()
}

if (userConfig.getUpdateDiscord()) {
  const updateDircordBtn = document.querySelector('.discord-checkbox')

  updateDircordBtn.checked = userConfig.getUpdateDiscord()
}

if (animeFiles.data.rootFolders.length) {
  const rootFoldersPath = animeFiles.data.rootFolders.map(folder => folder.path)

  rootFoldersPath.forEach(folderPath => addAnimeFolderToView(folderPath))
} else {
  const foldersList = document.querySelector('.folders-list')

  foldersList.classList.add('hidden')
}

if (userConfig.getLineColor()) {
  const root = document.documentElement
  root.style.setProperty('--line-color', userConfig.getLineColor())
}

if (animeList.getAnimeList()) {
  const disconnectView = document.querySelector('.disconnect-view')
  const connectedUser = document.querySelector('.connected-user')

  disconnectView.classList.remove('hidden')
  connectedUser.innerHTML = `Connected as ${userConfig.getUsername()}`

  addAnimesToView()
} else {
  const connectView = document.querySelector('.connect-view')

  connectView.classList.remove('hidden')

  addNoListToView()
}

ipcRenderer.send('getPage')
ipcRenderer.send('app_version')

setIpcCallbacks()
setEventListeners()
setWindowButtonsEvents()

/********************************************************************
 *                                                                  *
 *                            Functions                             *
 *                                                                  *
 * ******************************************************************
 */

function addAnimesToView() {
  const animeStatus = {
    'CURRENT': '#watching',
    'COMPLETED': '#completed',
    'PLANNING': '#planning',
    'PAUSED': '#paused',
    'DROPPED': '#dropped'
  }

  for (let [index, status] of Object.keys(animeStatus).entries()) {
    const subList = animeList.getAnimeList().filter(anime => anime.status == status)

    if (subList.length) {
      subList.forEach((entry) => {
        const animeWrap = document.getElementsByClassName('anime-wrap')[index]
        const newAnimeDiv = document.createElement('div')
        const newAnimeImg = document.createElement('img')
        const newAnimeP = document.createElement('p')
        const newAnimeSpan1 = document.createElement('span')
        const newAnimeSpan2 = document.createElement('span')

        newAnimeDiv.classList.add('anime')
        newAnimeImg.src = entry.media.coverImage.large
        newAnimeImg.loading = 'lazy'
        newAnimeP.innerText = entry.media.title.english ? entry.media.title.english : entry.media.title.romaji
        newAnimeSpan1.innerText = `${entry.progress}/${entry.media.episodes ? entry.media.episodes : '?'}`
        newAnimeSpan2.innerText = entry.score == 0 ? '-' : entry.score

        newAnimeDiv.appendChild(newAnimeImg)
        newAnimeDiv.appendChild(newAnimeP)
        newAnimeDiv.appendChild(newAnimeSpan1)
        newAnimeDiv.appendChild(newAnimeSpan2)

        newAnimeDiv.addEventListener('click', function () {
          ipcRenderer.send('setPage', animeStatus[status])
          window.location.href = `anime.html?id=${entry.media.id}`
        })

        animeWrap.appendChild(newAnimeDiv)
      })
    } else {
      const animeWrap = document.querySelectorAll('.anime-wrap')
      const noListDiv = document.createElement('div')

      noListDiv.classList.add('no-list')
      noListDiv.innerHTML = 'Nothing to show around here'

      animeWrap[index].appendChild(noListDiv)
    }
  }

  setGridSize()
  addAnimeListCounters()
}

function addSearchResultsToView(searchResults) {
  searchResults.forEach(function (media) {
    const animeWrap = document.getElementById('#search')
    const animeDiv = document.createElement('div')
    const animeImg = document.createElement('img')
    const animeP = document.createElement('p')

    animeDiv.classList.add('anime')
    animeImg.src = media.coverImage.large
    animeImg.loading = 'lazy'
    animeP.innerText = media.title.english ? media.title.english : media.title.romaji

    animeDiv.appendChild(animeImg)
    animeDiv.appendChild(animeP)

    animeDiv.addEventListener('click', function () {
      window.location.href = `anime.html?id=${media.id}`
    })

    animeWrap.appendChild(animeDiv)
  })

  setGridSize()
}

function addNoListToView() {
  const animeWrap = document.querySelectorAll('.anime-wrap')

  for (let i = 0; i < animeWrap.length; i++) {
    const noListDiv = document.createElement('div')

    noListDiv.classList.add('no-list')
    noListDiv.innerHTML = 'Nothing to show around here'

    animeWrap[i].appendChild(noListDiv)
  }
}

function addAnimeListCounters() {
  const counters = document.querySelector('.anime-lists-menu').getElementsByTagName('p')

  counters[0].innerHTML = animeList.getAnimeList().filter(anime => anime.status == 'CURRENT').length
  counters[1].innerHTML = animeList.getAnimeList().filter(anime => anime.status == 'COMPLETED').length
  counters[2].innerHTML = animeList.getAnimeList().filter(anime => anime.status == 'PLANNING').length
  counters[3].innerHTML = animeList.getAnimeList().filter(anime => anime.status == 'PAUSED').length
  counters[4].innerHTML = animeList.getAnimeList().filter(anime => anime.status == 'DROPPED').length
}

function setEventListeners() {
  const updateCloseBtn = document.querySelector('.close-update-btn')
  const updateRestartBtn = document.querySelector('.restart-update-btn')
  const searchBar = document.querySelector('.anime-search')
  const menuTabs = document.getElementsByClassName('tab')
  const tabContent = document.getElementsByClassName('tab-content')
  const slider = document.querySelector('.slider')
  const sortBtn = document.querySelector('.sort-btn')
  const sortBtnOptions = document.querySelector('.options')
  const sortBtnOptionsA = sortBtnOptions.getElementsByTagName('a')

  const checkUpdateBtn = document.querySelector('.update-btn')
  const loginBtn = document.querySelector('.anilist-login-btn')
  const loginInputs = document.getElementsByClassName('login-input')
  const disconnectBtn = document.querySelector('.disconnect-btn')
  const resyncBtn = document.querySelector('.resync-btn')
  const syncOnStartBtn = document.querySelector('.sync-checkbox')
  const updateDircordBtn = document.querySelector('.discord-checkbox')
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

  searchBar.addEventListener('input', () => {
    const animeDivs = document.getElementsByClassName('anime')

    for (let i = 0; i < animeDivs.length; i++) {
      const animeTitle = animeDivs[i].getElementsByTagName('p')[0]
      const titleText = animeTitle.textContent || animeTitle.innerHTML

      if (titleText.toUpperCase().indexOf(searchBar.value.toUpperCase()) > -1) {
        animeDivs[i].classList.remove('hidden')
      } else {
        animeDivs[i].classList.add('hidden')
      }
    }
  })

  searchBar.addEventListener('keydown', (event) => {
    if (event.key == 'Enter') {
      const animeDivs = document.getElementsByClassName('anime')
      const sortContainer = document.querySelector('.options-container')
      const pageTitle = document.querySelector('.header').children[0]
      const searchResults = document.getElementById('#search').querySelectorAll('.anime')

      if (searchResults.length) {
        for (let i = 0; i < searchResults.length; i++) {
          searchResults[i].remove()
        }
      }

      sortContainer.classList.add('hidden')

      for (let i = 0; i < animeDivs.length; i++) {
        animeDivs[i].classList.remove('hidden')
      }

      for (let i = 0; i < tabContent.length; i++) {
        if (tabContent[i].id != '#search') {
          tabContent[i].classList.add('hidden')
        } else {
          tabContent[i].classList.remove('hidden')
        }
      }

      pageTitle.innerHTML = 'Search'

      ipcRenderer.send('searchMedia', searchBar.value)
      searchBar.value = ''
    }
  })

  for (let i = 0; i < menuTabs.length; i++) {
    menuTabs[i].addEventListener('click', function () {
      const target = document.getElementById(menuTabs[i].dataset.tabTarget)
      const pageTitle = document.querySelector('.header').children[0]
      const gridSlider = document.querySelector('.grid-slider')
      const sortContainer = document.querySelector('.options-container')
      const searchResults = document.getElementById('#search').querySelectorAll('.anime')
      const noListDiv = document.querySelectorAll('.no-list')

      if (searchResults.length) {
        for (let i = 0; i < searchResults.length; i++) {
          searchResults[i].remove()
        }
      }

      for (let i = 0; i < noListDiv.length; i++) {
        noListDiv[i].classList.remove('hidden')
      }

      pageTitle.innerHTML = menuTabs[i].dataset.tabTarget.charAt(1).toUpperCase() + menuTabs[i].dataset.tabTarget.slice(2)

      for (let i = 0; i < tabContent.length; i++) {
        tabContent[i].classList.add('hidden')
      }

      if (menuTabs[i].dataset.tabTarget == '#settings') {
        gridSlider.classList.add('hidden')
        sortContainer.classList.add('hidden')
      } else {
        gridSlider.classList.remove('hidden')
        sortContainer.classList.remove('hidden')
      }

      target.classList.remove('hidden')
    })
  }

  slider.addEventListener('input', () => {
    userConfig.setGridSize(slider.value)
    setGridSize()
  })

  sortBtn.addEventListener('click', () => {
    const arrowUp = sortBtn.getElementsByTagName('i')[0]

    if (sortBtnOptions.style.maxHeight != '200px') {
      arrowUp.style.transform = 'translateY(3px) rotate(180deg)'
      sortBtnOptions.style.maxHeight = '200px'
    } else {
      arrowUp.style.transform = 'translateY(3px) rotate(0deg)'
      sortBtnOptions.style.maxHeight = '0'
    }
  })

  for (let i = 0; i < sortBtnOptionsA.length; i++) {
    sortBtnOptionsA[i].addEventListener('click', () => {
      const animeDivs = document.querySelectorAll('.anime')

      sortBtn.innerHTML = sortBtnOptionsA[i].innerHTML + '<i class="fas fa-angle-up"></i>'
      sortBtnOptions.style.maxHeight = '0'

      if (animeDivs) {
        for (let i = 0; i < animeDivs.length; i++) {
          animeDivs[i].remove()
        }

        animeList.getAnimeList().sort(Utils.compareParams(sortBtnOptionsA[i].id, sortBtnOptionsA[i].id == 'media.title.english' ? 'asc' : 'desc'))

        addAnimesToView()
        setGridSize()
      }
    })
  }

  checkUpdateBtn.addEventListener('click', () => {
    ipcRenderer.send('check_for_updates')
  })

  loginBtn.addEventListener('click', () => {
    const connectView = document.querySelector('.connect-view')
    const disconnectView = document.querySelector('.disconnect-view')
    const connectedUser = document.querySelector('.connected-user')
    const accessCode = loginInputs[0].value
    const username = loginInputs[1].value

    if (username && accessCode) {
      ipcRenderer.send('fetchMediaCollection', { username, accessCode })
      ipcRenderer.send('setPage', '#settings')

      connectView.classList.add('hidden')
      disconnectView.classList.remove('hidden')

      connectedUser.innerHTML = `Connected as ${username}`

      location.reload()
    }

  })

  disconnectBtn.addEventListener('click', () => {
    const connectView = document.querySelector('.connect-view')
    const disconnectView = document.querySelector('.disconnect-view')

    ipcRenderer.send('setPage', '#settings')

    userConfig.resetData()
    animeList.resetData()

    connectView.classList.remove('hidden')
    disconnectView.classList.add('hidden')

    location.reload()
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
        ipcRenderer.send('setPage', '#settings')

        connectView.classList.add('hidden')
        disconnectView.classList.remove('hidden')

        connectedUser.innerHTML = `Connected as ${username}`

        location.reload()
      }
    }
  })

  resyncBtn.addEventListener('click', () => {
    ipcRenderer.send('updateAnimeData')
  })

  setAnimeFolderBtn.addEventListener('click', () => {
    const path = remote.dialog.showOpenDialogSync({
      properties: ['openDirectory']
    })[0]

    if (path) {
      addAnimeFolderToView(path)
      ipcRenderer.send('setAnimeFolder', path)
    }
  })

  setAnimeFolderInpt.addEventListener('keydown', (event) => {
    if (event.key == 'Enter') {
      if (setAnimeFolderInpt.value) {
        addAnimeFolderToView(setAnimeFolderInpt.value)
        ipcRenderer.send('setAnimeFolder', setAnimeFolderInpt.value)
        setAnimeFolderInpt.value = ''
      }
    }
  })

  for (let i = 0; i < colorsBtn.length; i++) {
    colorsBtn[i].addEventListener('click', () => {
      const root = document.documentElement
      userConfig.setLineColor(colorsBtn[i].id)
      root.style.setProperty('--line-color', colorsBtn[i].id)
    })
  }

  syncOnStartBtn.addEventListener('input', () => {
    userConfig.setSyncOnStart(syncOnStartBtn.checked)
  })

  updateDircordBtn.addEventListener('input', () => {
    userConfig.setUpdateDiscord(updateDircordBtn.checked)

    if (!updateDircordBtn.checked) {
      ipcRenderer.send('disableDiscord')
    }
  })
}

function addAnimeFolderToView(path) {
  const foldersList = document.querySelector('.folders-list')
  const folderElement = document.createElement('div')
  const folderPath = document.createElement('p')
  const deleteBtn = document.createElement('p')

  foldersList.classList.remove('hidden')
  folderElement.classList.add('folder-element')
  folderPath.innerHTML = path
  deleteBtn.innerHTML = 'x'

  folderElement.appendChild(folderPath)
  folderElement.appendChild(deleteBtn)
  foldersList.appendChild(folderElement)

  deleteBtn.addEventListener('click', () => {
    folderElement.remove()

    if (!foldersList.childElementCount) {
      foldersList.classList.add('hidden')
    }

    ipcRenderer.send('removeAnimeFolder', path)
  })
}

function setGridSize() {
  const animeWrap = document.querySelectorAll('.anime-wrap')
  const animeDivs = document.querySelectorAll('.anime')
  const slider = document.querySelector('.slider')

  slider.value = userConfig.getGridSize()

  for (let i = 0; i < animeWrap.length; i++) {
    animeWrap[i].style.gridTemplateColumns = `repeat(auto-fill, minmax(${150 + userConfig.getGridSize() * 12}px, 1fr))`
  }

  for (let i = 0; i < animeDivs.length; i++) {
    animeDivs[i].style.width = `${160 + userConfig.getGridSize() * 10}px`
    animeDivs[i].style.height = `${220 + userConfig.getGridSize() * 12}px`
    animeDivs[i].getElementsByTagName('p')[0].style.minHeight = `${50 + userConfig.getGridSize() * 1}px`
  }
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

  ipcRenderer.on('showPage', (_, page) => {
    const tabContent = document.querySelectorAll('.tab-content')
    const pageTitle = document.querySelector('.header').children[0]

    tabContent.forEach((tab) => {
      if (tab.id == page) {
        tab.classList.remove('hidden')
        pageTitle.innerHTML = tab.id.charAt(1).toUpperCase() + tab.id.slice(2)
      }
    })
  })

  ipcRenderer.on('app_version', (_, args) => {
    const versionTag = document.querySelector('.version-tag')
    const lastUpdateP = document.querySelector('.last-update-time')

    versionTag.innerText = 'v' + args.appVersion
    lastUpdateP.innerText = `${Utils.zeroPad(args.lastUpdate.getHours(), 2)}:${Utils.zeroPad(args.lastUpdate.getMinutes(), 2)}h`
  })

  ipcRenderer.on('searchResult', (_, args) => {
    const noListDiv = document.querySelectorAll('.no-list')

    for (let i = 0; i < noListDiv.length; i++) {
      noListDiv[i].classList.add('hidden')
    }

    data = args.data.Page.media

    addSearchResultsToView(data)
  })

  ipcRenderer.on('updateUpdateTime', (_, lastUpdate) => {
    const lastUpdateP = document.querySelector('.last-update-time')

    lastUpdateP.innerText = `${Utils.zeroPad(lastUpdate.getHours(), 2)}:${Utils.zeroPad(lastUpdate.getMinutes(), 2)}h`
  })

  ipcRenderer.on('clearSelFolderInpt', () => {
    const setAnimeFolderInpt = document.querySelector('.anime-folder-input')

    setAnimeFolderInpt.value = ''
  })

  ipcRenderer.on('reload', () => {
    location.reload()
  })
}