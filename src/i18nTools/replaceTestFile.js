const fs = require('fs')
const path = require('path')
const { getTranslatedWordsList } = require('../BaseTools/extractReplaceHelper')
const translatedDir = '../../files/tolang/' // 已经翻译好的文件目录
const noTranslateFile = 'no_translate_words.csv' // 当翻译缺失的情况下，补充所有翻译为原中文，保证中文可以正常显示

const sourceFile = path.join(__dirname, '../pages/i18n_test.vue')
const all_words_map_path = path.join(__dirname, '../../files/map/all_words_map.txt')
const desFile = path.join(__dirname, '../pages/i18n_test2.vue')

const { replaceSourceWordsFromVue, replaceSourceWordsFromJs } = require('../BaseTools/extractReplaceHelper.js')

fs.readFile(sourceFile, 'utf8', (err, source) => {
  if (err) {
    console.error(err)
    return
  }
  const isJs = false
  let resultCode = ''
  const replaceWordsList = []
  const replaceMapList = []
  getTranslatedWordsList(path.join(__dirname, translatedDir), [noTranslateFile]).then((translatedWordsList) => {
    if (isJs) {
      resultCode = replaceSourceWordsFromJs(source, translatedWordsList, replaceWordsList, replaceMapList)
    } else {
      resultCode = replaceSourceWordsFromVue(source, translatedWordsList, replaceWordsList, replaceMapList)
    }
    fs.writeFile(desFile, resultCode, 'utf-8', function (err) {
      if (err) console.log('err:', err)
    })
  })
})
