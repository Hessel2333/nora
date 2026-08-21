type AccessTokenProvider = () => Promise<string>;

let accessTokenProvider: AccessTokenProvider | undefined;

export function configureAccessTokenProvider(provider?: AccessTokenProvider) {
  accessTokenProvider = provider;
}

export async function currentAccessToken() {
  if (!accessTokenProvider) throw new Error("生产身份尚未初始化");
  return accessTokenProvider();
}
