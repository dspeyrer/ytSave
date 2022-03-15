const loader = document.getElementById("loader"),
  content = document.getElementById("content"),
  activeIcon = document.getElementById("activeIcon"),
  userList = document.getElementById("userList"),
  userSelect = document.getElementById("userSelect"),
  sortActive = (a, b) => (a.active ? -1 : b.active ? 1 : 0);

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
  let data = await fetch("https://youtube.com" + url, {
    credentials: "include",
  }).then((res) => res.text());

  return JSON.parse(
    "{" + data.match(/(?<=var ytInitialData = {).*?(?=};)/s) + "}"
  );
}

async function getInternalApiParams(url) {
  let data = await fetch("https://youtube.com/", {
    credentials: "include",
  }).then((res) => res.text());

  return data
    .match(/(?<=ytcfg\.set\({).*?(?=}\);)/gs)
    .map((i) => JSON.parse("{" + i + "}"))
    .reduce((a, i) => {
      return { ...a, ...i };
    }, {});
}

    data = data.slice(data.indexOf("var ytInitialData = {") + 20);

    ytres = JSON.parse(data.slice(0, data.indexOf("};") + 1));

    console.log(ytcfg, ytres);
  });
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
  let context = {};

  await Promise.all([
    getUsers()
      .catch((e) => {
        login();
      })
      .then(loadUserData),
    document.fonts.load("14px Roboto"),
    getInternalApiParams().then(
      (data) =>
        (context = {
          ...context,
          name: data.INNERTUBE_CLIENT_NAME,
          version: data.INNERTUBE_CLIENT_VERSION,
          key: data.INNERTUBE_API_KEY,
        })
    ),
    browser.cookies
      .get({
        url: "https://youtube.com",
        name: "SAPISID",
      })
      .then((cookie) => (context.SAPISID = cookie.value)),
  ]);


  loader.style.visibility = "hidden";
  content.style.visibility = "visible";
}

load();
