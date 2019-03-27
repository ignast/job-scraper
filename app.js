let Parser = require('rss-parser');
let parser = new Parser();

const puppeteer = require('puppeteer')
const axios = require('axios')

let cheerio = require('cheerio')


// const select = require('soupselect').select;

// scrapeIndeed({tags: ['node.js', 'vue.js'], type: 'CDI', remote: undefined})
// stackOverflowRss({tags: ['node.js', 'vue.js'], type: '', remote: undefined})
// scrapeLinkedin({tags: ['vue.js'], type: 'CDI', remote: undefined})
// scrapePoleEmploi({tags: ['vue.js', 'javascript'], type: 'CDI', remote: undefined})
scrapeParisJob({tags: ['vue.js', 'javascript'], type: 'CDI', remote: undefined})

/**
 * TODO: Website is down, need to finish this code
 * @param parameters
 * @returns {Promise<void>}
 */
async function scrapeParisJob(parameters)
{
    const tagsArray = parameters.tags
    const type = parameters.type

    let tagString = tagStringGenerator(tagsArray, '+')
    let jobType = ''

    switch (type)
    {
        case 'CDI':
            jobType = '&c=CDI'
            break

        case 'CDD':
            jobType = '&c=CDD'
            break

        case 'freelance':
            jobType = '&c=Independant'
            break

        case 'termporary':
            jobType = '&c=Travail_temp'
            break

        case 'internship':
            jobType = '&c=Stage'
            break

        default:
            jobType = ''
            break
    }

    const URL = 'https://www.parisjob.com/emplois/recherche.html?k=' + tagString + jobType

    console.log(URL)
}

async function scrapePoleEmploi(parameters)
{
    const tagsArray = parameters.tags
    const type = parameters.type

    let tagString = tagStringGenerator(tagsArray, ',')
    let jobType = ''

    switch (type)
    {
        case 'full-time':
            jobType = '&dureeHebdo=1'
            break

        case 'part-time':
            jobType = '&dureeHebdo=2'
            break

        case 'CDI':
            jobType = '&typeContrat=CDI'
            break

        case 'CDD':
            jobType = '&typeContrat=CDD'
            break

        case 'freelance':
            jobType = '&typeContrat=LIB'
            break

        case 'termporary':
            jobType = '&typeContrat=DIN'
            break

        default:
            jobType = ''
            break
    }

    const URL = 'https://candidat.pole-emploi.fr/offres/recherche?motsCles=' + tagString + jobType + '&lieux=01P&offresPartenaires=true&tri=1'

    console.log(URL)

    const request = await axios.get(URL)

    let jobs = []
    const parse = cheerio.load(request.data)

    const title = parse('h2.t4')
    const company = parse('p.subtext')
    const summary = parse('p.description')

    console.log(title.length, company.length, summary.length)

    for(let  i = 0; i < title.length; i ++)
    {
        jobs.push({
            title: title[i].children[0].children[0].data.trim(),
            link: 'https://candidat.pole-emploi.fr' + title[i].children[0].attribs.href,
            company: company[i].children[0].data.replace('-', '').trim(),
            description: summary[i].children[0].data.trim().replace(/\n|\r/g, "").replace('\'', '\'')
        })
    }

    console.log(jobs)
}

async function scrapeLinkedin (parameters)
{
    const tagsArray = parameters.tags
    const type = parameters.type

    // No remote option in LinkedIn
    // const remote = parameters.remote === undefined ? '' : '&r=true'

    let tagString = tagStringGenerator(tagsArray, ' ')
    let jobType = ''

    switch (type)
    {
        case 'full-time':
            jobType = '&jt=fulltime'
            break

        case 'CDI':
            jobType = '&jt=fulltime'
            break

        case 'CDD':
            jobType = '&jt=parttime'
            break

        case 'internship':
            jobType = '&f_JT=I'
            break

        default:
            jobType = ''
            break
    }

    const URL = 'https://www.linkedin.com/jobs/search?keywords=' + tagString + jobType + '&location=France&sortBy=DD'

    console.log(URL)

    const browser = await puppeteer.launch({
        'args': ['--incognito']
    })
    const page = await browser.newPage()

    await page.setRequestInterception(true)

    page.on('request', (req) =>
    {
        if (req.resourceType() === 'stylesheet' || req.resourceType() === 'font' || req.resourceType() === 'image')
        {
            req.abort()
        } else
        {
            req.continue()
        }
    })

    await page.goto(URL)

    const jobs = await page.evaluate(() =>
    {
        return Array.from(document.querySelectorAll('.listed-job-posting')).map(job =>
            ({
                title: job.childNodes[1].childNodes[0].textContent,
                link: job.href,
                company: job.childNodes[1].childNodes[1].textContent,
                description: job.childNodes[1].childNodes[3].textContent,
            }))
    })

    console.log(jobs)

    await browser.close()
}

