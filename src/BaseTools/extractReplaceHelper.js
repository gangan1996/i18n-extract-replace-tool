const { getFileList, readFilePromise, readCsv, writeCsv } = require('./fileHelper')
const { getTemplateCnList, changePugToTemplate, getJsCnList, splitByPlus } = require('./astHelper')
const vueCompiler = require('vue-template-compiler')
const csvStringify = require('csv-stringify/lib/sync')
const fs = require('fs')
const path = require('path')
const regHelper = require('./regHelper')

const valueList = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'x', 'y', 'z']

const TEM_TYPE = 0
const NORMAL_PROP_TYPE = 1
const BIND_PROP_TYPE = 2
const NORMAL_JS_TYPE = 3
const BINARY_JS_TYPE = 4

function extractSourceWordsMapListFromVue(source) {
  const sourceAst = vueCompiler.parseComponent(source)
  let templateSource = ''
  if (sourceAst.template) {
    templateSource =
      sourceAst.template.lang === 'pug' ? changePugToTemplate(sourceAst.template.content) : sourceAst.template.content
  }

  const resultLists = getTemplateCnList(templateSource)
  const temCnMapList = resultLists.cnTextPropsList
  const propsCnMapList = resultLists.cnTextTemplateList
  const jsCnMapList = getJsCnList((sourceAst.script && sourceAst.script.content) || '')
  return temCnMapList.concat(propsCnMapList, jsCnMapList)
}

function extractSourceWordsMapListFromJs(source) {
  const jsCnMapList = getJsCnList(source)
  return jsCnMapList
}

function generateReplaceMapList(mapList) {
  if (!mapList || mapList.length === 0) {
    return []
  }
  const replaceMapList = []
  let replaceWordsList = []
  mapList.forEach((map) => {
    let word_message = null
    if (map.type === TEM_TYPE) {
      word_message = generateTemReplaceMap(map.text)
    } else if (map.type === NORMAL_PROP_TYPE) {
      word_message = generatePropMap(map.text)
    } else if (map.type === BIND_PROP_TYPE) {
      word_message = generateBindPropMap(map.text)
    } else if (map.type === NORMAL_JS_TYPE) {
      word_message = generateNormalJsMap(map.text)
    } else if (map.type === BINARY_JS_TYPE) {
      word_message = generateJsMap(map.text)
    }

    replaceMapList.push({
      text: map.text,
      type: map.type,
      replace: word_message.replaceStr
    })
    replaceWordsList = replaceWordsList.concat(word_message.word_message_list)
  })
  return { replaceMapList, replaceWordsList }
}

function generateReplaceWord(map, translatedWordsList, replaceWordsList, replaceMapList) {
  let word_message = null
  if (map.type === TEM_TYPE) {
    word_message = generateTemReplaceMap(map.text)
  } else if (map.type === NORMAL_PROP_TYPE) {
    word_message = generatePropMap(map.text)
  } else if (map.type === BIND_PROP_TYPE) {
    word_message = generateBindPropMap(map.text)
  } else if (map.type === NORMAL_JS_TYPE) {
    word_message = generateNormalJsMap(map.text)
  } else if (map.type === BINARY_JS_TYPE) {
    word_message = generateJsMap(map.text)
  }
  replaceMapList.push({
    text: map.text,
    type: map.type,
    replace: word_message.replaceStr
  })
  word_message.word_message_list.forEach((word) => {
    replaceWordsList.push(word)
  })
  if (!word_message.resultStr || translatedWordsList.indexOf(word_message.resultStr) > -1) {
    return word_message.replaceStr
  } else {
    return null
  }
}

function generateTemReplaceMap(word) {
  const word_message_list = []
  const replaceMap = {}
  let resultStr = word
  let replaceStr = ''
  const inDoubleBracketStr = word.match(regHelper.inDoubleBracketRegG)
  if (inDoubleBracketStr) {
    let valueIndex = 0
    inDoubleBracketStr.forEach((s) => {
      let beforeValue =
        s.match(regHelper.inButNotDoubleBracketReg) && s.match(regHelper.inButNotDoubleBracketReg)[0].trim()
      if (beforeValue.match(regHelper.hasQuotationReg)) {
        const quotationStr = beforeValue.match(regHelper.inQuotationRegG)
        if (quotationStr) {
          quotationStr.forEach((qs) => {
            if (qs.match(regHelper.cnReg)) {
              beforeValue = beforeValue.replace(qs, '$t(' + qs + ')')
              word_message_list.push(
                qs.match(regHelper.inButNotQuotationReg) && qs.match(regHelper.inButNotQuotationReg)[0]
              )
            }
          })
        }
        replaceMap[valueList[valueIndex]] = beforeValue
        resultStr = resultStr.replace(s, '{' + valueList[valueIndex] + '}')
      } else {
        replaceMap[valueList[valueIndex]] = beforeValue
        resultStr = resultStr.replace(s, '{' + valueList[valueIndex] + '}')
      }
      valueIndex++
    })
    replaceStr = "{{$t('" + resultStr + "'," + jsonToString(replaceMap) + ')}}'
  } else {
    replaceStr = "{{$t('" + resultStr + "')}}"
  }
  word_message_list.push(resultStr)
  return { replaceStr, word_message_list, resultStr }
}

