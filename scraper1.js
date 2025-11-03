const puppeteer = require("puppeteer");
const fs = require("fs");

// ----------------- CONFIGURATION -----------------
// The maximum number of scraping tasks to run at the same time.
// A good starting point is 5-10. Too high, and you might get IP banned or run out of memory.
const CONCURRENCY_LIMIT = 8;

// The maximum number of times to retry a failed scrape.
const MAX_RETRIES = 3;

// The delay in milliseconds to wait before retrying a failed scrape.
const RETRY_DELAY_MS = 2000; // 2 seconds

// ---------------- Generic Scraper ----------------
// This function remains the same as it's executed in the browser context.
async function scrapeHoroscopeDetails(page, labels) {
  return await page.evaluate((labels) => {
    const horoscopeEl =
      document.querySelector(".ui-large-content") ||
      document.querySelector(".ui-large-content.text-justify") ||
      document.querySelector(".ui-horoscope-content") ||
      document.querySelector(".ui-content-block");

    const horoscope = horoscopeEl ? horoscopeEl.innerText.trim() : null;

    let luckyNumber = null;
    let luckyColor = null;
    let remedy = null;

    const divs = Array.from(document.querySelectorAll("div.ui-large-content"));
    divs.forEach((div) => {
      const b = div.querySelector("b");
      if (!b) return;
      const labelText = b.innerText.trim();
      const value = div.innerText.replace(b.innerText, "").trim();

      if (labels.luckyNumber.some((l) => labelText.includes(l)))
        luckyNumber = value;
      else if (labels.luckyColor.some((l) => labelText.includes(l)))
        luckyColor = value;
      else if (labels.remedy.some((l) => labelText.includes(l))) remedy = value;
    });

    // ⭐ Extract ratings
    const ratings = {};
    document.querySelectorAll(".col-sm-4, .col-sm-6").forEach((div) => {
      const category = div
        .querySelector("b")
        ?.innerText.replace(":", "")
        .trim();
      if (!category) return;

      const stars = Array.from(div.querySelectorAll("img")).map((img) =>
        img.getAttribute("src").includes("star2.gif") ? 1 : 0
      );

      const filledStars = stars.reduce((sum, s) => sum + s, 0);

      // ✅ Only keep if there’s at least 1 star
      if (filledStars > 0) {
        ratings[category] = filledStars;
      }
    });

    return { horoscope, luckyNumber, luckyColor, remedy, ratings };
  }, labels);
}

