chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    var url = null;
    chrome.tabs.query({ active: true, title: message.downloadUrl }, (tabs) => {
        chrome.pageCapture.saveAsMHTML({ tabId: tabs[0].id}, async (blob) => {
            const content = await blob.text();
            url = "data:application/x-mimearchive;base64," + btoa(content);
            chrome.downloads.download({
                url,
                filename: message.filename
            });
            chrome.tabs.remove(tabs[0].id);
        });
    });
    sendResponse({blobUrl: url});
});