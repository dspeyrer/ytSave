const loader = document.getElementById("loader"),
  content = document.getElementById("content"),
  activeIcon = document.getElementById("activeIcon"),
  userList = document.getElementById("userList"),
  userSelect = document.getElementById("userSelect"),
  headerPrefix = "__YTSAVE_HEADER_" + Math.random().toString(36).slice(2) + "_",
  sortActive = (a, b) => (a.active ? -1 : b.active ? 1 : 0),
  headerReducer = (a, i) => {
    a[i.name] = i.value;
    return a;
  };

let SAPISID = null;

browser.webRequest.onBeforeSendHeaders.addListener(
  ({ requestHeaders }) => {
    requestHeaders
      .filter((i) => i.name.startsWith(headerPrefix))
      .forEach((i) => {
        let name = i.name.replace(headerPrefix, "");

        requestHeaders = requestHeaders.filter(
          (j) =>
            j.name.toLowerCase() != name.toLowerCase() &&
            j.name.toLowerCase() != i.name.toLowerCase()
        );
        requestHeaders.push({ name, value: i.value });
      });

    return { requestHeaders };
  },
  {
    urls: ["*://*.youtube.com/*"],
  },
  ["requestHeaders", "blocking"]
);

function hideUserlist() {
  userList.innerHTML = "";
  userList.style.visibility = "hidden";
}

function showUserlist(users) {
  users.forEach((i) => {
    let email = document.createElement("span");
    email.className = "email";
    email.innerHTML = i.email;
    userList.appendChild(email);
    i.accounts.forEach((j) => {
      let el = document.createElement("div");
      el.className = "user";
      el.onclick = j.active ? hideUserlist : () => changeUser(j.endpoint);
      el.innerHTML = `<img class="icon" src="${j.icon}"/>
          <div class="name">${j.name}</div>
          <div class="subtitle">
            ${j.byline}
          </div>`;
      userList.appendChild(el);
    });
  });

  let addAccount = document.createElement("div");
  addAccount.id = "addNew";
  addAccount.className = "user";
  addAccount.innerHTML = `<img src="adduser.svg" /> Add another account`;
  addAccount.onclick = () => login(true);
  userList.appendChild(addAccount);
  userList.style.visibility = "visible";
}

document.body.onclick = (e) => {
  if (!userSelect.contains(e.target)) hideUserlist();
};

async function loadUserData(users) {
  await Promise.all(
    users.map((user) =>
      Promise.all(
        user.accounts.map(
          (account) =>
            new Promise((resolve) => {
              let img = new Image();
              img.onload = resolve;
              img.src = account.icon;
            })
        )
      )
    )
  );

  activeIcon.src = users[0].accounts[0].icon;
  activeIcon.onclick = () => showUserlist(users);
}

function changeUser(endpoint) {
  loader.style.visibility = "visible";
  content.style.visibility = "hidden";
  userList.style.visibility = "hidden";
  hideUserlist();
  fetch(endpoint).then(load);
}

async function getYoutubeData(url) {
  let data = await fetch("https://www.youtube.com/" + url, {
    credentials: "include",
  }).then((res) => res.text());

  return {
    initialData: JSON.parse(
      "{" + data.match(/(?<=var ytInitialData = {).*?(?=};)/s) + "}"
    ),
    context: getInternalApiParams(data),
  };
}

function getInternalApiParams(data) {
  return data
    .match(/(?<=ytcfg\.set\({).*?(?=}\);)/gs)
    .map((i) => JSON.parse("{" + i + "}"))
    .reduce((a, i) => {
      return { ...a, ...i };
    }, {});
}

async function sha1hash(data) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-1", new TextEncoder().encode(data))
    ),
  ]
    .map((i) => i.toString(16))
    .join("");
}

async function apiAuthHeader() {
  let timestamp = Math.floor(new Date().getTime() / 1000);
  return `SAPISIDHASH ${timestamp}_${await sha1hash(
    timestamp + " " + SAPISID + " https://www.youtube.com"
  )}`;
}

async function internalApiRequest(method, endpoint, body, context) {
  return await fetch(
    `https://www.youtube.com/youtubei/${context.INNERTUBE_API_VERSION}/${endpoint}?key=${context.INNERTUBE_API_KEY}&prettyPrint=false`,
    {
      mode: "same-origin",
      headers: {
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/json",
        "X-Goog-Visitor-Id": context.INNERTUBE_CONTEXT.client.visitorData,
        "X-Youtube-Client-Name": context.INNERTUBE_CONTEXT_CLIENT_NAME,
        "X-Youtube-Client-Version": context.INNERTUBE_CONTEXT_CLIENT_VERSION,
        Authorization: await apiAuthHeader(),
        "X-Goog-AuthUser": context.SESSION_INDEX,
        "X-Origin": "https://www.youtube.com",
        "X-Goog-PageId": context.DELEGATED_SESSION_ID,
        "Alt-Used": "www.youtube.com",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "same-origin",
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        [headerPrefix + "Referer"]:
          "https://www.youtube.com/feed/subscriptions",
        [headerPrefix + "Origin"]: "https://www.youtube.com",
      },
      body: JSON.stringify({
        context: context.INNERTUBE_CONTEXT,
        ...body,
      }),
      method,
      mode: "cors",
    }
  ).then((res) => res.json());
}

async function login(addAcc = false) {
  await browser.tabs.create({
    url:
      "https://accounts.google.com/" + (addAcc ? "AddSession" : "ServiceLogin"),
  });

  window.close();
}

async function getUsers() {
  let res = await fetch("https://www.youtube.com/getAccountSwitcherEndpoint", {
    credentials: "include",
  });
  let resBody = await res.text();
  return JSON.parse(resBody.slice(5))
    .data.actions[0].getMultiPageMenuAction.menu.multiPageMenuRenderer.sections.map(
      (i) => i.accountSectionListRenderer
    )
    .map((i, index) => {
      let email = index
        ? i.contents[0].accountItemSectionRenderer.header
            .accountItemSectionHeaderRenderer.title.runs[0].text
        : i.header.googleAccountHeaderRenderer.email.simpleText;

      accounts = i.contents[0].accountItemSectionRenderer.contents;
      accounts = (index ? accounts : accounts.slice(0, accounts.length - 1))
        .map(({ accountItem }) => {
          return {
            active: accountItem.isSelected,
            name: accountItem.accountName.simpleText,
            icon: accountItem.accountPhoto.thumbnails[0].url,
            endpoint:
              "https://youtube.com" +
              accountItem.serviceEndpoint.selectActiveIdentityEndpoint.supportedTokens.reduce(
                (a, i) => {
                  return { ...a, ...i };
                },
                {}
              ).accountSigninToken.signinUrl,
            byline: accountItem.accountByline.simpleText,
          };
        })
        .sort(sortActive);
      return {
        email,
        active: !!accounts.find((i) => i.active),
        accounts,
      };
    })
    .sort(sortActive);
}

async function load() {
  await Promise.all([
    getUsers()
      .catch((e) => {
        login();
      })
      .then(loadUserData),
    document.fonts.load("14px Roboto"),
    browser.cookies
      .get({
        url: "https://youtube.com",
        name: "SAPISID",
      })
      .then((cookie) => (SAPISID = cookie.value)),
  ]);

  loader.style.visibility = "hidden";
  content.style.visibility = "visible";
}

load();
