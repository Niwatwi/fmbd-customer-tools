/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

// 🎯 กำหนด Interface ไทป์ให้ตรงตามโครงสร้างคอลัมน์ใน Supabase ของพี่นิวาสเป๊ะๆ ครับ
interface ProductItem {
  id: number;
  code: string;
  ImageUrl?: string;
  Barcode?: string;
  CategoryCode?: string;
  Category?: string;
  SubCategory?: string;
  Segment?: string;
  Company?: string;
  Competitor?: string;
  BrandType?: string;
  Brand?: string;
  SubBrand?: string;
  PackName?: string;
  Descriptions?: string;
  isActive: boolean;
}

export default function MarketIntelligencePage() {
  const router = useRouter();
  const [companyTag, setCompanyTag] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"price" | "npd">("price");

  // State จัดการข้อมูลและสภาวะการโหลด
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // ตัวกรอง (Filters) หน้าจอ
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedSegment, setSelectedSegment] = useState<string>("All");

  useEffect(() => {
    const storedUser = localStorage.getItem("customer_username");
    const storedTag = localStorage.getItem("customer_company_tag") || "RVP";

    if (!storedUser) {
      router.push("/login");
      return;
    }

    setCompanyTag(storedTag);

    // 🔍 ดึงข้อมูลจากตารางสินค้ามาแสดงผล
    const fetchMarketData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products") // 💡 ปรับเปลี่ยนเป็นชื่อตารางจริงของพี่นิวาสได้เลยครับ
          .select("*")
          .order("id", { ascending: false });

        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error("Error fetching market intel data:", err);
      }
      {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, [router]);

  // ลอจิกการกรองข้อมูลด้วย Search และ Segment ตัวเลือก
  const filteredProducts = products.filter((item) => {
    const matchesSearch =
      item.Brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.PackName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.Barcode?.includes(searchTerm);

    const matchesSegment =
      selectedSegment === "All" || item.Segment === selectedSegment;

    // ถ้าเป็นแท็บ NPD จะเลือกเฉพาะสินค้าที่ถูกมาร์คว่า Active เท่านั้น
    const matchesTab = activeTab === "price" ? true : item.isActive === true;

    return matchesSearch && matchesSegment && matchesTab;
  });

  // ดึงรายการ Segment ทั้งหมดแบบไม่ซ้ำมาทำ Dropdown ตัวกรอง
  const segmentsList = [
    "All",
    ...Array.from(new Set(products.map((p) => p.Segment).filter(Boolean))),
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans antialiased max-w-md mx-auto pb-12 flex flex-col justify-between">
      <div>
        {/* HEADER */}
        <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-50 shadow-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push("/")}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-slate-600"
            >
              <i className="fa-solid fa-chevron-left text-sm"></i>
            </button>
            <div className="text-left">
              <h1 className="text-xs font-black text-slate-800 tracking-tight uppercase">
                Market Intelligence
              </h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                {companyTag} Partner Reports
              </p>
            </div>
          </div>
          <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md border border-blue-100 uppercase">
            📊 สถิติคู่ค้า
          </span>
        </div>

        {/* TAB NAVIGATION */}
        <div className="px-4 mt-4">
          <div className="bg-slate-200/60 p-1 rounded-xl grid grid-cols-2 gap-1">
            <button
              onClick={() => setActiveTab("price")}
              className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "price"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <i className="fa-solid fa-tags text-[11px]"></i> Price Report
            </button>
            <button
              onClick={() => setActiveTab("npd")}
              className={`py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "npd"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <i className="fa-solid fa-boxes-packing text-[11px]"></i> NPD
              Report
            </button>
          </div>
        </div>

        {/* FILTERS PANEL */}
        <div className="px-4 mt-3 grid grid-cols-3 gap-2 text-left">
          <div className="col-span-2">
            <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">
              ค้นหาแบรนด์/บาร์โค้ด
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="พิมพ์ค้นหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-7 pr-3 text-[11px] font-bold text-slate-700 outline-none focus:border-slate-400"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-[10px] text-slate-400"></i>
            </div>
          </div>
          <div>
            <label className="block text-[8px] font-black text-slate-400 uppercase mb-0.5">
              Segment
            </label>
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2 text-[11px] font-bold text-slate-700 outline-none focus:border-slate-400 h-[29px]"
            >
              {segmentsList.map((seg, idx) => (
                <option key={idx} value={seg}>
                  {seg}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* REPORT CONTENT VIEW */}
        <div className="px-4 mt-4">
          {loading ? (
            <div className="text-center py-12 text-xs text-slate-400 font-medium">
              🔄 กำลังประมวลผลข้อมูลรายงานคู่ค้า...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-[11px] font-bold text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white">
              📭 ไม่พบรายการข้อมูลสินค้าที่ตรงเงื่อนไขในขณะนี้
            </div>
          ) : activeTab === "price" ? (
            /* ── VIEW A: PRICE REPORT TABLE ── */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs text-left">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-bold text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase border-b border-slate-200 font-black tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">รายละเอียดสินค้า</th>
                      <th className="py-2.5 px-2 text-center">Segment</th>
                      <th className="py-2.5 px-3 text-right">Brand</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <span className="block text-slate-800 text-[11px]">
                            {item.PackName || "ไม่ระบุชื่อแพ็ค"}
                          </span>
                          <span className="block text-[9px] text-slate-400 font-medium">
                            Barcode: {item.Barcode || "-"}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase">
                            {item.Segment || "ทั่วไป"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`text-[10.5px] font-black ${item.Competitor ? "text-rose-600" : "text-emerald-600"}`}
                          >
                            {item.Brand}
                          </span>
                          <span className="block text-[8px] text-slate-400 font-medium tracking-tight">
                            {item.Competitor ? "⚠️ คู่แข่ง" : "✅ สินค้าเรา"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ── VIEW B: NPD REPORT GRID CARDS ── */
            <div className="grid grid-cols-2 gap-3 text-left">
              {filteredProducts.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* ส่วนแสดงรูปสินค้ากรณีมี ImageUrl */}
                    <div className="w-full h-24 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden relative">
                      {item.ImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.ImageUrl}
                          alt={item.PackName}
                          className="object-contain max-h-full max-w-full p-1"
                        />
                      ) : (
                        <i className="fa-solid fa-box-open text-slate-300 text-xl"></i>
                      )}
                      <span className="absolute top-1.5 right-1.5 bg-indigo-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                        NEW NPD
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[8px] font-black text-indigo-500 uppercase block tracking-wider">
                        {item.Brand}
                      </span>
                      <h4 className="text-[11px] font-black text-slate-800 leading-tight line-clamp-2">
                        {item.PackName}
                      </h4>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 mt-2 flex justify-between items-center text-[9px]">
                    <span className="text-slate-400 font-medium">
                      คลัง: {item.CategoryCode || "-"}
                    </span>
                    <span className="bg-emerald-50 text-emerald-600 font-extrabold px-1.5 py-0.5 rounded border border-emerald-100">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="mt-8 text-center text-[9px] text-slate-400 font-bold uppercase tracking-wider">
        © 2026 RIVERPRO MARKET INTELLIGENCE WINDOW
      </footer>
    </div>
  );
}
