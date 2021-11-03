const { replaceSourceWordsFromVue, replaceSourceWordsFromJs } = require('../BaseTools/extractReplaceHelper.js')

function I18nReplaceLoader (source, sourceMap) {
  var callback = this.async()
  // console.log(options, this.context, this.resource)
  const isJs = this.resource.indexOf('js') > -1
  let resultCode = ''
  const translatedWordsList = global.translatedWordsList ? global.translatedWordsList : []
  if (isJs) {
    resultCode = replaceSourceWordsFromJs(source, translatedWordsList, global.replaceWordsList, global.replaceMapList)
  } else {
    resultCode = replaceSourceWordsFromVue(source, translatedWordsList, global.replaceWordsList, global.replaceMapList)
  }
  // return source

  callback(null, resultCode, sourceMap)
}
module.exports = I18nReplaceLoader
