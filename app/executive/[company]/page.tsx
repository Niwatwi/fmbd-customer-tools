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
  Share2,
  Home,
  Search,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  ImageIcon,
  MessageSquare,
  Send,
  Clock,
} from "lucide-react";
import Image from "next/image";
import dynamic from "next/dynamic";
// 🟢 ดึง supabase จากไลบรารีของระบบ
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

export default function CompanyExecutiveDashboard() {
  const params = useParams();
  const router = useRouter();
  const companyKey = (params.company as string) || "rvp";
  const config = COMPANY_CONFIG[companyKey.toLowerCase()] || COMPANY_CONFIG.rvp;

  const [isMounted, setIsMounted] = useState(false);
  const [data, setData] = useState<DashboardItem[]>([]);
  const [chartDataSrc, setChartDataSrc] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
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

  // ระบบตรวจเช็คเซสชันล็อกอิน
  useEffect(() => {
    const storedUser = localStorage.getItem("customer_username");
    const storedName = localStorage.getItem("customer_display_name");

    if (!storedUser || !storedName) {
      localStorage.clear();
      sessionStorage.clear();
      router.replace("/login");
      return;
    }
  }, [router]);

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

  useEffect(() => {
    let active = true;
    async function fetchChartAndDropdownMeta() {
      const { data: reports, error } = await supabase
        .from("vw_executive_warroom")
        .select("*")
        .eq("company", config.dbCompany)
        .in("oos_reason", TARGET_REASONS);

      if (active && !error && reports) {
        setChartDataSrc(reports as DashboardItem[]);
      }
    }
    fetchChartAndDropdownMeta();
    return () => {
      active = false;
    };
  }, [config.dbCompany, refreshTrigger]);

  const dropdownOptions = useMemo(() => {
    const dates = new Set<string>();
    const months = new Set<string>();
    const years = new Set<string>();
    const areas = new Set<string>();
    const accounts = new Set<string>();
    const provinces = new Set<string>();
    const reasons = new Set<string>();
    const barcodes = new Set<string>();
    const brands = new Set<string>();
    const subBrands = new Set<string>();
    const categories = new Set<string>();
    const subCategories = new Set<string>();

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
      if (item.oos_reason) reasons.add(item.oos_reason);
      if (item.barcode) barcodes.add(item.barcode);
      if (item.brand) brands.add(item.brand);

      const matchBrand = !filters.brand || item.brand === filters.brand;
      if (matchBrand) {
        if (item.sub_brand) subBrands.add(item.sub_brand);
        if (item.category) categories.add(item.category);
        if (item.sub_category) subCategories.add(item.sub_category);
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
      barcodes: Array.from(barcodes).sort(),
      brands: Array.from(brands).sort(),
      subBrands: Array.from(subBrands).sort(),
      categories: Array.from(categories).sort(),
      subCategories: Array.from(subCategories).sort(),
    };
  }, [chartDataSrc, filters.brand]);

  // แก้ไข useEffect ส่วน fetchPaginatedTableRecords ให้เหลือแค่ตัวแปรนี้ครับ
  useEffect(() => {
    let active = true;
    async function fetchAllRecords() {
      setLoading(true);
      const { data: reports, error } = await supabase
        .from("vw_executive_warroom")
        .select("*") // ดึงมาทั้งหมดเลย ไม่ต้องส่ง Query Filter
        .eq("company", config.dbCompany)
        .in("oos_reason", TARGET_REASONS);

      if (active) {
        if (!error && reports) {
          setChartDataSrc(reports as DashboardItem[]); // เก็บไว้ในตัวแปรหลัก
          setData(reports as DashboardItem[]); // เก็บลงตารางด้วย
        }
        setLoading(false);
      }
    }
    fetchAllRecords();
    return () => {
      active = false;
    };
  }, [config.dbCompany, refreshTrigger]); // 🟢 เอา filters ออกจากตรงนี้ครับ

  const uniqueCompanyStores = useMemo(() => {
    const stores = new Set<string>();
    chartDataSrc.forEach((item) => {
      if (item.store_name) stores.add(item.store_name);
    });
    return Array.from(stores).sort();
  }, [chartDataSrc]);

  useEffect(() => {
    if (!isMounted || uniqueCompanyStores.length === 0) return;

    async function fetchActiveComments() {
      const { data: comments, error } = await supabase
        .from("oos_comments")
        .select("*")
        .in("store_name", uniqueCompanyStores)
        .order("id", { ascending: false })
        .limit(10);

      if (!error && comments) {
        setCustomerComments(comments as CustomerCommentRow[]);
      }
    }
    fetchActiveComments();
  }, [uniqueCompanyStores, isMounted, commentRefreshTrigger, refreshTrigger]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommentStore) {
      Swal.fire(
        "กรุณาเลือกร้านค้า",
        "โปรดเลือกสาขาร้านค้าที่เกิดปัญหาต้องการสอบถามครับ",
        "warning",
      );
      return;
    }
    if (!newCommentText.trim()) {
      Swal.fire(
        "กรุณากรอกข้อความ",
        "โปรดระบุข้อความคำถาม/ข้อร้องเรียนที่ต้องการแจ้งศูนย์บัญชาการครับ",
        "warning",
      );
      return;
    }

    setSubmittingComment(true);
    const customerDisplayName =
      sessionStorage.getItem("user_display_name") ||
      `Executive (${config.name})`;

    try {
      const { error } = await supabase.from("oos_comments").insert([
        {
          store_name: selectedCommentStore,
          customer_name: customerDisplayName,
          comment_text: newCommentText.trim(),
          status: "pending",
        },
      ]);

      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "ส่งสัญญาณเข้า War Room สำเร็จ!",
        text: "🚀 บันทึกข้อร้องเรียนเข้าศูนย์ควบคุมแล้ว ฝ่ายปฏิบัติการหน้าร้าน (Auditor) และแอดมินจะดำเนินการตรวจสอบแก้ปัญหาและตอบกลับใน 15 นาทีครับ",
        confirmButtonColor: "#1e3a8a",
      });

      setNewCommentText("");
      setCommentRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      Swal.fire(
        "เกิดข้อผิดพลาด",
        "ไม่สามารถส่งข้อความได้เนื่องจากระบบเครือข่ายขัดข้อง",
        "error",
      );
    } finally {
      setSubmittingComment(false);
    }
  };

  const filteredChartData = useMemo(() => {
    return chartDataSrc.filter((item) => {
      if (filters.date && item.date_key !== filters.date) return false;

      if (filters.year && !item.date_key?.startsWith(`${filters.year}-`))
        return false;
      if (filters.month && !item.date_key?.includes(`-${filters.month}-`))
        return false;
      if (filters.sub_brand && item.sub_brand !== filters.sub_brand)
        return false;
      if (filters.sub_category && item.sub_category !== filters.sub_category)
        return false;

      if (filters.area && item.area !== filters.area) return false;
      if (filters.account && item.account !== filters.account) return false;
      if (filters.province && item.province !== filters.province) return false;
      if (filters.reason && item.oos_reason !== filters.reason) return false;
      if (filters.barcode && item.barcode !== filters.barcode) return false;
      if (filters.brand && item.brand !== filters.brand) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.status === "resolved" && !item.action_plan) return false;
      if (filters.status === "pending" && item.action_plan) return false;

      if (globalSearch) {
        const search = globalSearch.toLowerCase();
        return (
          item.store_name?.toLowerCase().includes(search) ||
          item.barcode?.toLowerCase().includes(search) ||
          item.brand?.toLowerCase().includes(search) ||
          item.descriptions?.toLowerCase().includes(search) ||
          false
        );
      }
      return true;
    });
  }, [chartDataSrc, filters, globalSearch]);

  // 🟢 คำนวณยอด OOS, Total Visits และ % ให้อัตโนมัติเมื่อมีการเปลี่ยนฟิลเตอร์
  const metrics = useMemo(() => {
    const totalOOSCount = filteredChartData.length;

    // คำนวณหาจำนวนครั้งที่เข้าเยี่ยมจาก visit_id ที่ไม่ซ้ำกัน (ตามข้อมูลที่โดน Filter แล้ว)
    const uniqueVisits = new Set<string>();
    filteredChartData.forEach((item) => {
      if (item.visit_id) uniqueVisits.add(item.visit_id);
    });
    const totalVisits = uniqueVisits.size;

    // คำนวณ % OOS
    const oosPercentage =
      totalVisits > 0
        ? ((totalOOSCount / totalVisits) * 100).toFixed(2)
        : "0.00";

    const accountCounts: Record<string, number> = {};
    filteredChartData.forEach((item) => {
      if (item.account)
        accountCounts[item.account] = (accountCounts[item.account] || 0) + 1;
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

    let pendingCount = 0;
    let resolvedCount = 0;
    filteredChartData.forEach((item) => {
      if (item.action_plan) resolvedCount++;
      else pendingCount++;
    });

    return {
      totalOOSCount,
      totalVisits,
      oosPercentage,
      maxAccount: totalOOSCount > 0 ? `${maxAccount} (${maxCount})` : "-",
      minAccount: totalOOSCount > 0 ? `${minAccount} (${minCount})` : "-",
      pendingCount,
      resolvedCount,
    };
  }, [filteredChartData]);

  const chartsProcessedData = useMemo(() => {
    const trendMap: Record<string, number> = {};
    filteredChartData.forEach((item) => {
      const dateStr = item.date_key ? item.date_key.substring(5, 10) : "N/A";
      trendMap[dateStr] = (trendMap[dateStr] || 0) + 1;
    });
    const lineChartData = Object.entries(trendMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, "จำนวน OOS": count }));

    const accountMap: Record<string, number> = {};
    filteredChartData.forEach((item) => {
      if (item.account)
        accountMap[item.account] = (accountMap[item.account] || 0) + 1;
    });
    const barChartData = Object.entries(accountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, "จำนวน OOS": value }));

    const areaMap: Record<string, number> = {};
    filteredChartData.forEach((item) => {
      if (item.area) areaMap[item.area] = (areaMap[item.area] || 0) + 1;
    });
    const donutChartData = Object.entries(areaMap).map(([name, value]) => ({
      name,
      value,
    }));

    return { lineChartData, barChartData, donutChartData };
  }, [filteredChartData]);

  const handleUpdateAction = async (id: string, val: string) => {
    if (!val.trim()) return;
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
      Swal.fire("Error", "ระบบฐานข้อมูลขัดข้อง กรุณาลองใหม่ครับ", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportExcel = () => {
    try {
      let csvContent =
        "\uFEFFDate,Area,Province,Account,Store Code,Store Name,Barcode,Description,Brand,Sub Brand,Category,Sub Category,OOS Reason,Status,Executive Directive\n";
      data.forEach((item) => {
        const row = [
          item.date_key || "",
          item.area || "",
          item.province || "",
          item.account || "",
          item.store_code || "",
          item.store_name || "",
          item.barcode || "",
          item.descriptions || "",
          item.brand || "",
          item.sub_brand || "",
          item.category || "",
          item.sub_category || "",
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
          <div className="relative w-9 h-9 bg-white rounded p-0.5 flex items-center justify-center overflow-hidden shrink-0">
            <Image
              src={config.logo}
              alt="Company Logo"
              width={32}
              height={32}
              className="object-contain"
              unoptimized
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
            onClick={() => setRefreshTrigger((p) => p + 1)}
            className="bg-blue-800 p-2 rounded hover:bg-blue-700 text-xs flex items-center gap-1.5 transition-all"
          >
            <RefreshCcw size={14} /> รีเฟรช
          </button>
          <button
            onClick={() => window.print()}
            className="bg-red-700 px-3 py-1.5 rounded text-xs flex items-center gap-1.5 hover:bg-red-600 transition-all"
          >
            <FileText size={14} /> Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="bg-green-700 px-3 py-1.5 rounded text-xs flex items-center gap-1.5 hover:bg-green-600 transition-all"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            onClick={() => {
              if (navigator.share)
                navigator.share({
                  title: config.fullName,
                  url: window.location.href,
                });
            }}
            className="bg-teal-700 px-3 py-1.5 rounded text-xs flex items-center gap-1.5 hover:bg-teal-600 transition-all"
          >
            <Share2 size={14} /> แชร์
          </button>
          <button
            onClick={() =>
              window.open(
                `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(window.location.href)}`,
                "_blank",
              )
            }
            className="bg-[#06C755] px-3 py-1.5 rounded text-xs flex items-center gap-1.5 hover:opacity-90 transition-all text-white font-medium"
          >
            แชร์ LINE
          </button>
          <button
            onClick={() => {
              router.push("/");
            }}
            className="bg-slate-800 text-slate-100 px-3 py-1.5 rounded text-xs hover:bg-slate-700 transition-all flex items-center gap-1.5 font-bold cursor-pointer border border-slate-700"
          >
            <Home size={14} /> กลับสู่พอร์ทัลหลัก
          </button>
        </div>
      </header>

      {/* 🟢 บล็อกตัวเลขสถิติด้านบน (อัปเดตเป็น 5 กล่อง) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4">
        {/* กล่องที่ 1: OOS รวม (แก้พื้นหลังเรียบร้อย) */}
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-4 rounded-xl shadow-md border border-rose-400">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold tracking-wide uppercase opacity-90">
              OOS รวม (4 เหตุผลหลัก)
            </p>
            <AlertCircle size={18} className="opacity-80" />
          </div>
          <h3 className="text-2xl font-black mt-2 font-mono">
            {metrics.totalOOSCount?.toLocaleString() || 0}{" "}
            <span className="text-xs font-normal">SKUs</span>
          </h3>
        </div>

        {/* 🟢 กล่องที่ 2: ยอดการเข้าเยี่ยมร้านค้า (กล่องใหม่) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            ยอดเข้าเยี่ยมร้านค้า
          </p>
          <h3 className="text-2xl font-black mt-1 text-slate-800">
            {metrics.totalVisits.toLocaleString()}{" "}
            <span className="text-xs font-normal text-gray-500">ครั้ง</span>
          </h3>
          <div className="text-xs text-blue-600 font-bold mt-1">
            คิดเป็น OOS: {metrics.oosPercentage}%
          </div>
        </div>

        {/* กล่องที่ 3: Account มากที่สุด */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Account OOS มากที่สุด
          </p>
          <h3 className="text-base font-extrabold mt-1 text-slate-800 truncate">
            {metrics.maxAccount}
          </h3>
          <div className="h-1 bg-rose-500 rounded-full mt-3 w-full"></div>
        </div>

        {/* กล่องที่ 4: Account น้อยที่สุด */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Account OOS น้อยที่สุด
          </p>
          <h3 className="text-base font-extrabold mt-1 text-emerald-600 truncate">
            {metrics.minAccount}
          </h3>
          <div className="h-1 bg-emerald-500 rounded-full mt-3 w-full"></div>
        </div>

        {/* กล่องที่ 5: สถานะการสั่งการ */}
        <div className="bg-[#1e293b] text-slate-100 p-4 rounded-xl shadow-md border border-slate-700">
          <div className="flex justify-between text-[11px] font-bold border-b border-slate-700 pb-1.5">
            <span className="text-amber-400 flex items-center gap-1">
              <AlertCircle size={12} /> ค้าง: {metrics.pendingCount}
            </span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={12} /> แก้แล้ว: {metrics.resolvedCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-slate-400">
            <UserCheck size={14} className="text-blue-400 shrink-0" />
            <span>
              แก้ไขสิทธิ์โดย: <strong className="text-white">Executive</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="mx-4 bg-white p-3 rounded shadow-sm border border-gray-200 flex items-center gap-2">
        <Search size={16} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="ค้นหาด่วนด้วยชื่อร้านค้า สินค้า บาร์โค้ด หรือแบรนด์..."
          className="w-full text-xs md:text-sm outline-none font-sans bg-transparent"
          value={globalSearch}
          onChange={(e) => {
            setCurrentPage(1);
            setGlobalSearch(e.target.value);
          }}
        />
      </div>

      {/* แผงควบคุมฟิลเตอร์ */}
      <div className="bg-white p-4 mx-4 mt-3 rounded shadow-sm border border-gray-200 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <select
          className="border border-gray-300 p-2 rounded text-xs outline-none bg-gray-50"
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
          className="border border-gray-300 p-2 rounded text-xs outline-none bg-gray-50"
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
          className="border border-gray-300 p-2 rounded text-xs outline-none bg-gray-50"
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
          className="border border-gray-300 p-2 rounded text-xs outline-none bg-gray-50"
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
          className="border border-gray-300 p-2 rounded text-xs outline-none bg-gray-50"
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
          className="border border-gray-300 p-2 rounded text-xs outline-none bg-gray-50"
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
          className="border border-gray-300 p-2 rounded text-xs outline-none bg-gray-50"
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

        <select
          className="border border-gray-300 p-2 rounded text-xs outline-none bg-gray-50"
          value={filters.barcode}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, barcode: e.target.value });
          }}
        >
          <option value="">Barcode (All)</option>
          {dropdownOptions.barcodes.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          className="border border-blue-400 p-2 rounded text-xs font-bold outline-none bg-blue-50 text-blue-900"
          value={filters.brand}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({
              ...filters,
              brand: e.target.value,
              sub_brand: "",
              category: "",
              sub_category: "",
            });
          }}
        >
          <option value="">Brand (All)</option>
          {dropdownOptions.brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          className="border border-gray-300 p-2 rounded text-xs outline-none bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
          value={filters.sub_brand}
          disabled={!filters.brand && dropdownOptions.subBrands.length === 0}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, sub_brand: e.target.value });
          }}
        >
          <option value="">Sub Brand (All)</option>
          {dropdownOptions.subBrands.map((sb) => (
            <option key={sb} value={sb}>
              {sb}
            </option>
          ))}
        </select>

        <select
          className="border border-gray-300 p-2 rounded text-xs outline-none bg-gray-50"
          value={filters.category}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, category: e.target.value });
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
          className="border border-gray-300 p-2 rounded text-xs outline-none bg-gray-50"
          value={filters.sub_category}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, sub_category: e.target.value });
          }}
        >
          <option value="">Sub Category (All)</option>
          {dropdownOptions.subCategories.map((sc) => (
            <option key={sc} value={sc}>
              {sc}
            </option>
          ))}
        </select>

        <select
          className="border border-gray-300 p-2 rounded text-xs outline-none bg-gray-50 md:col-span-2 lg:col-span-6"
          value={filters.status}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, status: e.target.value });
          }}
        >
          <option value="">Status (All)</option>
          <option value="pending">❌ Pending (รอดำเนินการ)</option>
          <option value="resolved">✅ Verified (สั่งการแล้ว)</option>
        </select>
      </div>

      {/* บล็อกแสดงกราฟสถิติหน้าระบบ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 min-w-0 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-700 mb-4">
            📈 Trend OOS / วัน
          </h4>
          <div
            className="relative w-full h-48 text-[10px]"
            style={{ minWidth: 0 }}
          >
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
                กำลังเตรียมข้อมูลกราฟ...
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 min-w-0 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-700 mb-4">
            📊 Top 5 Accounts OOS
          </h4>
          <div
            className="relative w-full h-48 text-[10px]"
            style={{ minWidth: 0 }}
          >
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
                กำลังเตรียมข้อมูลกราฟ...
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 min-w-0 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-700 mb-4">
            ⏱ ปริมาณ OOS ราย Area (Donut)
          </h4>
          <div className="relative w-full h-48" style={{ minWidth: 0 }}>
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

      <div className="px-4 pb-8">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 lg:grid-cols-3 gap-5 text-left mb-4">
          <form
            onSubmit={handleSendComment}
            className="space-y-3 lg:border-r lg:pr-5 border-gray-100"
          >
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <MessageSquare size={14} className="text-blue-600" />{" "}
                พิมพ์ข้อความร้องเรียน / สอบถามปัญหาด่วน
              </h3>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                ระบุสาขาและระบุเคสปัญหาเพื่อให้ทีมปฏิบัติการหน้างานแก้ด่วนภายใน
                15 นาที
              </p>
            </div>

            <div>
              <label
                htmlFor="comment-store-select"
                className="block text-[9px] font-black text-gray-500 mb-1 uppercase"
              >
                1. เลือกร้านค้า/สาขาที่มีปัญหา
              </label>
              <select
                id="comment-store-select"
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
              <label
                htmlFor="comment-text-area"
                className="block text-[9px] font-black text-gray-500 mb-1 uppercase"
              >
                2. ระบุรายละเอียดของปัญหา
              </label>
              <textarea
                id="comment-text-area"
                rows={2}
                placeholder="พิมพ์ข้อความแจ้ง เช่น สินค้าขาดสต๊อกนานแล้ว, ป้ายราคาไม่ตรง ฯลฯ"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-xs font-semibold outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submittingComment}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:bg-gray-300 cursor-pointer"
            >
              <Send size={12} />{" "}
              {submittingComment
                ? "กำลังนำส่งข้อความ..."
                : "ส่งสัญญาณเข้าศูนย์ War Room"}
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <Clock size={14} className="text-rose-500" />{" "}
                กระดานติดตามสถานะความคืบหน้า (SLA Q&A Tracker)
              </h3>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                ประวัติข้อความล่าสุด 10 เคสของท่านและการชี้แจงจากทีมปฏิบัติการ
              </p>
            </div>

            {customerComments.length === 0 ? (
              <div className="text-center py-10 text-[11px] text-gray-400 font-bold border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                📭 ยังไม่มีประวัติการส่ง Comment หรือข้อร้องเรียนจากบัญชีท่าน
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
                          ? "✅ แอดมินเคลียร์ปัญหาแล้ว"
                          : comment.status === "auditor_replied"
                            ? "🟢 ออดิเตอร์ตอบแล้ว"
                            : "⏳ รอเจ้าหน้าที่ตรวจสอบ"}
                      </span>
                    </div>

                    <p className="text-slate-700 bg-white border border-gray-100 p-2 rounded-lg font-medium mb-1.5">
                      <span className="text-[10px] font-bold text-gray-400 block">
                        💬 คำถาม/ข้อร้องเรียนของท่าน:
                      </span>{" "}
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
                          🛡️ มาตรการสนับสนุนเสริมจากแอดมิน (Admin):
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
                <th className="p-3">Product / Barcode</th>
                <th className="p-3">Brand</th>
                <th className="p-3">Category</th>
                <th className="p-3">Images</th>
                <th className="p-3">OOS Reason</th>
                <th className="p-3">Status</th>
                <th className="p-3">Executive Directive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading ? (
                <tr>
                  <td
                    colSpan={11}
                    className="p-12 text-center text-slate-500 font-bold"
                  >
                    🔄 กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredChartData.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="p-12 text-center text-slate-500 font-medium"
                  >
                    ไม่พบข้อมูลตามเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                filteredChartData
                  .slice(
                    (currentPage - 1) * itemsPerPage,
                    currentPage * itemsPerPage,
                  )
                  .map((row) => (
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
                          {row.store_name || "ไม่ระบุชื่อร้าน"}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {row.account || "General Account"}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-800">
                          {row.descriptions || "ไม่ระบุชื่อสินค้า"}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
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
                      <td className="p-4 text-center">Images</td>
                      <td className="p-4 text-rose-600 font-medium">
                        {row.oos_reason || "-"}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${row.action_plan ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {row.action_plan ? "Verified" : "Pending"}
                        </span>
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
                            placeholder="พิมพ์คำสั่งการ..."
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
                            onClick={() =>
                              handleUpdateAction(
                                row.id,
                                tempActions[row.id] || "",
                              )
                            }
                            disabled={updatingId === row.id}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded transition-all"
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
                  ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-[#1e293b] border-t border-slate-800 flex justify-between items-center text-xs mt-4 rounded-b-xl text-white">
          <button
            type="button"
            disabled={currentPage === 1 || loading}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded disabled:opacity-40 transition-all"
          >
            ◀ ย้อนกลับ
          </button>
          <span className="font-bold text-slate-400">
            หน้า{" "}
            <span className="text-emerald-400 font-mono">{currentPage}</span> /{" "}
            {Math.ceil(filteredChartData.length / itemsPerPage) || 1}
            (ทั้งหมด {filteredChartData.length} แถว)
          </span>
          <button
            type="button"
            disabled={
              currentPage >= Math.ceil(totalCount / itemsPerPage) || loading
            }
            onClick={() => setCurrentPage((prev) => prev + 1)}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded disabled:opacity-40 transition-all"
          >
            ถัดไป ▶
          </button>
        </div>
      </div>

      <footer className="mt-8 border-t border-slate-200 bg-white py-4 px-6 text-center shadow-inner text-[10px] text-slate-500 font-medium space-y-1">
        <p className="font-black text-slate-700 text-xs tracking-tight">
          by FMBD CONTROLLER
        </p>
        <p className="font-black text-slate-800 text-sm">Niwat Wiyasing</p>
        <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 font-bold text-slate-500 pt-0.5">
          <span>
            <i className="fa-solid fa-envelope text-blue-600 mr-1"></i> email :
            Niwat_wiy@riverpro.co.th
          </span>
          <span>
            <i className="fa-brands fa-line text-emerald-500 mr-1 text-xs"></i>{" "}
            Line ID : niwatwi
          </span>
          <span>
            <i className="fa-solid fa-phone text-teal-600 mr-1"></i> Tel. :
            065-806-4694
          </span>
        </div>
        <p className="text-[9px] text-slate-400 font-bold pt-1.5">
          © 2026 Riverpro Intertrade Co., Ltd. All Rights Reserved. Special War
          Room Interface Configuration.
        </p>
      </footer>
    </div>
  );
}
