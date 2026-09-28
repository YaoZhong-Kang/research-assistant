import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">

      <section className="mx-auto max-w-6xl px-6 py-24">

        <div className="text-center">

          <p className="mb-4 text-sm font-medium text-gray-500">
            AI-assisted Research Toolkit
          </p>

          <h1 className="text-5xl font-bold tracking-tight text-gray-900">
            研智助手
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            面向大学生科研场景的智能辅助平台，
            帮助你更高效地完成文献整理、科研数据处理与论文规范检查。
          </p>

        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">

          <Link
            href="/literature"
            className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="text-3xl">
              📚
            </div>

            <h2 className="mt-5 text-xl font-semibold text-gray-900">
              文献助手
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              搜索科研文献、整理文献信息，并借助 AI 快速理解论文内容。
            </p>

            <p className="mt-6 text-sm font-medium text-gray-900">
              开始使用 →
            </p>
          </Link>

          <Link
            href="/data"
            className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="text-3xl">
              📊
            </div>

            <h2 className="mt-5 text-xl font-semibold text-gray-900">
              数据助手
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              上传科研数据，自动检查缺失值、重复值和常见格式问题。
            </p>

            <p className="mt-6 text-sm font-medium text-gray-900">
              开始使用 →
            </p>
          </Link>

          <Link
            href="/writing"
            className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="text-3xl">
              ✍️
            </div>

            <h2 className="mt-5 text-xl font-semibold text-gray-900">
              论文规范助手
            </h2>

            <p className="mt-3 leading-7 text-gray-600">
              检查论文中的单位、标点、引用及科研表达规范问题。
            </p>

            <p className="mt-6 text-sm font-medium text-gray-900">
              开始使用 →
            </p>
          </Link>

        </div>

      </section>

    </main>
  );
}