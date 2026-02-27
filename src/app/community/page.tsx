"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bookmark,
  Heart,
  MessageCircle,
  Plus,
  Search,
  Send,
  SlidersHorizontal,
  Tv,
  X,
} from "lucide-react";

type PostType = "gear" | "setting";
type FeedFilter = "all" | PostType;
type FeedSort = "latest" | "popular" | "saved";

interface Post {
  id: string;
  type: PostType;
  author: string;
  title: string;
  body: string;
  tags: string[];
  imageUrl: string;
  gear: string[];
  setting: { dpi: number | null; sens: number | null; ads: number | null };
  likes: number;
  saves: number;
  comments: number;
  shares: number;
  createdAt: string;
}

interface ReactionState {
  liked: Record<string, boolean>;
  saved: Record<string, boolean>;
}

const STORAGE_POSTS = "wbz-community-posts-v4";
const STORAGE_REACTIONS = "wbz-community-reactions-v4";
const STORAGE_COMMENTS = "wbz-community-comments-v1";
const STORAGE_SHARES = "wbz-community-shares-v1";

const QUICK_TAGS = ["랭크", "일반전", "감도", "장비", "에임", "생존", "루트", "팀플"];

const SEED_POSTS: Post[] = [
  {
    id: "seed-1",
    type: "gear",
    author: "TAEGO_RUSH",
    title: "태이고 스쿼드 운영 장비",
    body: "M416 + Mini14 조합, 연막 6개 기준. 외곽 운영에 안정적인 세팅입니다.",
    tags: ["랭크", "팀플", "생존"],
    imageUrl: "https://images.unsplash.com/photo-1472457974886-0ebcd59440cc?q=80&w=1200&auto=format&fit=crop",
    gear: ["M416", "Mini14", "연막 x6", "3헬", "3조끼"],
    setting: { dpi: null, sens: null, ads: null },
    likes: 142,
    saves: 87,
    comments: 21,
    shares: 8,
    createdAt: "2026-02-13T10:05:00.000Z",
  },
  {
    id: "seed-2",
    type: "setting",
    author: "MIRAMAR_SNIPER",
    title: "반동 제어 감도 공유",
    body: "2배율 빠르게, 6배율 안정적으로 맞춘 DMR용 감도. 중장거리 교전에 좋습니다.",
    tags: ["감도", "에임", "랭크"],
    imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop",
    gear: [],
    setting: { dpi: 800, sens: 38, ads: 32 },
    likes: 231,
    saves: 160,
    comments: 39,
    shares: 24,
    createdAt: "2026-02-12T08:14:00.000Z",
  },
];

