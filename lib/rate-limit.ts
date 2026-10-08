import type {
  NextRequest,
} from "next/server";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const LIMIT = 5;

const WINDOW_MS =
  60 * 1000;


declare global {
  var __researchAssistantAiRateLimit:
    | Map<
        string,
        RateLimitRecord
      >
    | undefined;
}


const store =
  globalThis
    .__researchAssistantAiRateLimit ??
  new Map<
    string,
    RateLimitRecord
  >();


globalThis.__researchAssistantAiRateLimit =
  store;


export function getClientIp(
  request: NextRequest
) {
  const forwardedFor =
    request.headers.get(
      "x-forwarded-for"
    );

  if (forwardedFor) {
    return (
      forwardedFor
        .split(",")[0]
        ?.trim() ||
      "unknown"
    );
  }

  const realIp =
    request.headers.get(
      "x-real-ip"
    );

  return realIp || "unknown";
}


export function checkAiRateLimit(
  ip: string
): RateLimitResult {

  const now =
    Date.now();


  // 偶尔清理已经过期的 IP，
  // 防止 Map 长时间积累
  if (store.size > 500) {

    for (
      const [
        key,
        value,
      ] of store
    ) {

      if (
        value.resetAt <= now
      ) {
        store.delete(key);
      }
    }
  }


  const current =
    store.get(ip);


  // 第一次请求
  // 或上一分钟已经结束
  if (
    !current ||
    current.resetAt <= now
  ) {

    store.set(
      ip,
      {
        count: 1,
        resetAt:
          now + WINDOW_MS,
      }
    );

    return {
      allowed: true,
      remaining:
        LIMIT - 1,
      retryAfterSeconds:
        0,
    };
  }


  // 已达到上限
  if (
    current.count >= LIMIT
  ) {

    return {
      allowed: false,
      remaining: 0,

      retryAfterSeconds:
        Math.max(
          1,
          Math.ceil(
            (
              current.resetAt -
              now
            ) /
              1000
          )
        ),
    };
  }


  // 继续计数
  current.count += 1;

  store.set(
    ip,
    current
  );


  return {
    allowed: true,

    remaining:
      LIMIT -
      current.count,

    retryAfterSeconds:
      0,
  };
}