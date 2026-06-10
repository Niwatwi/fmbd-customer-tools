/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function CustomerDashboardHubPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>("");
  const [companyTag, setCompanyTag] = useState<string>("");
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    // 🔍 ดึงตั๋วเซสชันที่ได้จากการล็อกอินด้วยอีเมลในหน้า /login
    const storedUser = localStorage.getItem("customer_username");
    const storedName = localStorage.getItem("customer_display_name");
    const storedTag = localStorage.getItem("customer_company_tag");

    // 🛡️ ระบบความปลอดภัย: หากยังไม่ได้ล็อกอิน ให้ดีดกลับไปหน้า Login ทันที
    if (!storedUser || !storedName) {
      router.push("/login");
      return;
    }

    setDisplayName(storedName);
    setCompanyTag(storedTag || "RVP");
    setIsReady(true);
  }, [router]);

  const handleLogout = () => {
    Swal.fire({
      title: "ออกจากระบบคู่ค้า?",
      text: "ระบบจะล้างข้อมูลเซสชันชั่วคราวเพื่อความปลอดภัย",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0f172a",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ตกลง",
      cancelButtonText: "ยกเลิก",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.clear();
        router.push("/login");
      }
    });
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-xs font-bold text-slate-500 animate-pulse">
          🔄 กำลังตรวจสอบสิทธิ์เข้าใช้งานระบบส่วนกลาง...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans antialiased max-w-md mx-auto flex flex-col justify-between pb-6">
      <div>
        {/* TOP BAR HEADER */}
        <header className="bg-white border-b border-slate-200 py-4 px-5 flex justify-between items-center shadow-xs rounded-b-2xl">
          <span className="text-slate-800 font-black text-sm tracking-wider uppercase">
            RIVERPRO CUSTOMER PORTAL
          </span>
          <div className="flex items-center space-x-3">
            <div className="text-right text-xs">
              <p className="font-bold text-slate-800 flex items-center gap-1 justify-end">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                {displayName}
              </p>
              <p className="text-slate-400 font-black text-[9px] uppercase tracking-wider">
                {companyTag} Partner
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer border border-slate-100"
              title="ออกจากระบบ"
            >
              <i className="fa-solid fa-right-from-bracket text-xs"></i>
            </button>
          </div>
        </header>

        {/* MAIN HUB WORKSPACE */}
        <main className="px-4 pt-5 space-y-5">
          {/* PREMIUM WELCOME CARD */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-md relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8"></div>
            <span className="text-[8px] font-black bg-white/10 text-white px-2.5 py-0.5 rounded-md border border-white/5 uppercase tracking-wider inline-block">
              ✨ Customer Workspace
            </span>
            <h2 className="text-sm font-black tracking-wide pt-2">
              สวัสดีครับ, {displayName} 👋
            </h2>
            <p className="text-[10px] text-slate-300 font-medium leading-relaxed opacity-90 pt-0.5">
              ยินดีต้อนรับเข้าสู่ศูนย์กลางระบบติดตามงาน คัดกรองดัชนีชี้วัด
              และกระดานรายงานสถานการณ์หน้าร้านสำหรับกลุ่มพันธมิตรผู้ค้า
            </p>
          </div>

          {/* APPLICATIONS LINK GRID */}
          <div className="space-y-2.5">
            <h3 className="text-[9px] font-black text-slate-400 tracking-wider uppercase text-left pl-1">
              <i className="fa-solid fa-layer-group text-slate-500 mr-1"></i>{" "}
              แผงควบคุมและเครื่องมือบริการ
            </h3>

            <div className="grid grid-cols-1 gap-2.5 text-left">
              {/* 1. OOS Reports (War Room ลิงก์ Dynamic) */}
              <div
                onClick={() => router.push("/oos-warroom")}
                className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-4 shadow-xs transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xs">
                    <i className="fa-solid fa-triangle-exclamation text-sm"></i>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800">
                      OOS War Room Reports
                    </h4>
                    <p className="text-slate-400 text-[10px] font-semibold leading-tight pt-0.5">
                      ตรวจสอบวิเคราะห์ปัญหาสินค้าหมดบนชั้นวางรายบริษัท
                    </p>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-[9px] text-slate-300 group-hover:translate-x-0.5 transition-all"></i>
              </div>

              {/* 2. Market Intelligence */}
              <div
                onClick={() => router.push("/market-intel")}
                className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-4 shadow-xs transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xs">
                    <i className="fa-solid fa-chart-line text-sm"></i>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800">
                      Market Intelligence
                    </h4>
                    <p className="text-slate-400 text-[10px] font-semibold leading-tight pt-0.5">
                      แผงรายงานราคาสินค้าคู่แข่ง (Price) และข้อมูลสินค้าใหม่
                      (NPD)
                    </p>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-[9px] text-slate-300 group-hover:translate-x-0.5 transition-all"></i>
              </div>

              {/* 3. หน้าลงบันทึกแจ้งคำร้องเรียน (ตัวเดิมที่จิ้มสาขา) */}
              <div
                onClick={() => router.push("/customer")}
                className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-4 shadow-xs transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xs">
                    <i className="fa-solid fa-pen-to-square text-sm"></i>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800">
                      ศูนย์บันทึกแจ้งร้องเรียนหน้าร้าน
                    </h4>
                    <p className="text-slate-400 text-[10px] font-semibold leading-tight pt-0.5">
                      พิมพ์ข้อความแจ้งสินค้าขาดหรือข้อเสนอแนะส่งตรงหาทีมตรวจ
                    </p>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-[9px] text-slate-300 group-hover:translate-x-0.5 transition-all"></i>
              </div>

              {/* 4. Q & A */}
              <div
                onClick={() => router.push("/qa")}
                className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-4 shadow-xs transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xs">
                    <i className="fa-solid fa-comments text-sm"></i>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800">
                      Q & A Corner
                    </h4>
                    <p className="text-slate-400 text-[10px] font-semibold leading-tight pt-0.5">
                      กระดานตั้งคำถาม แลกเปลี่ยนข้อซักถาม และคำชี้แจงส่วนกลาง
                    </p>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-[9px] text-slate-300 group-hover:translate-x-0.5 transition-all"></i>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-wider pt-6">
        © 2026 FMBD CONTROLLER PORTAL PORTFOLIO
      </footer>
    </div>
  );
}
