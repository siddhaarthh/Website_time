function isValidURL(givenURL) {
  return givenURL && givenURL.includes(".");
}

function getDomain(tablink) {
  if (tablink) {
      let url = new URL(tablink);
      return url.hostname;
  } else {
      return null;
  }
}

function saveRestrictedSite(domain) {
  chrome.storage.local.get('restrictedSites', function(data) {
      let restrictedSites = data.restrictedSites || [];
      if (!restrictedSites.includes(domain)) {
          restrictedSites.push(domain);
          chrome.storage.local.set({ restrictedSites: restrictedSites });
      }
  });
}

function removeRestrictedSite(domain) {
  chrome.storage.local.get('restrictedSites', function(data) {
      let restrictedSites = data.restrictedSites || [];
      const index = restrictedSites.indexOf(domain);
      if (index > -1) {
          restrictedSites.splice(index, 1);
          chrome.storage.local.set({ restrictedSites: restrictedSites });
      }
  });
}

function getRestrictedSites(callback) {
  chrome.storage.local.get('restrictedSites', function(data) {
      callback(data.restrictedSites || []);
  });
}

function updateTime() {
  chrome.tabs.query({ "active": true, "lastFocusedWindow": true }, function(activeTabs) {
      let activeTab = activeTabs[0];
      let domain = getDomain(activeTab.url);
      if (isValidURL(domain)) {
          getRestrictedSites(function(restrictedSites) {
              if (restrictedSites.includes(domain)) {
                  // Close the tab or display a warning
                  chrome.tabs.remove(activeTab.id, function() {
                      console.log("Closed restricted site: " + domain);
                  });
                  return;
              }

              let today = new Date();
              let presentDate = getDateString(today);
              let myObj = {};
              myObj[presentDate] = {};
              myObj[presentDate][domain] = "";
              let timeSoFar = 0;
              chrome.storage.local.get(presentDate, function(storedObject) {
                  if (storedObject[presentDate]) {
                      if (storedObject[presentDate][domain]) {
                          timeSoFar = storedObject[presentDate][domain] + 1;
                          storedObject[presentDate][domain] = timeSoFar;
                          chrome.storage.local.set(storedObject, function() {
                              console.log("Set " + domain + " at " + storedObject[presentDate][domain]);
                              chrome.action.setBadgeText({ 'text': secondsToString(timeSoFar, true) });
                          });
                      } else {
                          timeSoFar++;
                          storedObject[presentDate][domain] = timeSoFar;
                          chrome.storage.local.set(storedObject, function() {
                              console.log("Set " + domain + " at " + storedObject[presentDate][domain]);
                              chrome.action.setBadgeText({ 'text': secondsToString(timeSoFar, true) });
                          })
                      }
                  } else {
                      timeSoFar++;
                      storedObject[presentDate] = {};
                      storedObject[presentDate][domain] = timeSoFar;
                      chrome.storage.local.set(storedObject, function() {
                          console.log("Set " + domain + " at " + storedObject[presentDate][domain]);
                          chrome.action.setBadgeText({ 'text': secondsToString(timeSoFar, true) });
                      })
                  }
              });
          });
      } else {
          chrome.action.setBadgeText({ 'text': '' });
      }
  });
}

function getDateString(nDate) {
  let nDateDate = nDate.getDate();
  let nDateMonth = nDate.getMonth() + 1;
  let nDateYear = nDate.getFullYear();
  if (nDateDate < 10) { nDateDate = "0" + nDateDate; }
  if (nDateMonth < 10) { nDateMonth = "0" + nDateMonth; }
  let presentDate = nDateYear + "-" + nDateMonth + "-" + nDateDate;
  return presentDate;
}

function secondsToString(seconds, compressed = false) {
  let hours = parseInt(seconds / 3600);
  seconds = seconds % 3600;
  let minutes = parseInt(seconds / 60);
  seconds = seconds % 60;
  let timeString = "";
  if (hours) {
      timeString += hours + " hrs ";
  }
  if (minutes) {
      timeString += minutes + " min ";
  }
  if (seconds) {
      timeString += seconds + " sec ";
  }
  if (!compressed) {
      return timeString;
  } else {
      if (hours) {
          return (`${hours}h`);
      }
      if (minutes) {
          return (`${minutes}m`);
      }
      if (seconds) {
          return (`${seconds}s`);
      }
  }
};

var intervalID;

intervalID = setInterval(updateTime, 1000);
setInterval(checkFocus, 500);

function checkFocus() {
  chrome.windows.getCurrent(function(window) {
      if (window.focused) {
          if (!intervalID) {
              intervalID = setInterval(updateTime, 1000);
          }
      } else {
          if (intervalID) {
              clearInterval(intervalID);
              intervalID = null;
          }
      }
  });
}

// Listen to web navigation events
chrome.webNavigation.onCommitted.addListener(function(details) {
  let domain = getDomain(details.url);
  getRestrictedSites(function(restrictedSites) {
      if (restrictedSites.includes(domain)) {
          chrome.tabs.remove(details.tabId, function() {
              console.log("Blocked access to restricted site: " + domain);
          });
      }
  });
});
