import fs from 'fs'
import path from 'path'
import cheerio from 'cheerio'

const OPENAI_API = 'https://api.openai.com/v1/chat/completions'

const openAIHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.OPENAI_KEY}`,
}

const getSpotifyToken = async () => {
  let url = 'https://accounts.spotify.com/api/token'

  let headers = {
    Authorization: 'Basic ' + process.env.SPOTIFY_KEY,
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  let data = 'grant_type=client_credentials'

  const res = await fetch(url, {
    method: 'POST',
    headers: headers,
    body: data,
  })
  const json = await res.json()
  return json?.access_token
}

const getAnimalOfTheDayObj = async () => {
  const res = await fetch(
    'https://www.animalfunfacts.net/pictures/picture-of-the-day.html'
  )
  const html = await res.text()
  // extract the url of the first srcset attribute
  const regex = /srcset="([^"]*)"/
  const match = html.match(regex)
  const srcset = match[1]
  let url = srcset.split(' ')[0].replace(/^\//, '')
  // the url is a relative path, so make it absolute from the domain above
  url = `https://www.animalfunfacts.net/${url}`
  // get the inner text of the first tag that has class uk-link-reset
  const regex2 = /<a .*class="uk-link-reset".*>([^<]*)<\/a>/
  const match2 = html.match(regex2)
  const animal = match2[1]
  return { img: url, animal }
}

const getWikiMusician = async () => {
  const date = new Date()
  const month = date.toLocaleString('default', { month: 'long' })
  const day = date.getDate()
  const fetchUrl = `https://en.wikipedia.org/wiki/Portal:Music/DateOfBirth/${month}_${day}`

  const response = await fetch(fetchUrl)
  const html = await response.text()
  const $ = cheerio.load(html)

  const getRandomArtistInfo = (idx) => {
    const els = $('#bodyContent li a:first-child')
    const randomIndex = Math.floor(Math.random() * els.length)
    const tag = els.eq(randomIndex)
    const randomArtistUrl = tag.attr('href')
    // get inner content of tag
    const text = tag.text()
    const name = text.split(',')[0].trim()
    const firstPartOfName = name.split(' ')[0]
    const base = 'https://en.wikipedia.org'
    const url = `${base}${randomArtistUrl}`
    const doesMatch = url.match(firstPartOfName)
    if (!doesMatch && idx < 5) {
      return getRandomArtistInfo(idx + 1)
    } else {
      return { url, name }
    }
  }

  const { url, name } = getRandomArtistInfo(0)
  let artistInfo = ''
  if (url) {
    const res = await fetch(url)
    const artistInfoBlob = await res.text()
    const $ = cheerio.load(artistInfoBlob)
    $('style').remove()
    artistInfo = $('#bodyContent').text()
  }
  return { url, name, artistInfo }
}

const LAT = 42.1675
const LON = -87.8977

const openweatherExampleResponse = {
  data: {
    coord: { lon: -87.8977, lat: 42.1675 },
    weather: [
      { id: 800, main: 'Clear', description: 'clear sky', icon: '01d' },
    ],
    base: 'stations',
    main: {
      temp: 88.23,
      feels_like: 96.6,
      temp_min: 82.78,
      temp_max: 95.54,
      pressure: 1015,
      humidity: 62,
    },
    visibility: 10000,
    wind: { speed: 6.91, deg: 80 },
    clouds: { all: 0 },
    dt: 1690487857,
    sys: {
      type: 1,
      id: 5453,
      country: 'US',
      sunrise: 1690454358,
      sunset: 1690506999,
    },
    timezone: -18000,
    id: 4907762,
    name: 'Riverwoods',
    cod: 200,
  },
}

const getWeather = async () => {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&exclude=minutely,daily,alerts&appid=${process.env.OPENWEATHER_KEY}&units=imperial`
  )
  const data = await response.json()

  const { main, sys } = data

  const minTemp = Math.round(main.temp_min)
  const maxTemp = Math.round(main.temp_max)
  const sunriseTime = new Date(sys.sunrise * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  const sunsetTime = new Date(sys.sunset * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  const weatherString = `Riverwoods Weather for today: Min temp: ${minTemp}°F. Max temp: ${maxTemp}°F. Sunrise: ${sunriseTime}. Sunset: ${sunsetTime}.`

  console.log(JSON.stringify({ data }, null, ' '))

  return weatherString
}

const getUnsplashImg = async (query) => {
  const response = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
      `Photo of A ${query}`
    )}&client_id=${process.env.UNSPLASH_KEY}`
  )
  const data = await response.json()
  return data.urls.small
}