// ---------------- Config for multiple languages ----------------
const languages = {
  english: {
    baseUrl: "https://www.astrosage.com/horoscope/daily-{sign}-horoscope.asp",
    signs: {
      aries: "aries",
      taurus: "taurus",
      gemini: "gemini",
      cancer: "cancer",
      leo: "leo",
      virgo: "virgo",
      libra: "libra",
      scorpio: "scorpio",
      sagittarius: "sagittarius",
      capricorn: "capricorn",
      aquarius: "aquarius",
      pisces: "pisces",
    },
    labels: {
      luckyNumber: ["Lucky Number", "Lucky Number :-"],
      luckyColor: ["Lucky Color", "Lucky Color :-"],
      remedy: ["Remedy", "Remedy :-"],
    },
  },
  hindi: {
    baseUrl: "https://hindi.astrosage.com/rashifal/{sign}-rashifal.asp",
    signs: {
      aries: "mesh",
      taurus: "vrishabha",
      gemini: "mithun",
      cancer: "karka",
      leo: "singh",
      virgo: "kanya",
      libra: "tula",
      scorpio: "vrishchika",
      sagittarius: "dhanu",
      capricorn: "makara",
      aquarius: "kumbha",
      pisces: "meena",
    },
    labels: {
      luckyNumber: ["भाग्यांक", "भाग्यांक :-"],
      luckyColor: ["भाग्य रंग", "भाग्य रंग :-"],
      remedy: ["उपाय", "उपाय :-"],
    },
  },
  gujarati: {
    baseUrl:
      "https://www.astrosage.com/gujarati/rashi-bhavishya/{sign}-rashi-bhavishya.asp",
    signs: {
      aries: "mesh",
      taurus: "vrushabh",
      gemini: "mithun",
      cancer: "kark",
      leo: "singh",
      virgo: "kanya",
      libra: "tula",
      scorpio: "vrushchik",
      sagittarius: "dhanu",
      capricorn: "makar",
      aquarius: "kumbh",
      pisces: "meen",
    },
    labels: {
      luckyNumber: ["લકી નંબર", "લકી નંબર :-"],
      luckyColor: ["નસીબદાર રંગ", "નસીબદાર રંગ :-"],
      remedy: ["ઉપાય", "ઉપાય :-"],
    },
  },
  marathi: {
    baseUrl:
      "https://www.astrosage.com/marathi/rashi-bhavishya/{sign}-rashi-bhavishya.asp",
    signs: {
      aries: "mesh",
      taurus: "vrishabha",
      gemini: "mithun",
      cancer: "karka",
      leo: "simha",
      virgo: "kanya",
      libra: "tula",
      scorpio: "vrishchika",
      sagittarius: "dhanu",
      capricorn: "makara",
      aquarius: "kumbha",
      pisces: "meena",
    },
    labels: {
      luckyNumber: ["भाग्यांक", "भाग्यांक :-"],
      luckyColor: ["भाग्य रंग", "भाग्य रंग :-"],
      remedy: ["उपाय", "उपाय :-"],
    },
  },
  punjabi: {
    baseUrl: "https://www.astrosage.com/punjabi/rashifal/{sign}-rashifal.asp",
    signs: {
      aries: "megh",
      taurus: "vrash",
      gemini: "mithun",
      cancer: "karak",
      leo: "sigh",
      virgo: "kania",
      libra: "tula",
      scorpio: "brishchak",
      sagittarius: "dhanu",
      capricorn: "makar",
      aquarius: "kumbh",
      pisces: "meen",
    },
    labels: {
      luckyNumber: ["ਭਾਗਸ਼ਾਲੀ ਨੰਬਰ", "ਭਾਗਸ਼ਾਲੀ ਨੰਬਰ :-"],
      luckyColor: ["ਭਾਗਸ਼ਾਲੀ ਰੰਗ", "ਭਾਗਸ਼ਾਲੀ ਰੰਗ :-"],
      remedy: ["ਉਪਾਅ", "ਉਪਾਅ :-"],
    },
  },
  tamil: {
    baseUrl: "https://www.astrosage.com/tamil/rasi-palan/{sign}-rasi-palan.asp",
    signs: {
      aries: "mesham",
      taurus: "rishabam",
      gemini: "midhunam",
      cancer: "kadagam",
      leo: "simmam",
      virgo: "kanni",
      libra: "thulaam",
      scorpio: "viruchigam",
      sagittarius: "dhanusu",
      capricorn: "magaram",
      aquarius: "kumbam",
      pisces: "meenam",
    },
    labels: {
      luckyNumber: ["அதிர்ஷ்ட எண்", "அதிர்ஷ்ட எண் :-"],
      luckyColor: ["அதிர்ஷ்ட நீரம்", "அதிர்ஷ்ட நீரம் :-"],
      remedy: ["பரிகாரம்", "பரிகாரம் :-"],
    },
  },
  telugu: {
    baseUrl:
      "https://www.astrosage.com/telugu/rasi-phalalu/{sign}-rasi-phalalu.asp",
    signs: {
      aries: "mesha",
      taurus: "vrusha",
      gemini: "mithuna",
      cancer: "karkataka",
      leo: "simha",
      virgo: "kanya",
      libra: "tula",
      scorpio: "vrushchika",
      sagittarius: "dhanusu",
      capricorn: "makara",
      aquarius: "kumbha",
      pisces: "meena",
    },
    labels: {
      luckyNumber: ["అదృష్ట సంఖ్య", "అదృష్ట సంఖ్య :-"],
      luckyColor: [" అదృష్ట రంగు", "అదృష్ట రంగు :-"],
      remedy: ["చికిత్స", "చికిత్స :-"],
    },
  },
  kannada: {
    baseUrl:
      "https://www.astrosage.com/kannada/rashi-bhavishya/{sign}-rashi-bhavishya.asp",
    signs: {
      aries: "mesha",
      taurus: "vrushabha",
      gemini: "mithuna",
      cancer: "karka",
      leo: "simha",
      virgo: "kanya",
      libra: "tula",
      scorpio: "vrushchika",
      sagittarius: "dhanu",
      capricorn: "makara",
      aquarius: "kumbha",
      pisces: "meena",
    },
    labels: {
      luckyNumber: ["ಅದೃಷ್ಟ ಸಂಖ್ಯೆ", "ಅದೃಷ್ಟ ಸಂಖ್ಯೆ :- "],
      luckyColor: ["ಲಕ್ಕಿ ಬಣ್ಣ", "ಅದೃಷ್ಟ ಬಣ್ಣ :-"],
      remedy: ["ಉಪಾಯ", "ಉಪಾಯ :-"],
    },
  },
  malayalam: {
    baseUrl: "https://www.astrosage.com/malayalam/rasi/{sign}-rasi.asp",
    signs: {
      aries: "metam",
      taurus: "itavam",
      gemini: "mithunam",
      cancer: "karkkatakam",
      leo: "cinnam",
      virgo: "kanni",
      libra: "tulam",
      scorpio: "vrscikam",
      sagittarius: "dhanu",
      capricorn: "makaram",
      aquarius: "kumbham",
      pisces: "minam",
    },
    labels: {
      luckyNumber: ["ഭാഗ്യ സംഖ്യ", "ഭാഗ്യ സംഖ്യ :-"],
      luckyColor: ["ഭാഗ്യ നിറം", "ഭാഗ്യ നിറം :-"],
      remedy: ["പരിഹാരം", "പരിഹാരം :-"],
    },
  },
  bengali: {
    baseUrl: "https://www.astrosage.com/bengali/rashifal/{sign}-rashifal.asp",
    signs: {
      aries: "mesh",
      taurus: "brishabh",
      gemini: "mithun",
      cancer: "karkat",
      leo: "singha",
      virgo: "kanya",
      libra: "tula",
      scorpio: "brishchik",
      sagittarius: "dhanu",
      capricorn: "makar",
      aquarius: "kumbha",
      pisces: "meen",
    },
    labels: {
      luckyNumber: ["শুভ সংখ্যা", "শুভ সংখ্যা :-"],
      luckyColor: ["শুভ  রং", "শুভ  রং :-"],
      remedy: ["প্রতিকার", "প্রতিকার :-"],
    },
  },
};

