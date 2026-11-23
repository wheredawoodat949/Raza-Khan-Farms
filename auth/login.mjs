const strings = {
  en: {
    brand: "Raza Khan Farms",
    section: "Family access",
    signedOut: "You’re signed out",
    again: "Sign in again",
    title: "Sign in",
    intro: "Use your family account to open the land register.",
    username: "Username",
    password: "Password",
    enter: "Sign in",
    demo: "Try demo",
    language: "Language",
    error: "Check your username and password and try again.",
    limit: "Too many attempts. Try again in a minute.",
    setup: "Sign-in is awaiting account setup.",
    place: "Swat Valley, Pakistan",
  },
  ps: {
    brand: "رضا خان فارمز",
    section: "د کورنۍ لاسرسی",
    signedOut: "تاسو له حسابه ووتلئ",
    again: "بیا ننوځئ",
    title: "ننوتل",
    intro: "د ځمکو د ثبت د پرانیستلو لپاره خپل کورنی حساب وکاروئ.",
    username: "کارن نوم",
    password: "پټنوم",
    enter: "ننوتل",
    demo: "ازمایښتي بڼه پرانیزئ",
    language: "ژبه",
    error: "خپل کارن نوم او پټنوم وګورئ او بیا هڅه وکړئ.",
    limit: "هڅې ډېرې شوې دي. یوه دقیقه وروسته بیا هڅه وکړئ.",
    setup: "د ننوتلو لپاره د حساب جوړولو ته انتظار دی.",
    place: "د سوات دره، پاکستان",
  },
};
export function loginPage(language, message = "", demoEnabled = false, signedOut = false) {
  const s = strings[language];
  const pageTitle = signedOut ? s.signedOut : s.title;
  const path = signedOut ? "/signed-out" : "/login";
  return `<!doctype html><html lang="${language}" dir="${language === "ps" ? "rtl" : "ltr"}">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#214e3b">
  <title>${pageTitle} · ${s.brand}</title><link rel="license" href="/assets/photo-credits"><link rel="icon" href="/assets/mark.svg"><link rel="stylesheet" href="/signin.css"></head>
  <body><header><div class="brand"><img src="/assets/mark.svg" width="42" height="42" alt="">${s.brand}</div>
  <nav aria-label="${s.language}"><a href="${path}?lang=en" lang="en" ${language === "en" ? 'aria-current="true"' : ""}>English</a><a href="${path}?lang=ps" lang="ps" ${language === "ps" ? 'aria-current="true"' : ""}>پښتو</a></nav></header>
  <main><section class="form-panel"><div class="form-inner"><p class="section">${s.section}</p><h1>${pageTitle}</h1>
  ${signedOut ? `<a class="again" href="/login?lang=${language}">${s.again}</a>` : `<p class="intro">${s.intro}</p>
  <form method="post" action="/login?lang=${language}">
  <label for="username">${s.username}</label><input id="username" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required maxlength="32" dir="auto">
  <label for="password">${s.password}</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="128">
  ${message ? '<p class="error" role="alert">' + s[message] + "</p>" : ""}<button type="submit">${s.enter}</button>
  </form>
  ${demoEnabled ? `<form method="post" action="/demo?lang=${language}"><button class="demo" type="submit">${s.demo}</button></form>` : ""}
  `}
  </div></section><aside><div class="caption"><span>${s.place}</span></div></aside></main></body></html>`;
}
