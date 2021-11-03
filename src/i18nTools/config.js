const i18nResultOutputDir = '../../files/' // 输出目录
const sourceDir = '../../../src' // 拉取词汇的源代码目录
const sourcePage = ['main', 'renderer'] // 拉取词汇的目录
const sourceExt = ['.vue', '.js']  // 目前支持这两种形式的文件
// 拉取词汇的跳过目录
const sourceIgnoreDir = [
  'emotionData.js',
  'emojiUtil.js',
  'capturetools.js',
  'i18n_test2.vue',
  'matchingKeyCode.js'
]
module.exports = {
    i18nResultOutputDir,
    sourceDir,
    sourcePage,
    sourceExt,
    sourceIgnoreDir
}