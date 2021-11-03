const { getTranslatedWordsList } = require('../BaseTools/extractReplaceHelper')
const { writeCsv,readCsv } = require('../BaseTools/fileHelper')
const regHelper = require('../BaseTools/regHelper')
const path = require('path')
const fs = require('fs')

const basePath = process.cwd() + '/i18n/'
const translatedDir = basePath + 'files/tolang/' // 已经翻译好的文件目录
const noTranslateFile = 'no_translate_words.csv' // 当翻译缺失的情况下，补充所有翻译为原中文，保证中文可以正常显示
const extractResultDir = basePath + 'files/extractfiles/' // 提取内容存放目录
const toTranslateFile = 'to_translate_words.csv' // 待翻译文件
const replaceMapFile = 'replace_map_file.txt' // 替换文件

function I18nReplacePlugin(options) {}

I18nReplacePlugin.prototype.apply = function (compiler) {
  compiler.hooks.beforeCompile.tapAsync('I18nReplacePlugin', (compilation, callback) => {
    getTranslatedWordsList(translatedDir, [noTranslateFile]).then((translatedWordsList) => {
      global.translatedWordsList = translatedWordsList
      global.replaceWordsList = []
      global.replaceMapList = []
      console.log('I18nReplacePlugin: beforcompile')
      callback()
    })
  })
  compiler.hooks.done.tapAsync('I18nReplacePlugin', (compilation, callback) => {
    if(!global.IsI18nReplacePluginDealed) {
      let toTranslateWordsList = global.replaceWordsList.filter((word) => {
        return global.translatedWordsList.indexOf(word) === -1
      })
      toTranslateWordsList = unique(toTranslateWordsList)
      const cnWordsList = []
      const toTranslateMapList = []
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
      // 生成替换对应的map，用于替换不对的时候查找问题用
      // fs.writeFile(extractResultDir + replaceMapFile, JSON.stringify(global.replaceMapList), () => {})
      readCsv(extractResultDir + toTranslateFile).then((maplist) => {
        let list = []
        maplist.forEach((ml) => {
          list.push(ml.zh_CN)
        })
        if(!arrayIsEqual(list, cnWordsList)) {
          writeCsv(extractResultDir + toTranslateFile, toTranslateMapList)
        }
      })
      
  
      console.log(
        'I18nReplacePlugin: aftercompile, cnWordsList :',
        cnWordsList.length,
        'replaceMapList : ',
        global.replaceMapList.length
      )
      global.IsI18nReplacePluginDealed = true
      callback()
    }
    callback()
  })
}
// 抽取的词汇去重
function unique(arr) {
  return Array.from(new Set(arr))
}
function arrayIsEqual(arr1, arr2) {
  if(!arr1 || !arr2) {
    return false
  }
  if(arr1.length !== arr2.length) {
    return false
  }
  for(var i = 0; i < arr1.length; i++) {
    if(arr2.indexOf(arr1[i]) === -1) {
      return false
    }
  }
  return true
}

module.exports = I18nReplacePlugin