async function scrapeIndeed (parameters)
{
    const tagsArray = parameters.tags
    const type = parameters.type

    // No remote option in Indeed
    // const remote = parameters.remote === undefined ? '' : '&r=true'

    let tagString = tagStringGenerator(tagsArray, '+')
    let jobType = ''

    switch (type)
    {
        case 'full-time':
            jobType = '&jt=fulltime'
            break

        case 'part-time':
            jobType = '&jt=parttime'
            break

        case 'CDI':
            jobType = '&jt=permanent'
            break

        case 'CDD':
            jobType = '&jt=contract'
            break

        case 'freelance':
            jobType = '&jt=subcontract'
            break

        case 'internship':
            jobType = '&jt=internship'
            break

        case 'termporary':
            jobType = '&jt=temporary'
            break

        default:
            jobType = ''
            break
    }

    const URL = 'https://www.indeed.fr/jobs?q=' + tagString + jobType + '&l=France&fromage=any&sort=date'

    console.log(URL)

    const request = await axios.get(URL)

    let jobs = []
    const parse = cheerio.load(request.data)

    const title = parse('h2.jobtitle')
    const company = parse('span.company')
    const summary = parse('.summary').text().trim().split('\n')

    for (let i = 0; i < title.length; i++)
    {
        jobs.push({
            title: title[i].children[0].next.attribs.title,
            link: 'https://www.indeed.fr' + title[i].children[0].next.attribs.href,
            company: company[i].children[0].data.trim(),
            description: summary[i].trim()
        })
    }

    console.log(jobs)

    // var start = new Date().getTime();
    //
    // const browser = await puppeteer.launch({
    //     'args': ['--incognito']
    // })
    // const page = await browser.newPage()
    //
    // await page.setRequestInterception(true)
    //
    // page.on('request', (req) =>
    // {
    //     if (req.resourceType() === 'stylesheet' || req.resourceType() === 'font' || req.resourceType() === 'image')
    //     {
    //         req.abort()
    //     } else
    //     {
    //         req.continue()
    //     }
    // })
    //
    // await page.goto(URL)
    //
    // const titles = await page.evaluate(() =>
    // {
    //     let jobs = []
    //     const info = Array.from(document.querySelectorAll('.jobtitle a.turnstileLink')).map(job => ({title: job.title, link: job.href}))
    //     const description = Array.from(document.querySelectorAll('.summary')).map(job => ({summary: job.textContent.trim()}))
    //
    //     for (let i = 0; i < info.length; i++)
    //     {
    //         jobs.push({title: info[i].title, link: info[i].link, description: description[i].summary})
    //     }
    //
    //     return jobs
    // })
    //
    // // console.log(titles)
    //
    // await browser.close()
    //
    // var end = new Date().getTime();
    // var time = end - start;
    // console.log('Execution time: ' + time);
}

function tagStringGenerator (tagsArray, separator)
{
    let tagString = ''

    tagsArray.forEach((tag, index) =>
    {
        tagString += tag

        if (index !== tagsArray.length - 1)
        {
            tagString += separator
        }
    })

    return tagString
}

async function stackOverflowRss (parameters)
{
    const tagsArray = parameters.tags
    const type = parameters.type
    const remote = parameters.remote === undefined ? '' : '&r=true'

    let tagString = tagStringGenerator(tagsArray, '+')
    let jobType = ''

    switch (type)
    {
        case 'full-time':
            jobType = '&j=permanent'
            break

        case 'CDI':
            jobType = '&j=permanent'
            break

        case 'freelance':
            jobType = '&j=contract'
            break

        case 'CDD':
            jobType = '&j=contract'
            break

        case 'internship':
            jobType = '&j=internship'
            break

        default:
            jobType = ''
            break
    }

    const URL = 'https://stackoverflow.com/jobs/feed?q=' + tagString + remote + jobType + '&l=france&sort=p'

    console.log(URL)

    let jobs = []
    let feed = await parser.parseURL(URL)

    feed.items.forEach(item =>
    {
        jobs.push({title: item.title, link: item.link, date: item.isoDate, tags: item.categories, description: item.contentSnippet})
    })

    jobs.sort((a, b) =>
    {
        return new Date(a.date).getTime() - new Date(b.date).getTime()
    })

    console.log(jobs)
}

