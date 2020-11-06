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

function addSeasonsToView(seasons) {
  console.log(seasons)

  for (let [seasonNumber, seasonValue] of Object.entries(seasons)) {
    const seasonDiv = document.getElementById(seasonNumber)

    const releases = {
      tvReleases: {
        name: 'TV',
        list: seasonValue.list.filter(anime => anime.format == 'TV').sort(Utils.compareParams('meanScore', 'desc'))
      },
      leftovers: {
        name: 'LEFTOVERS',
        list: seasonValue.list.filter(anime => anime.format == 'LEFTOVER').sort(Utils.compareParams('meanScore', 'desc'))
      },
      tvShortReleases: {
        name: 'TV SHORT',
        list: seasonValue.list.filter(anime => anime.format == 'TV_SHORT').sort(Utils.compareParams('meanScore', 'desc'))
      },
      movieReleases: {
        name: 'MOVIES',
        list: seasonValue.list.filter(anime => anime.format == 'MOVIE').sort(Utils.compareParams('meanScore', 'desc'))
      },
      ovaOnaSpecialReleases: {
        name: 'ONA / OVA / SPECIAL',
        list: seasonValue.list.filter(anime => anime.format == 'ONA' || anime.format == 'OVA' || anime.format == 'SPECIAL').sort(Utils.compareParams('meanScore', 'desc'))
      }
    }

    for (let [_, value] of Object.entries(releases)) {
      if (!value.list.length) {
        continue
      }

      const releaseTypeP = document.createElement('p')

      releaseTypeP.classList.add('season-media-type')
      releaseTypeP.innerHTML = value.name

      seasonDiv.appendChild(releaseTypeP)

      for (let anime of value.list) {
        const mediaCard = document.createElement('div')
        const mediaCardImg = document.createElement('div')
        const mediaCardBody = document.createElement('div')
        const cardBodyHeader = document.createElement('div')
        const cardBodyMain = document.createElement('div')
        const cardBodyFooter = document.createElement('div')

        mediaCard.classList.add('season-media-card')
        mediaCardImg.classList.add('media-img')
        mediaCardBody.classList.add('card-body')
        cardBodyHeader.classList.add('card-body-header')
        cardBodyMain.classList.add('card-body-main')
        cardBodyFooter.classList.add('card-body-footer')

        // Media Image Div
        const mediaImg = document.createElement('img')
        const mediaTitle = document.createElement('p')
        const mediaStudio = document.createElement('span')

        mediaImg.src = anime.coverImage.large
        mediaTitle.innerHTML = anime.title.english ? anime.title.english : anime.title.romaji
        mediaStudio.innerHTML = anime.studios.nodes[0] ? anime.studios.nodes[0].name : ''
        mediaStudio.style.color = anime.coverImage.color

        mediaTitle.addEventListener('mouseenter', () => {
          mediaTitle.style.color = anime.coverImage.color
        })

        mediaTitle.addEventListener('mouseleave', () => {
          mediaTitle.style.color = 'unset'
        })

        mediaTitle.addEventListener('click', () => {
          window.location.href = `anime.html?id=${anime.id}`
        })

        mediaCardImg.appendChild(mediaImg)
        mediaCardImg.appendChild(mediaTitle)
        mediaCardImg.appendChild(mediaStudio)
        mediaCard.appendChild(mediaCardImg)

        // Media Header Div
        const mediaEpisode = document.createElement('p')
        const mediaAiringTime = document.createElement('p')
        const mediaSource = document.createElement('p')
        const mediaEmoji = document.createElement('i')
        const mediaMeanScore = document.createElement('p')

        switch (seasonNumber) {
          case '#season1':
            if (anime.nextAiringEpisode) {
              if (anime.episodes) {
                mediaEpisode.innerHTML = `Ep ${anime.nextAiringEpisode.episode} of ${anime.episodes} airing in`
              } else {
                mediaEpisode.innerHTML = `Ep ${anime.nextAiringEpisode.episode} airing in`
              }

              setInterval(() => {
                mediaAiringTime.innerHTML = Utils.getTimeToNextEpisode(anime.nextAiringEpisode.airingDate - Date.now())
              }, 1000);
            } else {
              if (anime.episodes) {
                mediaEpisode.innerHTML = anime.episodes > 1 ? `${anime.episodes} Episodes aired on` : `${anime.episodes} Episode aired on`
              } else {
                mediaEpisode.innerHTML = 'Aired on'
              }

              mediaAiringTime.innerHTML = Utils.getAiringDate(anime.startDate)
            }
            break

          case '#season2':
            if (anime.nextAiringEpisode) {
              if (anime.episodes) {
                mediaEpisode.innerHTML = `Ep ${anime.nextAiringEpisode.episode} of ${anime.episodes} airing in`
              } else {
                mediaEpisode.innerHTML = `Ep ${anime.nextAiringEpisode.episode} airing in`
              }

              setInterval(() => {
                mediaAiringTime.innerHTML = Utils.getTimeToNextEpisode(anime.nextAiringEpisode.airingDate - Date.now())
              }, 1000);
            } else {
              if (anime.episodes) {
                mediaEpisode.innerHTML = anime.episodes > 1 ? `${anime.episodes} Episodes aired on` : `${anime.episodes} Episode aired on`
              } else {
                mediaEpisode.innerHTML = 'Aired on'
              }

              mediaAiringTime.innerHTML = Utils.getAiringDate(anime.startDate)
            }
            break

          default:
            if (anime.episodes) {
              if (anime.startDate.day) {
                mediaEpisode.innerHTML = anime.episodes > 1 ? `${anime.episodes} Episodes airing on` : `${anime.episodes} Episode airing on`
              } else if (anime.startDate.month || anime.startDate.year) {
                mediaEpisode.innerHTML = anime.episodes > 1 ? `${anime.episodes} Episodes airing in` : `${anime.episodes} Episode airing in`
              } else {
                mediaEpisode.innerHTML = ''
              }
            } else {
              if (anime.startDate.day || anime.startDate.month) {
                mediaEpisode.innerHTML = 'Airing on'
              } else if (anime.startDate.year) {
                mediaEpisode.innerHTML = 'Airing in'
              } else {
                mediaEpisode.innerHTML = ''
              }
            }

            mediaAiringTime.innerHTML = Utils.getAiringDate(anime.startDate)
            break
        }

        mediaSource.innerHTML = anime.source ? 'SOURCE • ' + anime.source.replace('_', ' ') : ''
        mediaEmoji.classList.add('far')
        mediaMeanScore.innerHTML = anime.meanScore + '%'
        cardBodyHeader.appendChild(mediaEpisode)
        cardBodyHeader.appendChild(mediaAiringTime)
        cardBodyHeader.appendChild(mediaSource)

        if (anime.meanScore) {
          if (anime.meanScore >= 75) {
            mediaEmoji.classList.add('fa-smile-beam')
          } else if (anime.meanScore >= 60) {
            mediaEmoji.classList.add('fa-meh')
            mediaEmoji.style.color = '#cc862b'
          } else {
            mediaEmoji.classList.add('fa-frown')
            mediaEmoji.style.color = '#c44545'
          }

          cardBodyHeader.appendChild(mediaEmoji)
          cardBodyHeader.appendChild(mediaMeanScore)
        }

        mediaCardBody.appendChild(cardBodyHeader)

        // Media Main Div
        const mediaSynopsis = document.createElement('p')

        mediaSynopsis.innerHTML = anime.description ? anime.description.replace(/<br>|<\/br>|<i>|<\/i>|<strong>|<\/strong>|<em>|<\/em>|<dogeza>|<\/dogeza>/g, '') : 'No synopsis available.'
        cardBodyMain.appendChild(mediaSynopsis)
        mediaCardBody.appendChild(cardBodyMain)

        // Media Footer Div
        const mediaAddBtn = document.createElement('i')
        const mediaAddDiv = document.createElement('div')
        const mediaAddWatching = document.createElement('p')
        const mediaAddPlanning = document.createElement('p')

        for (let [count, genre] of anime.genres.entries()) {
          const animeGenre = document.createElement('div')

          animeGenre.classList.add('media-genre')
          animeGenre.innerHTML = genre.toLowerCase()
          animeGenre.style.backgroundColor = anime.coverImage.color
          cardBodyFooter.appendChild(animeGenre)

          if (count == 2) {
            break
          }
        }

        mediaAddBtn.classList.add('far')
        mediaAddBtn.classList.add('fa-plus-square')
        mediaAddDiv.classList.add('media-add-div')
        mediaAddWatching.innerHTML = '<i class="far fa-caret-square-right"></i>Add to Watching'
        mediaAddPlanning.innerHTML = '<i class="far fa-question-circle"></i>Add to Planning'
        mediaAddDiv.appendChild(mediaAddWatching)
        mediaAddDiv.appendChild(mediaAddPlanning)
        cardBodyFooter.appendChild(mediaAddBtn)
        cardBodyFooter.appendChild(mediaAddDiv)
        mediaCardBody.appendChild(cardBodyFooter)

        mediaAddBtn.addEventListener('mouseenter', () => {
          mediaAddDiv.style.zIndex = '1'
          mediaAddDiv.style.opacity = '1'

          mediaAddDiv.addEventListener('mouseenter', () => {
            mediaAddDiv.style.zIndex = '1'
            mediaAddDiv.style.opacity = '1'
          })

          mediaAddDiv.addEventListener('mouseleave', () => {
            mediaAddDiv.style.zIndex = '-1'
            mediaAddDiv.style.opacity = '0'
          })
        })

        mediaAddBtn.addEventListener('mouseleave', () => {
          mediaAddDiv.style.zIndex = '-1'
          mediaAddDiv.style.opacity = '0'
        })

        mediaCard.appendChild(mediaCardBody)
        seasonDiv.appendChild(mediaCard)
      }
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

  ipcRenderer.on('addSeasonsToView', (_, args) => {
    const seasonLinks = document.querySelector('.seasons-lists-menu').children
    var counter = 0;

    for (let season of Object.values(args)) {
      seasonLinks[counter].dataset.seasonName = `${season.name.charAt(0) + season.name.slice(1).toLowerCase()} ${season.year}`
      counter++
    }

    addSeasonsToView(args)
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