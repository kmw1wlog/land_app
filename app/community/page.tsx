"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Flag, MessageSquarePlus, ThumbsUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Label } from "@/components/Label";
import { properties } from "@/data/dummy";
import type { CommunityCategory } from "@/types";

const categories: Array<{ key: CommunityCategory; label: string }> = [
  { key: "resident_review", label: "실거주 후기" },
  { key: "owner_opinion", label: "보유자 의견" },
  { key: "buyer_question", label: "구매 준비 질문" },
  { key: "broker_comment", label: "중개사 의견" },
  { key: "deal_report", label: "거래 제보" },
  { key: "good_news", label: "생활 호재" },
  { key: "bad_news", label: "생활 리스크" },
  { key: "prediction", label: "경로 점검" },
  { key: "move_up_consulting", label: "주거 이동 질문" },
  { key: "cash_flow_investment", label: "주거비 절감" }
];

export default function CommunityPage() {
  return (
    <Suspense fallback={<AppShell title="데이터 기반 커뮤니티" subtitle="단지방을 불러오는 중입니다."><div /></AppShell>}>
      <CommunityPageContent />
    </Suspense>
  );
}

function CommunityPageContent() {
  const searchParams = useSearchParams();
  const roomKey = searchParams.get("room");
  const [posts, setPosts] = useState<CommunityPostRow[]>([]);
  const [comments, setComments] = useState<CommunityCommentRow[]>([]);
  const [rooms, setRooms] = useState<CommunityRoomRow[]>([]);
  const [roomType, setRoomType] = useState("public_region");
  const [category, setCategory] = useState<CommunityCategory>("resident_review");
  const [region, setRegion] = useState("성동구");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [commentDraft, setCommentDraft] = useState("");

  useEffect(() => {
    fetch(roomKey ? `/api/community/rooms?roomKey=${encodeURIComponent(roomKey)}` : "/api/community/rooms")
      .then((response) => response.json())
      .then((data) => {
        setRooms(data.rooms ?? []);
        if (data.room) {
          setRoomType(data.room.roomType);
          setRegion(data.room.region ?? region);
        }
      })
      .catch(() => setRooms([]));
  }, [roomKey]);

  useEffect(() => {
    if (searchParams.get("draft")) {
      setTitle(searchParams.get("title") ?? "");
      setContent(searchParams.get("body") ?? "");
      setCategory("move_up_consulting");
    }
  }, [searchParams]);

  const activeRoom = rooms.find((room) => room.roomType === roomType);
  const roomContext = parseRoomContext(roomKey, activeRoom, content);

  useEffect(() => {
    const roomQuery = activeRoom ? `&roomId=${activeRoom.id}` : "";
    fetch(`/api/community/posts?region=${encodeURIComponent(region)}&category=${category}${roomQuery}`)
      .then((response) => response.json())
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => setPosts([]));
  }, [region, category, activeRoom?.id]);

  const filtered = useMemo(() => posts.slice(0, 20), [posts]);

  const firstPost = filtered[0];

  useEffect(() => {
    if (!firstPost) return;
    fetch(`/api/community/comments?postId=${firstPost.id}`)
      .then((response) => response.json())
      .then((data) => setComments(data.comments ?? []))
      .catch(() => setComments([]));
  }, [firstPost?.id]);

  return (
    <AppShell title="데이터 기반 커뮤니티" subtitle="단지, 지역, 실거주 맥락에 실거래 데이터를 함께 붙여 질문과 검증을 이어갑니다.">
      <div className="space-y-4">
        {roomContext ? (
          <section className="rounded-lg bg-ink p-4 text-white">
            <p className="text-xs font-bold text-white/55">데이터가 붙은 단지방</p>
            <h2 className="mt-1 text-xl font-black leading-tight">{roomContext.title}</h2>
            <p className="mt-2 text-xs leading-5 text-white/60">
              실거래 카드에서 넘어온 문맥을 유지합니다. 이 방에서는 현재 조건에서 무리 없는 선택인지, 실거주 관점에서 어떤 리스크가 있는지 중심으로 이야기합니다.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-white/10 p-3 text-center">
              <DataPoint tone="dark" label="기준가" value={roomContext.referencePrice} />
              <DataPoint tone="dark" label="90일 거래" value={roomContext.volume90d} />
              <DataPoint tone="dark" label="거래 집중도" value={roomContext.heat} />
              <DataPoint tone="dark" label="전고점 대비" value={roomContext.drawdown} />
              <DataPoint tone="dark" label="전세가율" value={roomContext.jeonseRatio} />
              <DataPoint tone="dark" label="방" value={roomContext.roomLabel} />
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <div className="mb-3 grid grid-cols-3 gap-2 text-xs font-black">
            {[
              ["public_region", "공개 토론"],
              ["verified_property", "인증방"],
              ["owner_only", "보유자방"],
              ["resident_only", "실거주 후기"],
              ["public_property", "주거 이동 질문"],
              ["broker_qna", "중개사 Q&A"],
              ["prediction", "경로 점검"]
            ].map(([key, label]) => (
              <button
                key={key}
                className={`h-10 rounded-md ${roomType === key ? "bg-ink text-white" : "bg-black/5 text-ink"}`}
                onClick={() => setRoomType(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {activeRoom ? (
            <p className="mb-3 rounded-md bg-moss/10 p-3 text-xs leading-5 text-moss">
              {activeRoom.name} · 공개범위 {activeRoom.visibility} · 쓰기권한 {activeRoom.writePolicy}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <select
              className="h-11 rounded-md border border-black/10 bg-white px-3 text-sm font-bold"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
            >
              {[...new Set(properties.map((property) => property.region))].slice(0, 12).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              className="h-11 rounded-md border border-black/10 bg-white px-3 text-sm font-bold"
              value={category}
              onChange={(event) => setCategory(event.target.value as CommunityCategory)}
            >
              {categories.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 rounded-md bg-black/5 p-3 text-center">
            <DataPoint label="방 유형" value={activeRoom?.roomType ?? "공개"} />
            <DataPoint label="검증" value={activeRoom?.visibility ?? "public"} />
            <DataPoint label="쓰기권한" value={activeRoom?.writePolicy ?? "all"} />
            <DataPoint label="데이터" value={roomContext ? "단지 카드 연결" : "실거래 카드 연결"} />
          </div>
        </section>

        <section className="rounded-lg border border-black/10 bg-white p-4">
          <div className="flex items-center gap-2">
            <MessageSquarePlus size={18} className="text-moss" />
            <h2 className="text-base font-black text-ink">글 작성</h2>
          </div>
          <input
            className="mt-3 h-11 w-full rounded-md border border-black/10 px-3 text-sm font-bold outline-none focus:border-moss"
            placeholder="제목"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            className="mt-2 min-h-24 w-full rounded-md border border-black/10 p-3 text-sm outline-none focus:border-moss"
            placeholder="현장 분위기, 질문, 검증하고 싶은 내용을 남겨보세요."
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <button
            className="mt-2 h-11 w-full rounded-md bg-ink text-sm font-black text-white"
            onClick={() => {
              if (!title.trim() || !content.trim()) return;
              fetch("/api/community/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, category, region, roomId: activeRoom?.id, userId: "demo-user" })
              })
                .then((response) => response.json())
                .then((data) => {
                  if (data.post && !data.post.isHidden) setPosts((value) => [data.post, ...value]);
                });
              setTitle("");
              setContent("");
            }}
          >
            게시하기
          </button>
        </section>

        <section className="space-y-3">
          {filtered.map((post) => (
            <article key={post.id} className="rounded-lg border border-black/10 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <Label tone="direct">{post.authorBadge}</Label>
                  <Label>{post.region}</Label>
                  {post.verificationLabel ? <Label tone={post.verificationLabel === "검증 필요" ? "risk" : "good"}>{post.verificationLabel}</Label> : null}
                </div>
                <p className="text-xs font-bold text-black/42">댓글 {post.commentCount}</p>
              </div>
              <h2 className="mt-3 text-lg font-black leading-6 text-ink">{post.title}</h2>
              <p className="mt-2 text-sm leading-6 text-black/60">{post.content}</p>
              <div className="mt-3 rounded-md bg-gold/10 p-3 text-xs leading-5 text-black/62">
                연결된 실거래 카드의 기준가, 거래량, 전세가율을 본문에 붙여 실거주 리스크와 접근 가능성을 함께 토론할 수 있습니다.
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-black/52">
                <span>출처/근거 첨부 가능</span>
                <span>반박/검증 요청</span>
                <span>예측 적중률 반영 예정</span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className="flex h-10 flex-1 items-center justify-center gap-1 rounded-md bg-black/5 text-sm font-black text-ink"
                  onClick={() => {
                    fetch(`/api/community/posts/${post.id}/like`, { method: "POST" })
                      .then((response) => response.json())
                      .then((data) =>
                        setPosts((value) => value.map((item) => (item.id === post.id ? data.post : item)))
                      );
                  }}
                >
                  <ThumbsUp size={15} />
                  {post.likes}
                </button>
                <button
                  className="flex h-10 flex-1 items-center justify-center gap-1 rounded-md bg-black/5 text-sm font-black text-ink"
                  onClick={() => {
                    fetch(`/api/community/posts/${post.id}/report`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: "demo-user", reason: "검증 필요" })
                    })
                      .then((response) => response.json())
                      .then((data) =>
                        setPosts((value) =>
                          data.post?.isHidden
                            ? value.filter((item) => item.id !== post.id)
                            : value.map((item) => (item.id === post.id ? data.post : item))
                        )
                      );
                  }}
                >
                  <Flag size={15} />
                  신고
                </button>
              </div>
            </article>
          ))}
        </section>

        {firstPost ? (
          <section className="rounded-lg border border-black/10 bg-white p-4">
            <h2 className="text-base font-black text-ink">댓글 작성</h2>
            <p className="mt-1 text-xs text-black/50">{firstPost.title}</p>
            <div className="mt-3 space-y-2">
              {comments
                .slice(0, 3)
                .map((comment) => (
                  <p key={comment.id} className="rounded-md bg-black/5 p-3 text-sm text-black/65">
                    {comment.content}
                  </p>
                ))}
            </div>
            <input
              className="mt-3 h-11 w-full rounded-md border border-black/10 px-3 text-sm outline-none focus:border-moss"
              placeholder="댓글을 입력하세요"
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
            />
            <button
              className="mt-2 h-10 w-full rounded-md bg-moss text-sm font-black text-white"
              onClick={() => {
                if (!commentDraft.trim()) return;
                fetch("/api/community/comments", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ postId: firstPost.id, content: commentDraft, userId: "demo-user" })
                })
                  .then((response) => response.json())
                  .then((data) => {
                    if (data.comment) setComments((value) => [...value, data.comment]);
                  });
                setCommentDraft("");
              }}
            >
              댓글 남기기
            </button>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

interface CommunityPostRow {
  id: string;
  region: string | null;
  category: string;
  title: string;
  content: string;
  authorBadge: string | null;
  verificationLabel: string | null;
  likes: number;
  commentCount: number;
}

interface CommunityRoomRow {
  id: string;
  roomType: string;
  name: string;
  visibility: string;
  writePolicy: string;
}

interface CommunityCommentRow {
  id: string;
  content: string;
}

function DataPoint({ label, value, tone = "light" }: { label: string; value: string; tone?: "light" | "dark" }) {
  return (
    <div>
      <p className={`text-[10px] font-bold ${tone === "dark" ? "text-white/50" : "text-black/42"}`}>{label}</p>
      <p className={`mt-1 text-sm font-black ${tone === "dark" ? "text-white" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function parseRoomContext(roomKey: string | null, room: CommunityRoomRow | undefined, draftBody: string) {
  if (!roomKey && !room) return null;
  const parts = roomKey?.split(":") ?? [];
  const complexName = parts[2] ?? room?.name ?? "관심 단지";
  return {
    title: room?.name ?? `${complexName} 토론방`,
    referencePrice: extractDraftMetric(draftBody, "최근 실거래 기준가") ?? "카드 기준",
    volume90d: extractDraftMetric(draftBody, "최근 90일 거래") ?? "확인 전",
    heat: extractDraftMetric(draftBody, "거래 집중도") ?? "확인 전",
    drawdown: extractDraftMetric(draftBody, "전고점 대비") ?? "확인 전",
    jeonseRatio: extractDraftMetric(draftBody, "전세가율") ?? "확인 전",
    roomLabel: room?.roomType ?? "단지방"
  };
}

function extractDraftMetric(body: string, label: string) {
  const line = body.split("\n").find((item) => item.startsWith(label));
  return line?.split(":").slice(1).join(":").trim();
}
