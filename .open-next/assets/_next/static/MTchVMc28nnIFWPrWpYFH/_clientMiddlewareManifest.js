self.__MIDDLEWARE_MATCHERS = [
  {
    "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!api\\/auth\\/login|api\\/debug|_next\\/static|_next\\/image|icon.png|login).*))(\\\\.json)?[\\/#\\?]?$",
    "originalSource": "/((?!api/auth/login|api/debug|_next/static|_next/image|icon.png|login).*)"
  }
];self.__MIDDLEWARE_MATCHERS_CB && self.__MIDDLEWARE_MATCHERS_CB()