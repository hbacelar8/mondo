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
const Utils = require(path.resolve('./src/js/utils'))
const currentPage = window.location.pathname.split('/').pop().replace('.html', '')

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

if (Object.keys(storeAnilistMediaData.data) != 0) {
  addAnimesToView()
} else {
  addNoListToView()
}

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
  storeAnilistMediaData.data[currentPage].entries.forEach((entry) => {
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
      window.location.href = `anime.html?id=${entry.media.id}`
    })

    animeWrap.appendChild(newAnimeDiv)
  })

  setGridSize()
  addAnimeListCounters()
}

function addNoListToView() {
  const animeWrap = document.querySelector('.anime-wrap')
  const noListDiv = document.createElement('div')

  noListDiv.classList.add('no-list')
  noListDiv.innerHTML = 'Nothing to show around here'

  animeWrap.appendChild(noListDiv)
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
  const slider = document.querySelector('.slider')
  const sortBtn = document.querySelector('.sort-btn')
  const sortBtnOptions = document.querySelector('.options')
  const sortBtnOptionsA = sortBtnOptions.getElementsByTagName('a')


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
      window.location.href = `search.html?str=${searchBar.value}`
    }
  })

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

        storeAnilistMediaData.data[currentPage].entries.sort(Utils.compareParams(sortBtnOptionsA[i].id, sortBtnOptionsA[i].id == 'media.title.english' ? 'asc' : 'desc'))

        addAnimesToView()
        setGridSize()
      }
    })
  }
}

function setGridSize() {
  const animeWrap = document.querySelector('.anime-wrap')
  const animeDivs = document.querySelectorAll('.anime')
  const slider = document.querySelector('.slider')

  slider.value = storeUserConfig.data.gridSize
  animeWrap.style.gridTemplateColumns = `repeat(auto-fill, minmax(${150 + storeUserConfig.data.gridSize * 12}px, 1fr))`

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
}