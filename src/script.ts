import "external-svg-loader";

// @ts-ignore
import browser, {WebRequest, Cookies} from "webextension-polyfill";

import HttpHeadersItemType = WebRequest.HttpHeadersItemType;
import OnBeforeSendHeadersDetailsType = WebRequest.OnBeforeSendHeadersDetailsType;
import BlockingResponse = WebRequest.BlockingResponse;
import Cookie = Cookies.Cookie;

interface User {
  email: string;
  active: boolean;
  accounts: Account[];
}

interface Account {
  active: boolean;
  name: string;
  icon: string;
  endpoint: string;
  byline: string;
}

interface AnyObj {
  [key: string]: any;
}

interface YoutubeData {
  initialData: AnyObj
  context: AnyObj
}

interface YoutubeVideo {

}

interface YoutubeSubscriptionsFeedData {
  items: YoutubeVideo[];
  token: string;
}

interface YoutubeSubscriptionsFeed extends YoutubeSubscriptionsFeedData {
  etc?: AnyObj
}

const loader = document.getElementById("loadingContainer")!,
  content = document.getElementById("content")!,
  activeIcon = document.getElementById("activeIcon") as HTMLImageElement,
  userList = document.getElementById("userList")!,
  userSelect = document.getElementById("userSelect")!,
  headerPrefix = "__YTSAVE_HEADER_" + Math.random().toString(36).slice(2) + "_",
  sortActive = (a: Account | User, b: Account | User): number => (a.active ? -1 : b.active ? 1 : 0),
  preloadImage = (url: string): Promise<Event> =>
    new Promise((resolve) => {
      let img = new Image();
      img.onload = resolve;
      img.src = url;
    }),
  cssToMs = (duration: string): number => {
    return duration.includes("m") ? parseFloat(duration) * 1000 : parseFloat(duration);
  };

let SAPISID: string;

browser.webRequest.onBeforeSendHeaders.addListener(
  ({ requestHeaders }: OnBeforeSendHeadersDetailsType): BlockingResponse => {
    requestHeaders
      .filter((i: HttpHeadersItemType) => i.name.startsWith(headerPrefix))
      .forEach((i: HttpHeadersItemType) => {
        let name = i.name.replace(headerPrefix, "");

        requestHeaders = requestHeaders.filter(
          (j: HttpHeadersItemType) =>
            j.name.toLowerCase() != name.toLowerCase() &&
            j.name.toLowerCase() != i.name.toLowerCase()
        );
        requestHeaders.push({ name, value: i.value });
      });

    return { requestHeaders };
  },
  {
    urls: ["https://www.youtube.com/*"],
  },
  ["requestHeaders", "blocking", "extraHeaders"]
);

function hideUserlist(): void {
  userList.style.opacity = "0";
  activeIcon.style.opacity = "1";
  setTimeout(
    () => (userList.innerHTML = ""),
    cssToMs(getComputedStyle(content).transitionDuration)
  );
}

