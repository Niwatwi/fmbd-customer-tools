"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  RefreshCcw,
  FileSpreadsheet,
  Save,
  ShieldCheck,
  FileText,
  Home,
  Search,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  MessageSquare,
  Send,
  Clock,
  Store,
} from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { supabase } from "../../../lib/supabase";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false },
);

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface DashboardItem {
  id: string;
  visit_id: string;
  barcode: string;
  category: string;
  sub_category?: string;
  brand: string;
  sub_brand?: string;
  oos_reason: string;
  product_image_url: string | null;
  company: string;
  price_tag_image: string | null;
  shelf_image: string | null;
  cma_image: string | null;
  action_plan: string | null;
  expected_delivery_date: string | null;
  created_at: string;
  date_key: string;
  auditor: string;
  area: string;
  store_name: string;
  store_code: string;
  chanel: string;
  account: string;
  province: string;
  region: string;
  descriptions: string | null;
  status: string;
}

interface CustomerCommentRow {
  id: number;
  created_at: string;
  store_name: string;
  customer_name: string;
  comment_text: string;
  auditor_reply: string | null;
  admin_reply: string | null;
  status: "pending" | "auditor_replied" | "admin_intervened";
}

const COMPANY_CONFIG: Record<
  string,
  { name: string; fullName: string; dbCompany: string; logo: string }
> = {
  rvp: {
    name: "RVP",
    fullName: "Riverpro Pulp&Paper Co., Ltd",
    dbCompany: "RVP",
    logo: "/rvp.png",
  },
  loxley: {
    name: "LOXLEY",
    fullName: "Loxley Public Company Limited",
    dbCompany: "Loxley",
    logo: "/loxley.png",
  },
  kewpie: {
    name: "KEWPIE",
    fullName: "Kewpie Corporation",
    dbCompany: "Kewpie",
    logo: "/kewpie.png",
  },
};

const TARGET_REASONS = [
  "สินค้าขาดหน้าร้าน มีสต๊อก",
  "สินค้าขาด ไม่มีออเดอร์",
  "สินค้าขาด สต๊อกลม",
  "สินค้าขาด มีออเดอร์",
];

const COLORS = [
  "#1e3a8a",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];
const BAR_COLORS = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#6366f1"];

const sanitizeOosReason = (reason: string | null): string => {
  if (!reason) return "-";
  const clean = reason.trim();
  if (clean.includes("มีสต๊อก") || clean.includes("มีสต็อก"))
    return "สินค้าขาดหน้าร้าน มีสต๊อก";
  if (clean.includes("สต๊อกลม") || clean.includes("สต็อกลม"))
    return "สินค้าขาด สต๊อกลม";
  if (clean.includes("สินค้าขาด")) {
    if (clean.includes("ไม่") || clean.includes("ไม่มี"))
      return "สินค้าขาด ไม่มีออเดอร์";
    if (
      clean.includes("มี") ||
      clean.includes("เดอร์") ||
      clean.includes("ออเดอร์")
    )
      return "สินค้าขาด มีออเดอร์";
  }
  return clean;
};

