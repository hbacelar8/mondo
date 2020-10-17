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
const Store = require('../store')
const Utils = require('../utils')

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

if (storeUserConfig.data.userAvatar) {
  const userAvatar = document.querySelector('.user-avatar-img')

  userAvatar.src = storeUserConfig.data.userAvatar
  userAvatar.classList.remove('hidden')
}

if (storeUserConfig.data.syncOnStart) {
  const syncOnStartBtn = document.querySelector('.sync-checkbox')

  syncOnStartBtn.checked = storeUserConfig.data.syncOnStart
}

if (storeUserConfig.data.animeFolder) {
  const setAnimeFolderInpt = document.querySelector('.anime-folder-input')

  setAnimeFolderInpt.value = storeUserConfig.data.animeFolder
}

if (Object.keys(storeAnilistMediaData.data) != 0) {
  const disconnectView = document.querySelector('.disconnect-view')
  const connectedUser = document.querySelector('.connected-user')

  disconnectView.classList.remove('hidden')
  connectedUser.innerHTML = `Connected as ${storeUserConfig.data.userInfo.username}`

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
  storeAnilistMediaData.data['watching'].entries.forEach((entry) => {
    const animeWrap = document.getElementsByClassName('anime-wrap')[0]
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
      ipcRenderer.send('setPage', '#watching')
      window.location.href = `anime.html?id=${entry.media.id}`
    })

    animeWrap.appendChild(newAnimeDiv)
  })

  storeAnilistMediaData.data['completed'].entries.forEach((entry) => {
    const animeWrap = document.getElementsByClassName('anime-wrap')[1]
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
      ipcRenderer.send('setPage', '#completed')
      window.location.href = `anime.html?id=${entry.media.id}`
    })

    animeWrap.appendChild(newAnimeDiv)
  })

  storeAnilistMediaData.data['planning'].entries.forEach((entry) => {
    const animeWrap = document.getElementsByClassName('anime-wrap')[2]
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
      ipcRenderer.send('setPage', '#planning')
      window.location.href = `anime.html?id=${entry.media.id}`
    })

    animeWrap.appendChild(newAnimeDiv)
  })

  storeAnilistMediaData.data['paused'].entries.forEach((entry) => {
    const animeWrap = document.getElementsByClassName('anime-wrap')[3]
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
      ipcRenderer.send('setPage', '#paused')
      window.location.href = `anime.html?id=${entry.media.id}`
    })

    animeWrap.appendChild(newAnimeDiv)
  })

  storeAnilistMediaData.data['dropped'].entries.forEach((entry) => {
    const animeWrap = document.getElementsByClassName('anime-wrap')[4]
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
      ipcRenderer.send('setPage', '#dropped')
      window.location.href = `anime.html?id=${entry.media.id}`
    })

    animeWrap.appendChild(newAnimeDiv)
  })

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

      if (searchResults.length) {
        for (let i = 0; i < searchResults.length; i++) {
          searchResults[i].remove()
        }
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
    storeUserConfig.set('gridSize', slider.value)
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

        storeAnilistMediaData.data['watching'].entries.sort(Utils.compareParams(sortBtnOptionsA[i].id, sortBtnOptionsA[i].id == 'media.title.english' ? 'asc' : 'desc'))
        storeAnilistMediaData.data['completed'].entries.sort(Utils.compareParams(sortBtnOptionsA[i].id, sortBtnOptionsA[i].id == 'media.title.english' ? 'asc' : 'desc'))
        storeAnilistMediaData.data['planning'].entries.sort(Utils.compareParams(sortBtnOptionsA[i].id, sortBtnOptionsA[i].id == 'media.title.english' ? 'asc' : 'desc'))
        storeAnilistMediaData.data['paused'].entries.sort(Utils.compareParams(sortBtnOptionsA[i].id, sortBtnOptionsA[i].id == 'media.title.english' ? 'asc' : 'desc'))
        storeAnilistMediaData.data['dropped'].entries.sort(Utils.compareParams(sortBtnOptionsA[i].id, sortBtnOptionsA[i].id == 'media.title.english' ? 'asc' : 'desc'))

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

      connectView.classList.add('hidden')
      disconnectView.classList.remove('hidden')

      connectedUser.innerHTML = `Connected as ${username}`

      location.reload()
    }

  })

  disconnectBtn.addEventListener('click', () => {
    const connectView = document.querySelector('.connect-view')
    const disconnectView = document.querySelector('.disconnect-view')

    storeUserConfig.removeFile()
    storeAnilistMediaData.removeFile()

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
      document.location.reload()
    })
  }

  syncOnStartBtn.addEventListener('input', () => {
    storeUserConfig.set('syncOnStart', syncOnStartBtn.checked)
  })
}

function setGridSize() {
  const animeWrap = document.querySelectorAll('.anime-wrap')
  const animeDivs = document.querySelectorAll('.anime')
  const slider = document.querySelector('.slider')

  slider.value = storeUserConfig.data.gridSize

  for (let i = 0; i < animeWrap.length; i++) {
    animeWrap[i].style.gridTemplateColumns = `repeat(auto-fill, minmax(${150 + storeUserConfig.data.gridSize * 12}px, 1fr))`
  }

  for (let i = 0; i < animeDivs.length; i++) {
    animeDivs[i].style.width = `${160 + storeUserConfig.data.gridSize * 10}px`
    animeDivs[i].style.height = `${220 + storeUserConfig.data.gridSize * 12}px`
    animeDivs[i].getElementsByTagName('p')[0].style.minHeight = `${50 + storeUserConfig.data.gridSize * 1}px`
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
    data = args.data.Page.media

    addSearchResultsToView(data)
  })

  ipcRenderer.on('updateUpdateTime', (_, lastUpdate) => {
    const lastUpdateP = document.querySelector('.last-update-time')

    lastUpdateP.innerText = `${Utils.zeroPad(lastUpdate.getHours(), 2)}:${Utils.zeroPad(lastUpdate.getMinutes(), 2)}h`
  })

  ipcRenderer.on('reload', () => {
    location.reload()
  })
}