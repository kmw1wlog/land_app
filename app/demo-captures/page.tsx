import { demoCaptureCards, demoComparables, demoCurrentHome, demoLadder } from "@/lib/demoSubmissionData";
import { formatKRW } from "@/lib/format";

export default function DemoCapturesPage() {
  return (
    <main className="bg-[#f7f1e7] p-8 text-ink">
      <div className="mx-auto max-w-[1280px] space-y-8">
        {demoCaptureCards.map((card, index) => (
          <section key={card.title} className="aspect-video overflow-hidden rounded-[2rem] bg-white p-10 shadow-soft">
            <p className="text-sm font-black text-moss">제출 이미지 {index + 1}</p>
            <h1 className="mt-3 text-5xl font-black tracking-normal">{card.title}</h1>
            <p className="mt-3 text-2xl font-bold text-black/55">{card.subtitle}</p>
            <div className="mt-8 grid grid-cols-4 gap-5">
              {card.body.map((item) => (
                <div key={item} className="flex min-h-36 items-center justify-center rounded-2xl bg-black/5 p-5 text-center text-2xl font-black">
                  {item}
                </div>
              ))}
            </div>
            {index === 2 ? <MvpMiniScreens /> : null}
            {index === 3 ? <TechFlow /> : null}
            {index === 4 ? <Roadmap /> : null}
          </section>
        ))}
      </div>
    </main>
  );
}

function MvpMiniScreens() {
  return (
    <div className="mt-7 grid grid-cols-4 gap-4">
      {[
        ["주거 구매력 피드", "구매력 적합 후보 · 거래 집중 3.1배"],
        ["내 주거 경로", `현재 기준점 ${formatKRW(demoCurrentHome.estimatedCurrentPrice)}`],
        ["같은 돈 비교", `${demoComparables.length}개 단지 비교`],
        ["데이터 커뮤니티", "자동 질문 템플릿"]
      ].map(([title, body]) => (
        <div key={title} className="rounded-2xl bg-ink p-5 text-white">
          <p className="text-lg font-black">{title}</p>
          <p className="mt-3 text-sm font-bold text-white/60">{body}</p>
        </div>
      ))}
    </div>
  );
}

function TechFlow() {
  return (
    <div className="mt-7 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4 text-center">
      <FlowBox title="공공데이터" body="실거래·전월세·건축물대장" />
      <span className="text-4xl font-black text-moss">→</span>
      <FlowBox title="시그널 엔진" body="거래 집중도·전고점·전세가율" />
      <span className="text-4xl font-black text-moss">→</span>
      <FlowBox title="개인화 계산" body="DSR/LTV·정리 후 여력·미래 구매력" />
    </div>
  );
}

function Roadmap() {
  return (
    <div className="mt-7 grid grid-cols-5 gap-3">
      {["MVP 구현", "지역 파일럿", "B2C 리포트", "B2B 리드", "전국 확장"].map((item, index) => (
        <div key={item} className="rounded-2xl bg-moss/10 p-5 text-center">
          <p className="text-sm font-black text-moss">{index}단계</p>
          <p className="mt-3 text-xl font-black">{item}</p>
        </div>
      ))}
    </div>
  );
}

function FlowBox({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-black/5 p-6">
      <p className="text-2xl font-black">{title}</p>
      <p className="mt-3 text-lg font-bold text-black/55">{body}</p>
    </div>
  );
}
