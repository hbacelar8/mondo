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

const FetchData = require('../../lib/fetch-data')
const UserConfig = require('../../lib/user-config')
const Store = require('../../lib/store')
const Utils = require('../../lib/utils')

const animeId = Utils.getUrlParam('id', null)
const root = document.documentElement

var animeData
var torrents = []

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
const storeAnilistMediaData = new Store({
  configName: 'anime-list',
  defaults: {}
})

// Instantiate class to fetch data
const fetchData = new FetchData({
  username: userConfig.getUsername(),
  accessCode: userConfig.getAccessCode()
})

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
  Repeating: 'REPEATING'
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

if (userConfig.getUserAvatar()) {
  const userAvatar = document.querySelector('.user-avatar-img')

  userAvatar.src = userConfig.getUserAvatar()
  userAvatar.classList.remove('hidden')
}

if (userConfig.getLineColor()) {
  root.style.setProperty('--line-color', userConfig.getLineColor())
}

fetchData.fetchAnimeData(animeId)
  .then(handleResponse)
  .then(handleData)
  .catch(handleError)

addAnimeListCounters()
setWindowButtonsEvents()
setIpcCallbacks()

/********************************************************************
 *                                                                  *
 *                            Functions                             *
 *                                                                  *
 * ******************************************************************
 */

function handleResponse(response) {
  return response.json().then(function (json) {
    return response.ok ? json : Promise.reject(json);
  });
}

function handleData(data) {
  animeData = data.data.Media

  addAnimeToPage()
  addOverviewToPage()
  addRelationsToPage()
  setEventListeners()
  Utils.getTorrents(animeData.title).then(handleTorrents)
}

function handleError(error) {
  if (error) {
    if (error.errors[0].message == 'Invalid token') {
      ipcRenderer.send('tokenError')
    }
  }
}

function addAnimeToPage() {
  const animeBannerDiv = document.querySelector('.banner')
  const animeCoverDiv = document.querySelector('.cover')
  const animeAboutDiv = document.querySelector('.about')
  const readMoreBtnP = document.querySelector('.read-more')
  const animeBannerImg = document.createElement('img')
  const animeCoverImg = document.createElement('img')
  const animeTitleP = document.createElement('p')
  const animeSynopsisP = document.createElement('p')
  const dropdownStatusBtn = document.querySelector('.dropdown-status-btn')
  const progressInput = document.querySelector('.progress-input')
  const scoreInput = document.querySelector('.score-input')
  const animeWatchBtn = document.createElement('a')
  const editAnimeBtn = document.createElement('a')

  const progress = animeData.mediaListEntry ? animeData.mediaListEntry.progress : 0
  const status = animeData.mediaListEntry ? animeData.mediaListEntry.status : 'NONE'
  const score = animeData.mediaListEntry ? animeData.mediaListEntry.score : 0

  animeTitleP.classList.add('title')
  animeSynopsisP.classList.add('synopsis')
  animeWatchBtn.classList.add('watch-btn')
  editAnimeBtn.classList.add('edit-btn')

  animeBannerImg.src = animeData.bannerImage
  animeCoverImg.src = animeData.coverImage.large
  animeTitleP.innerText = animeData.title.english ? animeData.title.english : animeData.title.romaji
  animeSynopsisP.innerText = animeData.description ? animeData.description.replace(/<br>|<\/br>|<i>|<\/i>|<strong>|<\/strong>|<em>|<\/em>/g, '') : ''
  animeWatchBtn.innerHTML = `Watch Ep. ${progress == animeData.episodes ? progress : progress + 1}/${animeData.episodes}`
  editAnimeBtn.innerHTML = MEDIA_ENTRY_STATUS[status] + '<i class="fas fa-pen"></i>'
  dropdownStatusBtn.innerHTML = MEDIA_ENTRY_STATUS[status]
  progressInput.value = progress
  scoreInput.value = score

  animeAboutDiv.insertBefore(animeTitleP, animeAboutDiv.children[0])
  animeAboutDiv.insertBefore(animeSynopsisP, animeAboutDiv.children[1])
  animeCoverDiv.appendChild(animeCoverImg)

  if (userConfig.getUsername()) {
    animeCoverDiv.appendChild(animeWatchBtn)
    animeCoverDiv.appendChild(editAnimeBtn)
  }

  if (animeData.bannerImage) {
    animeBannerDiv.appendChild(animeBannerImg)
  } else {
    const mainDiv = document.querySelector('.main')
    mainDiv.style.transform = 'translateY(-200px)'
  }

  if (animeAboutDiv.scrollHeight - animeAboutDiv.clientHeight) {
    readMoreBtnP.style.display = 'block'
  } else {
    readMoreBtnP.style.display = 'none'
  }
}

