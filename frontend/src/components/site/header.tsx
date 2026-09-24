"use client";

import { Menu, ChevronDown, Radio } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { usePathname } from "next/navigation";

// ─── Navigation Config ───────────────────────────────────────────────────────
const navConfig = [
  {
    name: "Beyond Campus",
    url: "/category/beyond-campus",
    children: [
      { name: "Current Affairs",             url: "/category/current-affairs" },
      { name: "Entertainment & Lifestyle Feature", url: "/category/entertainment-lifestyle-feature" },
      { name: "Sports",                      url: "/category/sports" },
    ],
  },
  { name: "Campus Buzz",     url: "/category/campus-buzz" },
  { name: "Social Buzz",     url: "/category/social-buzz" },
  { name: "MR TV",           url: "/category/mr-tv" },
  { name: "MR Podcast",      url: "/category/mr-podcast" },
  { name: "Student Voices",  url: "/category/students-voices" },
  { name: "Photo Gallery",   url: "/category/photo-gallery" },
  { name: "Announcements",   url: "/category/announcement" },
  { name: "About Us",        url: "/about" },
  { name: "Contact",         url: "/contact" },
];

// ─── Desktop Dropdown Item ────────────────────────────────────────────────────
function DropdownNavItem({
  item,
}: {
  item: (typeof navConfig)[0];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] lg:text-[11px] font-black uppercase tracking-normal text-zinc-900 hover:text-primary transition-all relative group py-1"
      >
        {item.name}
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180 text-primary" : ""}`}
        />
        <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-primary transition-all duration-300 group-hover:w-full" />
      </button>

      {open && item.children && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-950 border border-zinc-800 shadow-2xl rounded-sm py-2 z-50 animate-in fade-in duration-150">
          {item.children.map((child) => (
            <Link
              key={child.name}
              href={child.url}
              onClick={() => setOpen(false)}
              className="block px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-white hover:bg-zinc-900/80 transition-all border-b border-zinc-900/60 last:border-0"
            >
              › {child.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mobile Collapsible Item ──────────────────────────────────────────────────
function MobileCollapsibleItem({ item }: { item: (typeof navConfig)[0] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-zinc-900/60">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-zinc-900 text-zinc-300 hover:text-primary transition-all text-left"
      >
        {item.name}
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180 text-primary" : ""}`}
        />
      </button>
      {open && item.children && (
        <div className="bg-zinc-950 border-t border-zinc-900/60">
          {item.children.map((child) => (
            <SheetClose key={child.name} asChild>
              <Link
                href={child.url}
                className="block pl-10 pr-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-primary hover:bg-zinc-900 transition-all"
              >
                › {child.name}
              </Link>
            </SheetClose>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Breaking News Marquee Ticker Component ──────────────────────────────────
function BreakingNewsTicker() {
  const [headlines, setHeadlines] = useState<any[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  const getApiBase = () => {
    if (typeof window !== 'undefined') return '/api/v1';
    if (process.env.INTERNAL_API_URL) return `${process.env.INTERNAL_API_URL}/api/v1`;
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    return 'http://127.0.0.1:8081/api/v1';
  };

  const checkSettings = () => {
    // 1. Check local storage first
    try {
      const saved = localStorage.getItem('mrt_newsroom_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.enableBreakingTicker === 'boolean') {
          setEnabled(parsed.enableBreakingTicker);
        }
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Fetch live settings from PostgreSQL DB API
    const apiBase = getApiBase();
    fetch(`${apiBase}/settings`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data) {
          const val = resData.data.enableBreakingTicker;
          if (val !== undefined) {
            const isEnabled = val === 'true' || val === true;
            setEnabled(isEnabled);
          }
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    setMounted(true);
    checkSettings();

    const handleSettingsChange = () => checkSettings();
    window.addEventListener('mrt_settings_changed', handleSettingsChange);
    window.addEventListener('storage', handleSettingsChange);

    fetch('/api/v1/news?pageSize=100&status=published')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data.data) ? data.data : [];
        const nonGallery = list.filter((n: any) => {
          if (n.status !== 'published') return false;
          const catSlug = n.category?.slug || '';
          const catName = n.category?.name || '';
          return (
            catSlug !== 'photo-gallery' &&
            catSlug !== 'gallery' &&
            !catName.toLowerCase().includes('gallery')
          );
        });

        const breakingItems = nonGallery.filter((n: any) => n.is_breaking === true || n.isBreaking === true);
        setHeadlines(breakingItems);
      })
      .catch(console.error);

    return () => {
      window.removeEventListener('mrt_settings_changed', handleSettingsChange);
      window.removeEventListener('storage', handleSettingsChange);
    };
  }, []);

  if (!mounted || !enabled || headlines.length === 0) return null;

  return (
    <div className="w-full bg-zinc-950 border-y border-red-900/40 text-white h-9 flex items-center overflow-hidden relative shadow-inner z-20">
      {/* Fixed Left Badge */}
      <div className="bg-gradient-to-r from-red-700 via-red-600 to-rose-600 px-4 h-full flex items-center gap-2 font-black text-[10px] sm:text-xs uppercase tracking-widest text-white shadow-md z-30 shrink-0 select-none">
        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
        <Radio className="w-3.5 h-3.5 text-white" />
        <span>Latest News</span>
      </div>

      {/* Marquee Container */}
      <div className="flex-1 overflow-hidden relative flex items-center h-full">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-8 pl-4 hover:[animation-play-state:paused]">
          {headlines.length > 0 ? (
            headlines.map((item, idx) => (
              <Link
                key={item.id || idx}
                href={`/article/${item.slug || item.id}`}
                className="inline-flex items-center gap-3 text-xs font-bold text-zinc-200 hover:text-red-400 transition-colors"
              >
                <span>{item.title}</span>
                <span className="text-red-600 font-mono text-[10px]">✦</span>
              </Link>
            ))
          ) : (
            <span className="text-xs font-medium text-zinc-400">
              Manav Rachna Times — The Official Voice of School of Media Studies & Humanities (SMeH) ✦ Stay Tuned for Live Campus & Global News Updates
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Header Component ────────────────────────────────────────────────────
export function SiteHeader() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/login")) return null;

  return (
    <div className="w-full flex flex-col bg-white border-b border-zinc-200 sticky top-0 z-50 md:static">
      {/* Global Black Bar - Centered Elite Branding */}
      <div className="w-full bg-black text-white h-28 xs:h-32 md:h-44 flex items-center px-3 sm:px-6 md:px-8 relative shadow-2xl overflow-hidden">
        {/* Centered Professional Masthead & Publication Date */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex flex-col items-center justify-center z-10 px-2">
          {/* Logo Link - Sized for zero overlap on all mobile screens */}
          <Link href="/" className="flex items-center justify-center group relative z-10">
            <div className="relative w-[160px] h-[50px] xs:w-[210px] xs:h-[65px] sm:w-[380px] sm:h-[95px] md:w-[580px] md:h-[132px] transform group-hover:scale-[1.02] transition-transform duration-300">
              <Image
                src="/new_logo.png"
                alt="Manav Rachna Times Logo"
                fill
                className="object-contain object-center"
                sizes="(max-width: 480px) 210px, (max-width: 768px) 380px, 580px"
                priority
                unoptimized
              />
            </div>
          </Link>

          {/* Centered Newspaper Date Banner BELOW Logo */}
          <div className="text-[8px] xs:text-[9.5px] sm:text-xs font-black uppercase tracking-[0.15em] xs:tracking-[0.2em] sm:tracking-[0.25em] text-zinc-300 relative z-30 pt-0.5 sm:pt-1 flex items-center gap-1 sm:gap-2 select-none drop-shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block shadow-[0_0_6px_#dc2626]" />
            <span>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block shadow-[0_0_6px_#dc2626]" />
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 sm:gap-4 z-20 absolute right-2.5 sm:right-6 top-1/2 -translate-y-1/2">
          {/* Mobile Hamburger */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <button className="p-1.5 xs:p-2 text-zinc-300 hover:text-white transition-colors cursor-pointer rounded-xl bg-zinc-900/90 border border-zinc-800/90 backdrop-blur-md shadow-md active:scale-95" aria-label="Open Navigation Menu">
                  <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-black text-white border-none p-0 w-[85vw] max-w-[320px] shadow-2xl flex flex-col h-[100dvh]">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Main site navigation menu drawer</SheetDescription>

                {/* Side Drawer Branding */}
                <div className="p-8 border-b border-zinc-900 bg-zinc-950 flex flex-col items-center gap-5 shrink-0">
                  <div className="flex items-center justify-center w-[220px] h-[90px] relative">
                    <Image
                      src="/new_logo.png"
                      alt="logo"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="h-0.5 w-12 bg-primary" />
                </div>

                {/* Scrollable Navigation Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden pt-4 pb-20 no-scrollbar overscroll-contain" data-lenis-prevent="true">
                  <div className="flex flex-col">
                    {navConfig.map((item) =>
                      item.children ? (
                        <MobileCollapsibleItem key={item.name} item={item} />
                      ) : (
                        <SheetClose key={item.name} asChild>
                          <Link
                            href={item.url}
                            className="px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] border-b border-zinc-900/60 hover:bg-zinc-900 text-zinc-300 hover:text-primary transition-all text-left"
                          >
                            {item.name}
                          </Link>
                        </SheetClose>
                      )
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Primary Navigation Hub */}
      <nav className="hidden md:block w-full bg-white border-b border-zinc-200 py-3 px-6 overflow-visible">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-center gap-x-5 lg:gap-x-8 gap-y-1">
            {navConfig.map((item) =>
              item.children ? (
                <DropdownNavItem key={item.name} item={item} />
              ) : (
                <Link
                  key={item.name}
                  href={item.url}
                  className="text-[10px] lg:text-[11px] font-black uppercase tracking-normal text-zinc-900 hover:text-primary transition-all whitespace-nowrap relative group"
                >
                  {item.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-primary transition-all duration-300 group-hover:w-full" />
                </Link>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Breaking News Marquee Ticker */}
      <BreakingNewsTicker />
    </div>
  );
}