function generatePropMap(word) {
  const resultStr = word
  const replaceStr = `"$t('` + resultStr + `')"`
  const word_message_list = [resultStr]
  return { replaceStr, word_message_list }
}

function generateBindPropMap(word) {
  const word_message_list = []
  let resultStr = word
  const quotationStr = word.match(regHelper.inQuotationRegG)
  if (quotationStr) {
    quotationStr.forEach((s) => {
      if (s.match(regHelper.cnReg)) {
        const cnStr = s.match(regHelper.inButNotQuotationReg) && s.match(regHelper.inButNotQuotationReg)[0]
        word_message_list.push(cnStr)
        resultStr = resultStr.replace(s, '$t(' + s + ')')
      }
    })
  }
  const replaceStr = resultStr
  return { replaceStr, word_message_list }
}

function generateNormalJsMap(word) {
  let resultStr = word.match(regHelper.inButNotQuotationRegAll) && word.match(regHelper.inButNotQuotationRegAll)[0]
  resultStr = stringfyText(resultStr, true)
  const replaceStr = 'window.i18n.t("' + resultStr + '")'
  const word_message_list = [resultStr]
  return { replaceStr, word_message_list, resultStr }
}

function generateJsMap(word) {
  const word_message_list = []
  const replaceMap = {}
  let resultStr = ''
  let replaceStr = ''
  const splitList = splitByPlus(word)
  let valueIndex = 0
  splitList.forEach((s) => {
    if (s) {
      if (s.match(regHelper.inNormalQuotaionReg)) {
        const inQuotationStr = s.match(regHelper.inButNotQuotationReg) && s.match(regHelper.inButNotQuotationReg)[0]
        resultStr = resultStr + inQuotationStr
      } else if (s.indexOf('`') === -1) {
        if (s.match(regHelper.hasQuotationReg)) {
          let resultS = s
          const quotationStr = s.match(regHelper.inQuotationRegG)
          if (quotationStr) {
            quotationStr.forEach((qs) => {
              if (qs.match(regHelper.cnReg)) {
                resultS = resultS.replace(qs, 'window.i18n.t(' + qs + ')')
              }
            })
          }
          replaceMap[valueList[valueIndex]] = resultS
        } else {
          replaceMap[valueList[valueIndex]] = s
        }
        resultStr = resultStr + '{' + valueList[valueIndex] + '}'
        valueIndex++
      } else if (s.indexOf('`') > -1) {
        let resultS = s
        const inBracketsStr = s.match(regHelper.inBracketsReg)
        if (inBracketsStr) {
          inBracketsStr.forEach((bs) => {
            const inBracketsValue =
              bs.match(regHelper.inButNotBracketsReg) && bs.match(regHelper.inButNotBracketsReg)[0]
            replaceMap[valueList[valueIndex]] = inBracketsValue
            resultS = resultS.replace(bs, '{' + valueList[valueIndex] + '}')
            valueIndex++
          })
        }
        resultStr =
          resultStr +
          (resultS.match(regHelper.isInAntiQuotationReg) && resultS.match(regHelper.isInAntiQuotationReg)[0])
      }
    }
  })
  word_message_list.push(resultStr)
  resultStr = stringfyText(resultStr, true)
  if (Object.keys(replaceMap).length === 0) {
    replaceStr = 'window.i18n.t("' + resultStr + '")'
  } else {
    replaceStr = 'window.i18n.t("' + resultStr + '",' + jsonToString(replaceMap) + ')'
  }
  return { replaceStr, word_message_list, resultStr }
}

function getTranslatedWordsList(dir, ignorefiles) {
  let translatedMapList = []
  const translatedWordsList = []
  const csvPromiseList = []
  let fileList = fs.readdirSync(dir)
  fileList = fileList.filter((file) => {
    return !ignorefiles.includes(file)
  })
  fileList.forEach((file) => {
    const csvPromise = readCsv(path.join(dir, file))
    csvPromiseList.push(csvPromise)
  })
  return new Promise((resolve, reject) => {
    Promise.all(csvPromiseList).then((data) => {
      data.forEach((d) => {
        translatedMapList = translatedMapList.concat(d)
      })
      translatedMapList.forEach((map) => {
        translatedWordsList.push(map.zh_CN)
      })
      resolve(translatedWordsList)
    })
  })
}