function addOverviewToPage() {
  const overviewDiv = document.querySelector('.overview')

  const overviewData = {
    airing: animeData.nextAiringEpisode ? `Ep. ${animeData.nextAiringEpisode.episode}: ${Utils.convertSecondsToDHM(animeData.nextAiringEpisode.timeUntilAiring)}` : null,
    format: animeData.format,
    episodes: animeData.episodes,
    Episode_Duration: animeData.duration ? animeData.duration + 'mins' : null,
    status: animeData.status,
    Start_Date: animeData.startDate.month ? animeData.startDate.month + ', ' + animeData.startDate.year : null,
    End_Date: animeData.endDate.month ? animeData.endDate.month + ', ' + animeData.endDate.year : null,
    season: animeData.season ? [animeData.season, animeData.seasonYear] : null,
    Average_Score: animeData.averageScore ? animeData.averageScore + '%' : null,
    Mean_Score: animeData.meanScore ? animeData.meanScore + '%' : null,
    popularity: animeData.popularity,
    favorites: animeData.favourites,
    studio: animeData.studios.nodes.length ? animeData.studios.nodes[0].name : null,
    source: animeData.source
  }

  for (let [key, value] of Object.entries(overviewData)) {
    switch (key) {
      case 'airing':
        if (value) {
          var div = document.createElement('div')
          var p1 = document.createElement('p')
          var p2 = document.createElement('p')
          p2.style.color = getComputedStyle(document.body).getPropertyValue('--line-color')

          p1.innerText = 'Airing'
          p2.innerText = value

          div.appendChild(p1)
          div.appendChild(p2)
          overviewDiv.appendChild(div)
        }
        break

      case 'status':
        var div = document.createElement('div')
        var p1 = document.createElement('p')
        var p2 = document.createElement('p')

        p1.innerText = 'Status'
        p2.innerText = MEDIA_STATUS[value]

        div.appendChild(p1)
        div.appendChild(p2)
        overviewDiv.appendChild(div)
        break

      case 'season':
        if (value) {
          var div = document.createElement('div')
          var p1 = document.createElement('p')
          var p2 = document.createElement('p')

          p1.innerText = 'Season'
          p2.innerText = MEDIA_SEASON[value[0]] + ', ' + value[1]

          div.appendChild(p1)
          div.appendChild(p2)
          overviewDiv.appendChild(div)
        }
        break

      case 'source':
        if (value) {
          var div = document.createElement('div')
          var p1 = document.createElement('p')
          var p2 = document.createElement('p')

          p1.innerText = 'Source'
          p2.innerText = MEDIA_SOURCE[value]

          div.appendChild(p1)
          div.appendChild(p2)
          overviewDiv.appendChild(div)
        }
        break

      default:
        if (value) {
          var div = document.createElement('div')
          var p1 = document.createElement('p')
          var p2 = document.createElement('p')

          p1.innerText = (key.charAt(0).toUpperCase() + key.slice(1)).replace('_', ' ')
          p2.innerText = value

          div.appendChild(p1)
          div.appendChild(p2)
          overviewDiv.appendChild(div)
        }
        break
    }
  }
}

