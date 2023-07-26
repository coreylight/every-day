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

const htmlPrompt = ({ mucician }) => `
Give me a "fun facts of the day" html page that would be fun and useful to elementary students. The title of the page should include the current date in humanized and local timezone format according to the browser. The current date in ISO format is: ${new Date().toISOString()}.
The information should contain things like animal of the day, with facts, habitat etc. It should contain a color of the day that has a name to it, along with the hex code. Ensure that the color of the day is visually represented as a colored background element.
Also include information about the music artist ${mucician}. The info should include their birth year, musical genres, birthplace, and other interesting information.
For the music artist, include an img tag 640px by 640px with the id attribute "musician", the src attribute of "MUSICIAN-IMG-REPLACE", and the alt attribute of the name of the artist.
Also include a word of the day that is a good spelling word for 2nd graders. Make the word of the day large in the html. Include a sentence that is good for a 2nd grader to read and write with the word of the day in it.
At the end of the page, include a link to the previously generated page. It will be at /archive/DATE.html where the date is the previous day to ${new Date().toISOString()} in YYYY-MM-DD format. Also include a link of the same logic that goes to the next day, which would be the day after ${new Date().toISOString()}.
For the html code, please ensure your response includes the code within markdown code formatting blocks.
`

const generateContent = async (prompt) => {
  // replace 'prompt' with your desired prompt
  const res = await fetch(OPENAI_API, {
    method: 'POST',
    headers: openAIHeaders,
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      model: 'gpt-3.5-turbo-16k',
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

const run = async () => {
  const spotifyToken = await getSpotifyToken()
  const date = new Date()
  const oldIndexPath = path.join(__dirname, 'index.html')
  const archivePath = path.join(
    __dirname,
    'archive',
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

  let htmlContent = await generateContent(
    htmlPrompt({ mucician: artistJsonContent?.name })
  )
  const artistInfo = await fetchArtistInfo(spotifyToken, artistName)
  const theFirstArtistImg = artistInfo?.artists?.items?.[0]?.images?.[0]?.url
  htmlContent = htmlContent.replace('MUSICIAN-IMG-REPLACE', theFirstArtistImg)
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
