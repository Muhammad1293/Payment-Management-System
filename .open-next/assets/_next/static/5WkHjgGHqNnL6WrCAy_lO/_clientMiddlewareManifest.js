self.__MIDDLEWARE_MATCHERS = [
  {
    "regexp": "^(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!api\\/auth\\/login|_next\\/static|_next\\/image|favicon.ico|login).*))(\\\\.json)?[\\/#\\?]?$",
    "originalSource": "/((?!api/auth/login|_next/static|_next/image|favicon.ico|login).*)"
  }
];self.__MIDDLEWARE_MATCHERS_CB && self.__MIDDLEWARE_MATCHERS_CB()