function addRelationsToPage() {
  const animeRelationsDiv = document.querySelector('.anime-relations')

  for (let i = 0; i < animeData.relations.edges.length; i++) {
    if (animeData.relations.edges[i].relationType == 'ADAPTATION') {
      continue
    }

    let relationDiv = document.createElement('div')
    let relationImg = document.createElement('img')
    let relationP = document.createElement('p')

    relationDiv.classList.add('relation-div')
    relationImg.src = animeData.relations.edges[i].node.coverImage.large
    relationP.innerText = RELATION_TYPE[animeData.relations.edges[i].relationType]
    relationDiv.id = animeData.relations.edges[i].node.id

    relationDiv.appendChild(relationImg)
    relationDiv.appendChild(relationP)
    animeRelationsDiv.appendChild(relationDiv)
  }
}

function addAnimeListCounters() {
  const counters = document.querySelector('.anime-lists-menu').getElementsByTagName('p')

  counters[0].innerHTML = storeAnilistMediaData.data.animeList.filter(anime => anime.status == 'CURRENT').length
  counters[1].innerHTML = storeAnilistMediaData.data.animeList.filter(anime => anime.status == 'COMPLETED').length
  counters[2].innerHTML = storeAnilistMediaData.data.animeList.filter(anime => anime.status == 'PLANNING').length
  counters[3].innerHTML = storeAnilistMediaData.data.animeList.filter(anime => anime.status == 'PAUSED').length
  counters[4].innerHTML = storeAnilistMediaData.data.animeList.filter(anime => anime.status == 'DROPPED').length
}

function setEventListeners() {
  const updateCloseBtn = document.querySelector('.close-update-btn')
  const updateRestartBtn = document.querySelector('.restart-update-btn')
  const animeAboutDiv = document.querySelector('.about')
  const readMoreBtnP = document.querySelector('.read-more')
  const readMoreBtnA = document.querySelector('.button')
  const sideBarBtns = document.querySelectorAll('.side-bar-btn')
  const menuTabs = document.getElementsByClassName('tab')
  const tabContent = document.getElementsByClassName('tab-content')
  const relations = document.getElementsByClassName('relation-div')
  const tableThs = document.getElementsByTagName('TH')
  const editBtn = document.querySelector('.edit-btn')
  const editBox = document.querySelector('.edit-box')
  const closeEditBox = document.querySelector('.close-edit-box')
  const dropdownStatusBtn = document.querySelector('.dropdown-status-btn')
  const dropdownStatusMenu = document.querySelector('.dropdown-status-menu')
  const dropdownBtnA = dropdownStatusMenu.getElementsByTagName('a')
  const progressInput = document.querySelector('.progress-input')
  const scoreInput = document.querySelector('.score-input')
  const saveEditBtn = document.querySelector('.save-btn')
  const selFolderBtn = document.querySelector('.sel-folder-btn')
  const selFolderInput = document.querySelector('.sel-folder-input')
  const playBtn = document.querySelector('.watch-btn')

  updateCloseBtn.addEventListener('click', () => {
    const updateNotification = document.querySelector('.update-frame')
    updateNotification.classList.add('hidden')
  })

  updateRestartBtn.addEventListener('click', () => {
    ipcRenderer.send('restart-app')
  })

  readMoreBtnA.addEventListener('click', function () {
    animeAboutDiv.style.height = 'unset'
    readMoreBtnP.style.display = 'none'
  })

  for (let i = 0; i < sideBarBtns.length; i++) {
    sideBarBtns[i].addEventListener('click', () => {
      ipcRenderer.send('setPage', sideBarBtns[i].id)
    })
  }

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
      tableThs[i].setAttribute('data-after', '▲')

      tableThs[i].addEventListener('click', () => {
        var tableTrs = document.getElementsByTagName('TR')
        let length = tableTrs.length

        for (let i = 1; i < length; i++) {
          tableTrs[1].remove()
        }

        if (tableThs[i].getAttribute('data-after') == '▲') {
          tableThs[i].setAttribute('data-after', '▼')

          handleTorrents(torrents.sort(Utils.compareParams(tableThs[i].id, 'desc')))
        } else {
          tableThs[i].setAttribute('data-after', '▲')

          handleTorrents(torrents.sort(Utils.compareParams(tableThs[i].id, 'asc')))
        }
      })
    }
  }

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      editBox.style.height = '430px'
    })
  }

  closeEditBox.addEventListener('click', () => {
    editBox.style.height = '0'
  })

  dropdownStatusBtn.addEventListener('click', () => {
    dropdownStatusMenu.style.height = '150px'
  })

  for (let i = 0; i < dropdownBtnA.length; i++) {
    dropdownBtnA[i].addEventListener('click', () => {
      dropdownStatusBtn.innerHTML = dropdownBtnA[i].innerText
    })
  }

  progressInput.addEventListener('input', () => {
    if (progressInput.value > animeData.episodes) {
      progressInput.value = animeData.episodes
    } else if (progressInput.value < 0) {
      progressInput.value = 0
    } else {
      progressInput.value = Math.floor(progressInput.value)
    }
  })

  scoreInput.addEventListener('input', () => {
    if (scoreInput.value > 100) {
      scoreInput.value = 100
    } else if (scoreInput.value < 0) {
      scoreInput.value = 0
    } else {
      scoreInput.value = Math.floor(scoreInput.value)
    }
  })

  saveEditBtn.addEventListener('click', () => {
    const newStatus = dropdownStatusBtn.innerHTML
    const newProgress = progressInput.value
    const newScore = scoreInput.value

    ipcRenderer.send('pushEditAnimeToAnilist', {
      animeId,
      newStatus,
      newProgress,
      newScore
    })

    saveEditBtn.innerHTML = 'Saved'
  })

  selFolderBtn.addEventListener('click', () => {
    const path = remote.dialog.showOpenDialogSync({
      properties: ['openDirectory']
    })[0].replace(/\\/g, '/')

    if (path) {
      selFolderInput.value = path ? path : ''
      saveAnimeFolder(path)
    }
  })

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      const args = {
        nextEpisode: animeData.mediaListEntry.progress + 1 > animeData.episodes ? animeData.episodes : animeData.mediaListEntry.progress + 1,
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
    }
  })

  document.addEventListener('click', (event) => {
    if (!dropdownStatusBtn.contains(event.target)) {
      dropdownStatusMenu.style.height = '0'
    }
  })
}

