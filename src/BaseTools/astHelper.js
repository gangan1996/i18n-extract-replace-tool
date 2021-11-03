const { replaceSourceWords } = require('./extractReplaceHelper')
const regHelper = require('./regHelper')

const generator = require('@babel/generator')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse')
const t = require('@babel/types')
const templateCompiler = require('@vue/compiler-core')
const vueCompiler = require('vue-template-compiler')
const pug = require('pug')
const html2pug = require('html2pug')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { entries } = require('lodash')

const TEM_TYPE = 0
const NORMAL_PROP_TYPE = 1
const BIND_PROP_TYPE = 2
const NORMAL_JS_TYPE = 3
const BINARY_JS_TYPE = 4

function getTemplateCnList(code) {
  const cnTextTemplateList = []
  const cnTextPropsList = []
  const ast = templateCompiler.baseParse(code)
  getAllCnTextFromTemplate(ast.children, cnTextTemplateList, cnTextPropsList)
  return { cnTextTemplateList, cnTextPropsList }
}

function getAllCnTextFromTemplate(templateCode, cnTextTemplateList, cnTextPropsList) {
  if (!templateCode) {
    return
  }
  // data
  let cnText = ''
  let start
  let end
  let isCn = false
  templateCode.forEach((code) => {
    // props
    if (code.props) {
      code.props.forEach((prop) => {
        if (prop.type === 6) {
          // 普通属性
          if (prop.value && prop.value.content.match(regHelper.cnReg)) {
            cnTextPropsList.push({
              text: prop.value.content.trim(),
              start: prop.value.loc.start.offset,
              end: prop.value.loc.end.offset,
              prop_start: prop.loc.start.offset,
              type: NORMAL_PROP_TYPE
            })
          }
        } else if (prop.type === 7) {
          // v-xxx v-on
          if (prop.exp && prop.exp.content.match(regHelper.cnReg) && prop.exp.content.indexOf('$t') === -1) {
            cnTextPropsList.push({
              text: prop.exp.content.trim(),
              start: prop.exp.loc.start.offset,
              end: prop.exp.loc.end.offset,
              type: BIND_PROP_TYPE
            })
          }
        }
      })
    }
    if (code.type === 2 || code.type === 5) {
      // text
      cnText = cnText + code.loc.source
      if (code.loc.source.match(regHelper.cnReg)) {
        isCn = true
      }
      if (!start) {
        start = code.loc.start.offset
      }
      end = code.loc.end.offset
    }
    if (code.type === 1 || templateCode.indexOf(code) === templateCode.length - 1) {
      // <标签>
      if (isCn && cnText.indexOf('$t') === -1) {
        cnTextTemplateList.push({
          text: cnText.trim(),
          start: start,
          end: end,
          type: TEM_TYPE
        })
      }
      cnText = ''
      start = null
      end = null
      isCn = false
    }
    getAllCnTextFromTemplate(code.children, cnTextTemplateList, cnTextPropsList)
  })
}

function changePugToTemplate(code) {
  const fn = pug.compile(code, { doctype: 'html' })
  return fn(code)
}

