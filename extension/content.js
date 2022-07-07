
// Constants
// -------------------------------------------------------------------------

const targetNode = document.getElementById("app-mount");
const config = {
  attributes: false,
  childList: true,
  subtree: true,
  characterData:false,
  attributeOldValue: false,
  characterDataOldValue: false
};

const header = "<html lang=\"en-US\" style=\"font-size: 100%; --saturation-factor: 1; --devtools-sidebar-width: 0px;\" class=\"full-motion disable-forced-colors theme-dark platform-web font-size-16\" data-rh=\"lang,style,class\"><head><meta charset=\"UTF-8\"><link rel=\"stylesheet\" href=\"https://discord.com/assets/40532.ccd7077c8311c798fcff.css\"></head><body><div class=\"scroller-kQBbkU auto-2K3UW5 scrollerBase-_bVAAt disableScrollAnchor-6TwzvM managedReactiveScroller-1lEEh3\" dir=\"ltr\" ><div class=\"scrollerContent-2SW0kQ content-2a4AW9\"><ol class=\"scrollerInner-2PPAp2\">"
const footer = "</ol></div></div></body></html>"

const TOOLBAR_CLASS = ".toolbar-3_r2xA";
const APP_CLASS = ".content-1jQy2l";
const SCROLLER_CLASS = ".scrollerInner-2PPAp2";
const MESSAGE_CLASS = "messageListItem-ZZ7v6g";
const SCROLL_TARGET_CLASS = ".scroller-kQBbkU";

const DOWNLOADER_ID = "DownloaderSubmenu";
const ICON_ID = "ToolbarIcon";

const SCROLL_TIMEOUT = 1500;
const SAVE_TIMEOUT = 10000;

// Globals
// -------------------------------------------------------------------------

var previousUrl = "";
var succeeded = 0;
var archiverTarget = null;
var scrollTarget = null;

var messages = new AvlTree(comparator);
var updateCount = 0;

var startButton = null;
var count = null;

var currentlyScrolling = false;


// HTML Injection
// -------------------------------------------------------------------------

function comparator (k1,k2) {
  if (k1.id < k2.id)
    return -1;
  if (k1.id > k2.id)
    return 1;
  return 0;
};

function archiverCallback(mutations, observer) {
  console.log("Scroller update processed");
  for (let i = 0; i < mutations.length; ++i) {
    for (let j = 0; j < mutations[i].addedNodes.length; ++j) {
      let node = mutations[i].addedNodes[j];
  
      if(node.classList.contains(MESSAGE_CLASS)){
        updateCount++;
        messages.insert(node);
      }
    }
  }

  count.innerText = updateCount.toString();
};

function cleanup() {
  updateCount = 0;
  count.innerText = updateCount.toString();
  archiverObserver.disconnect;
  messages = new AvlTree(comparator);
};

function observerCallback(mutations, observer) {
  if(location.href !== previousUrl) {
    console.log(`URL changed to ${location.href}`);
    previousUrl = location.href;
    succeeded = 0;

    if (startButton) {
      succeeded++;
      cleanup();
      startButton.innerText = "Start";
    }

    if (document.getElementById("ToolbarIcon")) succeeded++;
  }

  if (succeeded < 2) {
    console.log("Injecting UI");

    for (let i = 0; i < mutations.length; ++i) {
      for (let j = 0; j < mutations[i].addedNodes.length; ++j) {
        let node = mutations[i].addedNodes[j];
        if (node.querySelectorAll) {
          Array.prototype.forEach.call(
            node.querySelectorAll(TOOLBAR_CLASS), injectToolbar);
          Array.prototype.forEach.call(
            node.querySelectorAll(APP_CLASS), injectMenu);
        }
      }
    }
  }
};


// Entrypoint
let archiverObserver = new MutationObserver(archiverCallback);
let observer = new MutationObserver(observerCallback);
observer.observe(targetNode, config);


// Toolbar Button
// -------------------------------------------------------------------------

function toolbarButtonClickCallback() {
  console.log("Clicked")
  div = document.getElementById(DOWNLOADER_ID);
  if(div){
    div.style.display = div.style.display == "none" ? "block" : "none";
  }
};

function injectToolbar(toolbar) {
  console.log("Injecting toolbar icon");

  let fragment = document.createElement("div");
  fragment.id = ICON_ID;
  fragment.tabIndex = -2;
  fragment.classList = ["iconWrapper-2awDjA", "clickable-ZD7xvu"];

  let src = chrome.runtime.getURL("button.svg");
  fragment.innerHTML = `<img class="icon-2xnN2Y" src=${src} />`;

  toolbar.appendChild(fragment);

  fragment.addEventListener("click", toolbarButtonClickCallback)
  succeeded++;
};


// Menu
// -------------------------------------------------------------------------