export default function CompanyExecutiveDashboard() {
  const params = useParams();
  const router = useRouter();

  const [companyKey, setCompanyKey] = useState("rvp");

  const config = useMemo(() => {
    const key =
      companyKey && typeof companyKey === "string" ? companyKey : "rvp";
    const safeKey = key.toLowerCase();
    return COMPANY_CONFIG[safeKey] || COMPANY_CONFIG.rvp;
  }, [companyKey]);

  const [isMounted, setIsMounted] = useState(false);
  const [data, setData] = useState<DashboardItem[]>([]);
  const [chartDataSrc, setChartDataSrc] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [totalStoreVisits, setTotalStoreVisits] = useState(0);
  const [sessionResolvedCount, setSessionResolvedCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [tempActions, setTempActions] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentTime, setCurrentTime] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");

  const [filters, setFilters] = useState({
    date: "",
    month: "",
    year: "",
    area: "",
    account: "",
    province: "",
    reason: "",
    status: "",
    barcode: "",
    brand: "",
    sub_brand: "",
    category: "",
    sub_category: "",
  });

  const [customerComments, setCustomerComments] = useState<
    CustomerCommentRow[]
  >([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [selectedCommentStore, setSelectedCommentStore] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentRefreshTrigger, setCommentRefreshTrigger] = useState(0);

  useEffect(() => {
    const storedUser = localStorage.getItem("customer_username");
    if (!storedUser) {
      router.replace("/login");
      return;
    }

    const rawCompany = params?.company;
    if (rawCompany) {
      const companyStr = Array.isArray(rawCompany) ? rawCompany[0] : rawCompany;
      setCompanyKey(companyStr.toLowerCase());
    } else {
      const stored = localStorage.getItem("company") || "rvp";
      setCompanyKey(stored.toLowerCase());
    }
  }, [params?.company, router]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleString("th-TH", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " น.",
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // คิวรีชุดที่ 1: ดึงสถิติกราฟ
  useEffect(() => {
    let active = true;
    async function fetchChartSummary() {
      if (!config.dbCompany) return;

      const { data: summary, error } = await supabase
        .from("mv_executive_chart_summary")
        .select("*")
        .eq("company", config.dbCompany);

      if (active && !error && summary) {
        setChartDataSrc(summary);
      }
    }
    fetchChartSummary();
    return () => {
      active = false;
    };
  }, [config.dbCompany, refreshTrigger]);

  // คิวรีชุดพิเศษ: ดึงยอดสถิติการเข้าเยี่ยมร้านจริง
  useEffect(() => {
    let active = true;
    async function fetchTotalVisitsCount() {
      if (!config.dbCompany) return;

      let query = supabase
        .from("store_visits")
        .select(
          "id, oos_items!inner(company, brand, category, oos_reason, action_plan)",
          { count: "exact", head: true },
        );

      if (config.dbCompany === "RVP") {
        query = query.or("company.eq.RVP,company.eq.RIVERPRO", {
          foreignTable: "oos_items",
        });
      } else {
        query = query.eq("oos_items.company", config.dbCompany);
      }

      if (filters.area) query = query.eq("area", filters.area);
      if (filters.account) query = query.eq("account", filters.account);
      if (filters.province) query = query.eq("province", filters.province);
      if (filters.brand) query = query.eq("oos_items.brand", filters.brand);
      if (filters.category)
        query = query.eq("oos_items.category", filters.category);

      if (filters.date) {
        query = query.eq("date_key", filters.date);
      } else {
        const activeYear = filters.year || "2026";
        if (filters.month) {
          const startDate = `${activeYear}-${filters.month}-01`;
          const lastDay = new Date(
            parseInt(activeYear),
            parseInt(filters.month),
            0,
          ).getDate();
          const endDate = `${activeYear}-${filters.month}-${lastDay}`;
          query = query.gte("date_key", startDate).lte("date_key", endDate);
        } else if (filters.year) {
          query = query
            .gte("date_key", `${activeYear}-01-01`)
            .lte("date_key", `${activeYear}-12-31`);
        }
      }

      if (filters.reason) {
        if (filters.reason === "สินค้าขาด มีออเดอร์") {
          query = query.ilike("oos_items.oos_reason", "%มี%ออเดอร์%");
        } else if (filters.reason === "สินค้าขาด ไม่มีออเดอร์") {
          query = query.ilike("oos_items.oos_reason", "%ไม่มี%ออเดอร์%");
        } else {
          query = query.eq("oos_items.oos_reason", filters.reason);
        }
      }
      if (filters.status) {
        query = query.eq("oos_items.status", filters.status);
      }

      const { count, error } = await query;
      if (active && !error && count !== null) {
        setTotalStoreVisits(count);
      }
    }
    fetchTotalVisitsCount();
    return () => {
      active = false;
    };
  }, [config.dbCompany, filters, refreshTrigger]);

  // คิวรีชุดที่ 2: ดึงสดผูกมิติร้านค้าความเร็วสูงแบบแบ่งหน้า
  useEffect(() => {
    let active = true;
    async function fetchTableData() {
      if (!config.dbCompany) return;
      setLoading(true);

      let query = supabase.from("oos_items").select(
        `
          id, visit_id, barcode, category, brand, oos_reason, product_image_url,
          company, price_tag_image, shelf_image, cma_image, action_plan,
          expected_delivery_date, descriptions, created_at, status,
          store_visits!inner (
            date_key, auditor, area, store_name, store_code, chanel, account, province, region
          )
        `,
        { count: "exact" },
      );

      if (config.dbCompany === "RVP") {
        query = query.or("company.eq.RVP,company.eq.RIVERPRO");
      } else {
        query = query.eq("company", config.dbCompany);
      }

      if (filters.area) query = query.eq("store_visits.area", filters.area);
      if (filters.account)
        query = query.eq("store_visits.account", filters.account);
      if (filters.province)
        query = query.eq("store_visits.province", filters.province);
      if (filters.brand) query = query.eq("brand", filters.brand);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.barcode) query = query.eq("barcode", filters.barcode);

      if (filters.date) {
        query = query.eq("store_visits.date_key", filters.date);
      } else {
        const activeYear = filters.year || "2026";
        if (filters.month) {
          const startDate = `${activeYear}-${filters.month}-01`;
          const lastDay = new Date(
            parseInt(activeYear),
            parseInt(filters.month),
            0,
          ).getDate();
          const endDate = `${activeYear}-${filters.month}-${lastDay}`;
          query = query
            .gte("store_visits.date_key", startDate)
            .lte("store_visits.date_key", endDate);
        } else if (filters.year) {
          query = query
            .gte("store_visits.date_key", `${activeYear}-01-01`)
            .lte("store_visits.date_key", `${activeYear}-12-31`);
        }
      }

      if (filters.reason) {
        if (filters.reason === "สินค้าขาด มีออเดอร์") {
          query = query.ilike("oos_reason", "%มี%ออเดอร์%");
        } else if (filters.reason === "สินค้าขาด ไม่มีออเดอร์") {
          query = query.ilike("oos_reason", "%ไม่มี%ออเดอร์%");
        } else {
          query = query.eq("oos_reason", filters.reason);
        }
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (globalSearch) {
        query = query.or(
          `descriptions.ilike.%${globalSearch}%,brand.ilike.%${globalSearch}%,store_visits.store_name.ilike.%${globalSearch}%`,
        );
      }

      const start = (currentPage - 1) * itemsPerPage;
      const end = currentPage * itemsPerPage - 1;
      query = query.order("created_at", { ascending: false }).range(start, end);

      const { data: list, count, error } = await query;

      if (active) {
        if (!error && list) {
          const mappedList = list.map((item: any) => ({
            ...item,
            date_key: item.store_visits?.date_key,
            auditor: item.store_visits?.auditor,
            area: item.store_visits?.area,
            store_name: item.store_visits?.store_name,
            store_code: item.store_visits?.store_code,
            chanel: item.store_visits?.chanel,
            account: item.store_visits?.account,
            province: item.store_visits?.province,
            region: item.store_visits?.region,
            oos_reason: sanitizeOosReason(item.oos_reason),
            company: item.company,
          }));

          setData(mappedList as DashboardItem[]);
          setTotalRows(count || 0);
        } else if (error) {
          console.error("Table query error:", error);
        }
        setLoading(false);
      }
    }
    fetchTableData();
    return () => {
      active = false;
    };
  }, [config.dbCompany, filters, globalSearch, currentPage, refreshTrigger]);

  // 🟢 จุดแก้ไขหลัก: แก้ไขโครงสร้าง Cascading Filter ทั้ง Brand และ Category ให้สัมพันธ์กัน
  const dropdownOptions = useMemo(() => {
    const dates = new Set<string>();
    const months = new Set<string>();
    const years = new Set<string>();
    const areas = new Set<string>();
    const accounts = new Set<string>();
    const provinces = new Set<string>();
    const reasons = new Set<string>();
    const brands = new Set<string>();
    const categories = new Set<string>();

    chartDataSrc.forEach((item) => {
      if (!item) return;
      if (item.date_key) {
        dates.add(item.date_key);
        const parts = item.date_key.split("-");
        if (parts[0]) years.add(parts[0]);
        if (parts[1]) months.add(parts[1]);
      }
      if (item.area) areas.add(item.area);
      if (item.account) accounts.add(item.account);
      if (item.province) provinces.add(item.province);
      if (item.oos_reason) reasons.add(sanitizeOosReason(item.oos_reason));

      // 1. จัดการตัวเลือกในกล่อง Brand (ยึดตาม Category ที่เลือก)
      if (filters.category) {
        if (item.category === filters.category && item.brand) {
          brands.add(item.brand);
        }
      } else {
        if (item.brand) brands.add(item.brand);
      }

      // 2. จัดการตัวเลือกในกล่อง Category (ยึดตาม Brand ที่เลือก)
      if (filters.brand) {
        if (item.brand === filters.brand && item.category) {
          categories.add(item.category);
        }
      } else {
        if (item.category) categories.add(item.category);
      }
    });

    return {
      dates: Array.from(dates).sort().reverse(),
      months: Array.from(months).sort(),
      years: Array.from(years).sort().reverse(),
      areas: Array.from(areas).sort(),
      accounts: Array.from(accounts).sort(),
      provinces: Array.from(provinces).sort(),
      reasons: Array.from(reasons).sort(),
      brands: Array.from(brands).sort(),
      categories: Array.from(categories).sort(),
    };
  }, [chartDataSrc, filters.brand, filters.category]);

  const uniqueCompanyStores = useMemo(() => {
    const stores = new Set<string>();
    data.forEach((item) => {
      if (item.store_name) stores.add(item.store_name);
    });
    return Array.from(stores).sort();
  }, [data]);

  useEffect(() => {
    if (!isMounted || !config.dbCompany) return;
    async function fetchActiveComments() {
      const { data: comments, error } = await supabase
        .from("oos_comments")
        .select("*")
        .eq("company", config.dbCompany) // 🟢 เปลี่ยนจาก .in มาเป็น .eq ดึงตรงรายบริษัทเลยครับ
        .order("id", { ascending: false })
        .limit(10);
      if (!error && comments)
        setCustomerComments(comments as CustomerCommentRow[]);
    }
    fetchActiveComments();
    // 🟢 เปลี่ยน dependency ด้านล่างให้ผูกกับ config.dbCompany แทน
  }, [config.dbCompany, isMounted, commentRefreshTrigger, refreshTrigger]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommentStore || !newCommentText.trim()) return;
    setSubmittingComment(true);
    const customerDisplayName =
      localStorage.getItem("customer_display_name") ||
      `Executive (${config.name})`;
    try {
      const { error } = await supabase.from("oos_comments").insert([
        {
          store_name: selectedCommentStore,
          customer_name: customerDisplayName,
          comment_text: newCommentText.trim(),
          status: "pending",
          company: config.dbCompany,
        },
      ]);
      if (error) throw error;
      Swal.fire({
        icon: "success",
        title: "ส่งสัญญาณเข้า War Room สำเร็จ!",
        confirmButtonColor: "#1e3a8a",
      });
      setNewCommentText("");
      setCommentRefreshTrigger((p) => p + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const filteredChartData = useMemo(() => {
    return chartDataSrc.filter((item) => {
      const cleanReason = sanitizeOosReason(item.oos_reason);
      if (filters.date && item.date_key !== filters.date) return false;
      if (filters.year && !item.date_key?.startsWith(`${filters.year}-`))
        return false;
      if (filters.month && !item.date_key?.includes(`-${filters.month}-`))
        return false;
      if (filters.area && item.area !== filters.area) return false;
      if (filters.account && item.account !== filters.account) return false;
      if (filters.province && item.province !== filters.province) return false;
      if (filters.reason && cleanReason !== filters.reason) return false;
      if (filters.brand && item.brand !== filters.brand) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.status && item.status !== filters.status) return false;
      return true;
    });
  }, [chartDataSrc, filters]);

  const metrics = useMemo(() => {
    const totalOOSCount = filteredChartData.reduce((sum, item) => {
      const cleanReason = sanitizeOosReason(item.oos_reason);
      if (TARGET_REASONS.includes(cleanReason)) {
        return sum + (item.oos_count || 0);
      }
      return sum;
    }, 0);

    let initialPendingCount = 0;
    let initialResolvedCount = 0;
    const accountCounts: Record<string, number> = {};

    filteredChartData.forEach((item) => {
      const amt = item.oos_count || 0;
      const cleanReason = sanitizeOosReason(item.oos_reason);

      if (cleanReason === "ไม่มีสินค้าที่ OOS") return;

      if (item.status === "Verified") initialResolvedCount += amt;
      else initialPendingCount += amt;
      if (item.account)
        accountCounts[item.account] = (accountCounts[item.account] || 0) + amt;
    });

    let maxAccount = "-";
    let maxCount = 0;
    let minAccount = "-";
    let minCount = Infinity;
    Object.entries(accountCounts).forEach(([acc, cnt]) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        maxAccount = acc;
      }
      if (cnt < minCount) {
        minCount = cnt;
        minAccount = acc;
      }
    });
    if (minCount === Infinity) minCount = 0;

    const pendingCount = Math.max(
      0,
      initialPendingCount - sessionResolvedCount,
    );
    const resolvedCount = initialResolvedCount + sessionResolvedCount;

    return {
      totalOOSCount,
      totalVisits: totalRows,
      oosPercentage:
        totalRows > 0 ? ((totalOOSCount / totalRows) * 100).toFixed(2) : "0.00",
      maxAccount: totalOOSCount > 0 ? `${maxAccount} (${maxCount})` : "-",
      minAccount: totalOOSCount > 0 ? `${minAccount} (${minCount})` : "-",
      pendingCount,
      resolvedCount,
    };
  }, [filteredChartData, totalRows, sessionResolvedCount]);

  const chartsProcessedData = useMemo(() => {
    const trendMap: Record<string, number> = {};
    filteredChartData.forEach((item) => {
      const dateStr = item.date_key ? item.date_key.substring(5, 10) : "N/A";
      trendMap[dateStr] = (trendMap[dateStr] || 0) + (item.oos_count || 0);
    });
    const lineChartData = Object.entries(trendMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, "จำนวน OOS": count }));

    const accountMap: Record<string, number> = {};
    filteredChartData.forEach((item) => {
      if (item.account)
        accountMap[item.account] =
          (accountMap[item.account] || 0) + (item.oos_count || 0);
    });
    const barChartData = Object.entries(accountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, "จำนวน OOS": value }));

    const areaMap: Record<string, number> = {};
    filteredChartData.forEach((item) => {
      if (item.area)
        areaMap[item.area] = (areaMap[item.area] || 0) + (item.oos_count || 0);
    });
    const donutChartData = Object.entries(areaMap).map(([name, value]) => ({
      name,
      value,
    }));

    return { lineChartData, barChartData, donutChartData };
  }, [filteredChartData]);

  const handleUpdateAction = async (id: string, val: string) => {
    if (!val.trim()) return;

    const matchedItem = data.find((x) => x.id === id);
    const wasPending = !matchedItem?.action_plan;

    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("oos_items")
        .update({ action_plan: val })
        .eq("id", id);
      if (error) throw error;

      setData((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, action_plan: val } : item,
        ),
      );
      if (wasPending) setSessionResolvedCount((prev) => prev + 1);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "บันทึกคำสั่งการผู้บริหารแล้ว",
        showConfirmButton: false,
        timer: 2000,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportExcel = () => {
    try {
      let csvContent =
        "\uFEFFDate,Area,Province,Account,Store Name,Barcode,Description,Brand,Category,OOS Reason,Status,Executive Directive\n";
      data.forEach((item) => {
        const row = [
          item.date_key || "",
          item.area || "",
          item.province || "",
          item.account || "",
          item.store_name || "",
          item.barcode || "",
          item.descriptions || "",
          item.brand || "",
          item.category || "",
          item.oos_reason || "",
          item.action_plan ? "Verified" : "Pending",
          item.action_plan || "",
        ];
        csvContent +=
          row.map((v) => `"${(v || "").replace(/"/g, '""')}"`).join(",") + "\n";
      });
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `OOS_Report_${config.name}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-12">
      <header className="sticky top-0 z-50 bg-[#1e3a8a] text-white p-4 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 bg-white rounded-lg p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            <img
              src={config.logo}
              alt={`${config.name} Logo`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div>
            <h1 className="font-bold text-base md:text-lg tracking-tight flex items-center gap-2">
              {config.fullName}{" "}
              <ShieldCheck size={16} className="text-emerald-400" />
            </h1>
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
              <p className="text-[10px] text-blue-200 tracking-widest uppercase font-semibold">
                CENTRAL WAR ROOM DASHBOARD
              </p>
              <span className="hidden md:inline text-blue-300">|</span>
              <p className="text-[11px] text-emerald-300 font-mono">
                🕒 {currentTime || "กำลังโหลดเวลา..."}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => {
              setRefreshTrigger((p) => p + 1);
              setSessionResolvedCount(0);
            }}
            className="bg-blue-800 p-2 rounded hover:bg-blue-700 text-xs flex items-center gap-1.5"
          >
            <RefreshCcw size={14} /> รีเฟรช
          </button>
          <button
            onClick={() => window.print()}
            className="bg-red-700 px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
          >
            <FileText size={14} /> Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="bg-green-700 px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            onClick={() => router.push("/")}
            className="bg-slate-800 text-slate-100 px-3 py-1.5 rounded text-xs hover:bg-slate-700 flex items-center gap-1.5 font-bold border border-slate-700"
          >
            <Home size={14} /> กลับหน้าหลัก
          </button>
        </div>
      </header>

      {/* บล็อกสถิติ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 p-4">
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-4 rounded-xl shadow-md border border-rose-400">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold uppercase tracking-wide opacity-90">
              OOS รวม (4 เหตุผลหลัก)
            </p>
            <AlertCircle size={18} className="opacity-80" />
          </div>
          <h3 className="text-2xl font-black mt-2 font-mono">
            {metrics.totalOOSCount?.toLocaleString() || 0}{" "}
            <span className="text-xs font-normal">SKUs</span>
          </h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            ยอดรายการสินค้าตาราง
          </p>
          <h3 className="text-2xl font-black mt-1 text-slate-800">
            {metrics.totalVisits.toLocaleString()}{" "}
            <span className="text-xs font-normal text-gray-500">แถว</span>
          </h3>
          <div className="text-xs text-blue-600 font-bold mt-1">
            อัตรา OOS: {metrics.oosPercentage}%
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-200 bg-gradient-to-b from-blue-50/20 to-transparent">
          <p className="text-[10px] text-blue-600 font-black uppercase tracking-wider flex items-center gap-1">
            <Store size={12} /> ยอดเข้าเยี่ยมร้านค้าจริง
          </p>
          <h3 className="text-2xl font-black mt-1 text-blue-900 font-mono">
            {totalStoreVisits.toLocaleString()}{" "}
            <span className="text-xs font-normal text-slate-500">ครั้ง</span>
          </h3>
          <div className="text-[10px] text-slate-400 font-bold mt-1.5">
            Ref: ประวัติการเช็คอินหน้าสาขา
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Account OOS มากที่สุด
          </p>
          <h3 className="text-base font-extrabold mt-1 text-slate-800 truncate">
            {metrics.maxAccount}
          </h3>
          <div className="h-1 bg-rose-500 rounded-full mt-3 w-full"></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Account OOS น้อยที่สุด
          </p>
          <h3 className="text-base font-extrabold mt-1 text-emerald-600 truncate">
            {metrics.minAccount}
          </h3>
          <div className="h-1 bg-emerald-500 rounded-full mt-3 w-full"></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between text-[11px] font-bold border-b pb-1.5">
            <span className="text-amber-600 flex items-center gap-1">
              <AlertCircle size={12} /> ค้าง: {metrics.pendingCount}
            </span>
            <span className="text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={12} /> แก้แล้ว: {metrics.resolvedCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-slate-400">
            <UserCheck size={14} className="text-blue-400 shrink-0" />
            <span>
              สิทธิ์จัดการ:{" "}
              <strong className="text-slate-700">Executive</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ค้นหา */}
      <div className="mx-4 bg-white p-3 rounded shadow-sm border border-gray-200 flex items-center gap-2">
        <Search size={16} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="ค้นหาด่วนเฉพาะตารางด้วยชื่อสาขาร้านค้า แบรนด์ หรือรายละเอียดสินค้า..."
          className="w-full text-xs md:text-sm outline-none bg-transparent"
          value={globalSearch}
          onChange={(e) => {
            setCurrentPage(1);
            setGlobalSearch(e.target.value);
          }}
        />
      </div>

      {/* แผงฟิลเตอร์ */}
      <div className="bg-white p-4 mx-4 mt-3 rounded shadow-sm border border-gray-200 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <select
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50"
          value={filters.date}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, date: e.target.value });
          }}
        >
          <option value="">Date (All)</option>
          {dropdownOptions.dates.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50"
          value={filters.year}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, year: e.target.value });
          }}
        >
          <option value="">Year (All)</option>
          {dropdownOptions.years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50"
          value={filters.month}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, month: e.target.value });
          }}
        >
          <option value="">Month (All)</option>
          {dropdownOptions.months.map((m) => (
            <option key={m} value={m}>
              เดือน {m}
            </option>
          ))}
        </select>
        <select
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50"
          value={filters.area}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, area: e.target.value });
          }}
        >
          <option value="">Area (All)</option>
          {dropdownOptions.areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50"
          value={filters.account}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, account: e.target.value });
          }}
        >
          <option value="">Account (All)</option>
          {dropdownOptions.accounts.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50"
          value={filters.province}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, province: e.target.value });
          }}
        >
          <option value="">Province (All)</option>
          {dropdownOptions.provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50"
          value={filters.reason}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, reason: e.target.value });
          }}
        >
          <option value="">OOS Reason (All)</option>
          {dropdownOptions.reasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {/* 🟢 ตัวเลือก Brand: เมื่อปรับค่า จะสั่ง Reset Category อัตโนมัติ */}
        <select
          className="border border-blue-400 p-2 rounded text-xs font-bold bg-blue-50 text-blue-900"
          value={filters.brand}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, brand: e.target.value, category: "" });
          }}
        >
          <option value="">Brand (All)</option>
          {dropdownOptions.brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        {/* 🟢 ตัวเลือก Category: เมื่อปรับค่า จะสั่ง Reset Brand อัตโนมัติ */}
        <select
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50"
          value={filters.category}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, category: e.target.value, brand: "" });
          }}
        >
          <option value="">Category (All)</option>
          {dropdownOptions.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50 md:col-span-2 lg:col-span-3"
          value={filters.status}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, status: e.target.value });
          }}
        >
          <option value="">Status (All)</option>
          {/* 🟢 เปลี่ยน value จาก "pending" เป็น "Pending" */}
          <option value="Pending">❌ Pending (รอดำเนินการ)</option>
          {/* 🟢 เปลี่ยน value จาก "resolved" เป็น "Verified" */}
          <option value="Verified">✅ Verified (สั่งการแล้ว)</option>
        </select>
      </div>

      {/* กราฟ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 min-w-0 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-700 mb-4">
            📈 Trend OOS / วัน
          </h4>
          <div className="relative w-full h-48 text-[10px]">
            {isMounted && chartsProcessedData.lineChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={192}>
                <LineChart
                  data={chartsProcessedData.lineChartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="จำนวน OOS"
                    stroke="#1e3a8a"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-400 font-bold">
                กำลังประมวลผลเทรนด์ YTD...
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 min-w-0 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-700 mb-4">
            📊 Top 5 Accounts OOS
          </h4>
          <div className="relative w-full h-48 text-[10px]">
            {isMounted && chartsProcessedData.barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={192}>
                <BarChart
                  data={chartsProcessedData.barChartData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar
                    dataKey="จำนวน OOS"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={35}
                  >
                    {chartsProcessedData.barChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={BAR_COLORS[index % BAR_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-400 font-bold">
                กำลังคำนวณอันดับบัญชี...
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 min-w-0 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-700 mb-4">
            ⏱ ปริมาณ OOS ราย Area (Donut)
          </h4>
          <div className="relative w-full h-48">
            {isMounted && chartsProcessedData.donutChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={192}>
                <PieChart>
                  <Pie
                    data={chartsProcessedData.donutChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartsProcessedData.donutChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: "10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-400 font-bold">
                กำลังเตรียมสัดส่วนพื้นที่...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* บอร์ดร้องเรียน */}
      <div className="px-4 pb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 lg:grid-cols-3 gap-5 text-left mb-4">
          <form
            onSubmit={handleSendComment}
            className="space-y-3 lg:border-r lg:pr-5 border-gray-100"
          >
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                <MessageSquare size={14} className="text-blue-600" />{" "}
                พิมพ์ข้อความร้องเรียนด่วน
              </h3>
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-500 mb-1">
                1. เลือกร้านค้า/สาขาที่มีปัญหา
              </label>
              <select
                value={selectedCommentStore}
                onChange={(e) => setSelectedCommentStore(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold bg-gray-50 outline-none"
              >
                <option value="">-- เลือกร้านค้าเพื่อร้องเรียน --</option>
                {uniqueCompanyStores.map((store, idx) => (
                  <option key={idx} value={store}>
                    {store}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-500 mb-1">
                2. ระบุรายละเอียดของปัญหา
              </label>
              <textarea
                rows={2}
                placeholder="พิมพ์รายละเอียดเคสปัญหา..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-xs font-semibold outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={submittingComment}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-lg flex items-center justify-center gap-1.5 disabled:bg-gray-300 cursor-pointer"
            >
              <Send size={12} />{" "}
              {submittingComment
                ? "กำลังนำส่งข้อความ..."
                : "ส่งสัญญาณเข้าศูนย์ War Room"}
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                <Clock size={14} className="text-rose-500" />{" "}
                กระดานติดตามสถานะความคืบหน้า (SLA Tracker)
              </h3>
            </div>
            {customerComments.length === 0 ? (
              <div className="text-center py-10 text-[11px] text-gray-400 font-bold border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                📭 ยังไม่มีประวัติการแจ้งเคสปัญหาในระบบ
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {customerComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-left text-xs relative"
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <span className="font-black text-slate-800 text-[11px]">
                        <i className="fa-solid fa-shop text-blue-600 mr-1"></i>{" "}
                        {comment.store_name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white whitespace-nowrap ${comment.status === "admin_intervened" ? "bg-teal-600" : comment.status === "auditor_replied" ? "bg-blue-600" : "bg-amber-500 animate-pulse"}`}
                      >
                        {comment.status === "admin_intervened"
                          ? "✅ เคลียร์ปัญหาแล้ว"
                          : comment.status === "auditor_replied"
                            ? "🟢 เจ้าหน้าที่ตอบแล้ว"
                            : "⏳ รอตรวจสอบ"}
                      </span>
                    </div>
                    <p className="text-slate-700 bg-white border border-gray-100 p-2 rounded-lg font-medium mb-1.5">
                      {comment.comment_text}
                    </p>
                    {comment.auditor_reply && (
                      <p className="text-blue-900 bg-blue-50/50 p-2 rounded-lg font-semibold text-[11px] mb-1">
                        <span className="text-[9px] font-black text-blue-600 block">
                          🏃‍♂️ คำชี้แจงจากทีมผู้ตรวจ (Auditor):
                        </span>{" "}
                        {comment.auditor_reply}
                      </p>
                    )}
                    {comment.admin_reply && (
                      <p className="text-teal-900 bg-teal-50 p-2 rounded-lg font-semibold text-[11px]">
                        <span className="text-[9px] font-black text-teal-600 block">
                          🛡️ มาตรการเสริมจากแอดมิน (Admin):
                        </span>{" "}
                        {comment.admin_reply}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ตารางงานหลักหน้าระบบ */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 overflow-x-auto mt-4">
          <table className="min-w-full text-left divide-y divide-slate-200">
            <thead className="bg-slate-100 text-[10px] uppercase tracking-widest text-slate-600">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Area</th>
                <th className="p-3">Province</th>
                <th className="p-3">Store / Account</th>
                <th className="p-3">Product Description</th>
                <th className="p-3">Brand</th>
                <th className="p-3">Category</th>
                <th className="p-3">Images</th>
                <th className="p-3">OOS Reason</th>
                <th className="p-3">Status</th>
                <th className="p-3">Executive Directive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading && (
                <tr>
                  <td
                    colSpan={11}
                    className="p-12 text-center text-slate-500 font-bold"
                  >
                    🔄 ดึงข้อมูลตารางแบบแบ่งหน้าจากระบบคลาวด์ความเร็วสูง...
                  </td>
                </tr>
              )}

              {!loading && data.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="p-12 text-center text-slate-500 font-medium"
                  >
                    ไม่พบข้อมูลในระบบตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              )}

              {!loading &&
                data.length > 0 &&
                data.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 text-slate-600 font-mono whitespace-nowrap">
                      {row.date_key || "-"}
                    </td>
                    <td className="p-4 font-bold text-slate-700">
                      {row.area || "-"}
                    </td>
                    <td className="p-4 text-blue-600 font-semibold">
                      {row.province || "-"}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">
                        {row.store_name || "ไม่ระบุสาขา"}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {row.account || "General"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">
                        {row.descriptions || "-"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {row.barcode || "-"}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {row.brand || "N/A"}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700">
                      {row.category || "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-1.5">
                        {row.price_tag_image && (
                          <a
                            href={row.price_tag_image}
                            target="_blank"
                            rel="noreferrer"
                            className="relative w-9 h-9 block border rounded bg-slate-100"
                          >
                            <img
                              src={row.price_tag_image}
                              alt="Price"
                              className="w-full h-full object-cover"
                            />
                          </a>
                        )}
                        {row.shelf_image && (
                          <a
                            href={row.shelf_image}
                            target="_blank"
                            rel="noreferrer"
                            className="relative w-9 h-9 block border rounded bg-slate-100"
                          >
                            <img
                              src={row.shelf_image}
                              alt="Shelf"
                              className="w-full h-full object-cover"
                            />
                          </a>
                        )}
                        {row.cma_image && (
                          <a
                            href={row.cma_image}
                            target="_blank"
                            rel="noreferrer"
                            className="relative w-9 h-9 block border rounded bg-slate-100"
                          >
                            <img
                              src={row.cma_image}
                              alt="CMA"
                              className="w-full h-full object-cover"
                            />
                          </a>
                        )}
                        {!row.price_tag_image &&
                          !row.shelf_image &&
                          !row.cma_image && (
                            <span className="text-slate-400 text-xs italic">
                              - ไม่มีรูป -
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="p-4 text-rose-600 font-medium">
                      {row.oos_reason}
                    </td>

                    <td className="p-4 text-center">
                      {row.oos_reason === "ไม่มีสินค้าที่ OOS" ? (
                        <span className="text-slate-400 font-bold">-</span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${row.status === "Verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {row.status || "Pending"}
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex gap-2 items-center bg-slate-100 p-2 rounded-lg border border-slate-200">
                        <input
                          className="bg-transparent w-full text-xs outline-none px-2 py-1 text-slate-700"
                          value={
                            tempActions[row.id] !== undefined
                              ? tempActions[row.id]
                              : row.action_plan || ""
                          }
                          placeholder={
                            row.oos_reason === "ไม่มีสินค้าที่ OOS"
                              ? "ไม่ต้องสั่งการ"
                              : "พิมพ์คำสั่งการ..."
                          }
                          disabled={row.oos_reason === "ไม่มีสินค้าที่ OOS"}
                          onChange={(e) =>
                            setTempActions({
                              ...tempActions,
                              [row.id]: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              handleUpdateAction(
                                row.id,
                                tempActions[row.id] || "",
                              );
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateAction(
                              row.id,
                              tempActions[row.id] || "",
                            )
                          }
                          disabled={
                            updatingId === row.id ||
                            row.oos_reason === "ไม่มีสินค้าที่ OOS"
                          }
                          className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded disabled:bg-gray-300"
                        >
                          <Save
                            size={14}
                            className={
                              updatingId === row.id ? "animate-spin" : ""
                            }
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* ควบคุม Pagination */}
        <div className="p-4 bg-[#1e293b] border-t border-slate-800 flex justify-between items-center text-xs mt-4 rounded-b-xl text-white">
          <button
            type="button"
            disabled={currentPage === 1 || loading}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded disabled:opacity-40"
          >
            ◀ ย้อนกลับ
          </button>
          <span className="font-bold text-slate-400">
            หน้า{" "}
            <span className="text-emerald-400 font-mono">{currentPage}</span> /{" "}
            {Math.ceil(totalRows / itemsPerPage) || 1} (เงื่อนไขนี้มีทั้งหมด{" "}
            <span className="text-emerald-300 font-mono">
              {totalRows.toLocaleString()}
            </span>{" "}
            แถว)
          </span>
          <button
            type="button"
            disabled={
              currentPage >= Math.ceil(totalRows / itemsPerPage) || loading
            }
            onClick={() => setCurrentPage((prev) => prev + 1)}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded disabled:opacity-40"
          >
            ถัดไป ▶
          </button>
        </div>
      </div>

      <footer className="mt-8 border-t border-slate-200 bg-white py-4 px-6 text-center text-[10px] text-slate-500 font-medium space-y-1">
        <p className="font-black text-slate-700 text-xs tracking-tight">
          by FMBD CONTROLLER
        </p>
        <p className="font-black text-slate-800 text-sm">Niwat Wiyasing</p>
        <p className="text-[9px] text-slate-400 font-bold pt-1.5">
          © 2026 Riverpro Intertrade Co., Ltd. All Rights Reserved. Fully
          Unbound Dynamic URL Filter Fixed.
        </p>
      </footer>
    </div>
  );
}
