// Inital
var SpreadsheetId = "";
var BotToken = "";

// 記錄塞進去
function insertRecord(ss, reponame, data, cleanup) {
    var currentSheet = ss.getSheetByName(reponame);
    var LastRow = currentSheet.getLastRow() - 1;
    if (cleanup == true) {
        currentSheet.deleteRows(2, LastRow);
    }
    var pushData = []
    for (i = 0; i < data.length; i++) {
        pushData.push([data[i].id, data[i].name, data[i].url])
    }
    currentSheet
        .getRange(2, 1, data.length, 3)
        .setValues(
            pushData
        );
}

function getStarsFromRemote(reponame) {
    var url = "https://api.github.com/repos/" + reponame;
    var resp = UrlFetchApp.fetch(url);
    if (resp.getResponseCode() != 200) {
        Logger.log(reponame + " not 200")
        return
    }
    // read stars total
    var repo = JSON.parse(resp.getContentText());
    if (typeof repo != 'object') {
        Logger.log('json parse error.')
        return
    }

    // 四捨五入
    var starredList = [];
    var totalPages = Math.round(repo.stargazers_count / 100 + 0.5) + 1
    var url = "https://api.github.com/repos/" + reponame + "/stargazers?per_page=100&page=";
    for (i = 1; i < totalPages; i++) {
        var r = UrlFetchApp.fetch(url + i);
        var tmp = JSON.parse(r.getContentText());
        for (x = 0; x < tmp.length; x++) {
            // id name url | id login url
            t = {
                "id": tmp[x].id.toString(),
                "name": tmp[x].login,
                "url": tmp[x].html_url
            }
            starredList.push(t);
        }
    };
    return starredList
}

function mentionHTML(name, url) {
    return "<a href=\"" + url + '">' + escape(name) + "</a>"
}

function boardcast(chatId, text) {
    var apiUrl = "https://api.telegram.org/bot" + BotToken + "/sendMessage";
    var splitChat = chatId.toString().split(",")
    for (i = 0; i < splitChat.length; i++) {
        var data = {
            'chat_id': splitChat[i],
            'text': text,
            'parse_mode': 'html'
        };
        var options = {
            'method': 'post',
            'contentType': 'application/json',
            'payload': JSON.stringify(data)
        };
        UrlFetchApp.fetch(apiUrl, options);
    }
}

function worker(ss, data) {
    var starredList = getStarsFromRemote(data.repo);
    var currentSheet = ss.getSheetByName(data.repo);

    // create sheet
    if (currentSheet == null) {
        ss.insertSheet(data.repo, ss.getSheets().length);
        var currentSheet = ss.getSheetByName(data.repo);
        var sheetHeaders = [
            ['Id', 'Name', 'URL']
        ];
        currentSheet
            .getRange(1, 1, 1, sheetHeaders[0].length)
            .setFontWeight('bold')
            .setBackground('lightgray')
            .setValues(sheetHeaders);
        // Inital new data.
        if (starredList.length != 0) {
            insertRecord(ss, data.repo, starredList, false)
            Logger.log("新建 Sheet 不動作。");
        }
    } else {
        var LastRow = currentSheet.getLastRow() - 1;
        var LastCol = currentSheet.getLastColumn();
        // null
        if (LastRow != 0) {
            var record = currentSheet.getSheetValues(2, 1, LastRow, LastCol).map(function (recordData) {
                return {
                    id: recordData[0].toString(),
                    name: recordData[1],
                    url: recordData[2],
                }
            })
        }
        var statusList = {
            "starred": [],
            "unstarred": []
        }
        // 空ㄉ表格
        if (typeof record == 'undefined') {
            for (i = 0; i < starredList.length; i++) {
                statusList.starred.push(starredList[i])
            }
            insertRecord(ss, data.repo, starredList, false)
        } else {
            // track unsub
            for (i = 0; i < record.length; i++) {
                if (starredList.filter(rs => rs.id == record[i].id).length == 0) {
                    statusList.unstarred.push(record[i])
                }
            }

            // track new sub
            for (i = 0; i < starredList.length; i++) {
                if (record.filter(rs => rs.id == starredList[i].id).length == 0) {
                    statusList.starred.push(starredList[i])
                }
            }
        }
        if (statusList.starred.length > 0 || statusList.unstarred.length > 0) {
            insertRecord(ss, data.repo, starredList, true)

            // boardcast
            var text = "";
            if (statusList.starred.length == 1) {
                // <a href=\""http://www.example.com/">inline URL</a>

                text += "🎉 有一位新的朋友 " + mentionHTML(statusList.starred[0].name, statusList.starred[0].url) + " 給ㄌ " + mentionHTML(data.repo, "https://github.com/" + data.repo) + " 星星 🌟\n"
            } else {
                if (statusList.starred.length > 1) {
                    text += "🎉 有 " + statusList.starred.length + " 位朋友給ㄌ " + mentionHTML(data.repo, "https://github.com/" + data.repo) + " 星星 🌟\n"
                    for (i = 0; i < statusList.starred.length; i++) {
                        text += mentionHTML(statusList.starred[i].name, statusList.starred[i].url)
                        if (i != statusList.starred.length - 1) {
                            text += "、"
                        }
                    }
                }
            }
            if (text.length > 1) {
                text += "\n"
            }
            if (statusList.unstarred.length == 1) {
                text += "🤧 有一位朋友 " + mentionHTML(statusList.unstarred[0].name, statusList.unstarred[0].url) + " 從 " + mentionHTML(data.repo, "https://github.com/" + data.repo) + " 拿走ㄌ星星 🌠"
            } else {
                if (statusList.unstarred.length > 1) {
                    text += "🤧 有 " + statusList.unstarred.length + " 位朋友從 " + mentionHTML(data.repo, "https://github.com/" + data.repo) + " 拿走ㄌ星星 🌠\n"
                    for (i = 0; i < statusList.unstarred.length; i++) {
                        text += mentionHTML(statusList.unstarred[i].name, statusList.unstarred[i].url)
                        if (i != statusList.unstarred.length - 1) {
                            text += "、"
                        }
                    }
                }
            }
            boardcast(data.chatId, text)
        }
    }
}

function main() {
    var ss = SpreadsheetApp.openById(SpreadsheetId);
    var DataSheet = ss.getSheetByName("data");
    // 先看總共有幾筆好ㄌ
    var LastRow = DataSheet.getLastRow() - 1;
    var LastCol = DataSheet.getLastColumn();

    // DataSheet.getSheetValues(1, 1, 2, 3)
    var watchDog = DataSheet.getSheetValues(2, 1, LastRow, LastCol).map(function (watchMenu) {
        return {
            repo: watchMenu[0],
            chatId: watchMenu[1].toString(),
        };
    });

    // 尻 worker
    for (n = 0; n < watchDog.length; n++) {
        worker(ss, watchDog[n])
    };
}