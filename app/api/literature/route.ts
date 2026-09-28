import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json(
      { error: "请输入搜索关键词" },
      { status: 400 }
    );
  }

  try {
    const url =
      `https://api.openalex.org/works` +
      `?search=${encodeURIComponent(query)}` +
      `&per_page=10`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("OpenAlex 请求失败");
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "文献搜索失败" },
      { status: 500 }
    );
  }
}