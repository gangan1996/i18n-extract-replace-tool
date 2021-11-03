# 国际化提取替换工具
## 介绍
基于vue-i18n国际化插件的的配套提取替换工具，不用修改源代码的前提下，充分保证项目内容语义的完整性和准确性。
### 功能
- 抽取项目中的所有的中文词汇
- 将抽取词汇转换成vue-i18n插件支持的翻译函数
- 在构建过程中将翻译函数替换回源代码处
### 特点
- 支持各种格式的代码，零改动成本
- 对包含变量的拼接字符串整段抽取，保证了语义和语序
- 在构建时进行多语言翻译函数替换，零侵入性
- 项目运行自动检索词汇，没有额外繁琐指令
- 内置opencc工具，一键进行繁体翻译
### 拼接字符提取支持
通过ast+正则结合的方法，分别提取template和普通js代码中的中文内容，对于包含变量的情况，采取整段提取的方式
例如 

`<div>{{inviter.name}}邀请了{{compony.name}}的{{invitee.name}}加入了群聊</div>`

将提取为

`{{inviter.name}}邀请了{{compony.name}}的{{invitee.name}}加入了群聊`

同理 js中的代码

`const showText = inviter.name + '邀请了' + compony.name + '的' + invitee.name + '加入了群聊'`

也将提取为 

`inviter.name + '邀请了' + compony.name + '的' + invitee.name + '加入了群聊'`

整段提取保证了中英文翻译时的完整句义，以及翻译成英文时导致语序不同的问题

最终，经过一系列转换，在项目中的内容将替换为

`inviter.name + 'invited' +  invitee.name + 'from' + compony.name + 'to join the group chat'`

### 构建生成过程
为了减少多语言对原代码造成的侵入，通过修改webpack构建流程，使多语言的翻译函数在构建时进行替换，
在构建流程中添加i18nReplaceLoader，来将编译后的代码替换为翻译函数包裹的形式，再利用vue-i18n，
使得vue在运行时根据当前语言拿到语言包中配置的的内容


## 使用介绍
### 安装依赖
`npm i i18n-extract-replace-tool -D`
### webpack配置
    const { I18nReplacePlugin } = require('i18n-extract-replace-tool')
    export default {
    // ...
    rules: [{
        test: /\.(js|vue)$/,
        exclude: /(i18n|node_modules|emotionData\.js|emojiUtil\.js|matchingKeyCode\.js)/,
        use: [
            {
                loader: 'i18n-extract-replace-tool'
            }
        ],
    }],
    plugins: [
        new I18nReplacePlugin(),
    ]
    }
### 主要命令
生成语言包

`node ./node_modules/i18n-extract-replace-tool/src/i18nTools/generateLangPack.js`

翻译繁体

`node ./node_modules/i18n-extract-replace-tool/src/i18nTools/translateHk.js`

项目中引用语言包和加载，见[vue-i18n官方文档](https://kazupon.github.io/vue-i18n/)

### 整体流程
运行项目时能将项目中未翻译过的内容提取到to_translate_words.csv文件中，将此文件拿给翻译，翻译后将翻译过的文件放入tolang文件夹下，（注意给翻译只翻译英文，繁体用工具自己翻译），此时运行`node ./node_modules/i18n-extract-replace-tool/src/i18nTools/translateHk.js`命令补充文件中的繁体翻译，再运行`node ./node_modules/i18n-extract-replace-tool/src/i18nTools/generateLangPack.js`生成语言包到lang文件下，此时运行程序中的内容就会被替换成多语言版本