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
// scrapeParisJob({tags: ['vue.js', 'node.js'], type: '', remote: undefined})
// scrapeAdecco({tags: ['vue.js'], type: '', remote: undefined})
// scrapeApec({tags: ['vue.js', 'node.js'], type: '', remote: undefined})
// scrapeWTTJ({tags: ['vue', 'node'], type: '', remote: undefined})
// scrapeKelJob({tags: ['vue.js'], type: '', remote: undefined})

async function scrapeKelJob(parameters)
{
    const tagsArray = parameters.tags
    const type = parameters.type

    // No remote option in Indeed
    // const remote = parameters.remote === undefined ? '' : '&r=true'

    let tagString = tagStringGenerator(tagsArray, ' ')
    let jobType = ''

    switch (type)
    {
        case 'CDI':
            jobType = '&c=CDI'
            break

        case 'CDD':
            jobType = '&c=CDD'
            break

        case 'temporary':
            jobType = '&c=Intérim'
            break

        case 'internship':
            jobType = '&c=Stage'
            break

        case 'freelance':
            jobType = '&c=Indépendant %2F Freelance %2F Autoentrepreneur'
            break

        default:
            jobType = ''
            break
    }

    const URL = 'https://www.keljob.com/recherche?q=' + tagString + jobType + '&d=7d'

    console.log(URL)

    const request = await axios.get(URL)

    let jobs = []
    const parse = cheerio.load(request.data)

    const title = parse('h2.offre-title > a > span')
    const company = parse('.offre-company > a > span')
    const summary = parse('p.job-description')

    for (let i = 0; i < title.length; i++)
    {
        jobs.push({
            title: title[i].children[0].data,
            link: 'https://www.keljob.com' + title[i].parent.attribs.href,
            company: company[i].children[0].data,
            description: summary[i].children[0].data.replace(/\n|\r/g, "")
        })
    }

    console.log(jobs)
}

async function scrapeWTTJ(parameters)
{
    const tagsArray = parameters.tags
    const type = parameters.type
    const remote = parameters.remote === undefined ? '' : '&toggle[is_remote]=true'

    let tagString = tagStringGenerator(tagsArray, ' ')
    let jobType = ''

    switch (type)
    {
        case 'CDI':
            jobType = '&refinementList[contract_type_names.fr][0]=CDI'
            break

        case 'CDD':
            jobType = '&refinementList[contract_type_names.fr][0]=CDD %2F Temporaire'
            break

        case 'internship':
            jobType = '&refinementList[contract_type_names.fr][0]=Stage'
            break

        case 'part-time':
            jobType = '&refinementList[contract_type_names.fr][0]=Temps partiel'
            break

        default:
            jobType = ''
            break
    }

    const URL = 'https://www.welcometothejungle.co/jobs?query=' + tagString + jobType + remote

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

    await page.goto(URL, {waitUntil : 'networkidle2'})

    const jobs = await page.evaluate(() =>
    {
        return Array.from(document.querySelectorAll('a.sc-jtRlXQ')).map(job =>
            ({
                title: job.childNodes[1].childNodes[1].childNodes[1].textContent,
                company: job.childNodes[1].childNodes[1].childNodes[0].textContent,
                link: job.href
            }))
    })

    console.log(jobs)

    await browser.close()
}

async function scrapeApec(parameters)
{
    const tagsArray = parameters.tags
    const type = parameters.type

    let tagString = tagStringGenerator(tagsArray, ' ')
    let jobType = ''

    switch (type)
    {
        case 'CDI':
            jobType = '&typesContrat=101888'
            break

        case 'CDD':
            jobType = '&typesContrat=101887'
            break

        case 'temporary':
            jobType = '&typesContrat=101930'
            break

        default:
            jobType = ''
            break
    }

    const URL = 'https://cadres.apec.fr/home/mes-offres/recherche-des-offres-demploi/liste-des-offres-demploi.html?motsCles='
                + tagString
                + jobType
                + '&sortsType=DATE&sortsDirection=DESCENDING&nbParPage=20'

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

    await page.goto(URL, {waitUntil : 'networkidle2'})

    const jobs = await page.evaluate(() =>
    {
        return Array.from(document.querySelectorAll('div.offre')).map(job =>
            ({
                title: job.children[0].firstElementChild.childNodes[1].textContent.split('\n\n\n\n\n')[0].replace(/\n|\r/g, ""),
                company: job.children[0].firstElementChild.childNodes[1].textContent.split('\n\n\n\n\n')[1].replace(/\n|\r/g, ""),
                description: job.children[0].firstElementChild.childNodes[6].textContent.replace(/\n|\r/g, ""),
                link: 'https://cadres.apec.fr' + job.children[0].childNodes[1].children[0].firstElementChild.pathname
            }))
    })

    console.log(jobs)

    await browser.close()
}

async function scrapeAdecco(parameters)
{
    const tagsArray = parameters.tags
    const type = parameters.type

    let tagString = 'm-' + tagStringGenerator(tagsArray, '-').replace('.', '')
    let jobType = ''

    switch (type)
    {
        case 'CDI':
            jobType = '/c-cdi/'
            break

        case 'CDD':
            jobType = '/c-cdd/'
            break

        case 'temporary':
            jobType = '/c-intérim/'
            break

        default:
            jobType = ''
            break
    }

    const URL = 'https://www.adecco.fr/resultats-offres-emploi/' + tagString + jobType + '?display=15&rss=1'

    console.log(URL)

    let jobs = []
    let feed = await parser.parseURL(URL)

    feed.items.forEach(item =>
    {
        jobs.push({title: item.title, link: item.link, description: item.contentSnippet})
    })

    console.log(jobs)
}

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

    const request = await axios.get(URL)

    let jobs = []
    const parse = cheerio.load(request.data)

    const title = parse('.annonce > h1 > .lien-annonce')
    const company = parse('.nom_entreprise > span')

    // console.log(title[0].attribs.title)
    // console.log('https://www.parisjob.com' + title[0].attribs.href)
    // console.log(company[0].children[0].data.trim())

    for(let  i = 0; i < title.length; i ++)
    {
        jobs.push({
            title: title[i].attribs.title,
            link: 'https://www.parisjob.com' + title[i].attribs.href,
            company: company[i].children[0].data.trim(),
        })
    }

    console.log(jobs)
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

