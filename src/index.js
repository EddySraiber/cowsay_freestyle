const exp = require('express');
const favicon = require('serve-favicon');
const helmet = require('helmet');
const path = require('path');
const cowsay = require('cowsay');
const request = require('request');
const cheerio = require('cheerio');
const compression = require('compression');
const app = exp();

// gzip
app.use(compression());

//security
app.use(helmet());
// app.use(helmet.noCache());
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubdomains: true
}));

// static files
const p = './public';
const publicFolderPath = path.join(__dirname, p);
app.use(favicon(path.join(publicFolderPath, '/favicon.ico')));
app.use(exp.static(publicFolderPath));

// Hardcoded Deepak Chopra-style quotes for fallback
const deepakChopraQuotes = [
  "Quantum physics discloses the architecture of the cosmos",
  "The universe is a field of infinite possibilities",
  "Your consciousness creates your unique reality",
  "Healing transforms perceptions into spiritual knowledge",
  "The physical world is a mirror of the unmanifested realm",
  "Time is the continuity of eternal awareness",
  "Imagination reveals the non-local nature of awareness",
  "Perception is transformed by the mechanics of your soul",
  "The secret of the universe exists within your own biology",
  "Spontaneous fulfillment arises from infinite silence",
  "Cosmic consciousness shapes your personal reality",
  "Happiness exists in the rhythm of balanced energy",
  "Meditation unveils the wisdom of your immortal essence",
  "Your DNA is a portal to universal intelligence",
  "Synchronicity is the universe's creative expression",
  "Transformation occurs beyond the boundaries of logical thought",
  "The field of pure potentiality transcends linear time",
  "Love is the frequency that unifies all existence",
  "Awareness blossoms in the garden of silent intention",
  "Healing is the remembrance of your eternal nature"
];

// Function to get a random quote from our fallback array
function getRandomQuote() {
  const randomIndex = Math.floor(Math.random() * deepakChopraQuotes.length);
  return deepakChopraQuotes[randomIndex];
}

app.get('/', function (req, res) {
  // First try to fetch from original website
  var options = {
    method: 'GET',
    url: 'http://www.wisdomofchopra.com/iframe.php',
    // Short timeout so we don't wait too long if the site is down
    timeout: 3000
  };
  
  request(options, function (error, response, body) {
    if (error || !response || response.statusCode !== 200) {
      // Website is down or error occurred, use fallback
      console.log('Website is down or returned an error. Using fallback quotes.');
      const randomQuote = getRandomQuote();
      const w = `
Deepak Chopra Quote (Fallback):
" ${randomQuote}"
      `;
      const responseText = setCowsaySentence(w);
      res.send(responseText);
    } else {
      // Website is up, parse the response as before
      try {
        var $ = cheerio.load(body);
        const st = $('h2', '#quote').text().replace(/\"/g, '').replace(/\_/g, '');
        const w = `
Deepak Chopra Quote:
" ${st}"
        `;
        const responseText = setCowsaySentence(w);
        res.send(responseText);
      } catch (parseError) {
        // If parsing fails, use fallback
        console.log('Failed to parse response from website. Using fallback quotes.');
        const randomQuote = getRandomQuote();
        const w = `
Deepak Chopra Quote:
" ${randomQuote}"
        `;
        const responseText = setCowsaySentence(w);
        res.send(responseText);
      }
    }
  });
});

app.get('/:text', function (req, res) {
  let text = 'xxxxxxxx';
  try {
    text = req.params.text;
  } catch (e) { }
  const responseText = setCowsaySentence(text);
  res.send(responseText);
});

const setCowsaySentence = (text) => {
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
      <meta name="description" content="cowsay">
      <meta name="author" content="Bibby Chung">
      <link rel="icon" href="/favicon.ico">
  
      <title>Cow Say</title>
    </head>
  
    <body>
      <pre>
${cowsay.say({
      text,
      e: "oO"
    })}
          </pre>
      <br/><br/>
    </body>
  </html>
`;
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`=> 0.0.0.0:${PORT}`));
