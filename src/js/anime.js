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

import {getUrlParam, convertSecondsToDHM} from './utils.js'


const MEDIA_STATUS = {
    FINISHED: 'Finished',
    RELEASING: 'Releasing',
    NOT_YET_RELEASED: 'Not Yet Released',
    CANCELLED: 'Cancelled'
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
                format,
                status,
                startDate {
                    month,
                    year
                },
                endDate {
                    month,
                    year
                },
                season,
                seasonYear,
                episodes,
                duration,
                countryOfOrigin,
                source,
                averageScore,
                meanScore,
                popularity,
                favourites,
                studios {
                    nodes {
                        name
                    }
                },
                nextAiringEpisode {
                    timeUntilAiring,
                    episode
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
                            id,
                            coverImage {
                                large
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
    const relationsData = data.data.Media.relations.edges
    console.log(data)

    const overviewData = {
        airing: anime.nextAiringEpisode ? `Ep. ${anime.nextAiringEpisode.episode}: ${convertSecondsToDHM(anime.nextAiringEpisode.timeUntilAiring)}` : null,
        format: anime.format,
        episodes: anime.episodes,
        Episode_Duration: anime.duration ? anime.duration + 'mins': null,
        status: anime.status,
        Start_Date: anime.startDate.month ? anime.startDate.month + ', ' + anime.startDate.year : null,
        End_Date: anime.endDate.month ? anime.endDate.month + ', ' + anime.endDate.year: null,
        season: anime.season ? [anime.season, anime.seasonYear] : null,
        Average_Score: anime.averageScore ? anime.averageScore + '%': null,
        Mean_Score: anime.meanScore ? anime.meanScore + '%': null,
        popularity: anime.popularity,
        favorites: anime.favourites,
        studio: anime.studios.nodes.length ? anime.studios.nodes[0].name : null,
        source: anime.source
    }

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
    addOverviewToPage(overviewData)
    addRelationsToPage(relationsData)
    setEventListeners()
}

/**
 * Handle error from server request
 * @param {object} error Array with error information
 */
function handleError(error) {
    alert('Error loading anime content.');
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
    const animeBannerDiv = document.querySelector('.banner'),
        animeCoverDiv = document.querySelector('.cover'),
        animeAboutDiv = document.querySelector('.about'),
        readMoreBtnP = document.querySelector('.read-more'),
        animeBannerImg = document.createElement('img'),
        animeCoverImg = document.createElement('img'),
        animeTitleP = document.createElement('p'),
        animeSynopsisP = document.createElement('p')

    animeTitleP.classList.add('title')
    animeSynopsisP.classList.add('synopsis')

    animeBannerImg.src = banner
    animeCoverImg.src = cover
    animeTitleP.innerText = title
    animeSynopsisP.innerText = synopsis
    animeSynopsisP.style.lineHeight = '25px'

    animeAboutDiv.insertBefore(animeTitleP, animeAboutDiv.children[0])
    animeAboutDiv.insertBefore(animeSynopsisP, animeCoverDiv.children[1])
    animeCoverDiv.insertBefore(animeCoverImg, animeCoverDiv.children[0])

    if (banner) {
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

/**
 * Add anime overview information to HTML page
 * @param {object} overviewData Overview information from anime
 */
function addOverviewToPage(overviewData) {
    const overviewDiv = document.querySelector('.overview')
    console.log(overviewData)

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

function addRelationsToPage(relationsData) {
    const animeRelationsDiv = document.querySelector('.anime-relations')

    for (let i = 0; i < relationsData.length; i++) {
        if (relationsData[i].relationType == 'ADAPTATION') {
            continue
        }

        let relationDiv = document.createElement('div')
        let relationImg = document.createElement('img')
        let relationP = document.createElement('p')

        relationDiv.classList.add('relation-div')
        relationImg.src = relationsData[i].node.coverImage.large
        relationP.innerText = RELATION_TYPE[relationsData[i].relationType]
        relationDiv.id = relationsData[i].node.id

        relationDiv.appendChild(relationImg)
        relationDiv.appendChild(relationP)
        animeRelationsDiv.appendChild(relationDiv)
    }
}

/**
 * Set general event listeners
 */
function setEventListeners() {
    const animeAboutDiv = document.querySelector('.about'),
        readMoreBtnP = document.querySelector('.read-more'),
        readMoreBtnA = document.querySelector('.button'),
        menuTabs = document.getElementsByClassName('tab'),
        tabContent = document.getElementsByClassName('tab-content'),
        relations = document.getElementsByClassName('relation-div')

    readMoreBtnA.addEventListener('click', function () {
        animeAboutDiv.style.height = 'unset'
        readMoreBtnP.style.display = 'none'
    })

    Array.prototype.forEach.call(menuTabs, tab => {
        tab.addEventListener('click', function () {
            const target = document.querySelector(tab.dataset.tabTarget)

            Array.prototype.forEach.call(tabContent, content => {
                content.classList.remove('active')
            })

            target.classList.add('active')
        })
    })

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
}
