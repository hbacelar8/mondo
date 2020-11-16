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
const AnimePage = require('../../lib/anime-page')
const AnimeList = require('../../lib/anime-list')
const Utils = require('../../lib/utils')

var torrents

// Load user information JSON
const userConfig = new UserConfig({
  configName: 'user-config',
  defaults: {
    userInfo: {
      username: null,
      accessCode: null
    },
    gridSize: 0,
    updateDiscord: true
  }
})

// Load Anilist media data JSON
const animeList = new AnimeList({
  configName: 'anime-list',
  defaults: {}
})

// Load anime files data JSON
const animeFiles = new AnimeFiles({
  configName: 'anime-files-v2',
  defaults: { rootFolders: [] }
})

const animePage = new AnimePage()

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

/** Main Page Functions */

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

    if (status == 'CURRENT') {
      subList.sort(Utils.compareParams('updatedAt', 'desc'))
    }

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
          const animeData = animePage.getAnimeData(entry.media.id)

          if (animeData) {
            showAnimePage(animeData)
          } else {
            animePage.fetchAnimePage(entry.media.id, userConfig.getUsername(), userConfig.getAccessCode())
              .then(handleResponse)
              .then((data) => {
                animePage.setAnimeData(data.data.Media)
                showAnimePage(data.data.Media)
              })
          }
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
      const mainPage = document.querySelector('.main')
      const animeMainPage = document.querySelector('.main-anime')
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
      mainPage.classList.remove('hidden')
      animeMainPage.classList.add('hidden')
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

/** Anime Page Functions */

function showAnimePage(animeData) {
  const mainPage = document.querySelector('.main')
  const animeMainPage = document.querySelector('.main-anime')

  resetAnimePage()
  addAnimeToPage(animeData)
  addOverviewToPage(animeData)
  addRelationsToPage(animeData)
  setAnimePageEventListeners()

  animePage.getAnimeTorrents(animeData.title)
    .then(addTorrentsToPage)

  mainPage.classList.add('hidden')
  animeMainPage.classList.remove('hidden')
}

function resetAnimePage() {
  const bannerImg = document.querySelector('.banner-img')
  const coverImg = document.querySelector('.cover-img')
  const title = document.querySelector('.anime-title')
  const synopsis = document.querySelector('.synopsis')
  const overviewTab = document.querySelector('.overview')
  const animeRelationsTab = document.querySelector('.anime-relations')
  const torrentsTable = document.querySelector('.table-content')
  const animeFolder = document.querySelector('.sel-folder-input')

  bannerImg.src = ''
  coverImg.src = ''
  title.innerHTML = ''
  synopsis.innerHTML = ''
  overviewTab.innerHTML = ''
  animeRelationsTab.innerHTML = ''
  torrentsTable.innerHTML = ''
  animeFolder.value = ''
}

function addAnimeToPage(animeData) {
  const animeBanner = document.querySelector('.banner-img')
  const animeCover = document.querySelector('.cover-img')
  const animeAboutDiv = document.querySelector('.anime-about')
  const animeTitle = document.querySelector('.anime-title')
  const animeSynopsis = document.querySelector('.synopsis')
  const readMoreBtn = document.querySelector('.read-more')
  const animeWatchBtn = document.querySelector('.watch-btn')
  const animeEditBtn = document.querySelector('.edit-btn')
  const tableThs = document.getElementsByTagName('TH')
  const status = animeList.getAnimeStatus(animeData.id)

  animeBanner.src = animeData.bannerImage
  animeCover.src = animeData.coverImage.large
  animeTitle.innerHTML = animeData.title.english ? animeData.title.english : animeData.title.romaji
  animeSynopsis.innerText = animeData.description ? animeData.description.replace(/<br>|<\/br>|<i>|<\/i>|<strong>|<\/strong>|<em>|<\/em>/g, '') : ''
  animeWatchBtn.innerHTML = `Watch ${progress == animeData.episodes ? progress : progress + 1}/${animeData.episodes ? animeData.episodes : '?'}`
  animeEditBtn.innerHTML = MEDIA_ENTRY_STATUS[status]

  for (let i = 0; i < tableThs.length; i++) {
    if (i != 4) {
      tableThs[i].setAttribute('data-after', '▲')
    }
  }

  if (!animeData.bannerImage) {
    const mainDiv = document.querySelector('.main')
    mainDiv.style.transform = 'translateY(-200px)'
  }

  if (animeAboutDiv.scrollHeight - animeAboutDiv.clientHeight) {
    readMoreBtn.style.display = 'block'
  } else {
    readMoreBtn.style.display = 'none'
  }
}

