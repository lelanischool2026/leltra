"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getCachedSession, clearSessionCache } from "@/lib/session-cache";
import { useRouter, usePathname } from "next/navigation";
import { Profile } from "@/lib/types";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const checkUser = useCallback(async () => {
    try {
      // Use cached session for instant loading
      const session = await getCachedSession();

      if (!session.user) {
        router.push("/auth/login");
        return;
      }

      if (!session.profile) {
        clearSessionCache();
        await supabase.auth.signOut();
        router.push("/auth/login");
        return;
      }

      setProfile(session.profile);
      setLoading(false);
    } catch (error) {
      console.error("Auth error:", error);
      router.push("/auth/login");
    }
  }, [router]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const handleLogout = async () => {
    clearSessionCache();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const getNavItems = () => {
    if (!profile) return [];

    switch (profile.role) {
      case "teacher":
        return [
          { href: "/dashboard/teacher", label: "Dashboard", icon: "🏠" },
          { href: "/reports/new", label: "New Report", icon: "📝" },
          { href: "/reports/history", label: "My Reports", icon: "📚" },
        ];
      case "headteacher":
        return [
          { href: "/dashboard/headteacher", label: "Dashboard", icon: "🏠" },
          { href: "/reports/history", label: "All Reports", icon: "📚" },
        ];
      case "director":
        return [
          { href: "/dashboard/director", label: "Dashboard", icon: "🏠" },
          { href: "/reports/history", label: "All Reports", icon: "📚" },
        ];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-primary animate-spin" />
          </div>
          <p className="text-gray-500 text-sm font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href={navItems[0]?.href || "/dashboard/teacher"}
                className="flex items-center gap-2"
                prefetch={true}
              >
                <img
                  src="/lslogo.png"
                  alt="Lelani School"
                  className="h-8 w-8 sm:h-10 sm:w-10"
                />
                <h1 className="text-lg sm:text-xl font-bold">LSDRAS</h1>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-1 ml-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? "bg-accent text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    {item.icon} {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-xs sm:text-sm text-gray-300">
                {profile?.full_name}
              </span>
              <span className="hidden lg:inline-block px-2 py-1 bg-gray-700 rounded text-xs capitalize">
                {profile?.role}
              </span>
              <button
                onClick={handleLogout}
                className="hidden sm:block bg-accent hover:bg-accent-dark px-3 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium transition-colors"
              >
                Logout
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-gray-300 hover:text-white p-2"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-800 border-t border-gray-700">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-3 rounded-md text-base font-medium ${
                    pathname === item.href
                      ? "bg-accent text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {item.icon} {item.label}
                </Link>
              ))}
              <div className="border-t border-gray-700 pt-3 mt-3">
                <div className="px-3 py-2 text-gray-400 text-sm">
                  {profile?.full_name} ({profile?.role})
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-3 text-accent hover:bg-gray-700 rounded-md font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}
