const fs = require('fs')
const path = require('path')
const os = require('os')
const parse = require('csv-parse')
var stringify = require('csv-stringify')

/**
 * 获取指定目录下所有文件路径
 * @param {*} dir 指定根目录
 * @param {*} pages 指定根目录下的目标文件夹，例如[pages, components]
 * @param {*} filesList 输出的目标文件路径列表
 * @param {*} ignoredir 忽略的目录
 * @returns
 */
function getFileList(dir, pages, filesList = [], ignoredir) {
  const files = fs.readdirSync(dir)
  files.forEach((item, index) => {
    if (ignoredir && ignoredir.includes(item)) return
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      return getFileList(fullPath, pages, filesList, ignoredir) // 递归读取文件
    } else {
      filesList.push(fullPath)
    }
  })
  return filesList
}

function readFilePromise(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', (err, source) => {
      if (err) {
        console.error(err)
        reject(err)
      }
      resolve(source)
    })
  })
}

function readCsv(filePath) {
  const p = new Promise((resolve, reject) => {
    fs.createReadStream(filePath).pipe(
      parse({ columns: true }, function (err, mapList) {
        if (err) {
          console.log('err:', err)
          return
        }
        resolve(mapList)
      })
    )
  })
  return p
}

function writeCsv(path, list) {
  stringify(
    list,
    {
      header: true
    },
    (err, output) => {
      if (err) {
        console.log('err:', err)
      } else {
        fs.writeFileSync(path, output, () => {})
      }
    }
  )
}

module.exports = {
  getFileList,
  readCsv,
  writeCsv,
  readFilePromise
}
