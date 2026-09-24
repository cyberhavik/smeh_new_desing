"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, Youtube, PlayCircle, Tag, User, Download, Images, Maximize2 } from "lucide-react";
import { LightboxModal, LightboxImage } from "@/components/Gallery/LightboxModal";

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return ''; // Browser uses relative URLs via nginx
  if (process.env.INTERNAL_API_URL) return process.env.INTERNAL_API_URL; // SSR: direct to backend
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  return 'http://127.0.0.1:8081'; // fallback for SSR
};
const API_BASE_URL = getBaseUrl();

interface RawArticle {
  id: string;
  _id?: string;
  title?: string;
  headline?: string;
  content?: string;
  description?: string;
  image?: string;
  image_url?: string;
  imageUrl?: string;
  youtube_url?: string;
  youtubeUrl?: string;
  published_at?: string;
  publishedAt?: string;
  created_at?: string;
  createdAt?: string;
  category?: any;
  title_font?: string;
  excerpt_font?: string;
  content_font?: string;
  author_name?: string;
  author?: {
    email?: string;
    name?: string;
    username?: string;
  };
  thumbnail?: {
    file_path?: string;
  };
  images?: Array<{
    id: string;
    media?: {
      id?: string;
      file_path?: string;
      original_name?: string;
    };
  }>;
  document?: {
    file_path?: string;
    original_name?: string;
  };
}

function getYouTubeId(url: string | null | undefined) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function getImageUrl(url: string | null | undefined) {
  if (!url || url === "undefined" || url === "") return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return url;
  if (url.startsWith('uploads/')) return `/${url}`;
  return `/uploads/${url}`;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
}

function resolveCategoryName(cat: any) {
  if (!cat) return "General";
  if (typeof cat === "string") return cat;
  if (typeof cat === "object") return cat.name || "General";
  return "General";
}

