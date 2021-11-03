const { getFileList, readFilePromise, writeCsv } = require('../BaseTools/fileHelper')
const {
  extractSourceWordsMapListFromJs,
  extractSourceWordsMapListFromVue,
  generateReplaceMapList,
  getTranslatedWordsList
} = require('../BaseTools/extractReplaceHelper')
const { i18nResultOutputDir, sourceDir, sourcePage, sourceExt, sourceIgnoreDir } = require('./config')
const fs = require('fs')
const path = require('path')
const os = require('os')
const regHelper = require('../BaseTools/regHelper')

const dirU = os.type().toLowerCase().includes('window') ? '\\' : '/' // window环境使用‘\\’mac系统使用‘/’

const translatedDir = i18nResultOutputDir + 'tolang/' // 已经翻译好的文件目录
const extractResultDir = i18nResultOutputDir + 'extractfiles/' // 提取内容存放目录
const noTranslateFile = 'no_translate_words.csv' // 当翻译缺失的情况下，补充所有翻译为原中文，保证中文可以正常显示
const toTranslateFile = 'to_translate_words.csv' // 待翻译文件
const replaceMapFile = 'replace_map_file.txt' // 替换文件

main()
function main() {
  const sourceFileList = []
  let extractWords = []
  const sourcePromiseList = []
  const sourceFileNameList = []
  getFileList(path.join(__dirname, sourceDir), sourcePage, sourceFileList, sourceIgnoreDir)
  sourceFileList.forEach((fullPath) => {
    let sourcePromise = null
    const localpath = fullPath.replace(process.cwd() + dirU + 'src' + dirU, '')
    if (sourcePage.some((pagedir) => localpath.includes(pagedir))) {
      const extname = path.extname(fullPath)
      if (sourceExt.includes(extname)) {
        sourcePromise = readFilePromise(fullPath)
        sourcePromiseList.push(sourcePromise)
        sourceFileNameList.push(fullPath)
      }
    }
  })
  Promise.all(sourcePromiseList).then((sourceData) => {
    let toTranslateWordsList = []
    const toTranslateMapList = []
    const noTranslateMapList = []
    if (sourceData) {
      for (let i = 0; i < sourceData.length; i++) {
        if (sourceFileNameList[i].match(/\.vue$/)) {
          extractWords = extractWords.concat(extractSourceWordsMapListFromVue(sourceData[i]))
        } else if (sourceFileNameList[i].match(/\.js$/)) {
          extractWords = extractWords.concat(extractSourceWordsMapListFromJs(sourceData[i]))
        }
      }
      extractWords = uniqueMapList(extractWords)
      const { replaceMapList, replaceWordsList } = generateReplaceMapList(extractWords)
      fs.writeFile(path.join(__dirname, extractResultDir + replaceMapFile), JSON.stringify(replaceMapList), () => {})
      getTranslatedWordsList(path.join(__dirname, translatedDir), [noTranslateFile]).then((translatedWordsList) => {
        toTranslateWordsList = replaceWordsList.filter((word) => {
          return translatedWordsList.indexOf(word) === -1
        })
        toTranslateWordsList = unique(toTranslateWordsList)
        const cnWordsList = []
        toTranslateWordsList.forEach((word) => {
          if (word) {
            if (word.match(regHelper.cnReg)) {
              cnWordsList.push(word)
            }
          }
        })
        cnWordsList.forEach((word) => {
          toTranslateMapList.push({
            id: word,
            zh_CN: word,
            en_US: '',
            zh_HK: '',
            comment: ''
          })
        })
        toTranslateWordsList.forEach((word) => {
          noTranslateMapList.push({
            id: word,
            zh_CN: word,
            en_US: word,
            zh_HK: word,
            comment: ''
          })
        })
        console.log(toTranslateMapList.length, noTranslateMapList.length)
        writeCsv(path.join(__dirname, extractResultDir + toTranslateFile), toTranslateMapList)
        // writeCsv(path.join(__dirname, translatedDir + noTranslateFile), noTranslateMapList)
      })
    }
  })
}

// 抽取的词汇去重
function unique(arr) {
  return Array.from(new Set(arr))
}

// 对象数组去重
function uniqueMapList(arr) {
  const arr2 = []
  arr.forEach((a) => {
    if (!arr2.some((a2) => a.text === a2.text && a.start === a2.start)) {
      arr2.push(a)
    }
  })
  return arr2
}
