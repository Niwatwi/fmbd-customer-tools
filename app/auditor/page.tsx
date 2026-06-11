/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase as supabaseClient } from "../../lib/supabase";
import Swal from "sweetalert2";

const supabase = supabaseClient as any;

interface VisitRow {
  id: number;
  created_at: string;
  store_name: string;
  store_province: string;
  type: string;
  date_key?: string;
}

interface PortalCommentAlert {
  id: number;
  store_name: string;
  customer_name: string;
  comment_text: string;
  created_at: string;
  status: string;
}

export default function AuditorMainPortalPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [fetchingData, setFetchingData] = useState<boolean>(true);

  const [auditorCode, setAuditorCode] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [companyTag, setCompanyTag] = useState<string>("");

  const [myTotalStores, setMyTotalStores] = useState<number>(0);
  const [myTodayVisits, setMyTodayVisits] = useState<number>(0);
  const [myRecentVisits, setMyRecentVisits] = useState<VisitRow[]>([]);

  const [pendingComments, setPendingComments] = useState<PortalCommentAlert[]>(
    [],
  );
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [isReplyingInPortal, setIsReplyingInPortal] = useState<number | null>(
    null,
  );

  useEffect(() => {
    // 🎫 ดึงค่าแกะจากระบบเซสชันตัวใหม่ของพอร์ทัลหลัก
    const userRole = sessionStorage.getItem("user_role") || "";
    const code =
      sessionStorage.getItem("user_username") ||
      localStorage.getItem("customer_username") ||
      "";
    const name =
      sessionStorage.getItem("user_display_name") ||
      localStorage.getItem("customer_display_name") ||
      "";
    const tag =
      sessionStorage.getItem("user_company") ||
      localStorage.getItem("customer_company_tag") ||
      "AUDITOR";

    startTransition(() => {
      if (userRole !== "auditor" && userRole !== "admin") {
        window.location.href = "https://fmbd-customer-tools.vercel.app/login";
      } else {
        setAuditorCode(code || "");
        setDisplayName(name || "พนักงานภาคสนาม");
        setCompanyTag(tag.toUpperCase());
        setIsAuthorized(true);
      }
    });
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    if (!auditorCode) {
      setFetchingData(false);
      return;
    }

    const fetchMyPersonalDashboard = async () => {
      setFetchingData(true);
      const todayStr = new Date().toISOString().split("T")[0];
      const cleanUserCode = auditorCode.trim().toUpperCase();
      const cleanTag = companyTag.trim().toUpperCase();

      try {
        const { data: allStores, error: storeErr } = await supabase
          .from("stores")
          .select("*");

        if (storeErr) throw storeErr;

        let filteredStores = allStores || [];

        if (!cleanTag.includes("ADMIN") && !cleanUserCode.includes("ADMIN")) {
          const matchKoeArea =
            cleanUserCode.match(/K0[1-8]/) || cleanTag.match(/K0[1-8]/);

          if (matchKoeArea) {
            filteredStores = filteredStores.filter(
              (s: any) => s.area?.toUpperCase() === matchKoeArea[0],
            );
          } else if (
            cleanUserCode.startsWith("C") &&
            cleanUserCode.length >= 3
          ) {
            const areaNum = cleanUserCode.substring(1, 3);
            filteredStores = filteredStores.filter(
              (s: any) => s.area?.toUpperCase() === `K${areaNum}`,
            );
          } else if (cleanUserCode.startsWith("M")) {
            filteredStores = filteredStores.filter(
              (s: any) => s.mer_code?.toUpperCase() === cleanUserCode,
            );
          }
        }

        const managedStoreNames = filteredStores
          ? filteredStores
              .map((s: any) => {
                if (!s.store_name) return "";
                return s.store_name.replace(/["']/g, "").trim();
              })
              .filter(Boolean)
          : [];

        const managedStoreIds = filteredStores.map((s: any) => s.id);

        let todayVisitsCount = 0;
        let recentVisitsList: VisitRow[] = [];

        if (managedStoreIds.length > 0) {
          const { count } = await supabase
            .from("attendance_logs")
            .select("*", { count: "exact", head: true })
            .in("store_id", managedStoreIds)
            .gte("created_at", `${todayStr}T00:00:00.000Z`)
            .lte("created_at", `${todayStr}T23:59:59.999Z`);

          todayVisitsCount = count || 0;

          const { data: recentData } = await supabase
            .from("attendance_logs")
            .select("id, created_at, store_name, store_province, type")
            .in("store_id", managedStoreIds)
            .order("id", { ascending: false })
            .limit(5);

          if (recentData) {
            recentVisitsList = recentData.map((r: any) => ({
              id: r.id,
              date_key: new Date(r.created_at).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
              store_name: r.store_name,
              store_province: r.store_province,
              type: r.type,
            })) as unknown as VisitRow[];
          }
        }

        let activeAlerts: PortalCommentAlert[] = [];

        if (filteredStores.length > 0) {
          const { data: allPendingComments } = await supabase
            .from("oos_comments")
            .select(
              "id, store_name, customer_name, comment_text, created_at, status",
            )
            .eq("status", "pending")
            .order("id", { ascending: false });

          if (allPendingComments) {
            if (cleanTag.includes("ADMIN") || cleanUserCode.includes("ADMIN")) {
              activeAlerts = allPendingComments as PortalCommentAlert[];
            } else {
              activeAlerts = allPendingComments.filter((comment: any) =>
                managedStoreNames.includes(
                  comment.store_name?.replace(/["']/g, "").trim(),
                ),
              ) as PortalCommentAlert[];
            }
          }
        }

        setMyTotalStores(filteredStores.length);
        setMyTodayVisits(todayVisitsCount);
        setMyRecentVisits(recentVisitsList);
        setPendingComments(activeAlerts);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setFetchingData(false);
      }
    };

    fetchMyPersonalDashboard();
  }, [isAuthorized, auditorCode, companyTag]);

  const handlePortalQuickReply = async (commentId: number) => {
    const text = replyTexts[commentId]?.trim();
    if (!text) return;

    setIsReplyingInPortal(commentId);
    try {
      const { error } = await supabase
        .from("oos_comments")
        .update({
          auditor_reply: text,
          status: "auditor_replied",
        })
        .eq("id", commentId);

      if (error) throw error;

      setPendingComments((prev) => prev.filter((c) => c.id !== commentId));
      Swal.fire({
        icon: "success",
        title: "ส่งคำชี้แจงสำเร็จ!",
        text: "ส่งสัญญาณอัปเดตเข้าวอร์รูมผู้บริหารเรียบร้อยครับพี่!",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถอัปเดตข้อมูลได้ในขณะนี้", "error");
    } finally {
      setIsReplyingInPortal(null);
    }
  };

  const handleBackToMain = () => {
    Swal.fire({
      title: "กลับสู่หน้าหลัก?",
      text: "ระบบจะพาท่านกลับไปยังหน้าศูนย์รวมเครื่องมือพอร์ทัลกลางควบคุมงานหลักครับพี่",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ตกลง",
      cancelButtonText: "ยกเลิก",
    }).then((result) => {
      if (result.isConfirmed) {
        // 🟢 เด้งกลับมาหน้าควบคุมหลักในเครือข่ายตัวเองแบบถาวร เซสชันไม่หลุด
        window.location.href = "https://fmbd-customer-tools.vercel.app";
      }
    });
  };

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-slate-100 font-sans antialiased max-w-md mx-auto relative pb-8 flex flex-col justify-between">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      />

      <div>
        {/* TOP HEADER PORTAL */}
        <div className="relative bg-white pt-6 pb-5 px-5 rounded-b-[2.5rem] shadow-md border-b border-slate-200">
          <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-blue-600 to-teal-400"></div>

          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <img
                src="/rvp.png"
                alt="Riverpro Logo"
                className="h-8 w-auto object-contain"
              />
              <div className="text-left">
                <h1 className="text-xs font-black text-slate-800 tracking-tight uppercase">
                  AUDITOR CENTRAL HUB
                </h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  War Room Personal Window
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleBackToMain}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer shadow-xs"
            >
              <i className="fa-solid fa-house-chimney text-[10px]"></i>{" "}
              กลับหน้าหลัก
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between mt-4">
            <div className="text-left">
              <span className="block text-[8px] font-black text-blue-600 uppercase tracking-widest">
                ยินดีต้อนรับทีมปฏิบัติการ
              </span>
              <span className="text-sm font-black text-slate-800">
                {displayName}
              </span>
            </div>
            <div className="text-right bg-blue-600 text-white font-mono font-black text-[10px] px-2.5 py-1 rounded-lg shadow-2xs">
              CODE: {auditorCode}
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-4">
          {/* ส่วนที่ 1: KPI FIX USER */}
          <div className="bg-linear-to-br from-slate-900 to-blue-950 rounded-2xl p-4 shadow-md text-slate-100">
            <h3 className="text-[10px] font-black tracking-wider uppercase text-blue-400 mb-3 flex items-center gap-1.5">
              <i className="fa-solid fa-square-poll-vertical"></i>{" "}
              สถิติติดตามงานของท่าน (My Fix-User KPI)
            </h3>

            {fetchingData ? (
              <div className="text-center py-2 text-[10px] text-slate-400 animate-pulse font-bold">
                🔄 กำลังประมวลผลดัชนีชี้วัด...
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase">
                    ห้างในความดูแล
                  </span>
                  <span className="text-base font-black text-white font-mono">
                    {myTotalStores}
                  </span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                  <span className="block text-[8px] font-bold text-amber-400 uppercase">
                    ตรวจแล้ววันนี้
                  </span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    {myTodayVisits}
                  </span>
                </div>
                <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-2 text-center">
                  <span className="block text-[8px] font-bold text-teal-400 uppercase">
                    อัตราความสำเร็จ
                  </span>
                  <span className="text-base font-black text-teal-400 font-mono">
                    {myTotalStores > 0
                      ? Math.min(
                          Math.round((myTodayVisits / myTotalStores) * 100),
                          100,
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ส่วนรับแจ้งเหตุด่วนรายเขต */}
          {!fetchingData &&
            (pendingComments.length > 0 ? (
              <div className="bg-amber-50 rounded-2xl shadow-sm p-4 border-2 border-amber-200 space-y-3">
                <div className="flex items-center gap-2 border-b border-amber-200 pb-2">
                  <i className="fa-solid fa-bell-on animate-bounce text-amber-600 text-sm"></i>
                  <h4 className="text-[11px] font-black text-amber-800 uppercase tracking-tight">
                    🚨 ด่วนที่สุด! มีข้อร้องเรียนค้างตอบ (
                    {pendingComments.length} เคส)
                  </h4>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {pendingComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-white p-3 rounded-xl border border-amber-100 text-left space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-[9px] font-bold">
                        <span className="text-blue-700 uppercase">
                          <i className="fa-solid fa-shop"></i>{" "}
                          {comment.store_name}
                        </span>
                        <span className="text-slate-400 font-normal">
                          โดย: {comment.customer_name}
                        </span>
                      </div>
                      <div className="text-[10.5px] font-bold text-slate-600 leading-tight italic bg-slate-50 p-2 rounded-lg">
                        &ldquo; {comment.comment_text} &rdquo;
                      </div>
                      <div className="flex gap-1 pt-1">
                        <input
                          type="text"
                          placeholder="พิมพ์ข้อความชี้แจงด่วน..."
                          value={replyTexts[comment.id] || ""}
                          onChange={(e) =>
                            setReplyTexts((prev) => ({
                              ...prev,
                              [comment.id]: e.target.value,
                            }))
                          }
                          className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handlePortalQuickReply(comment.id)}
                          disabled={isReplyingInPortal === comment.id}
                          className="bg-blue-600 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-black hover:bg-blue-700 transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer"
                        >
                          {isReplyingInPortal === comment.id
                            ? "..."
                            : "ส่งคำชี้แจง"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-200 text-emerald-800 text-[10px] font-black flex items-center justify-center gap-1.5">
                <i className="fa-solid fa-square-check text-emerald-600 text-sm"></i>{" "}
                ยอดเยี่ยม! ไม่พบเคสค้างตอบ รักษาเวลา SLA ได้ดีมาก
              </div>
            ))}

          {/* ส่วนที่ 2: หน้า INPUT LINK */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs text-left space-y-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <i className="fa-solid fa-pen-to-square text-blue-600"></i>{" "}
                บันทึกข้อมูลรายงานหน้าร้าน
              </h3>
            </div>
            <button
              type="button"
              onClick={() => router.push("/input")}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-sm active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <i className="fa-solid fa-file-circle-plus"></i>{" "}
              เข้าสู่หน้าฟอร์มส่งงาน (OOS Input)
            </button>
          </div>

          {/* ส่วนที่ 3: ประวัติการเยี่ยมร้าน */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs text-left space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <i className="fa-solid fa-clock-rotate-left text-indigo-600"></i>{" "}
              ประวัติการเยี่ยมร้านล่าสุด (My Dashboard)
            </h3>
            {fetchingData ? (
              <div className="text-center py-6 text-xs text-slate-400 font-medium">
                🔄 กำลังเรียกคืนรายงานดิบ...
              </div>
            ) : myRecentVisits.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                📭 ยังไม่มีประวัติการส่งงานของรหัสท่านในระบบ
              </div>
            ) : (
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-black text-slate-500 border-b border-slate-100 uppercase">
                      <th className="p-2.5">วันที่เข้าตรวจ</th>
                      <th className="p-2.5">ชื่อร้านค้า/สาขา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[11px] font-bold text-slate-700">
                    {myRecentVisits.map((visit: VisitRow) => (
                      <tr
                        key={visit.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="p-2.5 font-mono text-slate-400 text-[10px] whitespace-nowrap">
                          {visit.date_key}
                        </td>
                        <td className="p-2.5 truncate max-w-45">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-800">
                              {visit.store_name}
                            </span>
                            <span
                              className={`text-[8px] px-1.5 py-0.2 rounded-md font-extrabold border uppercase ${visit.type === "check-in" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}
                            >
                              {visit.type}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="mt-8 border-t border-slate-200 bg-white py-4 px-6 rounded-t-3xl text-center shadow-inner text-[10px] text-slate-500 font-medium space-y-1 mx-4">
        <p className="font-black text-slate-700 text-xs tracking-tight">
          by FMBD CONTROLLER
        </p>
        <p className="font-black text-slate-800 text-sm">Niwat Wiyasing</p>
        <p className="text-[8px] text-slate-300 font-bold pt-1">
          © 2026 Riverpro Intertrade Co., Ltd. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
