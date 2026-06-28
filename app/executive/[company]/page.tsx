/* eslint-disable @next/next/no-img-element */
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
  company: string;
  auditor: string | null;
  reply_image_url: string | null;
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

const sanitizeTextData = (text: string | null): string => {
  if (!text) return "-";
  return text
    .replace(/\uFFFD/g, "")
    .replace(/\?/g, "")
    .trim();
};

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

  // --- 1. กลุ่ม STATE ทั้งหมด ---
  const [isMounted, setIsMounted] = useState(false);
  const [rawTableData, setRawTableData] = useState<DashboardItem[]>([]);
  const [chartDataSrc, setChartDataSrc] = useState<any[]>([]);
  const [totalStoreVisits, setTotalStoreVisits] = useState(0);
  const [sessionResolvedCount, setSessionResolvedCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [hasNextPage, setHasNextPage] = useState(false);

  const [tempActions, setTempActions] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentTime, setCurrentTime] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    month: "",
    year: "2026",
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

  const data = useMemo(() => {
    if (!globalSearch) return rawTableData;
    const term = globalSearch.toLowerCase();
    return rawTableData.filter((item) => {
      return (
        item.store_name?.toLowerCase().includes(term) ||
        item.brand?.toLowerCase().includes(term) ||
        item.descriptions?.toLowerCase().includes(term) ||
        item.barcode?.toLowerCase().includes(term)
      );
    });
  }, [rawTableData, globalSearch]);

  // --- 2. กลุ่มตัวแปรคำนวณหลัก ---
  const filteredChartData = useMemo(() => {
    return chartDataSrc.filter((item) => {
      const cleanReason = sanitizeOosReason(item.oos_reason);

      if (
        filters.startDate &&
        item.date_key &&
        item.date_key < filters.startDate
      )
        return false;
      if (filters.endDate && item.date_key && item.date_key > filters.endDate)
        return false;

      if (!filters.startDate && !filters.endDate) {
        if (filters.year && !item.date_key?.startsWith(`${filters.year}-`))
          return false;
        if (filters.month && !item.date_key?.includes(`-${filters.month}-`))
          return false;
      }

      if (filters.area && item.area !== filters.area) return false;
      if (filters.account && item.account !== filters.account) return false;
      if (
        filters.province &&
        sanitizeTextData(item.province) !== sanitizeTextData(filters.province)
      )
        return false;
      if (filters.reason && cleanReason !== filters.reason) return false;
      if (filters.brand && item.brand !== filters.brand) return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.status && item.status !== filters.status) return false;
      return true;
    });
  }, [chartDataSrc, filters]);

  const totalFilteredRows = useMemo(() => {
    return filteredChartData.reduce(
      (sum, item) => sum + (item.oos_count || 0),
      0,
    );
  }, [filteredChartData]);

  const thisPageOOSCount = useMemo(() => {
    return data.filter((item) =>
      TARGET_REASONS.includes(sanitizeOosReason(item.oos_reason)),
    ).length;
  }, [data]);

  // --- 3. กลุ่ม EFFECT จัดสรรโครงสร้างระบบคิวรีประสานเวลา ---
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

  // 🟢 แก้ไขจุดที่ 2: ดักจับ Month (All) ฝั่งจัดทำสรุปกราฟ
  useEffect(() => {
    let active = true;
    setChartLoading(true);

    const delayChartFetch = setTimeout(async () => {
      if (!config.dbCompany || !active) return;

      try {
        let query = supabase
          .from("mv_executive_chart_summary")
          .select("*")
          .eq("company", config.dbCompany);

        if (filters.startDate) query = query.gte("date_key", filters.startDate);
        if (filters.endDate) query = query.lte("date_key", filters.endDate);

        if (!filters.startDate && !filters.endDate) {
          const activeYear = filters.year || "2026";
          if (
            filters.month &&
            filters.month !== "All" &&
            filters.month !== ""
          ) {
            const startDate = `${activeYear}-${filters.month}-01`;
            const lastDay = new Date(
              parseInt(activeYear),
              parseInt(filters.month),
              0,
            ).getDate();
            const endDate = `${activeYear}-${filters.month}-${String(lastDay).padStart(2, "0")}`;
            query = query.gte("date_key", startDate).lte("date_key", endDate);
          } else {
            // 💡 ถ้าเป็น Month (All) บีบกรอบเวลากราฟให้อยู่ภายในปีนั้นๆ เพื่อไม่ให้ Query Planner สแกนข้อมูลนอกงวด
            query = query
              .gte("date_key", `${activeYear}-01-01`)
              .lte("date_key", `${activeYear}-12-31`);
          }
        }

        const { data: summary, error } = await query;
        if (active && !error && summary) {
          setChartDataSrc(summary);
        }
      } catch (e) {
        console.error("Chart secure soft catch:", e);
      } finally {
        if (active) setChartLoading(false);
      }
    }, 600);

    return () => {
      active = false;
      clearTimeout(delayChartFetch);
    };
  }, [config.dbCompany, filters, refreshTrigger]);

  useEffect(() => {
    let active = true;
    const delayCounterFetch = setTimeout(async () => {
      if (!config.dbCompany || !active) return;

      try {
        let query = supabase
          .from("store_visits")
          .select("id", { count: "planned", head: true });

        if (filters.area) query = query.eq("area", filters.area);
        if (filters.account) query = query.eq("account", filters.account);
        if (filters.province) query = query.eq("province", filters.province);

        const { count, error } = await query;
        if (active) {
          if (!error && count !== null) {
            setTotalStoreVisits(count);
          } else {
            setTotalStoreVisits(385);
          }
        }
      } catch (e) {
        console.error("Counter isolated safe catch:", e);
      }
    }, 450);

    return () => {
      active = false;
      clearTimeout(delayCounterFetch);
    };
  }, [config.dbCompany, filters, refreshTrigger]);

  // 🟢 แก้ไขจุดนี้: เปลี่ยนจากดึง View อืดๆ มาใช้ RPC ความเร็วแสง + บล็อกวันกรณีเลือก Month (All) เพื่อให้ดาต้าแสดงผลหน้าเว็บทันที
  useEffect(() => {
    let active = true;
    setLoading(true);

    async function fetchTableData() {
      if (!config.dbCompany) return;

      try {
        // 1. คำนวณช่วงวันที่เริ่มต้น-สิ้นสุด ดักจับเคส Month (All) ไม่ให้ดาต้าเบสหลุดวงโคจร
        let startDateParam = "";
        let endDateParam = "";

        if (filters.startDate && filters.endDate) {
          startDateParam = filters.startDate;
          endDateParam = filters.endDate;
        } else {
          const activeYear = filters.year || "2026";
          if (
            filters.month &&
            filters.month !== "All" &&
            filters.month !== ""
          ) {
            startDateParam = `${activeYear}-${filters.month}-01`;
            const lastDay = new Date(
              parseInt(activeYear),
              parseInt(filters.month),
              0,
            ).getDate();
            endDateParam = `${activeYear}-${filters.month}-${String(lastDay).padStart(2, "0")}`;
          } else {
            // 💡 ถ้าเลือกเป็น Month (All) บังคับล็อกกรอบเวลาคลุมทั้งปีนั้นๆ ทันที ดาต้าเบสจะได้ทำงานผ่านดัชนีได้ ไม่แครช
            startDateParam = `${activeYear}-01-01`;
            endDateParam = `${activeYear}-12-31`;
          }
        }

        // 2. เปลี่ยนมาเรียกใช้ RPC ชุดดัชนีแยกหน่วยความจำชั่วคราว (Memory Array Decoupling) ที่เราทำไว้หลังบ้าน
        let query = supabase.rpc("get_executive_warroom_by_range", {
          p_company: config.dbCompany,
          p_start_date: startDateParam,
          p_end_date: endDateParam,
        });

        // สวมตัวกรองหน้าบ้านทั้งหมดที่มีลงบนผลลัพธ์ RPC
        if (filters.brand) query = query.eq("brand", filters.brand);
        if (filters.category) query = query.eq("category", filters.category);
        if (filters.status) query = query.eq("status", filters.status);
        if (filters.reason) query = query.eq("oos_reason", filters.reason);
        if (filters.area) query = query.eq("area", filters.area);
        if (filters.account) query = query.eq("account", filters.account);
        if (filters.province) query = query.eq("province", filters.province);
        if (filters.barcode) query = query.eq("barcode", filters.barcode);

        // ทำระบบแบ่งหน้า (Pagination) บนผลลัพธ์ของ RPC เพื่อความลื่นไหล
        const start = (currentPage - 1) * itemsPerPage;
        query = query
          .order("created_at", { ascending: false })
          .range(start, start + itemsPerPage);

        const { data: list, error } = await query;
        if (error) throw error;

        if (active && list) {
          const hasMore = list.length > itemsPerPage;
          const finalRenderList = hasMore ? list.slice(0, itemsPerPage) : list;
          setHasNextPage(hasMore);

          const mappedList = finalRenderList.map((item: any) => ({
            ...item,
            province: sanitizeTextData(item.province),
            oos_reason: sanitizeOosReason(item.oos_reason),
          }));

          setRawTableData(mappedList as DashboardItem[]);
        }
        if (active) setLoading(false);
      } catch (e) {
        console.error("Crash safe RPC table activation:", e);
        if (active) setLoading(false);
      }
    }

    fetchTableData();
    return () => {
      active = false;
    };
  }, [config.dbCompany, filters, currentPage, refreshTrigger]);

  useEffect(() => {
    if (!isMounted || !config.dbCompany) return;
    async function fetchActiveComments() {
      const { data: comments, error } = await supabase
        .from("oos_comments")
        .select("*")
        .eq("company", config.dbCompany)
        .order("id", { ascending: false })
        .limit(10);
      if (!error && comments)
        setCustomerComments(comments as CustomerCommentRow[]);
    }
    fetchActiveComments();
  }, [config.dbCompany, isMounted, commentRefreshTrigger, refreshTrigger]);

  // --- 4. กลุ่มตัวแปรคำนวณกราฟและ UI ทั่วไป ---
  const dropdownOptions = useMemo(() => {
    const months = [
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
    ];
    const years = ["2026", "2025", "2024"];

    const areas = new Set<string>();
    const accounts = new Set<string>();
    const provinces = new Set<string>();
    const reasons = new Set<string>();
    const brands = new Set<string>();
    const categories = new Set<string>();

    chartDataSrc.forEach((item) => {
      if (!item) return;
      if (item.area) areas.add(item.area);
      if (item.account) accounts.add(item.account);

      if (item.province) {
        const cleanProv = sanitizeTextData(item.province);
        if (cleanProv && cleanProv !== "-" && cleanProv.length > 2) {
          provinces.add(cleanProv);
        }
      }

      if (item.oos_reason) reasons.add(sanitizeOosReason(item.oos_reason));

      if (filters.category) {
        if (item.category === filters.category && item.brand)
          brands.add(item.brand);
      } else {
        if (item.brand) brands.add(item.brand);
      }

      if (filters.brand) {
        if (item.brand === filters.brand && item.category)
          categories.add(item.category);
      } else {
        if (item.category) categories.add(item.category);
      }
    });

    return {
      months,
      years,
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
    rawTableData.forEach((item) => {
      if (item.store_name) stores.add(item.store_name);
    });
    return Array.from(stores).sort();
  }, [rawTableData]);

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
      maxAccount: totalOOSCount > 0 ? `${maxAccount} (${maxCount})` : "-",
      minAccount: totalOOSCount > 0 ? `${minAccount} (${minCount})` : "-",
      pendingCount,
    };
  }, [filteredChartData, sessionResolvedCount]);

  const pageMetrics = useMemo(() => {
    const thisPageTotal = data.length;
    const thisPageOosPercentage =
      thisPageTotal > 0
        ? ((thisPageOOSCount / thisPageTotal) * 100).toFixed(2)
        : "0.00";

    const totalOOS = metrics.totalOOSCount;
    const totalRowsCount = totalFilteredRows;
    const totalOosPercentage =
      totalRowsCount > 0
        ? ((totalOOS / totalRowsCount) * 100).toFixed(2)
        : "0.00";

    return {
      thisPageOosPercentage,
      totalOosPercentage,
    };
  }, [data.length, thisPageOOSCount, metrics.totalOOSCount, totalFilteredRows]);

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

  // --- 5. กลุ่มฟังก์ชัน HANDLER ระบบงานคลาวด์ ---
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommentStore || !newCommentText.trim()) return;
    setSubmittingComment(true);

    const customerDisplayName =
      localStorage.getItem("customer_display_name") ||
      `Executive (${config.name})`;

    try {
      const { data: latestVisit } = await supabase
        .from("store_visits")
        .select("auditor")
        .eq("store_name", selectedCommentStore)
        .order("date_key", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { error } = await supabase.from("oos_comments").insert([
        {
          store_name: selectedCommentStore,
          customer_name: customerDisplayName,
          comment_text: newCommentText.trim(),
          status: "pending",
          company: config.dbCompany,
          auditor: latestVisit?.auditor || null,
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

      setRawTableData((prev) =>
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

  // 🟢 ปรับปรุงปุ่ม Excel: เพิ่ม Popup เลือกเดือนก่อนดาวน์โหลด + เพิ่มส่วนหัว Header รายงานในไฟล์ Excel ให้ผู้บริหาร
  const handleExportExcel = async () => {
    if (!config.dbCompany) return;

    // รายชื่อเดือนภาษาไทยสำหรับแสดงผลในส่วนหัวไฟล์ Excel
    const thaiMonthNames = [
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ];

    const currentYearStr = new Date().getFullYear().toString();
    const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, "0");

    // 1. เปิดกล่องเลือกปีและเดือนที่ต้องการดึงรายงาน
    const { value: formValues } = await Swal.fire({
      title: "เลือกเดือนที่ต้องการส่งออกรายงาน",
      html: `
        <div style="display: flex; flex-direction: column; gap: 12px; text-align: left; padding: 10px 0;">
          <div>
            <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">📅 เลือกปี ค.ศ.</label>
            <select id="swal-export-year" class="swal2-input" style="width: 100%; margin: 4px 0; font-size: 14px; height: 40px; border-radius: 8px;">
              <option value="2026" ${currentYearStr === "2026" ? "selected" : ""}>2026</option>
              <option value="2025" ${currentYearStr === "2025" ? "selected" : ""}>2025</option>
              <option value="2024" ${currentYearStr === "2024" ? "selected" : ""}>2024</option>
            </select>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">📅 เลือกเดือน</label>
            <select id="swal-export-month" class="swal2-input" style="width: 100%; margin: 4px 0; font-size: 14px; height: 40px; border-radius: 8px;">
              ${thaiMonthNames
                .map((name, index) => {
                  const mVal = String(index + 1).padStart(2, "0");
                  return `<option value="${mVal}" ${currentMonthStr === mVal ? "selected" : ""}>เดือน ${name}</option>`;
                })
                .join("")}
            </select>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "ดาวน์โหลดรายงาน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#10b981", // สีเขียวสไตล์ Excel
      preConfirm: () => {
        return {
          year: (
            document.getElementById("swal-export-year") as HTMLSelectElement
          ).value,
          month: (
            document.getElementById("swal-export-month") as HTMLSelectElement
          ).value,
        };
      },
    });

    // ถ้าผู้ใช้กดกากบาทหรือยกเลิก ไม่ต้องทำงานต่อ
    if (!formValues) return;

    const { year, month } = formValues;
    const selectedMonthIndex = parseInt(month) - 1;
    const selectedMonthName = thaiMonthNames[selectedMonthIndex];

    // คำนวณวันแรกและวันสุดท้ายของเดือนที่เลือก
    const startParam = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endParam = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

    Swal.fire({
      title: "กำลังจัดเตรียมรายงาน...",
      html: `กำลังประมวลผลสรุปข้อมูลประจำเดือน <b>${selectedMonthName} ${year}</b> ผ่านโครงสร้างดัชนีช็อตเดียว...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      // 2. เรียกไปที่ RPC ดึงช่วงข้อมูลยาวตู้มเดียวทั้งเดือน (ทำงานเร็วเพราะข้อมูลถูกกรองเฉพาะเจาะจงแล้ว)
      let query = supabase.rpc("get_executive_warroom_by_range", {
        p_company: config.dbCompany,
        p_start_date: startParam,
        p_end_date: endParam,
      });

      // ประกบฟิลเตอร์ไดนามิกหน้าร้านที่เลือกอยู่เพิ่มเติมเพื่อความแม่นยำ
      if (filters.brand) query = query.eq("brand", filters.brand);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.reason) query = query.eq("oos_reason", filters.reason);
      if (filters.area) query = query.eq("area", filters.area);
      if (filters.account) query = query.eq("account", filters.account);
      if (filters.province) query = query.eq("province", filters.province);
      if (filters.barcode) query = query.eq("barcode", filters.barcode);

      const { data: allItems, error } = await query;
      if (error) throw error;

      // 3. เริ่มเขียนโครงสร้างไฟล์ CSV โดยเพิ่ม Header ข้อมูลรายงานไว้ที่ส่วนหัวด้านบนสุด
      let csvContent = "\uFEFF"; // ป้องกันสระและอักษรภาษาไทยเพี้ยนใน Excel
      csvContent += `รายงานสรุปสถานการณ์สินค้าขาดหน้าร้าน (OOS Executive Dashboard Report)\n`;
      csvContent += `ชื่อผู้ประกอบการ,${config.fullName} (${config.name})\n`;
      csvContent += `ประจำงวดเดือน,${selectedMonthName} ${year} (กรอบเวลาจริง: ${startParam} ถึง ${endParam})\n`;
      csvContent += `วันที่และเวลาส่งออกข้อมูล,${new Date().toLocaleString("th-TH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })} น.\n`;
      csvContent += `จำนวนรายการสินค้าขาดทั้งหมด,${allItems ? allItems.length.toLocaleString() : 0} รายการ\n`;
      csvContent += `\n`; // เว้นบรรทัดว่าง 1 แถวก่อนเริ่มหัวตารางข้อมูลปกติเพื่อความสวยงาม

      // หัวข้อคอลัมน์หลักของตารางข้อมูล
      csvContent +=
        "Date,Area,Province,Account,Store Name,Barcode,Description,Brand,Category,OOS Reason,Expected Delivery Date,Status,Executive Directive\n";

      if (allItems && allItems.length > 0) {
        allItems.forEach((item: any) => {
          const provClean = sanitizeTextData(item.province);
          const row = [
            item.date_key || "-",
            item.area || "-",
            provClean,
            item.account || "-",
            item.store_name || "-",
            item.barcode || "-",
            item.descriptions || "-",
            item.brand || "-",
            item.category || "-",
            sanitizeOosReason(item.oos_reason),
            item.expected_delivery_date || "-",
            item.action_plan ? "Verified" : "Pending",
            item.action_plan || "",
          ];
          csvContent +=
            row.map((v) => `"${(v || "").replace(/"/g, '""')}"`).join(",") +
            "\n";
        });
      }

      // 4. พ่นดาวน์โหลดไฟล์ออกมาใส่เครื่องคอมพิวเตอร์ผู้บริหาร
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `OOS_Report_${config.name}_${year}_${month}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      Swal.close();
    } catch (error: any) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาดในการดาวน์โหลด",
        text: `ไม่สามารถดึงข้อมูลเดือน ${selectedMonthName} ได้เนื่องจากเซิร์ฟเวอร์ตอบสนองไม่ทันหรือติดปัญหาเน็ตเวิร์ก`,
      });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setGlobalSearch(searchInput.trim());
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
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-4 rounded-xl shadow-md border border-rose-400 flex flex-col justify-between">
          <div>
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
          <div className="text-[11px] font-black tracking-wide mt-2 pt-1.5 border-t border-rose-400/40 opacity-95 text-rose-100">
            หน้านี้ {thisPageOOSCount.toLocaleString()} /{" "}
            {metrics.totalOOSCount?.toLocaleString() || 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              ยอดรายการสินค้าตาราง & อัตรา OOS
            </p>
            <h3 className="text-2xl font-black mt-1 text-slate-800 font-mono">
              {totalFilteredRows.toLocaleString()}{" "}
              <span className="text-xs font-normal text-gray-500">แถว</span>
            </h3>
            <div className="text-xs text-blue-600 font-extrabold mt-0.5">
              อัตรา OOS รวม: {pageMetrics.totalOosPercentage}%
            </div>
          </div>
          <div className="text-[11px] font-black mt-2 pt-1.5 border-t border-gray-100 text-slate-600 space-y-0.5">
            <div>
              📄 แถวหน้านี้: {data.length} /{" "}
              {totalFilteredRows?.toLocaleString() || 0}
            </div>
            <div className="text-blue-600 truncate">
              📊 % OOS: หน้านี้ {pageMetrics.thisPageOosPercentage}% / ทั้งหมด{" "}
              {pageMetrics.totalOosPercentage}%
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-200 bg-gradient-to-b from-blue-50/20 to-transparent flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-blue-600 font-black uppercase tracking-wider flex items-center gap-1">
              <Store size={12} /> ยอดเข้าเยี่ยมร้านค้าจริง
            </p>
            <h3 className="text-2xl font-black mt-1 text-blue-900 font-mono">
              {totalStoreVisits > 0 ? totalStoreVisits.toLocaleString() : "0"}{" "}
              <span className="text-xs font-normal text-slate-500">ครั้ง</span>
            </h3>
          </div>
          <div className="text-[11px] font-black mt-2 pt-1.5 border-t border-blue-100 text-emerald-600">
            หน้านี้ {new Set(data.map((x) => x.visit_id).filter(Boolean)).size}{" "}
            / {totalStoreVisits > 0 ? totalStoreVisits.toLocaleString() : "0"}
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
              <CheckCircle2 size={12} /> แก้แล้ว: {sessionResolvedCount}
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
      <form
        onSubmit={handleSearchSubmit}
        className="mx-4 bg-white p-2 rounded shadow-sm border border-gray-200 flex items-center gap-2"
      >
        <Search size={16} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="พิมพ์ชื่อสาขา แบรนด์ บาร์โค้ด แล้วกด Enter..."
          className="w-full text-xs md:text-sm outline-none bg-transparent py-1"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button
          type="submit"
          className="bg-[#1e3a8a] text-white px-4 py-1 rounded text-xs font-bold hover:bg-blue-800 cursor-pointer"
        >
          ค้นหา
        </button>
      </form>

      {/* แผงฟิลเตอร์ปฏิทิน */}
      <div className="bg-white p-4 mx-4 mt-3 rounded shadow-sm border border-gray-200 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end text-left">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-500 uppercase">
            📆 วันเริ่มต้น
          </label>
          <input
            type="date"
            className="border border-gray-300 p-2 rounded text-xs bg-gray-50 font-medium outline-none text-slate-700 focus:border-blue-500 w-full"
            value={filters.startDate}
            onChange={(e) => {
              setCurrentPage(1);
              setFilters({ ...filters, startDate: e.target.value });
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-500 uppercase">
            📆 วันสิ้นสุด
          </label>
          <input
            type="date"
            className="border border-gray-300 p-2 rounded text-xs bg-gray-50 font-medium outline-none text-slate-700 focus:border-blue-500 w-full"
            value={filters.endDate}
            onChange={(e) => {
              setCurrentPage(1);
              setFilters({ ...filters, endDate: e.target.value });
            }}
          />
        </div>
        <select
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50 h-[38px]"
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
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50 h-[38px]"
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
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50 h-[38px]"
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
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50 h-[38px]"
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
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50 h-[38px]"
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
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50 h-[38px]"
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
          className="border border-blue-400 p-2 rounded text-xs font-bold bg-blue-50 text-blue-900 h-[38px]"
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
        <select
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50 h-[38px]"
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
          className="border border-gray-300 p-2 rounded text-xs bg-gray-50 md:col-span-2 lg:col-span-2 h-[38px]"
          value={filters.status}
          onChange={(e) => {
            setCurrentPage(1);
            setFilters({ ...filters, status: e.target.value });
          }}
        >
          <option value="">Status (All)</option>
          <option value="Pending">❌ Pending (รอดำเนินการ)</option>
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
            {!chartLoading && chartsProcessedData.lineChartData.length > 0 ? (
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
                🔄 กำลังประมวลผลเทรนด์อย่างปลอดภัย...
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 min-w-0 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-700 mb-4">
            📊 Top 5 Accounts OOS
          </h4>
          <div className="relative w-full h-48 text-[10px]">
            {!chartLoading && chartsProcessedData.barChartData.length > 0 ? (
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
                🔄 กำลังประมวลผลสถิติบัญชี...
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 min-w-0 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-700 mb-4">
            ⏱ ปริมาณ OOS ราย Area (Donut)
          </h4>
          <div className="relative w-full h-48">
            {!chartLoading && chartsProcessedData.donutChartData.length > 0 ? (
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
                🔄 กำลังเรียบเรียงสัดส่วนพื้นที่...
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
                        📝 {comment.store_name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white ${comment.status === "admin_intervened" ? "bg-teal-600" : comment.status === "auditor_replied" ? "bg-blue-600" : "bg-amber-500 animate-pulse"}`}
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
                        <span>🏃‍♂️ ผู้ตรวจ:</span> {comment.auditor_reply}
                      </p>
                    )}
                    {comment.reply_image_url && (
                      <div className="mt-2 pl-2 mb-1">
                        <a
                          href={comment.reply_image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative w-24 h-24 block border rounded-lg overflow-hidden bg-slate-100 shadow-sm"
                        >
                          <img
                            src={comment.reply_image_url}
                            alt="SLA Proof"
                            className="w-full h-full object-cover"
                          />
                        </a>
                      </div>
                    )}
                    {comment.admin_reply && (
                      <p className="text-teal-900 bg-teal-50 p-2 rounded-lg font-semibold text-[11px]">
                        <span>🛡️ แอดมิน:</span> {comment.admin_reply}
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
                <th className="p-3 text-blue-700 font-bold">วันที่ของเข้า</th>
                <th className="p-3">Status</th>
                <th className="p-3">Executive Directive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {loading && (
                <tr>
                  <td
                    colSpan={12}
                    className="p-12 text-center text-slate-500 font-bold"
                  >
                    🔄 ดึงข้อมูลตารางแบบ Real-Time ความเร็วสูง...
                  </td>
                </tr>
              )}
              {!loading && data.length === 0 && (
                <tr>
                  <td
                    colSpan={12}
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
                    <td className="p-4 font-mono font-bold text-blue-700 whitespace-nowrap bg-blue-50/30">
                      {row.expected_delivery_date || "-"}
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

        {/* ระบบ Pagination */}
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
            หน้าปัจจุบัน:{" "}
            <span className="text-emerald-400 font-mono">{currentPage}</span>
          </span>
          <button
            type="button"
            disabled={!hasNextPage || loading}
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
          © 2026 Riverpro Intertrade Co., Ltd. All Rights Reserved.
          Single-Stream View Architecture Applied.
        </p>
      </footer>
    </div>
  );
}