function replaceSourceWordsFromVue(source, translatedWordsList, replaceWordsList, replaceMapList) {
  let resultCode = source
  const sourceAst = vueCompiler.parseComponent(source)
  let templateSource = ''
  if (sourceAst.template) {
    templateSource =
      sourceAst.template.lang === 'pug' ? changePugToTemplate(sourceAst.template.content) : sourceAst.template.content
  }
  const jsSource = (sourceAst.script && sourceAst.script.content) || ''
  const resultTemplateCode = replaceTemplateSource(
    templateSource,
    translatedWordsList,
    replaceWordsList,
    replaceMapList
  )
  const resultJsCode = replaceJsSource(jsSource, translatedWordsList, replaceWordsList, replaceMapList)
  if (!sourceAst.template) {
    resultCode = resultCode.substr(0, sourceAst.script.start) + resultJsCode + resultCode.substr(sourceAst.script.end)
  } else if (!sourceAst.script) {
    resultCode =
      resultCode.substr(0, sourceAst.template.start) + resultTemplateCode + resultCode.substr(sourceAst.template.end)
  } else if (sourceAst.template.start > sourceAst.script.start) {
    resultCode =
      resultCode.substr(0, sourceAst.template.start) + resultTemplateCode + resultCode.substr(sourceAst.template.end)
    resultCode = resultCode.substr(0, sourceAst.script.start) + resultJsCode + resultCode.substr(sourceAst.script.end)
  } else {
    resultCode = resultCode.substr(0, sourceAst.script.start) + resultJsCode + resultCode.substr(sourceAst.script.end)
    resultCode =
      resultCode.substr(0, sourceAst.template.start) + resultTemplateCode + resultCode.substr(sourceAst.template.end)
  }
  return resultCode
}

function replaceSourceWordsFromJs(source, translatedWordsList, replaceWordsList, replaceMapList) {
  const resultJsCode = replaceJsSource(source, translatedWordsList, replaceWordsList, replaceMapList)
  return resultJsCode
}

function replaceTemplateSource(code, translatedWordsList, replaceWordsList, replaceMapList) {
  let replaceCode = code
  const resultLists = getTemplateCnList(code)
  const cnTextTemplateList = resultLists.cnTextTemplateList
  const cnTextPropsList = resultLists.cnTextPropsList
  let allCnTextList = cnTextTemplateList.concat(cnTextPropsList)
  allCnTextList = uniqueMapList(allCnTextList)
  allCnTextList
    .sort((a, b) => {
      // 逆序
      return b.start - a.start
    })
    .filter((a) => {
      return a.start > -1
    })
    .filter((word, index, array) => {
      // 去掉重叠部分
      return !array.some((i) => i.start < word.start && word.end <= i.end)
    })
    .forEach((word) => {
      const replaceWord = generateReplaceWord(word, translatedWordsList, replaceWordsList, replaceMapList)
      if (replaceWord) {
        if (word.type === NORMAL_PROP_TYPE) {
          replaceCode = replaceCode.substr(0, word.start) + replaceWord + replaceCode.substr(word.end)
          replaceCode = replaceCode.substr(0, word.prop_start) + ':' + replaceCode.substr(word.prop_start)
        } else {
          replaceCode = replaceCode.substr(0, word.start) + replaceWord + replaceCode.substr(word.end)
        }
      }
    })
  return replaceCode
}

function replaceJsSource(code, translatedWordsList, replaceWordsList, replaceMapList) {
  let replaceCode = code
  let cnTextJsList = getJsCnList(code)
  cnTextJsList = uniqueMapList(cnTextJsList)
  cnTextJsList
    .sort((a, b) => {
      // 逆序
      return b.start - a.start
    })
    .filter((a) => {
      return a.start > -1
    })
    .filter((word, index, array) => {
      // 去掉重叠部分
      return !array.some((i) => i.start < word.start && word.end <= i.end)
    })
    .forEach((word) => {
      const replaceWord = generateReplaceWord(word, translatedWordsList, replaceWordsList, replaceMapList)
      if (replaceWord) {
        replaceCode = replaceCode.substr(0, word.start) + replaceWord + replaceCode.substr(word.end)
      }
    })
  return replaceCode
}

function jsonToString(json) {
  const key_string = Object.keys(json)
  let jsonContentString = ''
  key_string.forEach((key) => {
    jsonContentString =
      jsonContentString + key + ':' + json[key] + (key_string.indexOf(key) === key_string.length - 1 ? '' : ',')
  })
  const json_string = '{' + jsonContentString + '}'
  return json_string
}
function uniqueMapList(arr) {
  const arr2 = []
  arr.forEach((a) => {
    if (!arr2.some((a2) => a.text === a2.text && a.start === a2.start)) {
      arr2.push(a)
    }
  })
  return arr2
}
// 处理词汇和node-csv处理的保持一致
function stringfyText(str, dealDoubleQuotation) {
  return str.replace(/"/g, '\\"')
}

module.exports = {
  extractSourceWordsMapListFromVue,
  extractSourceWordsMapListFromJs,
  generateReplaceMapList,
  getTranslatedWordsList,
  replaceSourceWordsFromVue,
  replaceSourceWordsFromJs,
  generateReplaceWord
}