const htmlPrompt = ({
  musician: { url: musicianUrl, name: musician, text: musicianText },
  weather,
  animal,
  animalImg,
}) => `
Give me a "fun facts of the day" html only page that would be fun and useful to elementary students. Javascript is not allowed.
Style the page in a way that is visually appealing to elementary students using an inline style tag.
The title of the page should include the current date in humanized and local timezone format according to the browser. The current date in ISO format is: ${new Date().toISOString()}.
Also include the day of the week in current timezone.
After the title, this exact text: "The current weather is ${weather}".
After the weather text, include an animal of the day, which is the ${animal}. The animal should be accompanied with facts like its habitat, diet, and other interesting information. Include an img tag of the animal with the src of ${animalImg}.
After the animal, the page should contain a color of the day that has a name to it, along with the hex code. Ensure that the color of the day is visually represented so that it uses the color as a background, and chooses white or black text, whichever is better for readability.
Also include a musician of the day, which is ${musician}. Just provide the name of the musician as a header and an html element that is <p id="musician"/> which will be replaced later.
For the music artist, include an img tag 400px by 400px horizontally centered with the id attribute "musician-img". Also include a link with the musician that is <a href="#" id="link-spotify" target="_blank">Listen to ${musician} on Spotify 🎶</a>.
Also include a word of the day that is a good spelling word for 2nd graders. Make the word of the day large in the html. Next, include a dictionary definition of the word. Next, include a sentence appropriate for a 2nd grader that is displayed on its own with the word of the day in it.
At the end of the page, include a link to the previously generated page. It will be at "archive/DATE.html" (relative path) where the date is the previous day to ${new Date().toISOString()} in YYYY-MM-DD format. Also include a link of the same logic that goes to the next day, which would be the day after ${new Date().toISOString()}.
For the html code, please ensure your response includes the code within markdown code formatting blocks.
Include 40px of padding for the html element.
`

const generateContent = async (prompt, opts) => {
  // replace 'prompt' with your desired prompt
  console.log({ prompt })
  const res = await fetch(OPENAI_API, {
    method: 'POST',
    headers: openAIHeaders,
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      model: 'gpt-3.5-turbo-16k',
      ...opts,
    }),
  })
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  if (!content) {
    console.log(JSON.stringify(data, null, ' '))
  }
  return content
}

const fetchArtistInfo = async (accessToken, artistName) => {
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
    artistName
  )}&type=artist&limit=1`

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  }

  try {
    const response = await fetch(url, { method: 'GET', headers: headers })
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error:', error)
  }
}
const __dirname = path.dirname(new URL(import.meta.url).pathname)

const getLetterBasedOnDayOfMonth = () => {
  const letterCode = 97 + ((new Date().getDate() - 1) % 26)
  return String.fromCharCode(letterCode)
}

const getAnimalPrompt = () => {
  return `Provide the name of an animal. It can be any animal at all, found anywhere in the world. The animal should start with the letter ${getLetterBasedOnDayOfMonth()}.`
}

const run = async () => {
  const {
    name: musicianName,
    url: musicianUrl,
    artistInfo: musicianInfo,
  } = await getWikiMusician()

  const musicianInfoSummary = await generateContent(`
  Summarize the information in 2 paragraphs or less.
  ${musicianInfo}
`)

  let artistJsonContent = {
    text: musicianInfoSummary,
    name: musicianName,
    url: musicianUrl,
  }

  const animalObj = await getAnimalOfTheDayObj()
  const weather = await getWeather()
  const spotifyToken = await getSpotifyToken()
  const date = new Date()
  const oldIndexPath = path.join(__dirname, '/index.html')
  const archivePath = path.join(
    __dirname,
    '/archive',
    `${date.toISOString().split('T')[0]}.html`
  )

  const oldIndexContent = fs.existsSync(oldIndexPath)
    ? fs.readFileSync(oldIndexPath)
    : ''

  fs.writeFileSync(archivePath, oldIndexContent)

  const artistName = artistJsonContent?.name || ''

  let htmlContent = await generateContent(
    htmlPrompt({
      musician: artistJsonContent,
      weather,
      animal: animalObj?.name,
      animalImg: animalObj?.img,
    })
  )

  try {
    htmlContent = htmlContent.split('```html')[1].split('```')[0]
  } catch (err) {
    //
  }

  const $ = cheerio.load(htmlContent)
  $('#musician').replaceWith(`<p id="musician">${artistJsonContent?.text}</p>`)

  const artistInfo = await fetchArtistInfo(spotifyToken, artistName)
  const firstArtist = artistInfo?.artists?.items?.[0]
  const theFirstArtistImg = firstArtist?.images?.[0]?.url

  $('#musician-img').attr('src', theFirstArtistImg).attr('alt', artistName)
  $('#link-spotify').attr('href', firstArtist?.external_urls?.spotify)

  const newIndexContent = `
    ${$.html()}
  `

  fs.writeFileSync(oldIndexPath, newIndexContent)
}

run()
