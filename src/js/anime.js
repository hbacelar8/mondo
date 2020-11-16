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

const { ipcRenderer } = require('electron')

const Utils = require('../../lib/utils')

var animeData
var torrents = []

if (animeFiles.data.rootFolders.length) {
  const animeSelFolderInpt = document.querySelector('.sel-folder-input')
  const animeFolder = animeFiles.getFolderById(animeId)

  if (animeFolder) {
    animeSelFolderInpt.value = animeFolder
  }
}

/********************************************************************
 *                                                                  *
 *                            Functions                             *
 *                                                                  *
 * ******************************************************************
 */

function handleData(data) {
  animeData = data.data.Media

  addAnimeToPage()
  addOverviewToPage()
  addRelationsToPage()
  setEventListeners()
  Utils.getTorrents(animeData.title).then(handleTorrents)
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
  const animeWatchDiv = document.querySelector('.watch-btn-div')
  const editDiv = document.querySelector('.edit-btn-div')
  const episodesDropMenu = document.querySelector('.episodes-menu-drop')
  const editBtn = document.querySelector('.edit-btn')

  const progress = animeList.data.animeList ? animeList.getAnimeProgress(animeId) : 0
  const status = animeList.data.animeList ? animeList.getAnimeStatus(animeId) : 'NONE'
  const score = animeList.data.animeList ? animeList.getAnimeScore(animeId) : 0

  for (let i = 1; i <= animeData.episodes; i++) {
    const episodeBtn = document.createElement('div')

    episodeBtn.innerHTML = `Episode ${i}`
    episodesDropMenu.appendChild(episodeBtn)

    episodeBtn.addEventListener('click', () => {
      const args = {
        nextEpisode: i,
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
      episodesDropMenu.style.maxHeight = '0px'
    })
  }

  animeTitleP.classList.add('title')
  animeSynopsisP.classList.add('synopsis')

  if (status != 'NONE') {
    animeWatchDiv.style.display = 'inline-flex'
    editDiv.style.top = '208px'
  }

  animeBannerImg.src = animeData.bannerImage
  animeCoverImg.src = animeData.coverImage.large
  animeTitleP.innerText = animeData.title.english ? animeData.title.english : animeData.title.romaji
  animeSynopsisP.innerText = animeData.description ? animeData.description.replace(/<br>|<\/br>|<i>|<\/i>|<strong>|<\/strong>|<em>|<\/em>/g, '') : ''
  animeWatchDiv.getElementsByTagName('a')[0].innerHTML = `Watch ${progress == animeData.episodes ? progress : progress + 1}/${animeData.episodes ? animeData.episodes : '?'}`
  editBtn.innerHTML = MEDIA_ENTRY_STATUS[status]
  dropdownStatusBtn.innerHTML = MEDIA_ENTRY_STATUS[status]
  progressInput.value = progress
  scoreInput.value = score

  animeAboutDiv.insertBefore(animeTitleP, animeAboutDiv.children[0])
  animeAboutDiv.insertBefore(animeSynopsisP, animeAboutDiv.children[1])
  animeCoverDiv.appendChild(animeCoverImg)

  if (userConfig.getUsername()) {
    animeCoverDiv.appendChild(animeWatchDiv)
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