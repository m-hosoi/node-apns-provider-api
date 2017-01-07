# APNs Provider APIとAPNs Auth Keyを使用したAPNs送信

## Install

### Install nodejs (macos & ndenv)
    ndenv install v7.4.0
    ndenv local v7.4.0


### Set up modules

    yarn
or

    npm install


## Usage

    node --harmony-async-await index.js


## Setting

* `config.js`: Auth KeyやBundleIDの設定
* `deviceTokens.json`: 送信先リスト
* `content.json`: 送信するデータ
