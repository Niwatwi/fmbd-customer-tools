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
    // 🔍 ดึงข้อมูลจาก localStorage
    const storedUser = localStorage.getItem("customer_username");
    const storedName = localStorage.getItem("customer_display_name");
    const storedTag = localStorage.getItem("customer_company_tag");

    // 🛡️ เช็คสิทธิ์
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

  // ถ้ายังโหลดไม่เสร็จ ให้แสดงหน้าโหลด
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
      {/* ... (ส่วน Header และ Layout เหมือนเดิม) ... */}
      <div>
        <header className="bg-white border-b border-slate-200 py-4 px-5 flex justify-between items-center shadow-xs rounded-b-2xl">
          <span className="text-slate-800 font-black text-sm tracking-wider uppercase">RIVERPRO CUSTOMER PORTAL</span>
          <div className="flex items-center space-x-3">
            <div className="text-right text-xs">
              <p className="font-bold text-slate-800 flex items-center gap-1 justify-end">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                {displayName}
              </p>
              <p className="text-slate-400 font-black text-[9px] uppercase tracking-wider">{companyTag} Partner</p>
            </div>
            <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer border border-slate-100">
              <i className="fa-solid fa-right-from-bracket text-xs"></i>
            </button>
          </div>
        </header>

        <main className="px-4 pt-5 space-y-5">
           {/* ส่วนปุ่มกด - นี่คือจุดที่สำคัญมากครับ! */}
           <div className="grid grid-cols-1 gap-2.5 text-left">
              <div
                onClick={() => {
                  const tag = companyTag.toLowerCase();
                  console.log("Navigating to:", `/executive/${tag}?tag=${tag}`); // Debug ได้ตรงนี้ครับ
                  router.push(`/executive/${tag}?tag=${tag}`);
                }}
                className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-4 shadow-xs transition-all cursor-pointer flex items-center justify-between group"
              >
                {/* ... เนื้อหาข้างใน ... */}
                 <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xs">
                        <i className="fa-solid fa-triangle-exclamation text-sm"></i>
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-slate-800">OOS War Room Reports</h4>
                        <p className="text-slate-400 text-[10px] font-semibold leading-tight pt-0.5">ตรวจสอบวิเคราะห์ปัญหาสินค้าหมดบนชั้นวางรายบริษัท</p>
                    </div>
                 </div>
                 <i className="fa-solid fa-chevron-right text-[9px] text-slate-300 group-hover:translate-x-0.5 transition-all"></i>
              </div>
           </div>
        </main>
      </div>
    </div>
  );
}
