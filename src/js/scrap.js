import {compareParams} from './utils.js'

const cheerio = require('cheerio')
const axios = require('axios')
const anitomy = require('anitomy-js')

export const getTorrents = async (anime) => {
	var torrents = {}

	anime = [anime.romaji, anime.english]

	for (let t = 0; t < 2; t++) {
		if (anime[t]) {
			anime[t] = anime[t].replace(/:/g, ' ').replace(/\dnd|Season/g, '')

			var { data } = await axios.get(
				`https://nyaa.si/?q=${anime[t]}&filter=2&c=1_0&p=${1}`
			)
			var $ = cheerio.load(data)
			const totalPages = Math.floor($('.pagination-page-info').text().match(/\d+/g)[2] / 75 + 1)

			for (let page = 1; page <= totalPages; page++) {
				$('.success').each((_, trElement) => {
					let torrentInfo = {}
			
					$(trElement).children().each((tdIndex, tdElement) => {
						switch (tdIndex) {
							case 1:
								let a = $(tdElement).children().last()
								torrentInfo.fullName = $(a).attr('title')
								let parsedTorrent = anitomy.parseSync(torrentInfo.fullName)
								torrentInfo.source = parsedTorrent.release_group

								if (parsedTorrent.video_resolution) {
									torrentInfo.name = `${parsedTorrent.anime_title} - ${parsedTorrent.video_resolution}`
								} else {
									torrentInfo.name = parsedTorrent.anime_title
								}
								
								if (!parsedTorrent.episode_number && parsedTorrent.release_information) {
									torrentInfo.episode = 'Batch'
								} else {
									torrentInfo.episode = parsedTorrent.episode_number ? parsedTorrent.episode_number : '?'
								}

								break;
			
							case 2:
								let a1 = $(tdElement).children().first()
								let a2 = $(tdElement).children().last()
			
								torrentInfo.downloadLink = 'https://nyaa.si/' + $(a1).attr('href')
								torrentInfo.magneticLink = $(a2).attr('href')
								break;
			
							case 3:
								torrentInfo.size = $(tdElement).text()
								break;
			
							case 5:
								torrentInfo.seeds = parseInt($(tdElement).text(), 10)
								break;
			
							case 6:
								torrentInfo.leechs = parseInt($(tdElement).text(), 10)
								break;
			
							case 7:
								torrentInfo.downloadNumber = parseInt($(tdElement).text(), 10)
								break;
						
							default:
								break;
						}
					})

					torrents[torrentInfo.fullName] = torrentInfo
				})

				if (page < totalPages) {
					var { data } = await axios.get(
						`https://nyaa.si/?q=${anime[t]}&filter=2&c=1_0&p=${page + 1}`
					)
					$ = cheerio.load(data)
				}
			}
		}
	}

	console.log(torrents)
	torrents = Object.values(torrents)

	return torrents.sort(compareParams('seeds', 'desc'))
}