function addOverviewToPage(animeData) {
  const overviewDiv = document.querySelector('.overview')
  const overviewData = animePage.getOverviewData(animeData.id)

  for (let [key, value] of Object.entries(overviewData)) {
    switch (key) {
      case 'timeToNextEpisode':
        if (value.value) {
          var div = document.createElement('div')
          var p1 = document.createElement('p')
          var p2 = document.createElement('p')
          p2.style.color = getComputedStyle(document.body).getPropertyValue('--line-color')

          p1.innerText = value.name
          p2.innerText = value.value

          div.appendChild(p1)
          div.appendChild(p2)
          overviewDiv.appendChild(div)
        }
        break

      case 'status':
        var div = document.createElement('div')
        var p1 = document.createElement('p')
        var p2 = document.createElement('p')

        p1.innerText = value.name
        p2.innerText = MEDIA_STATUS[value.value]

        div.appendChild(p1)
        div.appendChild(p2)
        overviewDiv.appendChild(div)
        break

      case 'season':
        if (value.value) {
          var div = document.createElement('div')
          var p1 = document.createElement('p')
          var p2 = document.createElement('p')

          p1.innerText = value.name
          p2.innerText = MEDIA_SEASON[value.value[0]] + ', ' + value.value[1]

          div.appendChild(p1)
          div.appendChild(p2)
          overviewDiv.appendChild(div)
        }
        break

      case 'source':
        if (value.value) {
          var div = document.createElement('div')
          var p1 = document.createElement('p')
          var p2 = document.createElement('p')

          p1.innerText = value.name
          p2.innerText = MEDIA_SOURCE[value.value]

          div.appendChild(p1)
          div.appendChild(p2)
          overviewDiv.appendChild(div)
        }
        break

      default:
        if (value.value) {
          var div = document.createElement('div')
          var p1 = document.createElement('p')
          var p2 = document.createElement('p')

          p1.innerText = value.name
          p2.innerText = value.value

          div.appendChild(p1)
          div.appendChild(p2)
          overviewDiv.appendChild(div)
        }
        break
    }
  }
}

function addRelationsToPage(animeData) {
  const animeRelationsDiv = document.querySelector('.anime-relations')

  for (let i = 0; i < animeData.relations.edges.length; i++) {
    if (animeData.relations.edges[i].relationType == 'ADAPTATION') {
      continue
    }

    const relationDiv = document.createElement('div')
    const relationImg = document.createElement('img')
    const relationP = document.createElement('p')

    relationDiv.classList.add('relation-div')
    relationImg.src = animeData.relations.edges[i].node.coverImage.large
    relationP.innerText = RELATION_TYPE[animeData.relations.edges[i].relationType]
    relationDiv.id = animeData.relations.edges[i].node.id

    relationDiv.appendChild(relationImg)
    relationDiv.appendChild(relationP)
    animeRelationsDiv.appendChild(relationDiv)
  }
}

