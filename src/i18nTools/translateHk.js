// 使用方法 node ${your path}/translate.js **.csv/csvDir
const OpenCC = require('opencc')
const converter = new OpenCC('s2t.json')
const fs = require('fs')
const readline = require('readline')
const path = require('path')
// const args = process.argv.slice(2)
// const fileName = path.resolve(args[0])
const i18nResultOutputDir  = process.cwd() + '/i18n/files/'
const fileName = i18nResultOutputDir + 'tolang/'
const { once } = require('events')
const csvParse = require('csv-parse/lib/sync')
const csvStringify = require('csv-stringify/lib/sync')
main()
async function main() {
  const stat = fs.statSync(path.resolve(fileName))

  if (stat.isDirectory()) {
    const files = fs.readdirSync(fileName, { withFileTypes: true })
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.isFile()) await handleFile(path.resolve(fileName, file.name))
    }
  } else {
    handleFile(fileName)
  }
}
async function handleFile(fileName) {
  let lineNum = -1
  const rl = readline.createInterface({
    input: fs.createReadStream(path.resolve(fileName)),
    crlfDelay: Infinity
  })
  const newContent = []
  const qunue = []
  rl.on('line', async (line) => {
    const promise = new Promise(async (resolve, reject) => {
      const curLine = lineNum + 1
      lineNum += 1
      let newLine = line
      if (line) {
        newLine = await translate(line, lineNum)
      }
      newContent[curLine] = newLine
      resolve()
    })
    qunue.push(promise)
  })
  await once(rl, 'close')
  await Promise.all(qunue)
  fs.appendFileSync(fileName, csvStringify(newContent), { flag: 'w' })
}
async function translate(line, lineNum) {
  let nvalues
  try {
    nvalues = csvParse(line)
  } catch (error) {
    console.log('--- eerr', line, '\r\n, ', error)
    return line
  }
  const values = nvalues[0]
  const zh_str = values[1]
  if (zh_str && lineNum !== 0) {
    const zh_hk = await converter.convertPromise(zh_str)
    values[3] = zh_hk
  }
  return values
}