export default function ArticlePage() {
  const { id } = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<RawArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    async function loadArticle() {
      try {
        // Try slug first
        let r = await fetch(`${API_BASE_URL}/api/v1/news/slug/${id}`, { cache: "no-store" });
        if (!r.ok) {
          // If slug returns 404, fallback to ID lookup
          r = await fetch(`${API_BASE_URL}/api/v1/news/${id}`, { cache: "no-store" });
        }
        if (!r.ok) {
          setArticle(null);
          setLoading(false);
          return;
        }
        const data = await r.json();
        const actualArticle = data.data && data.success !== undefined ? data.data : data;
        setArticle(actualArticle);
      } catch (e) {
        setError("Could not load this photo album or article.");
      } finally {
        setLoading(false);
      }
    }

    loadArticle();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-14 h-14 bg-zinc-200 rounded-full" />
        <div className="h-3 w-40 bg-zinc-100 rounded" />
        <div className="h-2 w-24 bg-zinc-50 rounded" />
      </div>
    </div>
  );

  if (error || !article) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-zinc-500 bg-white px-4">
      <div className="text-center space-y-2 max-w-md">
        <Images className="w-12 h-12 mx-auto text-zinc-300 stroke-[1.5]" />
        <p className="text-xl font-extrabold uppercase text-zinc-800 tracking-tight">{error || "Photo Album or Article Not Found"}</p>
        <p className="text-xs text-zinc-500">The requested album or content is currently unavailable or may have been removed.</p>
      </div>
      <button onClick={() => router.back()} className="mt-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs transition">
        ← Return to Gallery / Previous Page
      </button>
    </div>
  );

  const categoryName = resolveCategoryName(article.category);
  const isGalleryCategory = categoryName.toLowerCase().includes("gallery") || categoryName.toLowerCase().includes("photo");
  const imgSrc = getImageUrl(article.thumbnail?.file_path || article.image_url || article.image || article.imageUrl);
  const ytId = getYouTubeId(article.youtube_url || article.youtubeUrl);
  const publishedDate = formatDate(article.published_at || article.created_at);
  const authorEmail = article.author?.email || "";
  const authorName = article.author_name || article.author?.name || article.author?.username || article.author?.email || 'MRT Bureau';

  // Build Lightbox album photos
  const albumPhotos: LightboxImage[] = [];
  if (Array.isArray(article.images) && article.images.length > 0) {
    article.images.forEach((imgItem: any, idx: number) => {
      const rawPath = imgItem.media?.file_path || imgItem.media?.path_large || imgItem.media?.path_webp || imgItem.file_path || imgItem.path;
      const url = getImageUrl(rawPath);
      if (url) {
        albumPhotos.push({
          src: url,
          title: `${article.title} - Photo ${idx + 1}`,
          originalName: imgItem.media?.original_name || `photo-${idx + 1}.jpg`
        });
      }
    });
  }
  // Fallback to main cover image if images array is empty and valid cover exists
  if (albumPhotos.length === 0 && imgSrc && !imgSrc.includes('/new_logo.png') && !imgSrc.includes('/placeholder-news.jpg')) {
    albumPhotos.push({
      src: imgSrc,
      title: article.title,
      originalName: "cover.jpg"
    });
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="bg-white min-h-screen">
      <main className="container mx-auto px-4 md:px-8 py-8 max-w-5xl">

        {/* Breadcrumb / Back */}
        <div className="flex items-center gap-2 mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wider text-zinc-400 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <span className="text-zinc-200">|</span>
          <span className="text-[12px] font-black uppercase tracking-wider text-primary flex items-center gap-1">
            <Tag className="w-3 h-3" /> {categoryName}
          </span>
        </div>

        {/* Article Header */}
        <div className="mb-8 border-b border-zinc-100 pb-8">
          <h1 
            className="text-3xl md:text-5xl font-black leading-tight tracking-tight mb-6 text-zinc-950"
            style={article.title_font ? { fontFamily: article.title_font } : undefined}
          >
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-[12px] text-zinc-400 font-bold">
            {publishedDate && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> {publishedDate}
              </span>
            )}
            <span className="px-2.5 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-sm">
              {categoryName}
            </span>
            {authorName && (
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> {authorName}
              </span>
            )}
            {isGalleryCategory && (
              <span className="flex items-center gap-1.5 text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                <Images className="w-3.5 h-3.5" /> {albumPhotos.length} Photos in Album
              </span>
            )}
          </div>
        </div>

        {/* 🖼️ Dedicated Photo Gallery Album Layout */}
        {isGalleryCategory ? (
          <div className="mb-12 space-y-8">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900 flex items-center gap-2">
                <Images className="w-5 h-5 text-red-600" /> Photo Album Grid
              </h2>
              <span className="text-xs font-mono text-zinc-400">Click any photo for Fullscreen & Download</span>
            </div>

            {/* Bento / Responsive Grid of Album Photos */}
            {albumPhotos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 auto-rows-[220px] sm:auto-rows-[250px] md:auto-rows-[280px]">
                {albumPhotos.map((photo, index) => {
                  return (
                    <div
                      key={index}
                      onClick={() => openLightbox(index)}
                      className="group relative overflow-hidden rounded-xl bg-zinc-900 border border-zinc-200 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                    >
                      <img
                        src={photo.src}
                        alt={photo.title || `Photo ${index + 1}`}
                        onError={(e) => {
                          if (!e.currentTarget.src.includes('/placeholder-news.jpg')) {
                            e.currentTarget.srcset = '';
                            e.currentTarget.src = '/placeholder-news.jpg';
                          }
                        }}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                        <span className="bg-zinc-900/90 text-white font-semibold text-xs px-4 py-2 rounded-full border border-white/20 shadow-2xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all group-hover:border-red-500/80 group-hover:bg-red-600">
                          <Maximize2 className="w-3.5 h-3.5 text-white" /> Expand Fullscreen
                        </span>
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-mono px-2 py-0.5 rounded">
                        #{index + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center text-zinc-400 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl space-y-2">
                <Images className="w-12 h-12 mx-auto text-zinc-300 stroke-[1.5]" />
                <p className="text-base font-extrabold uppercase text-zinc-700 tracking-wide">No Images Available in this Album</p>
                <p className="text-xs text-zinc-500">No photos have been uploaded to this album collection yet.</p>
              </div>
            )}
          </div>
        ) : (
          /* Lead Image for Standard Articles */
          imgSrc && (
            <div className="relative w-full aspect-[21/9] md:aspect-video overflow-hidden bg-zinc-50 mb-10 rounded-xl shadow-sm border border-zinc-100">
              <Image src={imgSrc} alt={article.title || article.headline || 'Untitled'} fill className="object-cover" priority unoptimized={true} onError={(e) => { if (!e.currentTarget.src.includes('/new_logo.png')) { e.currentTarget.srcset = ''; e.currentTarget.src = '/new_logo.png'; } }} />
            </div>
          )
        )}

        {/* YouTube Embed — shown above body when video exists */}
        {ytId && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <PlayCircle className="w-5 h-5 text-red-600" />
              <span className="text-[13px] font-black uppercase tracking-wider text-zinc-700">Watch Video</span>
            </div>
            <div className="relative w-full aspect-video overflow-hidden bg-zinc-900">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                title={article.title || article.headline || 'Untitled'}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
            <a
              href={`https://www.youtube.com/watch?v=${ytId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-black text-red-600 hover:text-red-700"
            >
              <Youtube className="w-3.5 h-3.5" /> Open on YouTube
            </a>
          </div>
        )}

        {/* Document Inline Viewer */}
        {article.document && article.document.file_path && (() => {
          const docUrl = `/uploads/${article.document.file_path}`;
          const isPdf = article.document.file_path.toLowerCase().endsWith('.pdf');
          const fullUrl = typeof window !== 'undefined'
            ? `${window.location.origin}${docUrl}`
            : docUrl;
          return (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-black uppercase tracking-wider text-zinc-400">
                  {article.document.original_name || 'Document'}
                </h3>
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-zinc-600 transition"
                >
                  <Download className="w-3 h-3" /> Open in new tab
                </a>
              </div>
              {isPdf ? (
                <div className="w-full" style={{ height: '80vh' }}>
                  <iframe
                    src={`${docUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                    className="w-full h-full"
                    title={article.document.original_name || 'Document'}
                    style={{ border: 'none', display: 'block' }}
                  />
                </div>
              ) : (
                <div className="w-full" style={{ height: '80vh' }}>
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(fullUrl)}&embedded=true`}
                    className="w-full h-full"
                    title={article.document.original_name || 'Document'}
                    style={{ border: 'none', display: 'block' }}
                  />
                </div>
              )}
            </div>
          );
        })()}

        {/* Article Body — render full HTML from rich editor */}
        {article.content && (
          <div
            className="prose prose-zinc max-w-none text-[16px] leading-loose text-justify [&_p]:text-justify [&_div]:text-justify [&_li]:text-justify"
            style={article.content_font ? { fontFamily: article.content_font } : undefined}
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">
            Manav Rachna Times — {categoryName}
          </span>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-wider text-primary hover:underline"
          >
            <ArrowLeft className="w-3 h-3" /> Back to {categoryName}
          </button>
        </div>

        {/* 🖼️ Fullscreen Interactive Lightbox Modal */}
        <LightboxModal
          images={albumPhotos}
          currentIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(index) => setLightboxIndex(index)}
        />

      </main>
    </div>
  );
}