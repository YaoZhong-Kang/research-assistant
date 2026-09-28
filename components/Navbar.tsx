import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">

        <Link
          href="/"
          className="flex items-center gap-3"
        >
          <Image
            src="/shu-logo.png"
            alt="上海大学 Logo"
            width={40}
            height={40}
          />

          <div>
            <div className="text-xl font-bold text-gray-900">
              研智助手
            </div>

            <div className="text-xs text-gray-500">
              上海大学社会实践项目
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-8 text-sm text-gray-600">

          <Link
            href="/"
            className="transition hover:text-black"
          >
            首页
          </Link>

          <Link
            href="/literature"
            className="transition hover:text-black"
          >
            文献助手
          </Link>

          <Link
            href="/data"
            className="transition hover:text-black"
          >
            数据助手
          </Link>

          <Link
            href="/writing"
            className="transition hover:text-black"
          >
            论文规范
          </Link>

        </div>

      </div>
    </nav>
  );
}