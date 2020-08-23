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
 * along with Foobar.  If not, see <https://www.gnu.org/licenses/>.
 */

import { getUrlParam } from './utils.js'
const animeId = getUrlParam('id', null)

fetchAnime(animeId)

/* ---------------------------------------------------------------------------- */

/**
 * Fetch anime information from Anilist DB
 * @param {number} id Anime ID
 */
function fetchAnime(id) {
    const query = `
        query ($id: Int) {
            Media (id: $id, type: ANIME) {
                title {
                    english,
                    romaji,
                    native
                },
                coverImage {
                    large
                },
                bannerImage,
                description(asHtml: false),
                relations {
                    edges {
                        relationType,
                        node {
                            title {
                                english
                            }
                        }
                    }
                }
            }
        }
    `;

    const variables = {
        id: id
    };

    const url = 'https://graphql.anilist.co',
        options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        };

    fetch(url, options).then(handleResponse)
        .then(handleData)
        .catch(handleError);
}

/**
 * Handle response from server
 * @param {object} response server's response
 */
function handleResponse(response) {
    return response.json().then(function (json) {
        return response.ok ? json : Promise.reject(json);
    });
}

/**
 * Handle data received from server
 * @param {object} data Data received from server
 */
function handleData(data) {
    const anime = data.data.Media

    if (anime.title.english) {
        var title = anime.title.english
    } else if (anime.title.romaji) {
        var title = anime.title.romaji
    } else {
        var title = anime.title.native
    }

    var cover = anime.coverImage.large,
        banner = anime.bannerImage,
        synopsis = anime.description

    if (synopsis) {
        synopsis = synopsis.replace(/<br>|<\/br>|<i>|<\/i>/g, '')
    }

    addAnimeToPage(title, cover, banner, synopsis)
}

/**
 * Handle error from server request
 * @param {object} error Array with error information
 */
function handleError(error) {
    alert('Error, check console');
    console.error(error);
}

/**
 * Add anime to HTML
 * @param {string} title Anime's title
 * @param {string} cover Link to anime's cover image
 * @param {string} banner Link to anime's banner image
 * @param {string} synopsis Anime's synopsis
 */
function addAnimeToPage(title, cover, banner, synopsis) {
    var headerDiv = document.querySelector('.header'),
        animeBannerDiv = document.createElement('div'),
        animeCoverInfoDiv = document.createElement('div'),
        animeCoverDiv = document.createElement('div'),
        animeInfoDiv = document.createElement('div'),
        animeAboutDiv = document.createElement('div'),
        animeBannerImg = document.createElement('img'),
        animeCoverImg = document.createElement('img'),
        watchBtnA = document.createElement('a'),
        animeTitleP = document.createElement('p'),
        animeSynopsisP = document.createElement('p'),
        readMoreBtnP = document.createElement('p'),
        readMoreBtnA = document.createElement('a')

    animeBannerDiv.classList.add('banner')
    animeCoverInfoDiv.classList.add('cover-info-wrap')
    animeCoverDiv.classList.add('cover')
    animeInfoDiv.classList.add('info')
    animeAboutDiv.classList.add('about')
    animeTitleP.classList.add('title')
    animeSynopsisP.classList.add('synopsis')
    readMoreBtnP.classList.add('read-more')
    readMoreBtnA.classList.add('button')

    animeBannerImg.src = banner
    animeCoverImg.src = cover
    watchBtnA.innerText = 'Watch'
    animeTitleP.innerText = title
    animeSynopsisP.innerText = synopsis
    readMoreBtnA.innerText = 'Read More'

    readMoreBtnP.appendChild(readMoreBtnA)
    animeAboutDiv.appendChild(animeTitleP)
    animeAboutDiv.appendChild(animeSynopsisP)
    animeAboutDiv.appendChild(readMoreBtnP)
    animeInfoDiv.appendChild(animeAboutDiv)
    animeCoverDiv.appendChild(animeCoverImg)
    animeCoverDiv.appendChild(watchBtnA)
    animeCoverInfoDiv.appendChild(animeCoverDiv)
    animeCoverInfoDiv.appendChild(animeInfoDiv)
    animeBannerDiv.appendChild(animeBannerImg)

    headerDiv.appendChild(animeBannerDiv)
    headerDiv.appendChild(animeCoverInfoDiv)

    if (animeAboutDiv.scrollHeight - animeAboutDiv.clientHeight) {
        readMoreBtnP.style.display = 'block'
    } else {
        readMoreBtnP.style.display = 'none'
    }

    readMoreBtnA.addEventListener('click', function () {
        animeAboutDiv.style.height = 'unset'
        readMoreBtnP.style.display = 'none'
    })

    setEventListeners()
}

/**
 * Set general event listeners
 */
function setEventListeners() {
    const animeAbout = document.querySelector('.about'),
        readMoreBtn = document.querySelector('.read-more')

    window.addEventListener('resize', function () {
        animeAbout.style.height = '185px'

        if (animeAbout.scrollHeight - animeAbout.clientHeight) {
            readMoreBtn.style.display = 'block'
        } else {
            readMoreBtn.style.display = 'none'
        }
    })
}
