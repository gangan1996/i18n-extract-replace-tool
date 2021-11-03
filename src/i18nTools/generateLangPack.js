const fs = require('fs')
const path = require('path')

const parse = require('csv-parse')
const i18nResultOutputDir  = process.cwd() + '/i18n/files/'
const dir = i18nResultOutputDir + 'tolang/'
const fileList = []
const en_US_json = {}
const zh_CN_json = {}
const zh_HK_json = {}
const p_list = []

const files = fs.readdirSync(dir)
files.forEach((item, index) => {
  const fullPath = path.join(dir, item)
  const stat = fs.statSync(fullPath)
  if (!stat.isDirectory()) {
    fileList.push(fullPath)
  }
})

let index = 0
fileList.forEach((filePath) => {
  p_list.push(
    new Promise((resolve, reject) => {
      fs.createReadStream(filePath).pipe(
        parse({ columns: true, skip_empty_lines: true }, function (err, all_translated_list) {
          if (err) {
            console.log('err:', err)
            return
          }
          // console.log(all_translated_list)
          all_translated_list.forEach((s) => {
            if (s['id']) {
              en_US_json[replaceEscape(s['id'])] = replaceEscape(s.en_US)
              zh_CN_json[replaceEscape(s['id'])] = replaceEscape(s.zh_CN)
              zh_HK_json[replaceEscape(s['id'])] = replaceEscape(s.zh_HK)
            } else {
              console.log('no id', index++, s)
            }
          })
          resolve()
        })
      )
    })
  )
})

function replaceEscape(str) {
  return str.replace(/\\n/g, '\n')
}

Promise.all(p_list).then(() => {
  fs.writeFile(
    i18nResultOutputDir + 'lang/en_US.json',
    JSON.stringify(en_US_json),
    function (err) {
      if (err) console.log('err:', err)
    }
  )
  fs.writeFile(
    i18nResultOutputDir + 'lang/zh_CN.json',
    JSON.stringify(zh_CN_json),
    function (err) {
      if (err) console.log('err:', err)
    }
  )
  fs.writeFile(
    i18nResultOutputDir + 'lang/zh_HK.json',
    JSON.stringify(zh_HK_json),
    function (err) {
      if (err) console.log('err:', err)
    }
  )
})
