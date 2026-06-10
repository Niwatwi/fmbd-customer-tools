/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Swal from "sweetalert2";

interface CommentHistoryRow {
  id: number;
  created_at: string;
  comment_text: string;
  status: string;
  auditor_reply?: string;
}

export default function CustomerMainPortalPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [fetchingHistory, setFetchingHistory] = useState<boolean>(true);

  const [storeName, setStoreName] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [storeProvince, setStoreProvince] = useState<string>("");

  const [newComment, setNewComment] = useState<string>("");
  const [commentHistory, setCommentHistory] = useState<CommentHistoryRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const sName = sessionStorage.getItem("customer_store_name");
    const cName = sessionStorage.getItem("customer_name");
    const sProv =
      sessionStorage.getItem("customer_store_province") || "ไม่ระบุ";

    startTransition(() => {
      if (!sName || !cName) {
        router.push("/");
      } else {
        setStoreName(sName);
        setCustomerName(cName);
        setStoreProvince(sProv);
        setIsAuthorized(true);
      }
    });
  }, [router]);

  useEffect(() => {
    if (!isAuthorized || !storeName) return;

    const fetchMyStoreComments = async () => {
      setFetchingHistory(true);
      try {
        const { data, error } = await supabase
          .from("oos_comments")
          .select("id, created_at, comment_text, status, auditor_reply")
          .eq("store_name", storeName)
          .order("id", { ascending: false });

        if (error) throw error;
        setCommentHistory(data || []);
      } catch (err) {
        console.error("Error loading history:", err);
      } finally {
        setFetchingHistory(false);
      }
    };

    fetchMyStoreComments();
  }, [isAuthorized, storeName]);

  const handleSubmitComment = async (e: any) => {
    // ✅ ระบุประเภท e: any
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const cleanText = newComment.replace(/["']/g, "").trim();

    try {
      const { data, error } = await supabase
        .from("oos_comments")
        .insert([
          {
            store_name: storeName,
            customer_name: customerName,
            comment_text: cleanText,
            status: "pending",
          },
        ] as any)
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setCommentHistory((prev: any[]) => [
          data[0] as CommentHistoryRow,
          ...prev,
        ]); // ✅ ระบุประเภท prev: any[]
      }

      setNewComment("");
      Swal.fire({
        icon: "success",
        title: "ส่งเรื่องเรียบร้อย!",
        text: "ส่งสัญญานเตือนแจ้งทีมตรวจ (Auditor) เข้าแก้ไขปัญหาแล้วครับ",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire(
        "เกิดข้อผิดพลาด",
        "ไม่สามารถส่งข้อมูลเข้าสู่ระบบส่วนกลางได้",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExitPortal = () => {
    Swal.fire({
      title: "ออกจากระบบร้านค้า?",
      text: "ระบบจะเคลียร์เซสชันชั่วคราวเพื่อความปลอดภัยของข้อมูล",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0f172a",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ตกลง, ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
    }).then((result: any) => {
      // ✅ ระบุประเภท result: any
      if (result.isConfirmed) {
        sessionStorage.clear();
        router.push("/");
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
        {/* HEADER */}
        <div className="relative bg-white pt-6 pb-5 px-5 rounded-b-[2.5rem] shadow-md border-b border-slate-200">
          <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-slate-800 to-slate-500"></div>
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <div className="text-left">
                <h1 className="text-xs font-black text-slate-800 tracking-tight uppercase">
                  CUSTOMER WAR ROOM WINDOW
                </h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  แผงแจ้งเรื่องและติดตามสถานะสำหรับลูกค้า
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExitPortal}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
            >
              <i className="fa-solid fa-right-from-bracket text-[10px]"></i>{" "}
              ออกจากระบบ
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left space-y-1 mt-4">
            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">
              🏪 ร้านค้า / สาขาของท่าน
            </span>
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-slate-800">
                {storeName}
              </span>
              <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                📍 {storeProvince}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium pt-0.5">
              ผู้ลงชื่อแจ้ง: {customerName}
            </p>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs text-left space-y-3">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                <i className="fa-solid fa-paper-plane text-slate-700"></i>{" "}
                แจ้งสินค้า OOS / ปัญหาและข้อร้องเรียน
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                ระบุยี่ห้อสินค้า ขนาด
                หรือพื้นที่จุดวางที่ต้องการให้เจ้าหน้าที่เข้ามาตรวจสอบโดยด่วน
              </p>
            </div>

            <form onSubmit={handleSubmitComment} className="space-y-2">
              <textarea
                rows={3}
                required
                placeholder="พิมพ์ข้อความที่ต้องการแจ้ง เช่น 'กระดาษทิชชูริเวอร์โปรแบบม้วนหนาพิเศษหมดบนชั้นวาง รบกวนเติมของด่วนครับ'..."
                value={newComment}
                onChange={(e: any) => setNewComment(e.target.value)} // ✅ ระบุประเภท e: any
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-slate-800 resize-none leading-relaxed"
              ></textarea>
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <i className="fa-solid fa-circle-notch animate-spin"></i>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane"></i>{" "}
                    ส่งรายงานเข้าระบบทันที
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs text-left space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <i className="fa-solid fa-clock-rotate-left text-slate-600"></i>{" "}
              ประวัติและสถานะการดำเนินการ
            </h3>

            {fetchingHistory ? (
              <div className="text-center py-6 text-xs text-slate-400 font-medium">
                🔄 กำลังดึงประวัติของท่าน...
              </div>
            ) : commentHistory.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                🎉 สาขาของท่านยังไม่มีประวัติการแจ้งปัญหาค้างในระบบ
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {commentHistory.map(
                  (
                    item: any, // ✅ ระบุประเภท item: any
                  ) => (
                    <div
                      key={item.id}
                      className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2"
                    >
                      <div className="flex justify-between items-center text-[9px] font-black">
                        <span className="text-slate-400">
                          {new Date(item.created_at).toLocaleDateString(
                            "th-TH",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md uppercase text-[8px] font-extrabold border ${
                            item.status === "pending"
                              ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                              : "bg-emerald-50 text-emerald-600 border-emerald-200"
                          }`}
                        >
                          {item.status === "pending"
                            ? "⏳ รอตรวจสอบ"
                            : "✅ ดำเนินการแล้ว"}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold text-slate-700 leading-tight italic bg-white p-2 rounded-lg border border-slate-100">
                        &ldquo; {item.comment_text} &rdquo;
                      </p>

                      {item.auditor_reply && (
                        <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-lg p-2 text-[10.5px] font-bold space-y-0.5">
                          <span className="block text-[8px] uppercase tracking-wider text-blue-600 font-black">
                            📢 ข้อความชี้แจงจากเจ้าหน้าที่ตรวจเขต:
                          </span>
                          <p className="leading-tight text-slate-700">
                            {item.auditor_reply}
                          </p>
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>

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