function injectMenu(menu) {
  console.log("Injecting submenu");

  let ui = document.createElement("div");
  ui.id = DOWNLOADER_ID;
  ui.style = "display: none; padding: 20px";
  ui.classList = ["container-2o3qEW"];

  let heading = document.createElement("h3");
  heading.classList.value = "wrapper-3eehVU base-ZDDK0g size16-CysEuG";
  heading.innerText = "Archive Messages";
  heading.style = "padding-bottom: 10px";
  ui.appendChild(heading);

  count = document.createElement("b");
  count.classList.value = "markup-eYLPri";
  count.innerText = "0";
  count.style = "padding-bottom: 10px";

  let countContainer = 
  document.createElement("div");
  countContainer.classList.value = "markup-eYLPri";
  countContainer.innerText = "Messages in cache: ";
  countContainer.style = "padding-bottom: 10px";
  countContainer.appendChild(count);
  ui.appendChild(countContainer);

  let scroll = document.createElement("div");
  scroll.classList.value = "markup-eYLPri";
  scroll.innerHTML = "<input type=\"checkbox\" id=\"autoscroll\" name=\"autoscroll\"><label for=\"autoscroll\">Automatically scroll upwards</label>";
  scroll.style = "padding-bottom: 10px";
  ui.appendChild(scroll);

  let chunk = document.createElement("div");
  chunk.classList.value = "markup-eYLPri";
  chunk.innerHTML = "Save every <input type=\"number\" id=\"chunk\" name=\"chunk\" min=\"1000\" max=\"10000\" value=\"5000\"> messages";
  chunk.style = "padding-bottom: 10px";
  ui.appendChild(chunk);

  startButton = document.createElement("button");
  startButton.classList.value = "button-f2h6uQ lookFilled-yCfaCM colorBrand-I6CyqQ sizeSmall-wU2dO- grow-2sR_-F";
  startButton.innerText = "Start";
  startButton.addEventListener("click", toggleArchiving);
  ui.appendChild(startButton);

  menu.prepend(ui);
  succeeded++;

};


// Scroller
// -------------------------------------------------------------------------

function scroll() {
  let timeout = SCROLL_TIMEOUT;

  if (updateCount > parseInt(document.querySelector("#chunk").value)) {
    prepareFile();
    timeout = SAVE_TIMEOUT;
  }

  if (currentlyScrolling) {
    if (document.querySelector("#autoscroll").checked)
      scrollTarget.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth"
      });
    setTimeout(scroll, timeout);
  }

}


function startCapture() {
  currentlyScrolling = true;
  if (document.querySelector("#autoscroll").checked) scroll();
};

function stopCapture() {
  currentlyScrolling = false;
};


// Archiver
// -------------------------------------------------------------------------

function openAsPage (data, contentType) {
  let blob = new window.Blob([data], {type: contentType});
  let url = window.URL.createObjectURL(blob);
  window.open(url, "_blank");
};

//todo: save previous state

// function savePosition() {
//   let url = window.location.href;
//   let value = messages.getMax.classList.value;
//   chrome.storage.sync.set({[url]: value});
// };

function classNameToDateTime(name) {
  let snowflake = BigInt(name.substring(14,32));
  let unixTime = Number(snowflake >> 22n) + 1420070400000;
  return strftime("%F-%H%M", new Date(unixTime));
}

function prepareFile() {
  if(messages._root == null) return;

  output = header;
  updateCount = 0;

  let earliest = classNameToDateTime(messages.getMin().element.id);
  let last = classNameToDateTime(messages.getMax().element.id);

  messages.forEach(message => { output += message.outerHTML.replace("/asset", "https://www.discord.com/asset"); });
  output += footer;

  cleanup();

  let blob = new window.Blob([output], {type: "text/html"});
  let url = URL.createObjectURL(blob);
  window.open(url, "_blank");

  setTimeout(function () {
    chrome.runtime.sendMessage(
      {downloadUrl: url, filename: `${earliest} - ${last}.mhtml`},
      captureUrl => { URL.revokeObjectURL(captureUrl); });
    }, 500);
  setTimeout(function () { URL.revokeObjectURL(url); }, 3e4);

};

function saveCurrentlyLoaded() {
  let loadedMessages = archiverTarget.querySelectorAll("." + MESSAGE_CLASS);
  for (message of loadedMessages){
    updateCount++;
    messages.insert(message);
  }
  count.innerText = updateCount.toString();
}

function toggleArchiving() {
  if (startButton.innerText == "Start"){
    startButton.innerText = "Stop";
    cleanup();

    archiverTarget = document.querySelector(SCROLLER_CLASS);
    scrollTarget = document.querySelector(SCROLL_TARGET_CLASS);

    saveCurrentlyLoaded();
    archiverObserver.observe(archiverTarget, config);
    startCapture();

  } else {
    startButton.innerText = "Start";
    stopCapture();
    archiverObserver.disconnect();
    prepareFile();
  }
};
