"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useMemo, useState } from "react";
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
import { useLanguage } from "@/context/LanguageContext";

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

function parseTags(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function parseGear(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function replaceValue(template: string, value: number): string {
  return template.replace("{{value}}", String(value));
}

export default function CommunityPage() {
  const { t } = useLanguage();
  const labels = t.communityPage;

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

  const seedPosts = useMemo<Post[]>(() => {
    const first = labels.seedPosts[0];
    const second = labels.seedPosts[1];
    return [
      {
        id: "seed-1",
        type: "gear",
        author: first.author,
        title: first.title,
        body: first.body,
        tags: [...first.tags],
        imageUrl: "https://images.unsplash.com/photo-1472457974886-0ebcd59440cc?q=80&w=1200&auto=format&fit=crop",
        gear: ["M416", "Mini14", "Smoke x6", "Vest Lv3", "Helmet Lv3"],
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
        author: second.author,
        title: second.title,
        body: second.body,
        tags: [...second.tags],
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
  }, [labels.seedPosts]);

  useEffect(() => {
    try {
      const storedPosts = localStorage.getItem(STORAGE_POSTS);
      const storedReactions = localStorage.getItem(STORAGE_REACTIONS);
      const storedComments = localStorage.getItem(STORAGE_COMMENTS);
      const storedShares = localStorage.getItem(STORAGE_SHARES);

      if (storedPosts) setPosts(JSON.parse(storedPosts) as Post[]);
      if (storedReactions) setReactions(JSON.parse(storedReactions) as ReactionState);
      if (storedComments) setExtraComments(JSON.parse(storedComments) as Record<string, string[]>);
      if (storedShares) setExtraShares(JSON.parse(storedShares) as Record<string, number>);
    } catch (error) {
      console.error("Community state load failed:", error);
    }
  }, []);

  useEffect(() => localStorage.setItem(STORAGE_POSTS, JSON.stringify(posts)), [posts]);
  useEffect(() => localStorage.setItem(STORAGE_REACTIONS, JSON.stringify(reactions)), [reactions]);
  useEffect(() => localStorage.setItem(STORAGE_COMMENTS, JSON.stringify(extraComments)), [extraComments]);
  useEffect(() => localStorage.setItem(STORAGE_SHARES, JSON.stringify(extraShares)), [extraShares]);

  const allPosts = useMemo(() => [...posts, ...seedPosts], [posts, seedPosts]);

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    allPosts.forEach((post) => {
      post.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [allPosts]);

  const feed = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    const filtered = allPosts.filter((post) => {
      if (filter !== "all" && post.type !== filter) return false;
      if (activeTag && !post.tags.includes(activeTag)) return false;
      if (!q) return true;
      return [post.author, post.title, post.body, ...post.tags].join(" ").toLowerCase().includes(q);
    });

    const sorted = [...filtered];
    if (sort === "saved") {
      return sorted
        .filter((post) => reactions.saved[post.id])
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }

    sorted.sort((a, b) => {
      if (sort === "latest") {
        return +new Date(b.createdAt) - +new Date(a.createdAt);
      }

      const score = (post: Post) =>
        post.likes +
        (reactions.liked[post.id] ? 1 : 0) +
        (post.comments + (extraComments[post.id]?.length ?? 0)) * 2 +
        (post.saves + (reactions.saved[post.id] ? 1 : 0)) * 2 +
        (post.shares + (extraShares[post.id] ?? 0));

      return score(b) - score(a);
    });

    return sorted;
  }, [activeTag, allPosts, extraComments, extraShares, filter, keyword, reactions, sort]);

  const relativeTime = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "-";
    const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMinutes < 1) return labels.card.justNow;
    if (diffMinutes < 60) return replaceValue(labels.card.minutesAgo, diffMinutes);
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return replaceValue(labels.card.hoursAgo, hours);
    return replaceValue(labels.card.daysAgo, Math.floor(hours / 24));
  };

  const addQuickTag = (tag: string) => {
    const parsed = parseTags(tagsInput);
    if (parsed.includes(tag)) return;
    setTagsInput([...parsed, tag].map((item) => `#${item}`).join(" "));
  };

  const toggleLike = (postId: string) => {
    setReactions((prev) => ({
      ...prev,
      liked: { ...prev.liked, [postId]: !prev.liked[postId] },
    }));
  };

  const toggleSave = (postId: string) => {
    setReactions((prev) => ({
      ...prev,
      saved: { ...prev.saved, [postId]: !prev.saved[postId] },
    }));
  };

  const handleShare = (postId: string) => {
    setExtraShares((prev) => ({ ...prev, [postId]: (prev[postId] ?? 0) + 1 }));
  };

  const handleComment = (postId: string) => {
    const content = (commentDraft[postId] ?? "").trim();
    if (!content) return;
    setExtraComments((prev) => ({ ...prev, [postId]: [...(prev[postId] ?? []), content] }));
    setCommentDraft((prev) => ({ ...prev, [postId]: "" }));
  };

  const submitPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!body.trim()) {
      window.alert(labels.composer.bodyRequired);
      return;
    }

    const next: Post = {
      id: `post-${Date.now()}`,
      type,
      author: author.trim() || labels.composer.anonymous,
      title: title.trim() || (type === "gear" ? labels.composer.defaultGearTitle : labels.composer.defaultSettingTitle),
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
    setAuthor("");
    setTitle("");
    setBody("");
    setImageUrl("");
    setTagsInput("");
    setGearInput("");
    setDpi("");
    setSens("");
    setAds("");
    setComposerOpen(false);
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <section className="mb-5 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-black text-white md:text-5xl">{labels.title}</h1>
            <p className="text-sm text-wbz-mute">{labels.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-wbz-gold px-4 py-2.5 text-sm font-black text-black"
          >
            <Plus className="h-4 w-4" />
            {labels.createPost}
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-8">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-wbz-card/70 p-3">
            <div className="flex flex-wrap items-center gap-2">
              {([
                ["all", labels.filters.all],
                ["gear", labels.filters.gear],
                ["setting", labels.filters.setting],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setFilter(key);
                    if (key !== "all") setActiveTag("");
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                    filter === key
                      ? "border-wbz-gold bg-wbz-gold text-black"
                      : "border-white/10 bg-white/5 text-wbz-mute"
                  }`}
                >
                  {label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as FeedSort)}
                  className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="latest">{labels.filters.latest}</option>
                  <option value="popular">{labels.filters.popular}</option>
                  <option value="saved">{labels.filters.saved}</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-wbz-mute" />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder={labels.filters.searchPlaceholder}
                  className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white"
                />
              </div>

              {activeTag ? (
                <button
                  onClick={() => setActiveTag("")}
                  className="rounded-full border border-rose-300/40 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-bold text-rose-200"
                >
                  {labels.filters.clearTag} #{activeTag}
                </button>
              ) : null}
            </div>
          </div>

          {feed.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-wbz-card/70 p-10 text-center text-wbz-mute">
              {labels.empty}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {feed.map((post, index) => {
                const liked = Boolean(reactions.liked[post.id]);
                const saved = Boolean(reactions.saved[post.id]);
                const comments = extraComments[post.id] ?? [];
                const shareCount = post.shares + (extraShares[post.id] ?? 0);
                const totalLikeCount = post.likes + (liked ? 1 : 0);
                const totalSaveCount = post.saves + (saved ? 1 : 0);

                return (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="overflow-hidden rounded-xl border border-white/10 bg-wbz-card/90"
                  >
                    {post.imageUrl ? (
                      <div className="relative h-44 w-full overflow-hidden">
                        <Image src={post.imageUrl} alt={post.title} fill className="object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/50 px-2 py-1 text-[11px] font-bold text-white">
                          <Tv className="h-3 w-3 text-wbz-gold" />
                          {post.type === "gear" ? labels.filters.gear : labels.filters.setting}
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-wbz-mute">
                            {post.author} / {relativeTime(post.createdAt)}
                          </p>
                          <h2 className="mt-1 text-lg font-black text-white">{post.title}</h2>
                        </div>
                      </div>

                      <p className="text-sm leading-6 text-zinc-200">{post.body}</p>

                      {post.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {post.tags.map((tag) => (
                            <button
                              key={`${post.id}-${tag}`}
                              onClick={() => setActiveTag(tag)}
                              className="rounded-full border border-wbz-gold/25 bg-wbz-gold/10 px-2.5 py-1 text-[11px] font-bold text-wbz-gold"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {post.type === "gear" && post.gear.length > 0 ? (
                        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                          <div className="mb-2 text-[11px] font-bold text-wbz-mute">{labels.card.loadout}</div>
                          <div className="flex flex-wrap gap-2">
                            {post.gear.map((item) => (
                              <span
                                key={`${post.id}-${item}`}
                                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {post.type === "setting" ? (
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            ["DPI", post.setting.dpi ?? "-"],
                            [labels.composer.sens, post.setting.sens ?? "-"],
                            [labels.composer.ads, post.setting.ads ?? "-"],
                          ].map(([label, value]) => (
                            <div key={`${post.id}-${label}`} className="rounded-xl border border-white/10 bg-black/25 p-3 text-center">
                              <div className="text-[11px] text-wbz-mute">{label}</div>
                              <div className="mt-1 text-base font-black text-white">{value}</div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                        <button
                          onClick={() => toggleLike(post.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                            liked ? "bg-rose-500/15 text-rose-300" : "bg-white/5 text-wbz-mute"
                          }`}
                        >
                          <Heart className="h-3.5 w-3.5" />
                          {labels.card.likes} {totalLikeCount}
                        </button>
                        <button
                          onClick={() => toggleSave(post.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                            saved ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-wbz-mute"
                          }`}
                        >
                          <Bookmark className="h-3.5 w-3.5" />
                          {labels.card.saves} {totalSaveCount}
                        </button>
                        <button
                          onClick={() => handleShare(post.id)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-wbz-mute"
                        >
                          <Send className="h-3.5 w-3.5" />
                          {labels.card.shares} {shareCount}
                        </button>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-wbz-mute">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {labels.card.comments} {post.comments + comments.length}
                        </div>
                      </div>

                      <div className="space-y-2 rounded-xl border border-white/10 bg-black/25 p-3">
                        <div className="flex gap-2">
                          <input
                            value={commentDraft[post.id] ?? ""}
                            onChange={(event) =>
                              setCommentDraft((prev) => ({ ...prev, [post.id]: event.target.value }))
                            }
                            placeholder={labels.card.commentPlaceholder}
                            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
                          />
                          <button
                            onClick={() => handleComment(post.id)}
                            className="rounded-lg bg-wbz-gold px-3 py-2 text-xs font-black text-black"
                          >
                            {labels.card.commentSubmit}
                          </button>
                        </div>

                        {comments.length > 0 ? (
                          <div className="space-y-1">
                            {comments.map((comment, commentIndex) => (
                              <div
                                key={`${post.id}-comment-${commentIndex}`}
                                className="rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-xs text-zinc-200"
                              >
                                {comment}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-wbz-mute">{labels.card.noComments}</div>
                        )}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:col-span-4">
          <div className="rounded-2xl border border-white/10 bg-wbz-card/80 p-4">
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-wbz-gold" />
              <h2 className="text-sm font-black text-white">{labels.quickTagsTitle}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {[...labels.quickTags, ...topTags.map(([tag]) => tag)].slice(0, 12).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(tag)}
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    activeTag === tag
                      ? "border-wbz-gold bg-wbz-gold text-black"
                      : "border-white/10 bg-white/5 text-wbz-mute"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {composerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-white">{labels.composer.title}</h2>
              <button
                onClick={() => setComposerOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-wbz-mute"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitPost} className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {([
                  ["gear", labels.composer.gear],
                  ["setting", labels.composer.setting],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                      type === key
                        ? "border-wbz-gold bg-wbz-gold text-black"
                        : "border-white/10 bg-white/5 text-wbz-mute"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                  placeholder={labels.composer.author}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                />
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={labels.composer.titleField}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                />
              </div>

              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={labels.composer.body}
                rows={5}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              />

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder={labels.composer.imageUrl}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                />
                <input
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder={labels.composer.tags}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                />
              </div>

              {type === "gear" ? (
                <textarea
                  value={gearInput}
                  onChange={(event) => setGearInput(event.target.value)}
                  placeholder={labels.composer.gearList}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    value={dpi}
                    onChange={(event) => setDpi(event.target.value)}
                    placeholder={labels.composer.dpi}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  />
                  <input
                    value={sens}
                    onChange={(event) => setSens(event.target.value)}
                    placeholder={labels.composer.sens}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  />
                  <input
                    value={ads}
                    onChange={(event) => setAds(event.target.value)}
                    placeholder={labels.composer.ads}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {[...labels.quickTags, ...topTags.map(([tag]) => tag)].slice(0, 10).map((tag) => (
                  <button
                    key={`quick-${tag}`}
                    type="button"
                    onClick={() => addQuickTag(tag)}
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold text-wbz-mute"
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white"
                >
                  {labels.composer.cancel}
                </button>
                <button type="submit" className="rounded-xl bg-wbz-gold px-4 py-2 text-sm font-black text-black">
                  {labels.composer.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
