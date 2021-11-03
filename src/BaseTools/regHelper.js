const regHelper = {
  cnReg: /[\u4E00-\u9FA5\uF900-\uFA2D]+/, // 包含中文
  hasQuotationReg: /['"`]/, // 是否包含引号
  inQuotationReg: /(['"`])[^'"`]*?\1/,
  inQuotationRegG: /(['"`])[^'"`]*?\1/g, // 所有引号包含的内容，非贪婪
  inNormalQuotaionReg: /^(['"])[^'"]*?\1$/,
  isInAntiQuotationReg: /(?<=`)[\s\S]*?(?=`)/,
  inSingleQuotationReg: /^'[\s\S]*'$/,
  inDoubleQuotationReg: /^"[\s\S]*"$/,
  inBracketsReg: /\$\{[\s\S]*?\}/g,
  inButNotBracketsReg: /(?<=\$\{)[\s\S]*(?=\})/,
  inDoubleBracketRegG: /\{\{[\s\S]*?\}\}/g,
  inButNotDoubleBracketReg: /(?<=\{\{)[\s\S]*(?=\}\})/,
  inDoubleBracketReg: /\{\{[\s\S]*?\}\}/,
  inQuotationMoreReg: /(['"`])[\s\S]*\1/g,
  inButNotQuotationReg: /(?<=['"])[\s\S]*?(?=['"])/,
  inButNotQuotationRegAll: /(?<=['"])[\s\S]*(?=['"])/,
  inButNotQuotationRegG: /(?<=['"])[\s\S]*?(?=['"])/g,
  isPlusEndReg: /.*\+$/, // 以加号结尾,
  isPlusBeginReg: /^\+.*/, // 以加号开始
  quotationToEnd: /['"`].*/ // 引号开头，一直到句尾
}
module.exports = regHelper