function parseTags(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function parseGear(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  const m = Math.floor((Date.now() - date.getTime()) / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [reactions, setReactions] = useState<ReactionState>({ liked: {}, saved: {} });
  const [extraComments, setExtraComments] = useState<Record<string, string[]>>({});
  const [extraShares, setExtraShares] = useState<Record<string, number>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});

  const [filter, setFilter] = useState<FeedFilter>("all");
  const [sort, setSort] = useState<FeedSort>("latest");
  const [activeTag, setActiveTag] = useState("");
  const [keyword, setKeyword] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);

  const [type, setType] = useState<PostType>("gear");
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [gearInput, setGearInput] = useState("");
  const [dpi, setDpi] = useState("");
  const [sens, setSens] = useState("");
  const [ads, setAds] = useState("");

  useEffect(() => {
    try {
      const p = localStorage.getItem(STORAGE_POSTS);
      const r = localStorage.getItem(STORAGE_REACTIONS);
      const c = localStorage.getItem(STORAGE_COMMENTS);
      const s = localStorage.getItem(STORAGE_SHARES);
      if (p) setPosts(JSON.parse(p) as Post[]);
      if (r) setReactions(JSON.parse(r) as ReactionState);
      if (c) setExtraComments(JSON.parse(c) as Record<string, string[]>);
      if (s) setExtraShares(JSON.parse(s) as Record<string, number>);
    } catch (error) {
      console.error("커뮤니티 로드 실패:", error);
    }
  }, []);

  useEffect(() => localStorage.setItem(STORAGE_POSTS, JSON.stringify(posts)), [posts]);
  useEffect(() => localStorage.setItem(STORAGE_REACTIONS, JSON.stringify(reactions)), [reactions]);
  useEffect(() => localStorage.setItem(STORAGE_COMMENTS, JSON.stringify(extraComments)), [extraComments]);
  useEffect(() => localStorage.setItem(STORAGE_SHARES, JSON.stringify(extraShares)), [extraShares]);

  const allPosts = useMemo(() => [...posts, ...SEED_POSTS], [posts]);
  const topTags = useMemo(() => {
    const map = new Map<string, number>();
    allPosts.forEach((p) => p.tags.forEach((tag) => map.set(tag, (map.get(tag) ?? 0) + 1)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [allPosts]);

  const feed = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    let list = allPosts.filter((p) => {
      if (filter !== "all" && p.type !== filter) return false;
      if (activeTag && !p.tags.includes(activeTag)) return false;
      if (!q) return true;
      return [p.author, p.title, p.body, ...p.tags].join(" ").toLowerCase().includes(q);
    });
    if (sort === "saved") list = list.filter((p) => reactions.saved[p.id]);
    list.sort((a, b) => {
      if (sort === "latest" || sort === "saved") return +new Date(b.createdAt) - +new Date(a.createdAt);
      const aScore =
        a.likes + (reactions.liked[a.id] ? 1 : 0) + (a.comments + (extraComments[a.id]?.length ?? 0)) * 2 + (a.saves + (reactions.saved[a.id] ? 1 : 0)) * 2;
      const bScore =
        b.likes + (reactions.liked[b.id] ? 1 : 0) + (b.comments + (extraComments[b.id]?.length ?? 0)) * 2 + (b.saves + (reactions.saved[b.id] ? 1 : 0)) * 2;
      return bScore - aScore;
    });
    return list;
  }, [allPosts, filter, activeTag, keyword, sort, reactions, extraComments]);

  const addQuickTag = (tag: string) => {
    const tags = parseTags(tagsInput);
    if (tags.includes(tag)) return;
    setTagsInput([...tags, tag].map((v) => `#${v}`).join(" "));
  };

  const submitPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!body.trim()) return alert("본문은 필수입니다.");
    const next: Post = {
      id: `post-${Date.now()}`,
      type,
      author: author.trim() || "익명",
      title: title.trim() || (type === "gear" ? "장비 세팅 공유" : "감도 세팅 공유"),
      body: body.trim(),
      tags: parseTags(tagsInput),
      imageUrl: imageUrl.trim(),
      gear: type === "gear" ? parseGear(gearInput) : [],
      setting: {
        dpi: type === "setting" ? Number.parseInt(dpi, 10) || null : null,
        sens: type === "setting" ? Number.parseInt(sens, 10) || null : null,
        ads: type === "setting" ? Number.parseInt(ads, 10) || null : null,
      },
      likes: 0,
      saves: 0,
      comments: 0,
      shares: 0,
      createdAt: new Date().toISOString(),
    };
    setPosts((prev) => [next, ...prev]);
    setAuthor(""); setTitle(""); setBody(""); setImageUrl(""); setTagsInput(""); setGearInput(""); setDpi(""); setSens(""); setAds("");
    setComposerOpen(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 mb-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-2">WBZ 커뮤니티 허브</h1>
            <p className="text-wbz-mute text-sm">장비와 감도를 빠르게 공유하고 댓글, 저장, 공유로 반응을 쌓는 실전형 피드</p>
          </div>
          <button type="button" onClick={() => setComposerOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-wbz-gold text-black font-black text-sm">
            <Plus className="w-4 h-4" /> 새 글 작성
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 space-y-3">
          <div className="rounded-2xl border border-white/10 bg-wbz-card/70 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {([["all", "전체"], ["gear", "장비"], ["setting", "감도"]] as Array<[FeedFilter, string]>).map(([k, l]) => (
                <button key={k} onClick={() => { setFilter(k); if (k !== "all") setActiveTag(""); }} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${filter === k ? "bg-wbz-gold text-black border-wbz-gold" : "bg-white/5 text-wbz-mute border-white/10"}`}>{l}</button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <select value={sort} onChange={(e) => setSort(e.target.value as FeedSort)} className="bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white">
                  <option value="latest">최신순</option><option value="popular">인기순</option><option value="saved">저장한 글</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-wbz-mute" />
                <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="작성자/제목/태그 검색" className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white" />
              </div>
              {activeTag && <button onClick={() => setActiveTag("")} className="px-2.5 py-1.5 rounded-full text-[11px] font-bold border border-rose-300/40 bg-rose-500/10 text-rose-200">태그 해제 #{activeTag}</button>}
            </div>
          </div>

          {feed.length === 0 ? <div className="rounded-2xl border border-white/10 bg-wbz-card/70 p-10 text-center text-wbz-mute">조건에 맞는 게시물이 없습니다.</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {feed.map((p, i) => {
                const liked = Boolean(reactions.liked[p.id]);
                const saved = Boolean(reactions.saved[p.id]);
                const commentCount = p.comments + (extraComments[p.id]?.length ?? 0);
                return (
                  <motion.article key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="rounded-xl overflow-hidden border border-white/10 bg-wbz-card/90">
                    <div className="relative h-36 bg-cover bg-center" style={{ backgroundImage: p.imageUrl ? `linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,.2)), url(${p.imageUrl})` : "linear-gradient(160deg,#0b0b0b,#141414)" }}>
                      <div className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20 bg-black/40">{p.type === "gear" ? "장비" : "감도"}</div>
                      <div className="absolute top-2 right-2 text-[10px] text-white/80">{relativeTime(p.createdAt)}</div>
                      <div className="absolute bottom-2 left-2 text-xs font-black">@{p.author}</div>
                    </div>
                    <div className="p-3 space-y-2">
                      <h3 className="text-white font-black text-base">{p.title}</h3>
                      <p className="text-xs text-wbz-mute">{p.body}</p>
                      <div className="flex flex-wrap gap-1.5">{p.tags.map((t) => <button key={`${p.id}-${t}`} onClick={() => { setFilter("all"); setActiveTag(t); }} className="text-[10px] px-2 py-1 rounded-full bg-white/5 border border-white/10">#{t}</button>)}</div>
                      {p.type === "gear" && p.gear.length > 0 && <div className="flex flex-wrap gap-1.5">{p.gear.slice(0, 4).map((g) => <span key={`${p.id}-${g}`} className="text-[10px] px-2 py-1 rounded-md bg-amber-400/20 border border-amber-300/30 text-amber-100">{g}</span>)}</div>}
                      {p.type === "setting" && <div className="flex gap-1.5 text-[10px]"><span className="px-2 py-1 rounded bg-cyan-400/20 border border-cyan-300/30">DPI {p.setting.dpi ?? "-"}</span><span className="px-2 py-1 rounded bg-cyan-400/20 border border-cyan-300/30">민감도 {p.setting.sens ?? "-"}</span><span className="px-2 py-1 rounded bg-cyan-400/20 border border-cyan-300/30">ADS {p.setting.ads ?? "-"}</span></div>}
                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
                        <button onClick={() => setReactions((prev) => ({ ...prev, liked: { ...prev.liked, [p.id]: !prev.liked[p.id] } }))} className="inline-flex items-center gap-1 text-wbz-mute hover:text-white"><Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />{p.likes + (liked ? 1 : 0)}</button>
                        <span className="inline-flex items-center gap-1 text-wbz-mute"><MessageCircle className="w-4 h-4" />{commentCount}</span>
                        <button onClick={() => setReactions((prev) => ({ ...prev, saved: { ...prev.saved, [p.id]: !prev.saved[p.id] } }))} className="inline-flex items-center gap-1 text-wbz-mute hover:text-white"><Bookmark className={`w-4 h-4 ${saved ? "fill-amber-300 text-amber-300" : ""}`} />{p.saves + (saved ? 1 : 0)}</button>
                        <button onClick={async () => { const text = `[WBZ] ${p.title}\\n${p.body}`; const url = `${window.location.origin}/community#${p.id}`; if (typeof navigator.share === "function") await navigator.share({ title: p.title, text, url }); else await navigator.clipboard.writeText(`${text}\\n${url}`); setExtraShares((prev) => ({ ...prev, [p.id]: (prev[p.id] ?? 0) + 1 })); }} className="inline-flex items-center gap-1 text-wbz-mute hover:text-white"><Send className="w-4 h-4" />{p.shares + (extraShares[p.id] ?? 0)}</button>
                      </div>
                      <div className="flex gap-1.5 pt-1">
                        <input value={commentDraft[p.id] ?? ""} onChange={(e) => setCommentDraft((prev) => ({ ...prev, [p.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const text = (commentDraft[p.id] ?? "").trim(); if (!text) return; setExtraComments((prev) => ({ ...prev, [p.id]: [...(prev[p.id] ?? []), text] })); setCommentDraft((prev) => ({ ...prev, [p.id]: "" })); } }} placeholder="댓글 입력..." className="flex-1 bg-black/30 border border-white/10 rounded-md px-2.5 py-1.5 text-[11px] text-white" />
                        <button onClick={() => { const text = (commentDraft[p.id] ?? "").trim(); if (!text) return; setExtraComments((prev) => ({ ...prev, [p.id]: [...(prev[p.id] ?? []), text] })); setCommentDraft((prev) => ({ ...prev, [p.id]: "" })); }} className="px-2.5 py-1.5 rounded-md bg-white/10 border border-white/10 text-[11px] font-bold">등록</button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="xl:col-span-4 space-y-3 xl:sticky xl:top-28 h-fit">
          <section className="rounded-2xl border border-white/10 bg-wbz-card/70 p-4">
            <h2 className="text-sm font-black text-white mb-3">인기 태그</h2>
            <div className="flex flex-wrap gap-1.5">
              {topTags.map(([tag, count]) => <button key={tag} onClick={() => { setFilter("all"); setActiveTag(tag); }} className="text-[11px] px-2.5 py-1 rounded-full border border-white/10 bg-white/5">#{tag} <span className="text-wbz-mute">{count}</span></button>)}
            </div>
          </section>
          <section className="rounded-2xl border border-white/10 bg-wbz-card/70 p-4">
            <h2 className="text-sm font-black text-white mb-2">빠른 태그 추가</h2>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => <button key={tag} onClick={() => addQuickTag(tag)} className="text-[11px] px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-wbz-mute hover:text-white">#{tag}</button>)}
            </div>
          </section>
        </aside>
      </div>

      {composerOpen && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-black">새 글 작성</h2>
              <button type="button" onClick={() => setComposerOpen(false)} className="p-2 rounded-lg bg-white/5 text-wbz-mute hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={submitPost} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setType("gear")} className={`px-3 py-2 rounded-lg text-xs font-bold border ${type === "gear" ? "bg-wbz-gold text-black border-wbz-gold" : "bg-white/5 text-wbz-mute border-white/10"}`}><Tv className="w-3.5 h-3.5 inline-block mr-1" />장비 공유</button>
                <button type="button" onClick={() => setType("setting")} className={`px-3 py-2 rounded-lg text-xs font-bold border ${type === "setting" ? "bg-wbz-gold text-black border-wbz-gold" : "bg-white/5 text-wbz-mute border-white/10"}`}><SlidersHorizontal className="w-3.5 h-3.5 inline-block mr-1" />감도 공유</button>
              </div>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="작성자 (미입력 시 익명)" className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white" />
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목 (선택)" className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white" />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="본문 (필수)" className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white resize-none" />
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="이미지 URL (선택)" className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white" />
              <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="태그 (#랭크 #감도 #장비)" className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white" />
              {type === "gear" ? <textarea value={gearInput} onChange={(e) => setGearInput(e.target.value)} rows={2} placeholder="장비 목록 (예: M416, Mini14, 연막 x6)" className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white resize-none" /> : <div className="grid grid-cols-3 gap-2"><input value={dpi} onChange={(e) => setDpi(e.target.value)} placeholder="DPI" className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white" /><input value={sens} onChange={(e) => setSens(e.target.value)} placeholder="민감도" className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white" /><input value={ads} onChange={(e) => setAds(e.target.value)} placeholder="ADS" className="w-full glass-input rounded-lg px-3 py-2 text-sm text-white" /></div>}
              <button className="w-full bg-wbz-gold text-black rounded-lg py-2.5 text-sm font-black hover:bg-white">게시하기</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