// ---------------- New Resilient Scraper with Retries ----------------
async function scrapeWithRetry(browser, task) {
  const { lang, sign, url, labels } = task;
  let page; // Declare page here to access it in the finally block

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      page = await browser.newPage();

      // Optional: Improve performance by blocking images, stylesheets, etc.
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        if (
          ["image", "stylesheet", "font", "media"].includes(req.resourceType())
        ) {
          req.abort();
        } else {
          req.continue();
        }
      });

      console.log(
        `[${lang}] Scraping ${sign} (Attempt ${attempt}/${MAX_RETRIES}) → ${url}`
      );
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }); // Increased timeout

      const data = await scrapeHoroscopeDetails(page, labels);
      await page.close(); // Close the page on success

      console.log(`✅ [${lang}] Success: ${sign}`);
      return { lang, sign, status: "fulfilled", value: data };
    } catch (err) {
      console.error(
        `❌ [${lang}] Failed attempt ${attempt} for ${sign}: ${err.name}`
      );
      if (page) await page.close(); // Ensure page is closed on failure

      if (attempt === MAX_RETRIES) {
        console.error(
          `❌ [${lang}] All retries failed for ${sign}. Giving up.`
        );
        // Return a structured error object
        return {
          lang,
          sign,
          status: "rejected",
          reason: err.message,
          value: {
            horoscope: null,
            luckyNumber: null,
            luckyColor: null,
            remedy: null,
            ratings: {},
          },
        };
      }
      // Wait before the next retry
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

// ---------------- New Parallel Runner ----------------
(async () => {
  console.log("🚀 Starting the scraper...");
  const browser = await puppeteer.launch({ headless: true });

  // 1. Create a flat list of all scraping tasks
  const allTasks = [];
  for (const [lang, config] of Object.entries(languages)) {
    for (const [sign, slug] of Object.entries(config.signs)) {
      allTasks.push({
        lang,
        sign,
        url: config.baseUrl.replace("{sign}", slug),
        labels: config.labels,
      });
    }
  }

  // 2. Run tasks with a concurrency limit
  const results = [];
  const runningPromises = [];
  for (const task of allTasks) {
    const promise = scrapeWithRetry(browser, task);
    runningPromises.push(promise);

    // When a promise finishes, add its result and remove it from the running list
    promise.then((result) => {
      results.push(result);
      const index = runningPromises.indexOf(promise);
      if (index > -1) {
        runningPromises.splice(index, 1);
      }
    });

    // If we've hit the concurrency limit, wait for one promise to finish before starting the next
    if (runningPromises.length >= CONCURRENCY_LIMIT) {
      await Promise.race(runningPromises);
    }
  }

  // Wait for all remaining promises to complete
  await Promise.all(runningPromises);

  // 3. Process and save the results
  const finalOutput = {};
  for (const [lang] of Object.entries(languages)) {
    finalOutput[lang] = {};
  }

  results.forEach((res) => {
    if (res) {
      // Ensure result is not undefined
      finalOutput[res.lang][res.sign] = res.value;
    }
  });

  for (const [lang, data] of Object.entries(finalOutput)) {
    fs.writeFileSync(
      `horoscopes_${lang}.json`,
      JSON.stringify(data, null, 2),
      "utf-8"
    );
    console.log(`💾 [${lang}] Horoscopes saved to horoscopes_${lang}.json`);
  }

  await browser.close();
  console.log("🎉 All scraping complete!");
  
})();