function showUserlist(users: User[]): void {
  users.forEach((i: User) => {
    let email = document.createElement("span");
    email.className = "email";
    email.innerHTML = i.email;
    userList.appendChild(email);
    i.accounts.forEach((j: Account) => {
      let el = document.createElement("div");
      el.className = "user";
      el.onclick = j.active ? hideUserlist : () => changeUser(j.endpoint);
      el.innerHTML = `<img class="icon" src="${j.icon}" alt="User icon"/>
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
  addAccount.innerHTML = `<img src="adduser.svg" alt="Add user icon" /> Add another account`;
  addAccount.onclick = () => login(true);
  userList.appendChild(addAccount);
  userList.style.opacity = "1";
  activeIcon.style.opacity = "0";
}

document.body.onclick = (e) => {
  if (!userSelect.contains(e.target as Node)) hideUserlist();
};

async function loadUserData(users: User[]): Promise<void> {
  await Promise.all(
    users.map((user: User) =>
      Promise.all(user.accounts.map((account: Account) => preloadImage(account.icon)))
    )
  );

  activeIcon.src = users[0].accounts[0].icon;
  activeIcon.onclick = () => showUserlist(users);
}

function changeUser(endpoint: string): void {
  loader.style.opacity = "1";
  content.style.opacity = "0";
  hideUserlist();
  fetch(endpoint, {
    headers: {
      [headerPrefix + "Origin"]: "https://www.youtube.com",
    },
  }).then(load);
}

async function getYoutubeData(url: string): Promise<YoutubeData> {
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

function getInternalApiParams(data: string): YoutubeData["context"] {
  return data
    .match(/(?<=ytcfg\.set\({).*?(?=}\);)/gs)!
    .map((i) => JSON.parse("{" + i + "}"))
    .reduce((a, i) => {
      return { ...a, ...i };
    }, {});
}

function parseSubscriptionsFeed(data: AnyObj): YoutubeSubscriptionsFeedData {
  return {
    token: data[data.length - 1].continuationItemRenderer ? data.pop().continuationItemRenderer.continuationEndpoint
        .continuationCommand.token : null,
    items: data.flatMap(
        (i: AnyObj) => i.itemSectionRenderer.contents[0].shelfRenderer.content.gridRenderer
            .items)
  }
}

async function getSubscriptionsFeed(token?: string, context?: AnyObj): Promise<YoutubeSubscriptionsFeed> {
  if (token && context) {
    let response = await internalApiRequest(
        "POST",
        "browse",
        {
          continuation: token,
        },
        context
    );
    let data =
        response.onResponseReceivedActions[0].appendContinuationItemsAction
            .continuationItems;
    return parseSubscriptionsFeed(data);
  }
  else {
    let response = await getYoutubeData("feed/subscriptions");
    let data = response.initialData.contents.twoColumnBrowseResultsRenderer.tabs[0]
        .tabRenderer.content.sectionListRenderer.contents;

    return {
      ...parseSubscriptionsFeed(data),
      etc: {
        userIcon: response.initialData.topbar.desktopTopbarRenderer.topbarButtons.pop().topbarMenuButtonRenderer.avatar.thumbnails[0].url,
        context: response.context
      }
    };
  }
}

async function sha1hash(data: string): Promise<string> {
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

async function internalApiRequest(method: string, endpoint: string, body: AnyObj, context: AnyObj): Promise<AnyObj> {
  return await fetch(
    `https://www.youtube.com/youtubei/v1/${endpoint}?key=${context.INNERTUBE_API_KEY}&prettyPrint=false`,
    {
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
      mode: "same-origin",
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

async function getUsers(): Promise<User[]> {
  let res = await fetch("https://www.youtube.com/getAccountSwitcherEndpoint", {
    credentials: "include",
  });

  let resBody = await res.text();
  return (JSON.parse(resBody.slice(5))
    .data.actions[0].getMultiPageMenuAction.menu.multiPageMenuRenderer.sections.map(
      (i: AnyObj) => i.accountSectionListRenderer
    ) as Array<AnyObj>)
    .map((i: AnyObj, index: number) => {
      let email = index
        ? i.contents[0].accountItemSectionRenderer.header
            .accountItemSectionHeaderRenderer.title.runs[0].text
        : i.header.googleAccountHeaderRenderer.email.simpleText;

      let accounts = i.contents[0].accountItemSectionRenderer.contents;
      accounts = (((index ? accounts : accounts.slice(0, accounts.length - 1)) as Array<AnyObj>)
        .map(({ accountItem }) => {
          return {
            active: accountItem.isSelected,
            name: accountItem.accountName.simpleText,
            icon: accountItem.accountPhoto.thumbnails[0].url,
            endpoint:
              "https://www.youtube.com" +
              accountItem.serviceEndpoint.selectActiveIdentityEndpoint.supportedTokens.reduce(
                (a: AnyObj, i: AnyObj) => {
                  return { ...a, ...i };
                },
                {}
              ).accountSigninToken.signinUrl,
            byline: accountItem.accountByline.simpleText,
          };
        }) as Account[])
        .sort(sortActive);
      return {
        email,
        active: !!accounts.find((i: Account) => i.active),
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
        return [];
      })
      .then(loadUserData),
    document.fonts.load("14px Roboto"),
    preloadImage("adduser.svg"),
    browser.cookies
      .get({
        url: "https://www.youtube.com",
        name: "SAPISID",
      })
      .then((cookie: Cookie) => (SAPISID = cookie.value)),
  ]);

  loader.style.opacity = "0";
  content.style.opacity = "1";
}

load().then();