function addTorrentsToPage(data) {
  const table = document.querySelector('.table-content')
  const loadingIcon = document.querySelector('.lds-dual-ring')

  torrents = data

  console.log(torrents)

  // // Avoid updating global variable torrents when sorting
  // if (torrents.length != data.length || torrents.length == 75) {
  //   Array.prototype.push.apply(torrents, data)
  // }

  for (let i = 0; i < data.length; i++) {
    let tr = document.createElement('tr')
    let sourceTd = document.createElement('td')
    let nameTd = document.createElement('td')
    let episodeTd = document.createElement('td')
    let videoTd = document.createElement('td')
    let linkTd = document.createElement('td')
    let sizeTd = document.createElement('td')
    let seedTd = document.createElement('td')
    let leechTd = document.createElement('td')
    let downloadTd = document.createElement('td')
    let downloadLink = document.createElement('a')
    let magneticLink = document.createElement('a')

    sourceTd.innerHTML = data[i].source
    nameTd.innerHTML = data[i].name
    episodeTd.innerHTML = data[i].episode
    videoTd.innerHTML = data[i].video
    sizeTd.innerHTML = data[i].size
    seedTd.innerHTML = data[i].seeds
    leechTd.innerHTML = data[i].leechs
    downloadTd.innerHTML = data[i].downloadNumber
    downloadLink.href = data[i].downloadLink
    magneticLink.href = data[i].magneticLink
    downloadLink.innerHTML = '<i class="fas fa-download"></i>'
    magneticLink.innerHTML = '<i class="fas fa-magnet"></i>'

    linkTd.appendChild(downloadLink)
    linkTd.appendChild(magneticLink)

    tr.appendChild(sourceTd)
    tr.appendChild(nameTd)
    tr.appendChild(episodeTd)
    tr.appendChild(videoTd)
    tr.appendChild(linkTd)
    tr.appendChild(sizeTd)
    tr.appendChild(seedTd)
    tr.appendChild(leechTd)
    tr.appendChild(downloadTd)

    table.appendChild(tr)
  }

  loadingIcon.style.display = 'none'
}

function setAnimePageEventListeners() {
  const animeAboutDiv = document.querySelector('.anime-about')
  const readMoreBtnP = document.querySelector('.read-more')
  const readMoreBtnA = document.querySelector('.button')
  const menuTabs = document.getElementsByClassName('anime-tab')
  const tabContent = document.getElementsByClassName('main-anime-tab-content')
  const relations = document.getElementsByClassName('relation-div')
  const tableThs = document.getElementsByTagName('TH')
  const editBtn = document.querySelector('.edit-btn')
  const selFolderBtn = document.querySelector('.sel-folder-btn')
  const selFolderInput = document.querySelector('.sel-folder-input')
  const watchBtn = document.querySelector('.watch-btn')
  const episodesDropDown = document.querySelector('.fa-angle-down')
  const statusDropDown = document.querySelector('.fa-pen')

  readMoreBtnA.addEventListener('click', function () {
    animeAboutDiv.style.height = 'unset'
    readMoreBtnP.style.display = 'none'
  })

  for (let i = 0; i < menuTabs.length; i++) {
    menuTabs[i].addEventListener('click', function () {
      const target = document.querySelector(menuTabs[i].dataset.tabTarget)

      for (let i = 0; i < tabContent.length; i++) {
        tabContent[i].classList.remove('active')
      }

      target.classList.add('active')
    })
  }

  window.addEventListener('resize', function () {
    animeAboutDiv.style.height = '185px'

    if (animeAboutDiv.scrollHeight - animeAboutDiv.clientHeight) {
      readMoreBtnP.style.display = 'block'
    } else {
      readMoreBtnP.style.display = 'none'
    }
  })

  for (let i = 0; i < relations.length; i++) {
    relations[i].addEventListener('click', () => {
      window.location.href = `anime.html?id=${relations[i].id}`
    })
  }

  for (let i = 0; i < tableThs.length; i++) {
    if (i != 4) {
      tableThs[i].addEventListener('click', () => {
        const torrentsTable = document.querySelector('.table-content')

        torrentsTable.innerHTML = ''

        if (tableThs[i].getAttribute('data-after') == '▲') {
          tableThs[i].setAttribute('data-after', '▼')
          console.log(tableThs[i].getAttribute('data-after'))

          addTorrentsToPage(torrents.sort(Utils.compareParams(tableThs[i].id, 'desc')))
        } else {
          tableThs[i].setAttribute('data-after', '▲')
          console.log(tableThs[i].getAttribute('data-after'))

          addTorrentsToPage(torrents.sort(Utils.compareParams(tableThs[i].id, 'asc')))
        }
      })
    }
  }

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      editBox.style.height = '430px'
    })
  }

  selFolderBtn.addEventListener('click', () => {
    const path = remote.dialog.showOpenDialogSync({
      properties: ['openDirectory']
    })[0]

    if (path) {
      selFolderInput.value = path
      ipcRenderer.send('setUniqueAnimeFolder', {
        folderPath: path,
        animeId: animeId
      })
    }
  })

  selFolderInput.addEventListener('focusout', () => {
    if (selFolderInput.value) {
      ipcRenderer.send('setUniqueAnimeFolder', {
        folderPath: selFolderInput.value,
        animeId: animeId
      })
    }
  })

  if (watchBtn) {
    watchBtn.addEventListener('click', () => {
      const args = {
        nextEpisode: animeList.getAnimeProgress(animeId) + 1 > animeData.episodes ? animeData.episodes : animeList.getAnimeProgress(animeId) + 1,
        totalEpisodes: animeData.episodes,
        animeId: animeId,
        animeTitle: {
          english: animeData.title.english,
          romaji: animeData.title.romaji
        },
        updateDiscord: {
          details: animeData.title.english ? animeData.title.english : animeData.title.romaji,
          state: `Episode ${animeData.mediaListEntry.progress + 1 > animeData.episodes ? animeData.episodes : animeData.mediaListEntry.progress + 1} of ${animeData.episodes}`
        }
      }

      ipcRenderer.send('playAnime', args)
    })
  }

  document.addEventListener('keydown', (event) => {
    if (event.key == 'Escape') {
      editBox.style.height = '0'
      saveEditBtn.innerHTML = 'Save'
    }
  })

  document.addEventListener('click', (event) => {
    const episodesDropDownMenu = document.querySelector('.episodes-menu-drop')
    const statusDropDownMenu = document.querySelector('.status-menu-drop')
  })
}