function handleTorrents(data) {
  const table = document.querySelector('.table-content')
  const loadingIcon = document.querySelector('.lds-dual-ring')

  // Avoid updating global variable torrents when sorting
  if (torrents.length != data.length || torrents.length == 75) {
    Array.prototype.push.apply(torrents, data)
  }

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

  ipcRenderer.on('episodeWatched', (_, args) => {
    if (animeId == args.animeId) {
      const watchBtn = document.querySelector('.watch-btn')
      const progressInput = document.querySelector('.progress-input')

      animeData.mediaListEntry.progress = args.episodeWatched

      watchBtn.innerHTML = `Watch Ep. ${args.episodeWatched + 1}/${animeData.episodes}`
      progressInput.value = args.episodeWatched
    }
  })

  ipcRenderer.on('animeFinished', (_, args) => {
    if (animeId == args.animeId) {
      const watchBtn = document.querySelector('.watch-btn')
      const progressInput = document.querySelector('.progress-input')
      const dropdownStatusBtn = document.querySelector('.dropdown-status-btn')
      const editAnimeBtn = document.querySelector('.edit-btn')

      watchBtn.innerHTML = `Watch Ep. 1/${animeData.episodes}`
      progressInput.value = animeData.episodes
      dropdownStatusBtn.innerHTML = MEDIA_ENTRY_STATUS['COMPLETED']
      editAnimeBtn.innerHTML = MEDIA_ENTRY_STATUS['COMPLETED'] + '<i class="fas fa-pen"></i>'
    }
  })
}