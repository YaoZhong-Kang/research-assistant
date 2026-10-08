export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-gray-50">

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-3">

        {/* 项目说明 */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            关于研智助手
          </h2>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            研智助手为上海大学常态化社会实践项目，
            面向大学生科研场景提供智能辅助。
          </p>

        </div>


        {/* 文献来源 */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            文献数据来源
          </h2>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            文献检索与元数据主要来源于开放学术数据库
            {" "}
            <a
              href="https://openalex.org"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-gray-700 underline underline-offset-4 transition hover:text-black"
            >
              OpenAlex
            </a>
            。
          </p>

        </div>


        {/* 隐私 */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            数据与隐私
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            请勿提交涉密数据或不宜交由第三方服务处理的未公开科研材料。
          </p>
        </div>

      </div>


      <div className="border-t border-gray-200">

        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-gray-400">

          <p>
            © 2026 研智助手 · 上海大学理学院“研智同行”社会实践团队
          </p>



        </div>

      </div>

    </footer>
  );
}