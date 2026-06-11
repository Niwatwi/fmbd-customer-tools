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
    // 🔍 ตรวจสอบเซสชันความปลอดภัยจากเครื่อง
    const storedUser = localStorage.getItem("customer_username");
    const storedName = localStorage.getItem("customer_display_name");
    const storedTag = localStorage.getItem("customer_company_tag");

    if (!storedUser || !storedName) {
      window.location.href = "/login";
      return;
    }

    setDisplayName(storedName);
    setCompanyTag(storedTag || "RVP");
    setIsReady(true);
  }, []);

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
        sessionStorage.clear();
        window.location.href = "/login";
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
        {/* 🏢 ส่วนหัวควบคุมกลาง (Header) */}
        <header className="bg-white border-b border-slate-200 py-4 px-5 flex justify-between items-center shadow-xs rounded-b-2xl">
          <span className="text-slate-800 font-black text-sm tracking-wider uppercase">
            RIVERPRO PORTAL
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
            >
              <i className="fa-solid fa-right-from-bracket text-xs"></i>
            </button>
          </div>
        </header>

        {/* 🎛️ แผงรวมศูนย์ปุ่มควบคุมงานทั้งหมด (Main Menu) */}
        <main className="px-4 pt-5 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
            เมนูระบบงานควบคุมหน้าร้าน
          </p>

          <div className="grid grid-cols-1 gap-2.5 text-left">
            {/* 🎯 ปุ่มที่ 1: OOS War Room Reports (ระบบใหม่ ชี้เข้าหาบ้านใหม่ไร้รอยต่อ) */}
            <div
              onClick={() => {
                const tag = companyTag.toLowerCase();
                router.push(`/executive/${tag}?tag=${tag}`);
              }}
              className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-4 shadow-xs transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xs">
                  <i className="fa-solid fa-chart-line text-sm"></i>
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

            {/* 📸 ปุ่มที่ 2: ระบบลงเวลาเข้างาน (Staff Check-In / Out พร้อมระบุพิกัด) */}
            <div
              onClick={() => router.push("/checkin")}
              className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-4 shadow-xs transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-xs">
                  <i className="fa-solid fa-location-dot text-sm"></i>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">
                    Staff Check-In / Out
                  </h4>
                  <p className="text-slate-400 text-[10px] font-semibold leading-tight pt-0.5">
                    บันทึกเวลาเข้า-ออกงาน พร้อมถ่ายภาพและบันทึกพิกัด GPS
                  </p>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right text-[9px] text-slate-300 group-hover:translate-x-0.5 transition-all"></i>
            </div>

            {/* 🏷️ ปุ่มที่ 3: ระบบจัดการข้อมูลสินค้าและราคา (Product & Price Management) */}
            <div
              onClick={() => router.push("/products")}
              className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-4 shadow-xs transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-xs">
                  <i className="fa-solid fa-tags text-xs"></i>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">
                    Product & Price Manager
                  </h4>
                  <p className="text-slate-400 text-[10px] font-semibold leading-tight pt-0.5">
                    อัปเดตบาร์โค้ด หมวดหมู่สินค้า
                    และราคากลางเข้าสู่ระบบฐานข้อมูล
                  </p>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right text-[9px] text-slate-300 group-hover:translate-x-0.5 transition-all"></i>
            </div>
            {/* 🛡️ ปุ่มใหม่: Auditor War Room (ชี้ไปยัง URL โปรเจกต์ fmbd-tools) */}
            <div
              onClick={() => {
                // ใช้ URL ที่พี่เพิ่งได้มา แล้วบวก /auditor ต่อท้ายครับ
                window.location.href =
                  "https://riverpro-oos-warroom-dwx4.vercel.app/auditor";
              }}
              className="bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-4 shadow-xs transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-all">
                  <i className="fa-solid fa-shield-halved text-xs"></i>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">
                    Auditor War Room
                  </h4>
                  <p className="text-slate-400 text-[10px] font-semibold leading-tight pt-0.5">
                    ระบบตรวจสอบงานออดิเตอร์ และจัดการเคสร้องเรียน
                  </p>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right text-[9px] text-slate-300 group-hover:translate-x-0.5 transition-all"></i>
            </div>
          </div>
        </main>
      </div>

      {/* 📋 ส่วนท้ายระบบ (Footer) */}
      <footer className="text-center">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          Powered by Riverpro Tech Team © 2026
        </p>
      </footer>
    </div>
  );
}