function getJsCnList(code) {
  const cnTextJsList = []
  const commentIgnoreLineNumList = []
  const ast = parser.parse(code, {
    allowImportExportEverywhere: true,
    attachComment: true,
    plugins: ['typescript']
  })
  const commentVisitor = {
    enter(path) {
      if (path.node.leadingComments) {
        path.node.leadingComments.forEach(dealComment)
      }
      if (path.node.trailingComments) {
        path.node.trailingComments.forEach(dealComment)
      }
    }
  }
  function dealComment(comment) {
    const { value, loc } = comment
    if (value && value.indexOf('i18n-ignore-next-line') > -1) {
      commentIgnoreLineNumList.push(loc.start.line + 1)
    } else if (value && value.indexOf('i18n-ignore-current-line') > -1) {
      commentIgnoreLineNumList.push(loc.start.line)
    }
  }
  traverse.default(ast, commentVisitor)
  const stringLiteralVisitor = {
    StringLiteral(path) {
      const ignorePath = path.findParent(getIgnorePath)
      if (!ignorePath) {
        let rootBinaryPath = ''
        path.findParent((p) => {
          if (p.isBinaryExpression() && p.node.operator === '+') {
            rootBinaryPath = p
          }
          return false
        })
        if (rootBinaryPath) {
          const { start, end, loc } = rootBinaryPath.node
          if (
            code.substr(start, end - start).match(regHelper.cnReg) &&
            !commentIgnoreLineNumList.includes(loc.start.line)
          ) {
            cnTextJsList.push({
              text: code.substr(start, end - start),
              start: start,
              end: end,
              type: BINARY_JS_TYPE
            })
          }
        } else {
          const { value, extra, start, end, loc } = path.node
          if (value.match(regHelper.cnReg) && !commentIgnoreLineNumList.includes(loc.start.line)) {
            cnTextJsList.push({
              text: extra.raw.trim(),
              start: start,
              end: end,
              type: NORMAL_JS_TYPE
            })
          }
        }
      }
    }
  }
  traverse.default(ast, stringLiteralVisitor)
  const templateLiteralVisitor = {
    TemplateLiteral(path) {
      const ignorePath = path.findParent(getIgnorePath)
      if (!ignorePath) {
        let rootBinaryPath = ''
        path.findParent((p) => {
          if (p.isBinaryExpression() && p.node.operator === '+') {
            rootBinaryPath = p
          }
          return false
        })
        if (rootBinaryPath) {
          const { start, end, loc } = rootBinaryPath.node
          if (
            code.substr(start, end - start).match(regHelper.cnReg) &&
            !commentIgnoreLineNumList.includes(loc.start.line)
          ) {
            cnTextJsList.push({
              text: code.substr(start, end - start),
              start: start,
              end: end,
              type: BINARY_JS_TYPE
            })
          }
        } else {
          const { start, end, loc } = path.node
          if (
            code.substr(start, end - start).match(regHelper.cnReg) &&
            !commentIgnoreLineNumList.includes(loc.start.line)
          ) {
            cnTextJsList.push({
              text: code.substr(start, end - start),
              start: start,
              end: end,
              type: BINARY_JS_TYPE
            })
          }
        }
      }
    }
  }
  function getIgnorePath(p) {
    if (p.isCallExpression()) {
      if (p.node.callee.name === 'printSafely' || p.node.callee.name === 'nativeLog' || p.node.callee.name === '$t') {
        return true
      }
      if (p.node.callee.object) {
        if (p.node.callee.object.name === 'console') {
          return true
        }
        if (p.node.callee.object.property && p.node.callee.object.property.name === 'i18n') {
          return true
        }
      }
      if (p.node.callee.property && p.node.callee.property.name === '$t') {
        return true
      }
    }
    return false
  }
  traverse.default(ast, templateLiteralVisitor)
  return cnTextJsList
}

function splitByPlus(code) {
  const splitList = []
  const usedStart = []
  const ast = parser.parse(code, {
    allowImportExportEverywhere: true,
    attachComment: false,
    plugins: ['typescript']
  })

  const visitor = {
    BinaryExpression(path) {
      let topBinaryPath = path
      path.findParent((p) => {
        if (p.isBinaryExpression() && p.node.operator === '+') {
          topBinaryPath = p
        }
      })
      const node = topBinaryPath.node
      if (!usedStart.includes(node.start)) {
        usedStart.push(node.start)
        getStrList(node, splitList, code)
      }
    }
  }
  traverse.default(ast, visitor)
  if (splitList.length === 0) {
    return [code]
  }
  return splitList
}

function getStrList(node, splitList, rowString) {
  if (
    node.operator === '+' &&
    (node.left.type === 'StringLiteral' ||
      node.right.type === 'StringLiteral' ||
      node.left.type === 'BinaryExpression' ||
      node.right.type === 'BinaryExpression' ||
      node.left.type === 'TemplateLiteral' ||
      node.right.type === 'TemplateLiteral')
  ) {
    if (node.right.type === 'StringLiteral') {
      splitList.unshift(node.right.extra.raw)
    } else if (node.right.type === 'TemplateLiteral') {
      splitList.unshift(rowString.substr(node.right.start, node.right.end - node.right.start))
    } else if (node.right.type === 'BinaryExpression') {
      getStrList(node.right, splitList, rowString)
    } else {
      splitList.unshift(rowString.substr(node.right.start, node.right.end - node.right.start))
    }
    if (node.left.type === 'StringLiteral') {
      splitList.unshift(node.left.extra.raw)
    } else if (node.left.type === 'TemplateLiteral') {
      splitList.unshift(rowString.substr(node.left.start, node.left.end - node.left.start))
    } else if (node.left.type === 'BinaryExpression') {
      getStrList(node.left, splitList, rowString)
    } else {
      splitList.unshift(rowString.substr(node.left.start, node.left.end - node.left.start))
    }
  } else {
    splitList.unshift(rowString.substr(node.start, node.end - node.start))
  }
}

module.exports = {
  getTemplateCnList,
  changePugToTemplate,
  getJsCnList,
  splitByPlus
}
