// Inital
SS_ID = "";
BOT_TOKEN = "";

// 記錄塞進去
function insertRecord(ss, reponame, data, cleanup) {
    var currentSheet = ss.getSheetByName(reponame);
    last_row = currentSheet.getLastRow() - 1;
    last_col = currentSheet.getLastColumn();
    if (cleanup == true) {
        currentSheet.deleteRows(2, last_row);
    }
    push_data = []
    for (i = 0; i < data.length; i++) {
        push_data.push([data[i].id, data[i].name, data[i].url])
    }
    currentSheet
        .getRange(2, 1, data.length, 3)
        .setValues(
            push_data
        );
}

function get_stars_from_remote(reponame) {
    url = "https://api.github.com/repos/" + reponame;
    var resp = UrlFetchApp.fetch(url);
    if (resp.getResponseCode() != 200) {
        Logger.log(reponame + " not 200")
        return
    }
    // read stars total
    repo = JSON.parse(resp.getContentText());
    if (typeof repo != 'object') {
        Logger.log('json parse error.')
        return
    }

    // 四捨五入
    var starred_list = [];
    total_pages = repo.stargazers_count / 100 + 0.5
    url = "https://api.github.com/repos/" + reponame + "/stargazers?per_page=100&page=";
    for (i = 1; i < total_pages; i++) {
        r = UrlFetchApp.fetch(url + i);
        tmp = JSON.parse(r.getContentText());
        for (x = 0; x < tmp.length; x++) {
            // id name url | id login url
            t = {
                "id": tmp[x].id.toString(),
                "name": tmp[x].login,
                "url": tmp[x].html_url
            }
            starred_list.push(t);
        }
    };
    return starred_list
}

function mention_html(name, url) {
    return "<a href=\"" + url + '">' + escape(name) + "</a>"
}

function boardcast(chat_id, text) {
    api_url = "https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage";
    split_chat = chat_id.toString().split(",")
    for (i = 0; i < split_chat.length; i++) {
        var data = {
            'chat_id': split_chat[i],
            'text': text,
            'parse_mode': 'html'
        };
        var options = {
            'method': 'post',
            'contentType': 'application/json',
            'payload': JSON.stringify(data)
        };
        UrlFetchApp.fetch(api_url, options);
    }
}

function worker(ss, data) {
    var starred_list = get_stars_from_remote(data.repo);
    var currentSheet = ss.getSheetByName(data.repo);

    // create sheet
    if (currentSheet == null) {
        ss.insertSheet(data.repo, ss.getSheets().length);
        currentSheet = ss.getSheetByName(data.repo);
        var sheetHeaders = [
            ['Id', 'Name', 'URL']
        ];
        currentSheet
            .getRange(1, 1, 1, sheetHeaders[0].length)
            .setFontWeight('bold')
            .setBackground('lightgray')
            .setValues(sheetHeaders);
        // Inital new data.
        if (starred_list.length != 0) {
            insertRecord(ss, data.repo, starred_list, false)
            Logger.log("新建 Sheet 不動作。");
        }
    } else {
        last_row = currentSheet.getLastRow() - 1;
        last_col = currentSheet.getLastColumn();
        // null
        if (last_row != 0) {
            record = currentSheet.getSheetValues(2, 1, last_row, last_col).map(function (record_data) {
                return {
                    id: record_data[0].toString(),
                    name: record_data[1],
                    url: record_data[2],
                }
            })
        }
        status_list = {
            "starred": [],
            "unstarred": []
        }
        // 空ㄉ表格
        if (typeof record == 'undefined') {
            for (i = 0; i < starred_list.length; i++) {
                status_list.starred.push(starred_list[i])
            }
            insertRecord(ss, data.repo, starred_list, false)
        } else {
            // track unsub
            for (i = 0; i < record.length; i++) {
                if (starred_list.filter(rs => rs.id == record[i].id).length == 0) {
                    status_list.unstarred.push(record[i])
                }
            }

            // track new sub
            for (i = 0; i < starred_list.length; i++) {
                if (record.filter(rs => rs.id == starred_list[i].id).length == 0) {
                    status_list.starred.push(starred_list[i])
                }
            }
        }
        if (status_list.starred.length > 0 || status_list.unstarred.length > 0) {
            insertRecord(ss, data.repo, starred_list, true)

            // boardcast
            var text = "";
            if (status_list.starred.length == 1) {
                // <a href=\""http://www.example.com/">inline URL</a>

                text += "🎉 有一位新的朋友" + mention_html(status_list.starred[0].name, status_list.starred[0].url) + "給ㄌ" + mention_html(data.repo, "https://github.com/" + data.repo) + "星星 🌟\n"
            } else {
                if (status_list.starred.length > 1) {
                    text += "🎉 有 " + status_list.starred.length + " 位朋友給ㄌ" + mention_html(data.repo, "https://github.com/" + data.repo) + "星星 🌟\n"
                    for (i = 0; i < status_list.starred.length; i++) {
                        text += mention_html(status_list.starred[i].name, status_list.starred[i].url)
                        if (i != status_list.starred.length - 1) {
                            text += "、"
                        }
                    }
                }
            }
            if (status_list.unstarred.length == 1) {
                text += "🤧 有一位朋友" + mention_html(status_list.unstarred[0].name, status_list.unstarred[0].url) + "從" + mention_html(data.repo, "https://github.com/" + data.repo) + "拿走ㄌ星星 🌠"
            } else {
                if (status_list.unstarred.length > 1) {
                    text += "🤧 有 " + status_list.unstarred.length + " 位朋友從" + mention_html(data.repo, "https://github.com/" + data.repo) + "拿走ㄌ星星 🌠\n"
                    for (i = 0; i < status_list.unstarred.length; i++) {
                        text += mention_html(status_list.unstarred[i].name, status_list.unstarred[i].url)
                        if (i != status_list.unstarred.length - 1) {
                            text += "、"
                        }
                    }
                }
            }
            boardcast(data.chat_id, text)
        }
    }
}

function main() {
    var ss = SpreadsheetApp.openById(SS_ID);
    var data_sheet = ss.getSheetByName("data");
    // 先看總共有幾筆好ㄌ
    last_row = data_sheet.getLastRow() - 1;
    last_col = data_sheet.getLastColumn();

    // data_sheet.getSheetValues(1, 1, 2, 3)
    watch_dog = data_sheet.getSheetValues(2, 1, last_row, last_col).map(function (watch_menu) {
        return {
            repo: watch_menu[0],
            chat_id: watch_menu[1].toString(),
        };
    });

    // 尻 worker
    for (i = 0; i < watch_dog.length; i++) {
        worker(ss, watch_dog[i])
    };
}