function handleResponse(response) {
  return response.json().then(function (json) {
    return response.ok ? json : Promise.reject(json);
  });
}

const MEDIA_STATUS = {
  FINISHED: 'Finished',
  RELEASING: 'Releasing',
  NOT_YET_RELEASED: 'Not Yet Released',
  CANCELLED: 'Cancelled'
}

const MEDIA_ENTRY_STATUS = {
  CURRENT: 'Watching',
  PLANNING: 'Planning',
  COMPLETED: 'Completed',
  DROPPED: 'Dropped',
  PAUSED: 'Paused',
  REPEATING: 'Repeating',
  NONE: 'Edit',
  Watching: 'CURRENT',
  Planning: 'PLANNING',
  Completed: 'COMPLETED',
  Dropped: 'DROPPED',
  Paused: 'PAUSED',
  Repeating: 'REPEATING',
  Delete: 'Delete'
}

const MEDIA_SOURCE = {
  ORIGINAL: 'Original',
  MANGA: 'Manga',
  LIGHT_NOVEL: 'Light Novel',
  VISUAL_NOVEL: 'Visual Novel',
  VIDEO_GAME: 'Video Game',
  OTHER: 'Other',
  NOVEL: 'Novel',
  DOUJINSHI: 'Doujinshi',
  ANIME: 'Anime'
}

const MEDIA_SEASON = {
  WINTER: 'Winter',
  SPRING: 'Spring',
  SUMMER: 'Summer',
  FALL: 'Fall'
}

const RELATION_TYPE = {
  ADAPTATION: 'Adaptation',
  PREQUEL: 'Prequel',
  SEQUEL: 'Sequel',
  ALTERNATIVE: 'Alternative',
  SPIN_OFF: 'Spin Off',
  SIDE_STORY: 'Side Story',
  CHARACTER: 'Character',
  SUMMARY: 'Summary',
  OTHER: 'Other',
  PARENT: 'Parent'
}