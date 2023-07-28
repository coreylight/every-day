import fs from 'fs'
import path from 'path'

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

const htmlPrompt = ({ mucician, weather, animal, animalImg }) => `
Give me a "fun facts of the day" html only page that would be fun and useful to elementary students. Javascript is not allowed.
Style the page in a way that is visually appealing to elementary students using an inline style tag.
The title of the page should include the current date in humanized and local timezone format according to the browser. The current date in ISO format is: ${new Date().toISOString()}.
Also include the day of the week in current timezone.
After the title, include the weather for the area. The current weather is ${weather}.
After the weather, include an animal of the day, which is the ${animal}. The animal should be accompanied with facts like its habitat, diet, and other interesting information. Include an img tag of the animal with the src of ${animalImg}.
After the animal, the page should contain a color of the day that has a name to it, along with the hex code. Ensure that the color of the day is visually represented so that it uses the color as a background, and chooses white or black text, whichever is better for readability.
Also include information about the music artist ${mucician}. The info should include their birth year, musical genres, birthplace, and other interesting information.
For the music artist, include an img tag 400px by 400px horizontally centered with the id attribute "musician", the src attribute of "MUSICIAN-IMG-REPLACE", and the alt attribute of the name of the artist. Also include a link with the musician that is <a href="#" id="link-spotify">Listen to ${mucician} on Spotify 🎶</a>.
Also include a word of the day that is a good spelling word for 2nd graders. Make the word of the day large in the html. Next, include a dictionary definition of the word. Next, include a sentence appropriate for a 2nd grader that is displayed on its own with the word of the day in it.
At the end of the page, include a link to the previously generated page. It will be at "archive/DATE.html" (relative path) where the date is the previous day to ${new Date().toISOString()} in YYYY-MM-DD format. Also include a link of the same logic that goes to the next day, which would be the day after ${new Date().toISOString()}.
For the html code, please ensure your response includes the code within markdown code formatting blocks.
Include 40px of padding for the html element.
`

const generateContent = async (prompt, opts) => {
  // replace 'prompt' with your desired prompt
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

  const artistContent = await generateContent(`
    Pick a random music artist in which their birth date is on or close to the current date which is ${new Date().toISOString()}, from any era, dead or alive. Output in json format and limit all prose. An example json structure looks like this:
    {
      "name": "Stevie Wonder",
      "genres": ["pop", "soul", "r&b"],
      "birthplace": "Saginaw, Michigan",
      "birthdate": "1950-05-13",
      "facts": "This multi-talented musician, composer, and singer was born six weeks premature, which resulted in Retinopathy of Prematurity, a condition that led to his blindness. Despite this, Wonder was undeterred and began his career as a child prodigy, signing with Motown's Tamla label at just 11 years old. Known for his captivating voice and extraordinary songwriting abilities, Wonder is the recipient of multiple Grammy Awards, with an impressive total of 25 as of my knowledge cutoff in 2021. He was also the youngest-ever recipient of the Album of the Year Grammy, which he won when he was just 23. One of his many notable achievements includes his induction into the Rock and Roll Hall of Fame in 1989. Furthermore, Stevie is also a civil rights activist and was instrumental in making Martin Luther King Jr.'s birthday a national holiday in the United States. Not just limited to his musical talent, Wonder is also known for playing various instruments, but he is best recognized for his skill on the piano and harmonica."
    }
    Now, a new music artist is:
  `)
  let artistJsonContent
  try {
    artistJsonContent = JSON.parse(artistContent)
  } catch (err) {
    //
  }

  const artistName = artistJsonContent?.name || ''
  if (!artistName) {
    console.log('No artist generated.')
    console.log(JSON.stringify(artistJsonContent, null, ' '))
  }

  let htmlContent = await generateContent(
    htmlPrompt({
      mucician: artistJsonContent?.name,
      weather,
      animal: animalObj?.name,
      animalImg: animalObj?.img,
    })
  )
  const artistInfo = await fetchArtistInfo(spotifyToken, artistName)
  const firstArtist = artistInfo?.artists?.items?.[0]
  const theFirstArtistImg = firstArtist?.images?.[0]?.url
  htmlContent = htmlContent.replace('MUSICIAN-IMG-REPLACE', theFirstArtistImg)
  htmlContent = htmlContent.replace(
    'href="#" id="link-spotify"',
    `href="${firstArtist?.external_urls?.spotify}" id="link-spotify" target="_blank"`
  )
  try {
    htmlContent = htmlContent.split('```html')[1].split('```')[0]
  } catch (err) {
    //
  }

  const newIndexContent = `
    ${htmlContent}
  `

  fs.writeFileSync(oldIndexPath, newIndexContent)
}

run()
